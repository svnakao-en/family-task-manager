'use server';

/**
 * 親用：ご褒美マスター CRUD Server Actions（Phase 9 統合版）
 *
 * - Admin SDK のみ使用（Web SDK 禁止）
 * - createReward: version=1 固定で初期化
 * - updateReward: Transaction 内で FieldValue.increment(1)（手動 +1 禁止）
 *                 loadedVersion による楽観的ロック（任意）
 * - deleteReward: 論理削除のみ（物理削除禁止）・loadedVersion による楽観的ロック（任意）
 * - restoreReward: 論理削除済みを復元・同名アクティブ報酬がある場合はエラー
 * - 各アクション成功後: revalidateTag(`rewards:${familyId}`) を城外で実行
 * - undefined/空文字 → null に正規化してから Firestore に書き込む（undefined クラッシュ防止）
 */

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidateTag } from 'next/cache';
import { randomUUID } from 'crypto';
import { CreateRewardInput, UpdateRewardInput } from '@/types';

const MAX_REQUIRED_POINTS = 100_000;

type ParentUser = { userId: string; familyId: string; role: string };
type ActionSuccess<T = Record<never, never>> = { success: true } & T;
type ActionError = { success: false; code: string; message: string };

function validateRewardInput(input: Pick<CreateRewardInput, 'title' | 'requiredPoints' | 'stock'>): ActionError | null {
  if (!input.title?.trim()) {
    return { success: false, code: 'INVALID_TITLE', message: 'タイトルを入力してください' };
  }
  if (!Number.isInteger(input.requiredPoints) || input.requiredPoints < 1 || input.requiredPoints > MAX_REQUIRED_POINTS) {
    return { success: false, code: 'INVALID_POINTS', message: `必要ポイントは1〜${MAX_REQUIRED_POINTS.toLocaleString()}の整数で入力してください` };
  }
  if (input.stock != null && (!Number.isInteger(input.stock) || input.stock < 0)) {
    return { success: false, code: 'INVALID_STOCK', message: '在庫は0以上の整数で入力してください' };
  }
  return null;
}

// 空文字・undefined を null に正規化（Firestore への undefined 書き込みクラッシュ防止）
function normalizeText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * ご褒美を新規作成する
 * version は 1 固定で初期化（0始まり禁止）
 */
export async function createReward(
  input: CreateRewardInput,
  parentUser: ParentUser
): Promise<ActionSuccess<{ rewardId: string }> | ActionError> {
  if (parentUser.role !== 'parent') {
    return { success: false, code: 'NOT_PARENT', message: '権限がありません' };
  }

  const validationError = validateRewardInput(input);
  if (validationError) return validationError;

  const logBase = { rewardId: 'new', childUserId: '', familyId: parentUser.familyId };

  try {
    const rewardId = randomUUID();
    await adminDb.collection('rewards').doc(rewardId).set({
      reward_id: rewardId,
      family_id: parentUser.familyId,
      title: input.title.trim(),
      description: normalizeText(input.description),  // 空文字 → null
      required_points: input.requiredPoints,
      stock: input.stock ?? null,
      is_active: true,
      is_deleted: false,
      version: 1,  // 1 固定（0始まり禁止）
      created_by: parentUser.userId,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
      deleted_at: null,
      deleted_by: null,
    });

    console.log({ ...logBase, rewardId, transactionPhase: 'createReward', result: 'success', errorCode: '' });
    revalidateTag(`rewards:${parentUser.familyId}`);
    return { success: true, rewardId };

  } catch (err) {
    console.error({ ...logBase, transactionPhase: 'createReward', result: 'error', errorCode: 'UNKNOWN_ERROR', error: String(err) });
    return { success: false, code: 'UNKNOWN_ERROR', message: 'ご褒美の作成に失敗しました' };
  }
}

/**
 * ご褒美を更新する
 * loadedVersion を指定すると楽観的ロックを有効化（パパママ同時編集による先祖返り防止）
 * バージョン管理フィールド変更時は FieldValue.increment(1)（手動 +1 禁止）
 */
