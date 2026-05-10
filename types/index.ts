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

// Made with Bob