/**
 * ご褒美ストア関連のアクション関数（修正版）
 * 申請・引き渡し・却下の各トランザクションを担当
 *
 * 方針A（申請時即時減算）:
 *   createExchange  → ポイント即時減算、child_name を非正規化埋め込み
 *   deliverExchange → 在庫1減算
 *   rejectExchange  → ポイント返金（冪等性ガード必須）
 *                     監査ログは delivered_by / delivered_at に統一
 */

import {
  doc,
  collection,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserData } from '@/types';
import { rewardConverter } from '@/lib/converters/rewardConverter';
import { exchangeConverter } from '@/lib/converters/exchangeConverter';

/**
 * 子供がご褒美を交換申請する（申請時にポイントを即時減算）
 */
export async function createExchange(
  rewardId: string,
  childUser: UserData
): Promise<void> {
  if (childUser.role !== 'child') {
    throw new Error('交換申請は子供のみが実行できます');
  }
  if (!childUser.familyId) {
    throw new Error('家族IDが設定されていません');
  }

  // withConverter で READ を型安全化。new doc は raw ref で作成（FieldValue 混入を回避）
  const rewardRef = doc(db, 'rewards', rewardId).withConverter(rewardConverter);
  const childUserRef = doc(db, 'users', childUser.userId);
  const newExchangeRef = doc(collection(db, 'exchanges'));

  try {
    await runTransaction(db, async (transaction) => {
      // 直列 Read（並列 Promise.all 禁止）
      const rewardSnap = await transaction.get(rewardRef);
      const childSnap = await transaction.get(childUserRef);

      if (!rewardSnap.exists()) throw new Error('ご褒美が存在しません');
      if (!childSnap.exists()) throw new Error('ユーザーデータが存在しません');

      // withConverter 経由で完全に型付けされた RewardData
      const rewardData = rewardSnap.data();
      const childData = childSnap.data();

      if (!rewardData.isActive) throw new Error('このご褒美は現在利用できません');
      if (rewardData.familyId !== childUser.familyId) throw new Error('権限がありません');
      if (rewardData.stock !== undefined && rewardData.stock <= 0) {
        throw new Error('申し訳ありません、売り切れです');
      }

      const currentBalance: number = childData.total_reward ?? 0;
      const required: number = rewardData.requiredPoints;
      if (currentBalance < required) {
        throw new Error(
          `ポイントが足りません（必要: ${required}pt、所持: ${currentBalance}pt）`
        );
      }

      // Write: 子のポイントを即時減算（updated_at も記録して一貫性を担保）
      transaction.update(childUserRef, {
        total_reward: currentBalance - required,
        updated_at: serverTimestamp(),
      });

      // Write: 交換申請ドキュメントを作成
      // child_name を非正規化埋め込みして親側の N+1 を防止
      transaction.set(newExchangeRef, {
        family_id: childUser.familyId,
        reward_id: rewardId,
        reward_title: rewardData.title,
        child_name: childUser.name || 'こども',
        required_points: required,
        status: 'requested',
        requested_by: childUser.userId,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    });
  } catch (error) {
    console.error('createExchange Transaction エラー:', error);
    if (error instanceof Error) throw error;
    throw new Error('交換申請に失敗しました');
  }
}

/**
 * 親がご褒美を子供に引き渡す（在庫を1減算・status: delivered）
 */
export async function deliverExchange(
  exchangeId: string,
  parentUser: UserData
): Promise<void> {
  if (parentUser.role !== 'parent') {
    throw new Error('引き渡しは親のみが実行できます');
  }
  if (!parentUser.familyId) {
    throw new Error('家族IDが設定されていません');
  }

  const exchangeRef = doc(db, 'exchanges', exchangeId).withConverter(exchangeConverter);

  try {
    await runTransaction(db, async (transaction) => {
      // 直列 Read
      const exchangeSnap = await transaction.get(exchangeRef);
      if (!exchangeSnap.exists()) throw new Error('申請データが存在しません');

      const exchangeData = exchangeSnap.data();

      // 冪等性ガード（二重処理完全防止）
      if (exchangeData.status !== 'requested') {
        throw new Error('この申請は既に処理済みです');
      }
      if (exchangeData.familyId !== parentUser.familyId) {
        throw new Error('権限がありません');
      }

      const rewardRef = doc(db, 'rewards', exchangeData.rewardId).withConverter(rewardConverter);
      const rewardSnap = await transaction.get(rewardRef);
      if (!rewardSnap.exists()) throw new Error('ご褒美データが存在しません');

      const rewardData = rewardSnap.data();

      // 在庫チェック（承認時点での最終確認）
      if (rewardData.stock !== undefined && rewardData.stock <= 0) {
        throw new Error('在庫切れのため引き渡しできません');
      }

      // Write: 在庫を減算（在庫管理がある場合のみ）
      if (rewardData.stock !== undefined) {
        // update は converter を経由しないため raw ref で更新
        const rewardRawRef = doc(db, 'rewards', exchangeData.rewardId);
        transaction.update(rewardRawRef, {
          stock: rewardData.stock - 1,
          updated_at: serverTimestamp(),
        });
      }

      // Write: ステータスを delivered に確定
      const exchangeRawRef = doc(db, 'exchanges', exchangeId);
      transaction.update(exchangeRawRef, {
        status: 'delivered',
        delivered_by: parentUser.userId,
        delivered_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    });
  } catch (error) {
    console.error('deliverExchange Transaction エラー:', error);
    if (error instanceof Error) throw error;
    throw new Error('引き渡し処理に失敗しました');
  }
}

/**
 * 親が申請を却下する（ポイントをアトミックに返金・status: rejected）
 * 監査ログは delivered_by / delivered_at に統一（世界線規約）
 */
export async function rejectExchange(
  exchangeId: string,
  parentUser: UserData
): Promise<void> {
  if (parentUser.role !== 'parent') {
    throw new Error('却下は親のみが実行できます');
  }
  if (!parentUser.familyId) {
    throw new Error('家族IDが設定されていません');
  }

  const exchangeRef = doc(db, 'exchanges', exchangeId).withConverter(exchangeConverter);

  try {
    await runTransaction(db, async (transaction) => {
      // 直列 Read
      const exchangeSnap = await transaction.get(exchangeRef);
      if (!exchangeSnap.exists()) throw new Error('申請データが存在しません');

      const exchangeData = exchangeSnap.data();

      // 冪等性ガード（二重返金・ポイント増殖を完全遮断）
      if (exchangeData.status !== 'requested') {
        throw new Error('この申請は既に処理済みです（二重返金防止）');
      }
      if (exchangeData.familyId !== parentUser.familyId) {
        throw new Error('権限がありません');
      }

      const childUserRef = doc(db, 'users', exchangeData.requestedBy);
      const childSnap = await transaction.get(childUserRef);
      if (!childSnap.exists()) throw new Error('子供のデータが存在しません');

      const childData = childSnap.data();
      const currentBalance: number = childData.total_reward ?? 0;
      const refundAmount: number = exchangeData.requiredPoints;

      // Write: ポイントをアトミックに返金
      transaction.update(childUserRef, {
        total_reward: currentBalance + refundAmount,
        updated_at: serverTimestamp(),
      });

      // Write: ステータスを rejected に確定
      // 監査ログは世界線規約通り delivered_by / delivered_at に統一
      const exchangeRawRef = doc(db, 'exchanges', exchangeId);
      transaction.update(exchangeRawRef, {
        status: 'rejected',
        delivered_by: parentUser.userId,
        delivered_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    });
  } catch (error) {
    console.error('rejectExchange Transaction エラー:', error);
    if (error instanceof Error) throw error;
    throw new Error('却下処理に失敗しました');
  }
}

// Made with Bob
