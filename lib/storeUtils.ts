/**
 * ご褒美ストア関連のユーティリティ関数
 * Firestoreのsnake_caseとTypeScriptのcamelCaseの変換を担当
 */

import { Timestamp } from 'firebase/firestore';
import {
  RewardData,
  ExchangeData,
  FirestoreRewardDocument,
  FirestoreExchangeDocument,
  ExchangeStatus,
  RejectedReason,
} from '@/types';

function convertTimestamp(ts: unknown): Date {
  if (!ts) return new Date();
  if (ts instanceof Timestamp) return ts.toDate();
  if (ts && typeof (ts as { toDate?: unknown }).toDate === 'function') {
    return (ts as { toDate: () => Date }).toDate();
  }
  return new Date(ts as string);
}

/**
 * Firestoreのご褒美ドキュメントをRewardDataに変換
 */
export function buildRewardData(firestoreData: unknown, docId: string): RewardData {
  const data = firestoreData as FirestoreRewardDocument;

  if (!data.family_id || !data.title || !data.created_by) {
    throw new Error('ご褒美データが不正です（必須フィールドが不足）');
  }

  const requiredPoints = Number(data.required_points);
  if (isNaN(requiredPoints) || requiredPoints < 1) {
    throw new Error('必要ポイントが不正です');
  }

  const reward: RewardData = {
    rewardId: docId,
    familyId: data.family_id,
    title: data.title,
    requiredPoints,
    isActive: Boolean(data.is_active),
    version: typeof data.version === 'number' ? data.version : 0,
    createdBy: data.created_by,
    createdAt: convertTimestamp(data.created_at),
  };

  if (data.description) reward.description = data.description;
  // stock: null/undefined = 無限、数値 = 在庫数
  if (data.stock !== undefined) reward.stock = data.stock === null ? null : Number(data.stock);

  return reward;
}

/**
 * FirestoreのexchangeドキュメントをExchangeDataに変換
 */
export function buildExchangeData(firestoreData: unknown, docId: string): ExchangeData {
  const data = firestoreData as FirestoreExchangeDocument;

  if (!data.family_id || !data.reward_id || !data.requested_by) {
    throw new Error('交換データが不正です（必須フィールドが不足）');
  }

  const exchange: ExchangeData = {
    exchangeId: docId,
    familyId: data.family_id,
    rewardId: data.reward_id,
    rewardTitle: data.reward_title,
    childName: data.child_name ?? '',
    requiredPoints: Number(data.required_points),
    status: data.status as ExchangeStatus,
    requestedBy: data.requested_by,
    createdAt: convertTimestamp(data.created_at),
    updatedAt: convertTimestamp(data.updated_at),
  };

  if (data.rejected_reason) exchange.rejectedReason = data.rejected_reason as RejectedReason;
  if (data.delivered_by) exchange.deliveredBy = data.delivered_by;
  if (data.delivered_at) exchange.deliveredAt = convertTimestamp(data.delivered_at);
  if (data.rejected_by) exchange.rejectedBy = data.rejected_by;
  if (data.rejected_at) exchange.rejectedAt = convertTimestamp(data.rejected_at);

  return exchange;
}

/**
 * 経過時間を日本語で表示（感情UX）
 */
export function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (days > 0) return `${days}日前`;
  if (hours > 0) return `${hours}時間前`;
  if (minutes > 0) return `${minutes}分前`;
  return 'たったいま';
}

// Made with Bob
