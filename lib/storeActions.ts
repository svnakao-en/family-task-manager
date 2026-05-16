/**
 * ご褒美ストア関連のアクション関数
 * 申請・引き渡し・却下の各トランザクションを担当
 *
 * 方針A（申請時即時減算）:
 *   createExchange  → ポイント即時減算
 *   deliverExchange → 在庫1減算
 *   rejectExchange  → ポイント返金（冪等性ガード必須）
 */

import {
  doc,
  collection,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserData } from '@/types';

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

  const rewardRef = doc(db, 'rewards', rewardId);
  const childUserRef = doc(db, 'users', childUser.userId);
  const newExchangeRef = doc(collection(db, 'exchanges'));

  try {
    await runTransaction(db, async (transaction) => {
      // 直列Read（並列Promise.all禁止）
      const rewardSnap = await transaction.get(rewardRef);
      const childSnap = await transaction.get(childUserRef);

      if (!rewardSnap.exists()) throw new Error('ご褒美が存在しません');
      if (!childSnap.exists()) throw new Error('ユーザーデータが存在しません');

      const rewardData = rewardSnap.data();
      const childData = childSnap.data();

      // バリデーション
      if (!rewardData.is_active) throw new Error('このご褒美は現在利用できません');
      if (rewardData.family_id !== childUser.familyId) throw new Error('権限がありません');
      if (rewardData.stock !== undefined && rewardData.stock <= 0) {
        throw new Error('申し訳ありません、売り切れです');
      }

      const currentBalance: number = childData.total_reward ?? 0;
      const required: number = rewardData.required_points;
      if (currentBalance < required) {
        throw new Error(
          `ポイントが足りません（必要: ${required}pt、所持: ${currentBalance}pt）`
        );
      }

      // Write: 子のポイントを即時減算
      transaction.update(childUserRef, {
        total_reward: currentBalance - required,
      });

      // Write: 交換申請ドキュメントを作成
      transaction.set(newExchangeRef, {
        family_id: childUser.familyId,
        reward_id: rewardId,
        reward_title: rewardData.title,
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

  const exchangeRef = doc(db, 'exchanges', exchangeId);

  try {
    await runTransaction(db, async (transaction) => {
      // 直列Read
      const exchangeSnap = await transaction.get(exchangeRef);
      if (!exchangeSnap.exists()) throw new Error('申請データが存在しません');

      const exchangeData = exchangeSnap.data();

      // 冪等性ガード（二重処理完全防止）
      if (exchangeData.status !== 'requested') {
        throw new Error('この申請は既に処理済みです');
      }
      if (exchangeData.family_id !== parentUser.familyId) {
        throw new Error('権限がありません');
      }

      const rewardRef = doc(db, 'rewards', exchangeData.reward_id);
      const rewardSnap = await transaction.get(rewardRef);
      if (!rewardSnap.exists()) throw new Error('ご褒美データが存在しません');

      const rewardData = rewardSnap.data();

      // 在庫チェック（承認時点での最終確認）
      if (rewardData.stock !== undefined && rewardData.stock <= 0) {
        throw new Error('在庫切れのため引き渡しできません');
      }

      // Write: 在庫を減算（在庫管理がある場合のみ）
      if (rewardData.stock !== undefined) {
        transaction.update(rewardRef, {
          stock: rewardData.stock - 1,
          updated_at: serverTimestamp(),
        });
      }

      // Write: ステータスを delivered に確定
      transaction.update(exchangeRef, {
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

  const exchangeRef = doc(db, 'exchanges', exchangeId);

  try {
    await runTransaction(db, async (transaction) => {
      // 直列Read
      const exchangeSnap = await transaction.get(exchangeRef);
      if (!exchangeSnap.exists()) throw new Error('申請データが存在しません');

      const exchangeData = exchangeSnap.data();

      // 冪等性ガード（二重返金・ポイント増殖を完全遮断）
      if (exchangeData.status !== 'requested') {
        throw new Error('この申請は既に処理済みです（二重返金防止）');
      }
      if (exchangeData.family_id !== parentUser.familyId) {
        throw new Error('権限がありません');
      }

      const childUserRef = doc(db, 'users', exchangeData.requested_by);
      const childSnap = await transaction.get(childUserRef);
      if (!childSnap.exists()) throw new Error('子供のデータが存在しません');

      const childData = childSnap.data();
      const currentBalance: number = childData.total_reward ?? 0;
      const refundAmount: number = exchangeData.required_points;

      // Write: ポイントをアトミックに返金
      transaction.update(childUserRef, {
        total_reward: currentBalance + refundAmount,
      });

      // Write: ステータスを rejected に確定
      transaction.update(exchangeRef, {
        status: 'rejected',
        rejected_by: parentUser.userId,
        rejected_at: serverTimestamp(),
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
