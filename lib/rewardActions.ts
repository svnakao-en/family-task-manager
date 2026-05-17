'use server';

/**
 * 親用：ご褒美マスター CRUD Server Actions（Phase 9 最終確定版）
 *
 * - Admin SDK のみ使用（Web SDK 禁止）
 * - 第1引数 auth: AuthContext に統一（バラ撒き禁止・将来の認証刷新に備えた抽象化）
 * - 成功時は値を return、失敗時は throw（呼び出し元は try/catch で処理）
 * - トランザクション内は必ず Read → Verify（楽観ロック） → Write の順を厳守
 * - FieldValue.increment(1) のみ許可（手動 +1 禁止）
 * - undefined/空文字 → null に正規化（Firestore クラッシュ防止）
 */

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidateTag } from 'next/cache';
import { randomUUID } from 'crypto';
import type { CreateRewardInput, UpdateRewardInput } from '@/types';
import type { AuthContext } from '@/lib/auth/types';

const MAX_REQUIRED_POINTS = 100_000;

// 空文字・undefined を null に正規化
function normalizeText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

// エラーコードと code プロパティを持つ Error を生成して throw
function throwWithCode(code: string, message: string): never {
  throw Object.assign(new Error(message), { code });
}

// バリデーション
function validateTitle(title: string | undefined): void {
  if (!title?.trim()) throwWithCode('INVALID_TITLE', 'タイトルを入力してください');
}
function validatePoints(points: number | undefined): void {
  if (points === undefined) return;
  if (!Number.isInteger(points) || points < 1 || points > MAX_REQUIRED_POINTS) {
    throwWithCode('INVALID_POINTS', `必要ポイントは1〜${MAX_REQUIRED_POINTS.toLocaleString()}の整数で入力してください`);
  }
}
function validateStock(stock: number | null | undefined): void {
  if (stock != null && (!Number.isInteger(stock) || stock < 0)) {
    throwWithCode('INVALID_STOCK', '在庫は0以上の整数で入力してください');
  }
}

/**
 * ご褒美を新規作成する（version=1 固定）
 */
export async function createReward(
  auth: AuthContext,
  input: CreateRewardInput
): Promise<{ rewardId: string }> {
  if (auth.role !== 'parent') throwWithCode('UNAUTHORIZED_ROLE', '権限がありません');

  validateTitle(input.title);
  validatePoints(input.requiredPoints);
  validateStock(input.stock);

  const logBase = { rewardId: 'new', uid: auth.uid, familyId: auth.familyId };

  try {
    const rewardId = randomUUID();
    await adminDb.collection('rewards').doc(rewardId).set({
      reward_id: rewardId,
      family_id: auth.familyId,
      title: input.title.trim(),
      description: normalizeText(input.description),
      required_points: input.requiredPoints,
      stock: input.stock ?? null,
      is_active: true,
      is_deleted: false,
      version: 1,
      created_by: auth.uid,
      updated_by: auth.uid,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
      deleted_at: null,
      deleted_by: null,
    });

    console.log({ ...logBase, rewardId, transactionPhase: 'createReward', result: 'success' });
    revalidateTag(`rewards:${auth.familyId}`);
    return { rewardId };

  } catch (err) {
    if ((err as any).code) throw err; // バリデーションエラーはそのまま再 throw
    console.error({ ...logBase, transactionPhase: 'createReward', result: 'error', error: String(err) });
    throwWithCode('UNKNOWN_ERROR', 'ご褒美の作成に失敗しました');
  }
}

/**
 * ご褒美を更新する
 * loadedVersion: number（必須） — トランザクション内で Read → 比較 → Write の順を厳守
 */
export async function updateReward(
  auth: AuthContext,
  rewardId: string,
  loadedVersion: number,
  input: UpdateRewardInput
): Promise<void> {
  if (auth.role !== 'parent') throwWithCode('UNAUTHORIZED_ROLE', '権限がありません');
  if (input.title !== undefined) validateTitle(input.title);
  validatePoints(input.requiredPoints);
  validateStock(input.stock);

  const logBase = { rewardId, uid: auth.uid, familyId: auth.familyId };
  const rewardRef = adminDb.collection('rewards').doc(rewardId);

  await adminDb.runTransaction(async (tx) => {
    // Step 1: Read
    const snap = await tx.get(rewardRef);
    if (!snap.exists) throwWithCode('REWARD_NOT_FOUND', 'ご褒美が見つかりません');

    const data = snap.data()!;
    if (data.family_id !== auth.familyId) throwWithCode('FAMILY_MISMATCH', '権限がありません');
    if (data.is_deleted) throwWithCode('REWARD_DELETED', 'このご褒美は既に削除されています');

    // Step 2: 楽観的ロック検証
    if (data.version !== loadedVersion) {
      throwWithCode('PREV_VERSION_MISMATCH', 'PREV_VERSION_MISMATCH');
    }

    // Step 3: ペイロード組み立て
    const update: Record<string, unknown> = {
      updated_at: FieldValue.serverTimestamp(),
      updated_by: auth.uid,
    };
    let needsVersionBump = false;

    if (input.title !== undefined) { update.title = input.title.trim(); needsVersionBump = true; }
    if (input.description !== undefined) { update.description = normalizeText(input.description); needsVersionBump = true; }
    if (input.requiredPoints !== undefined) { update.required_points = input.requiredPoints; needsVersionBump = true; }
    if (input.stock !== undefined) { update.stock = input.stock; needsVersionBump = true; }
    if (input.isActive !== undefined) { update.is_active = input.isActive; needsVersionBump = true; }

    if (needsVersionBump) update.version = FieldValue.increment(1);

    // Step 4: Write
    tx.update(rewardRef, update);
  });

  console.log({ ...logBase, transactionPhase: 'updateReward', result: 'success' });
  revalidateTag(`rewards:${auth.familyId}`);
}