export async function updateReward(
  rewardId: string,
  input: UpdateRewardInput,
  parentUser: ParentUser,
  loadedVersion?: number
): Promise<ActionSuccess | ActionError> {
  if (parentUser.role !== 'parent') {
    return { success: false, code: 'NOT_PARENT', message: '権限がありません' };
  }
  if (input.title !== undefined && !input.title.trim()) {
    return { success: false, code: 'INVALID_TITLE', message: 'タイトルを入力してください' };
  }
  if (input.requiredPoints !== undefined) {
    if (!Number.isInteger(input.requiredPoints) || input.requiredPoints < 1 || input.requiredPoints > MAX_REQUIRED_POINTS) {
      return { success: false, code: 'INVALID_POINTS', message: `必要ポイントは1〜${MAX_REQUIRED_POINTS.toLocaleString()}の整数で入力してください` };
    }
  }
  if (input.stock != null && input.stock !== undefined && (!Number.isInteger(input.stock) || input.stock < 0)) {
    return { success: false, code: 'INVALID_STOCK', message: '在庫は0以上の整数で入力してください' };
  }

  const logBase = { rewardId, childUserId: '', familyId: parentUser.familyId };

  try {
    const rewardRef = adminDb.collection('rewards').doc(rewardId);

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(rewardRef);
      if (!snap.exists) throw Object.assign(new Error('REWARD_NOT_FOUND'), { code: 'REWARD_NOT_FOUND' });

      const data = snap.data()!;
      if (data.family_id !== parentUser.familyId) throw Object.assign(new Error('FAMILY_MISMATCH'), { code: 'FAMILY_MISMATCH' });
      if (data.is_deleted) throw Object.assign(new Error('REWARD_DELETED'), { code: 'REWARD_DELETED' });

      // 楽観的ロック：loadedVersion 指定時のみ検証
      if (loadedVersion !== undefined && data.version !== loadedVersion) {
        throw Object.assign(new Error('VERSION_MISMATCH'), { code: 'VERSION_MISMATCH' });
      }

      const update: Record<string, unknown> = { updated_at: FieldValue.serverTimestamp() };
      let needsVersionBump = false;

      if (input.title !== undefined) { update.title = input.title.trim(); needsVersionBump = true; }
      if (input.description !== undefined) { update.description = normalizeText(input.description); needsVersionBump = true; }
      if (input.requiredPoints !== undefined) { update.required_points = input.requiredPoints; needsVersionBump = true; }
      if (input.stock !== undefined) { update.stock = input.stock; needsVersionBump = true; }
      if (input.isActive !== undefined) { update.is_active = input.isActive; needsVersionBump = true; }

      if (needsVersionBump) {
        update.version = FieldValue.increment(1); // 手動 +1 禁止・必ず increment を使用
      }

      tx.update(rewardRef, update);
    });

    console.log({ ...logBase, transactionPhase: 'updateReward', result: 'success', errorCode: '' });
    revalidateTag(`rewards:${parentUser.familyId}`);
    return { success: true };

  } catch (err: unknown) {
    const errorCode = err instanceof Error && 'code' in err
      ? (err as Error & { code: string }).code : 'UNKNOWN_ERROR';
    console.error({ ...logBase, transactionPhase: 'updateReward', result: 'error', errorCode });

    const messages: Record<string, string> = {
      REWARD_NOT_FOUND: 'ご褒美が見つかりません',
      FAMILY_MISMATCH: '権限がありません',
      REWARD_DELETED: 'このご褒美は既に削除されています',
      VERSION_MISMATCH: '他の管理者が更新しました。画面を再読み込みしてください',
    };
    return { success: false, code: errorCode, message: messages[errorCode] ?? '更新に失敗しました' };
  }
}

/**
 * ご褒美を論理削除する（物理削除は過去履歴破壊のため禁止）
 * loadedVersion を指定すると楽観的ロックを有効化
 */
