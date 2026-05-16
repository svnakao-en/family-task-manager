'use server';

/**
 * 即時交換決済アクション（Phase 8 FIX版）
 *
 * - Admin SDK のみ使用（Web SDK 禁止）
 * - purchaseRequestId (UUID v4) による冪等性保証
 * - Transaction callback 内は Firestore Read/Write のみ（fetch・通知禁止）
 * - 構造化ロギング必須
 */

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';
import { ImmediateExchangeResult } from '@/types';

const MAX_POINTS = 1_000_000;
const MAX_REQUIRED_POINTS = 100_000;
const IDEMPOTENCY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validatePurchaseRequestId(id: string): void {
  if (typeof id !== 'string' || id.length > 64 || !UUID_V4_REGEX.test(id)) {
    throw Object.assign(new Error('INVALID_REQUEST_ID'), { code: 'INVALID_REQUEST_ID' });
  }
}

const USER_MESSAGES: Record<string, string> = {
  OUT_OF_STOCK: '在庫切れです',
  INSUFFICIENT_POINTS: 'ポイントが足りません',
  REWARD_NOT_FOUND: 'ご褒美が見つかりません',
  REWARD_INACTIVE: 'このご褒美は現在利用できません',
  FAMILY_MISMATCH: '権限エラー',
  NOT_CHILD: '権限エラー',
  USER_NOT_FOUND: '権限エラー',
};

/**
 * 子供が即時交換を申請する（ポイント即時減算・冪等性保証）
 *
 * @param purchaseRequestId - クライアントが生成した UUID v4。リトライ時は同じ値を再送すること
 */