/**
 * ご褒美を論理削除する（物理削除禁止）
 * loadedVersion: number（必須）
 */
export async function deleteReward(
  auth: AuthContext,
  rewardId: string,
  loadedVersion: number
): Promise<void> {
  if (auth.role !== 'parent') throwWithCode('UNAUTHORIZED_ROLE', '権限がありません');

  const logBase = { rewardId, uid: auth.uid, familyId: auth.familyId };
  const rewardRef = adminDb.collection('rewards').doc(rewardId);

  try {
    await adminDb.runTransaction(async (tx) => {
      // Step 1: Read
      const snap = await tx.get(rewardRef);
      if (!snap.exists) throwWithCode('REWARD_NOT_FOUND', 'ご褒美が見つかりません');

      const data = snap.data()!;
      if (data.family_id !== auth.familyId) throwWithCode('FAMILY_MISMATCH', '権限がありません');
      // 多重削除ガード
      if (data.is_deleted === true) throwWithCode('ALREADY_DELETED', 'ALREADY_DELETED');

      // Step 2: 楽観的ロック検証
      if (data.version !== loadedVersion) {
        throwWithCode('PREV_VERSION_MISMATCH', 'PREV_VERSION_MISMATCH');
      }

      // Step 3: 論理削除
      tx.update(rewardRef, {
        is_deleted: true,
        is_active: false,
        version: FieldValue.increment(1),
        deleted_at: FieldValue.serverTimestamp(),
        deleted_by: auth.uid,
        updated_at: FieldValue.serverTimestamp(),
        updated_by: auth.uid,
      });
    });

  } catch (err: unknown) {
    // 冪等: 既に削除済みなら成功扱い
    if ((err as any).code === 'ALREADY_DELETED') {
      console.log({ ...logBase, transactionPhase: 'deleteReward', result: 'already_deleted' });
      revalidateTag(`rewards:${auth.familyId}`);
      return;
    }
    throw err;
  }

  console.log({ ...logBase, transactionPhase: 'deleteReward', result: 'success' });
  revalidateTag(`rewards:${auth.familyId}`);
}

/**
 * 論理削除済みのご褒美を復元する
 * 同名のアクティブな報酬が存在する場合は復元を拒否（データクレンリネス保護）
 */
export async function restoreReward(
  auth: AuthContext,
  rewardId: string,
  loadedVersion: number
): Promise<void> {
  if (auth.role !== 'parent') throwWithCode('UNAUTHORIZED_ROLE', '権限がありません');

  const logBase = { rewardId, uid: auth.uid, familyId: auth.familyId };
  const rewardRef = adminDb.collection('rewards').doc(rewardId);

  await adminDb.runTransaction(async (tx) => {
    // Step 1: Read
    const snap = await tx.get(rewardRef);
    if (!snap.exists) throwWithCode('REWARD_NOT_FOUND', 'ご褒美が見つかりません');

    const data = snap.data()!;
    if (data.family_id !== auth.familyId) throwWithCode('FAMILY_MISMATCH', '権限がありません');
    if (data.is_deleted !== true) throwWithCode('NOT_DELETED', 'このご褒美は削除されていません');

    // Step 2: 楽観的ロック検証
    if (data.version !== loadedVersion) {
      throwWithCode('PREV_VERSION_MISMATCH', 'PREV_VERSION_MISMATCH');
    }

    // Step 3: 同名アクティブ報酬の重複チェック
    const duplicateSnap = await tx.get(
      adminDb.collection('rewards')
        .where('family_id', '==', auth.familyId)
        .where('is_deleted', '==', false)
        .where('title', '==', data.title as string)
    );
    if (!duplicateSnap.empty) {
      throwWithCode('DUPLICATE_TITLE', '同じ名前のご褒美がすでに存在します。別の名前で作成してください');
    }

    // Step 4: 復元（全フィールド明示的に初期化）
    tx.update(rewardRef, {
      is_deleted: false,
      is_active: true,
      deleted_at: null,
      deleted_by: null,
      inactive_reason: null,
      version: FieldValue.increment(1),
      updated_at: FieldValue.serverTimestamp(),
      updated_by: auth.uid,
    });
  });

  console.log({ ...logBase, transactionPhase: 'restoreReward', result: 'success' });
  revalidateTag(`rewards:${auth.familyId}`);
}
