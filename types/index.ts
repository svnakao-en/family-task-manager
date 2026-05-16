/**
 * 型定義ファイル
 * プロジェクト全体で使用する型を定義
 */

/**
 * ユーザーの役割
 */
export type UserRole = 'parent' | 'child' | 'unknown' | null;

/**
 * ユーザーデータ型（フロントエンド用・camelCase）
 */
export interface UserData {
  userId: string;
  email: string | null;
  name: string;
  totalReward: number;
  familyId?: string; // オプショナル: 役割未設定時はプロパティ自体が存在しない
  role: UserRole;
}

/**
 * Firestore の users コレクションのドキュメント型
 */
export interface FirestoreUserDocument {
  name: string;
  total_reward: number;
}

/**
 * Firestore の family_members コレクションのドキュメント型
 */
export interface FirestoreFamilyMemberDocument {
  user_id: string;
  family_id: string;
  role: 'parent' | 'child' | 'unknown';
}

/**
 * Firestore の families コレクションのドキュメント型
 */
export interface FirestoreFamilyDocument {
  name: string;
}

/**
 * 認証フックの戻り値型
 */
export interface UseAuthReturn {
  user: UserData | null;
  loading: boolean;
}

/**
 * タスクデータ型（フロントエンド用・camelCase）
 */
export interface TaskData {
  taskId: string;
  familyId: string;
  title: string;
  description?: string;
  rewardPoints: number;
  status: 'pending' | 'working' | 'completed' | 'approved'; // working 追加
  assignedTo?: string;
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
  approvedAt?: Date;
}

/**
 * Firestore の tasks コレクションのドキュメント型
 */
export interface FirestoreTaskDocument {
  task_id: string;
  family_id: string;
  title: string;
  description?: string;
  reward_points: number;
  status: 'pending' | 'working' | 'completed' | 'approved'; // working 追加
  assigned_to?: string;
  created_by: string;
  created_at: any; // Firestore Timestamp
  completed_at?: any; // Firestore Timestamp
  approved_at?: any; // Firestore Timestamp
}

// ==============================
// ご褒美ストア（Phase 8）
// ==============================

export type ExchangeStatus = 'requested' | 'delivered' | 'rejected';
export type RejectedReason = 'parent_rejected' | 'out_of_stock';

/**
 * ご褒美マスターデータ型（フロントエンド用・camelCase）
 */
export interface RewardData {
  rewardId: string;
  familyId: string;
  title: string;
  description?: string;
  requiredPoints: number;
  stock?: number | null;   // undefined/null=無限、0=売り切れ
  isActive: boolean;
  isDeleted: boolean;      // 論理削除（過去履歴保護のため物理削除禁止）
  version: number;         // 楽観的排他制御用バージョン（更新時 FieldValue.increment(1)）
  createdBy: string;
  createdAt: Date;
}

// 親CRUD入力DTO（Omit/Pick 禁止ルール#9のため独立型として定義）
export interface CreateRewardInput {
  title: string;
  description?: string;
  requiredPoints: number;
  stock?: number | null;
}

export interface UpdateRewardInput {
  title?: string;
  description?: string;
  requiredPoints?: number;
  stock?: number | null;
  isActive?: boolean;
}

/**
 * 交換履歴データ型（フロントエンド用・camelCase）
 * 監査ログは操作の種類ごとに分離：承認 → deliveredBy/At、却下 → rejectedBy/At
 */
export interface ExchangeData {
  exchangeId: string;
  familyId: string;
  rewardId: string;
  rewardTitle: string;
  childName: string;        // 申請時スナップショット（N+1防止）
  requiredPoints: number;
  status: ExchangeStatus;
  rejectedReason?: RejectedReason;
  requestedBy: string;
  deliveredBy?: string;     // 承認した親のuserId（監査ログ）
  deliveredAt?: Date;       // 承認日時
  rejectedBy?: string;      // 却下した親のuserId（監査ログ）
  rejectedAt?: Date;        // 却下日時
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Firestore の rewards コレクションのドキュメント型
 */
export interface FirestoreRewardDocument {
  family_id: string;
  title: string;
  description?: string;
  required_points: number;
  stock?: number | null;   // null=無限、0=売り切れ
  is_active: boolean;
  is_deleted: boolean;     // 論理削除フラグ（物理削除禁止）
  version: number;         // 更新時は Transaction 内で FieldValue.increment(1)
  created_by: string;
  created_at: any;
  updated_at?: any;
  deleted_at?: any;
  deleted_by?: string;
}

// ==============================
// 即時交換（Phase 8 FIX版）
// ==============================

export type ImmediateExchangeResult =
  | { success: true; exchangeId: string }
  | { success: false; code: string; message: string };

/**
 * Firestore の reward_exchanges コレクションのドキュメント型
 * ドキュメントID = purchaseRequestId
 */
export interface FirestoreExchangeHistoryDocument {
  exchange_id: string;
  reward_id: string;
  reward_snapshot: {
    reward_id: string;
    version: number;
    title: string;
    description?: string;
    required_points: number;
  };
  child_user_id: string;
  family_id: string;
  consumed_points: number;
  created_at: any;
  request_metadata: {
    client_timestamp: number;
    user_agent?: string;
    app_version: string;
  };
}

/**
 * Firestore の idempotency_keys コレクションのドキュメント型
 * ドキュメントID = purchaseRequestId
 */
export interface IdempotencyKeyDocument {
  status: 'completed';
  exchange_id: string;
  child_user_id: string;
  reward_id: string;
  updated_at: any;
  expire_at: Date;
}

/**
 * Firestore の exchanges コレクションのドキュメント型
 * 監査ログは操作の種類ごとに分離：承認 → delivered_by/at、却下 → rejected_by/at
 */
export interface FirestoreExchangeDocument {
  family_id: string;
  reward_id: string;
  reward_title: string;
  child_name: string;
  required_points: number;
  status: ExchangeStatus;
  rejected_reason?: RejectedReason;
  requested_by: string;
  delivered_by?: string;
  delivered_at?: any;
  rejected_by?: string;
  rejected_at?: any;
  created_at: any;
  updated_at: any;
}

// Made with Bob