export async function createImmediateExchange(
  purchaseRequestId: string,
  rewardId: string,
  childUser: { userId: string; familyId: string; name: string },
  requestMetadata: { clientTimestamp: number; userAgent?: string }
): Promise<ImmediateExchangeResult> {
  const logBase = {
    purchaseRequestId,
    rewardId,
    childUserId: childUser.userId,
    familyId: childUser.familyId,
  };

  try {
    validatePurchaseRequestId(purchaseRequestId);
  } catch {
    const errorCode = 'INVALID_REQUEST_ID';
    console.error({ ...logBase, transactionPhase: 'validation', result: 'error', errorCode });
    return { success: false, code: errorCode, message: '不正なリクエストIDです' };
  }

  if (!rewardId || typeof rewardId !== 'string') {
    return { success: false, code: 'INVALID_REWARD_ID', message: '不正なご褒美IDです' };
  }

  try {
    const exchangeId = randomUUID();
    const expireAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS);

    const idempotencyRef = adminDb.collection('idempotency_keys').doc(purchaseRequestId);
    const exchangeRef = adminDb.collection('reward_exchanges').doc(purchaseRequestId);
    const userRef = adminDb.collection('users').doc(childUser.userId);
    const rewardRef = adminDb.collection('rewards').doc(rewardId);

    const txResult = await adminDb.runTransaction(async (tx) => {
      // --- Read Phase（Admin SDK は Transaction 内で Promise.all 可）---
      const [idempotencySnap, userSnap, rewardSnap] = await Promise.all([
        tx.get(idempotencyRef),
        tx.get(userRef),
        tx.get(rewardRef),
      ]);

      // 冪等性チェック：同一 purchaseRequestId で完了済みならそのまま返す
      if (idempotencySnap.exists) {
        const existing = idempotencySnap.data()!;
        console.log({ ...logBase, transactionPhase: 'idempotency_hit', result: 'already_completed', errorCode: '' });
        return { success: true as const, exchangeId: existing.exchange_id as string };
      }

      // --- サーバー側でのユーザー権限二重検証 ---
      if (!userSnap.exists) {
        throw Object.assign(new Error('USER_NOT_FOUND'), { code: 'USER_NOT_FOUND' });
      }
      const userData = userSnap.data()!;

      if (userData.role !== 'child') {
        throw Object.assign(new Error('NOT_CHILD'), { code: 'NOT_CHILD' });
      }
      if (userData.family_id !== childUser.familyId) {
        throw Object.assign(new Error('FAMILY_MISMATCH'), { code: 'FAMILY_MISMATCH' });
      }

      const currentPoints: number = userData.total_reward ?? 0;
      if (!Number.isInteger(currentPoints) || currentPoints < 0 || currentPoints > MAX_POINTS) {
        throw Object.assign(new Error('INVALID_USER_POINTS'), { code: 'INVALID_USER_POINTS' });
      }

      // --- ご褒美バリデーション ---
      if (!rewardSnap.exists) {
        throw Object.assign(new Error('REWARD_NOT_FOUND'), { code: 'REWARD_NOT_FOUND' });
      }
      const rewardData = rewardSnap.data()!;

      if (!rewardData.is_active) {
        throw Object.assign(new Error('REWARD_INACTIVE'), { code: 'REWARD_INACTIVE' });
      }
      if (rewardData.family_id !== childUser.familyId) {
        throw Object.assign(new Error('FAMILY_MISMATCH'), { code: 'FAMILY_MISMATCH' });
      }

      const requiredPoints: number = rewardData.required_points;
      if (!Number.isInteger(requiredPoints) || requiredPoints < 1 || requiredPoints > MAX_REQUIRED_POINTS) {
        throw Object.assign(new Error('INVALID_REWARD_POINTS'), { code: 'INVALID_REWARD_POINTS' });
      }

      // stock: null = 無限、0 = 在庫切れ
      const currentStock: number | null = rewardData.stock ?? null;
      if (currentStock !== null) {
        if (!Number.isInteger(currentStock) || currentStock < 0) {
          throw Object.assign(new Error('INVALID_STOCK'), { code: 'INVALID_STOCK' });
        }
        if (currentStock <= 0) {
          throw Object.assign(new Error('OUT_OF_STOCK'), { code: 'OUT_OF_STOCK' });
        }
      }

      const newPoints = currentPoints - requiredPoints;
      if (newPoints < 0) {
        throw Object.assign(new Error('INSUFFICIENT_POINTS'), { code: 'INSUFFICIENT_POINTS' });
      }

      const rewardVersion: number =
        typeof rewardData.version === 'number' ? rewardData.version : 0;

      // --- Write Phase ---

      // ユーザーポイント減算（Read-before-Write 算術）
      tx.update(userRef, { total_reward: newPoints });

      // ご褒美在庫減算（Read-before-Write 算術）+ バージョン更新
      const rewardUpdate: Record<string, unknown> = {
        version: FieldValue.increment(1), // version のみ increment を許可（仕様書明示）
        updated_at: FieldValue.serverTimestamp(),
      };
      if (currentStock !== null) {
        rewardUpdate.stock = currentStock - 1;
      }
      tx.update(rewardRef, rewardUpdate);

      // 交換履歴ドキュメント
      tx.set(exchangeRef, {
        exchange_id: exchangeId,
        reward_id: rewardId,
        reward_snapshot: {
          reward_id: rewardId,
          version: rewardVersion,
          title: rewardData.title as string,
          ...(rewardData.description ? { description: rewardData.description as string } : {}),
          required_points: requiredPoints,
        },
        child_user_id: childUser.userId,
        family_id: childUser.familyId,
        consumed_points: requiredPoints,
        created_at: FieldValue.serverTimestamp(),
        request_metadata: {
          client_timestamp: requestMetadata.clientTimestamp,
          ...(requestMetadata.userAgent ? { user_agent: requestMetadata.userAgent } : {}),
          app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0',
        },
      });

      // 冪等性キードキュメント（TTL 7日）
      tx.set(idempotencyRef, {
        status: 'completed',
        exchange_id: exchangeId,
        child_user_id: childUser.userId,
        reward_id: rewardId,
        updated_at: FieldValue.serverTimestamp(),
        expire_at: expireAt,
      });

      return { success: true as const, exchangeId };
    });

    console.log({ ...logBase, transactionPhase: 'transaction_complete', result: 'success', errorCode: '' });
    return txResult;

  } catch (err: unknown) {
    const errorCode =
      err instanceof Error && 'code' in err
        ? (err as Error & { code: string }).code
        : 'UNKNOWN_ERROR';

    console.error({ ...logBase, transactionPhase: 'transaction', result: 'error', errorCode, error: String(err) });

    return {
      success: false,
      code: errorCode,
      message: USER_MESSAGES[errorCode] ?? 'エラーが発生しました。もう一度お試しください',
    };
  }
}

/**
 * purchaseRequestId で申請結果を照会する（指数バックオフリトライ時の復元用）
 * sessionUserId との一致チェックで認可を確認
 */
export async function getPurchaseResult(
  purchaseRequestId: string,
  sessionUserId: string
): Promise<{ found: false } | { found: true; exchangeId: string; status: 'completed' }> {
  try {
    validatePurchaseRequestId(purchaseRequestId);
  } catch {
    return { found: false };
  }

  const snap = await adminDb.collection('idempotency_keys').doc(purchaseRequestId).get();
  if (!snap.exists) return { found: false };

  const data = snap.data()!;
  if (data.child_user_id !== sessionUserId) return { found: false };

  return { found: true, exchangeId: data.exchange_id as string, status: 'completed' };
}