export async function deleteReward(
  rewardId: string,
  parentUser: ParentUser,
  loadedVersion?: number
): Promise<ActionSuccess | ActionError> {
  if (parentUser.role !== 'parent') {
    return { success: false, code: 'NOT_PARENT', message: '権限がありません' };
  }

  const logBase = { rewardId, childUserId: '', familyId: parentUser.familyId };

  try {
    const rewardRef = adminDb.collection('rewards').doc(rewardId);

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(rewardRef);
      if (!snap.exists) throw Object.assign(new Error('REWARD_NOT_FOUND'), { code: 'REWARD_NOT_FOUND' });

      const data = snap.data()!;
      if (data.family_id !== parentUser.familyId) throw Object.assign(new Error('FAMILY_MISMATCH'), { code: 'FAMILY_MISMATCH' });
      // 多重削除・購入処理との競合ガード
      if (data.is_deleted === true) throw Object.assign(new Error('ALREADY_DELETED'), { code: 'ALREADY_DELETED' });

      // 楽観的ロック：loadedVersion 指定時のみ検証
      if (loadedVersion !== undefined && data.version !== loadedVersion) {
        throw Object.assign(new Error('VERSION_MISMATCH'), { code: 'VERSION_MISMATCH' });
      }

      tx.update(rewardRef, {
        is_deleted: true,
        is_active: false,
        version: FieldValue.increment(1),
        deleted_at: FieldValue.serverTimestamp(),
        deleted_by: parentUser.userId,
        updated_at: FieldValue.serverTimestamp(),
      });
    });

    console.log({ ...logBase, transactionPhase: 'deleteReward', result: 'success', errorCode: '' });
    revalidateTag(`rewards:${parentUser.familyId}`);
    return { success: true };

  } catch (err: unknown) {
    const errorCode = err instanceof Error && 'code' in err
      ? (err as Error & { code: string }).code : 'UNKNOWN_ERROR';

    // 冪等: 既に削除済みなら成功扱い
    if (errorCode === 'ALREADY_DELETED') {
      console.log({ ...logBase, transactionPhase: 'deleteReward', result: 'already_deleted', errorCode: '' });
      return { success: true };
    }

    console.error({ ...logBase, transactionPhase: 'deleteReward', result: 'error', errorCode });
    const messages: Record<string, string> = {
      REWARD_NOT_FOUND: 'ご褒美が見つかりません',
      FAMILY_MISMATCH: '権限がありません',
      VERSION_MISMATCH: '他の管理者が更新しました。画面を再読み込みしてください',
    };
    return { success: false, code: errorCode, message: messages[errorCode] ?? '削除に失敗しました' };
  }
}

/**
 * 論理削除済みのご褒美を復元する
 * 同名のアクティブな報酬が存在する場合は復元を拒否（データクレンリネス保護）
 * loadedVersion を指定すると楽観的ロックを有効化
 */
export async function restoreReward(
  rewardId: string,
  parentUser: ParentUser,
  loadedVersion?: number
): Promise<ActionSuccess | ActionError> {
  if (parentUser.role !== 'parent') {
    return { success: false, code: 'NOT_PARENT', message: '権限がありません' };
  }

  const logBase = { rewardId, childUserId: '', familyId: parentUser.familyId };

  try {
    const rewardRef = adminDb.collection('rewards').doc(rewardId);

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(rewardRef);
      if (!snap.exists) throw Object.assign(new Error('REWARD_NOT_FOUND'), { code: 'REWARD_NOT_FOUND' });

      const data = snap.data()!;
      if (data.family_id !== parentUser.familyId) throw Object.assign(new Error('FAMILY_MISMATCH'), { code: 'FAMILY_MISMATCH' });
      if (data.is_deleted !== true) throw Object.assign(new Error('NOT_DELETED'), { code: 'NOT_DELETED' });

      // 楽観的ロック：loadedVersion 指定時のみ検証
      if (loadedVersion !== undefined && data.version !== loadedVersion) {
        throw Object.assign(new Error('VERSION_MISMATCH'), { code: 'VERSION_MISMATCH' });
      }

      // 同名アクティブ報酬の重複チェック（トランザクション内で読み取り）
      const duplicateSnap = await tx.get(
        adminDb.collection('rewards')
          .where('family_id', '==', parentUser.familyId)
          .where('is_deleted', '==', false)
          .where('title', '==', data.title as string)
      );
      if (!duplicateSnap.empty) {
        throw Object.assign(new Error('DUPLICATE_TITLE'), { code: 'DUPLICATE_TITLE' });
      }

      tx.update(rewardRef, {
        is_deleted: false,
        is_active: true,
        version: FieldValue.increment(1),
        deleted_at: null,
        deleted_by: null,
        updated_at: FieldValue.serverTimestamp(),
      });
    });

    console.log({ ...logBase, transactionPhase: 'restoreReward', result: 'success', errorCode: '' });
    revalidateTag(`rewards:${parentUser.familyId}`);
    return { success: true };

  } catch (err: unknown) {
    const errorCode = err instanceof Error && 'code' in err
      ? (err as Error & { code: string }).code : 'UNKNOWN_ERROR';
    console.error({ ...logBase, transactionPhase: 'restoreReward', result: 'error', errorCode });

    const messages: Record<string, string> = {
      REWARD_NOT_FOUND: 'ご褒美が見つかりません',
      FAMILY_MISMATCH: '権限がありません',
      NOT_DELETED: 'このご褒美は削除されていません',
      VERSION_MISMATCH: '他の管理者が更新しました。画面を再読み込みしてください',
      DUPLICATE_TITLE: '同じ名前のご褒美がすでに存在します。別の名前でご褒美を作成してください',
    };
    return { success: false, code: errorCode, message: messages[errorCode] ?? '復元に失敗しました' };
  }
}
