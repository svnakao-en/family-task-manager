/**
 * タスク関連のユーティリティ関数
 * Firestoreのsnake_caseとTypeScriptのcamelCaseの変換を担当
 */

import { Timestamp } from 'firebase/firestore';
import { TaskData, FirestoreTaskDocument } from '@/types';

/**
 * FirestoreのタスクドキュメントをTaskDataに変換
 * snake_case → camelCase、Timestamp → Date の変換を行う
 * @param firestoreData - Firestoreから取得した生データ
 * @param docId - ドキュメントID
 * @returns TaskData オブジェクト
 */
export function buildTaskData(firestoreData: any, docId: string): TaskData {
  const data = firestoreData as FirestoreTaskDocument;
  
  // 必須フィールドの検証と型の強制
  if (!data.family_id || !data.title || !data.created_by) {
    throw new Error('タスクデータが不正です（必須フィールドが不足）');
  }

  // reward_pointsの数値への強制キャスト（型の揺らぎ対策）
  const rewardPoints = Number(data.reward_points);
  if (isNaN(rewardPoints) || rewardPoints < 0) {
    throw new Error('報酬ポイントが不正です');
  }

  // Timestampの変換ヘルパー
  const convertTimestamp = (timestamp: any): Date => {
    if (!timestamp) return new Date();
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    return new Date(timestamp);
  };

  const taskData: TaskData = {
    taskId: docId,
    familyId: data.family_id,
    title: data.title,
    rewardPoints: rewardPoints,
    status: data.status || 'pending',
    createdBy: data.created_by,
    createdAt: convertTimestamp(data.created_at),
  };

  // オプショナルフィールドの追加（存在確認を徹底）
  if (data.description) {
    taskData.description = data.description;
  }

  if (data.assigned_to) {
    taskData.assignedTo = data.assigned_to;
  }

  // 日付フィールドは存在する場合のみ変換（クラッシュ防止）
  if (data.completed_at) {
    taskData.completedAt = convertTimestamp(data.completed_at);
  }

  if (data.approved_at) {
    taskData.approvedAt = convertTimestamp(data.approved_at);
  }

  return taskData;
}

/**
 * TaskDataをFirestore用のオブジェクトに変換
 * camelCase → snake_case、Date → Timestamp の変換を行う
 * @param taskData - TaskData オブジェクト
 * @returns Firestore用のオブジェクト
 */
export function taskDataToFirestore(taskData: Partial<TaskData>): Partial<FirestoreTaskDocument> {
  const firestoreData: any = {};

  if (taskData.familyId !== undefined) firestoreData.family_id = taskData.familyId;
  if (taskData.title !== undefined) firestoreData.title = taskData.title;
  if (taskData.description !== undefined) firestoreData.description = taskData.description;
  if (taskData.rewardPoints !== undefined) firestoreData.reward_points = taskData.rewardPoints;
  if (taskData.status !== undefined) firestoreData.status = taskData.status;
  if (taskData.assignedTo !== undefined) firestoreData.assigned_to = taskData.assignedTo;
  if (taskData.createdBy !== undefined) firestoreData.created_by = taskData.createdBy;

  // Date型はFirestoreに保存する際にTimestampに自動変換される
  if (taskData.createdAt !== undefined) firestoreData.created_at = taskData.createdAt;
  if (taskData.completedAt !== undefined) firestoreData.completed_at = taskData.completedAt;
  if (taskData.approvedAt !== undefined) firestoreData.approved_at = taskData.approvedAt;

  return firestoreData;
}

/**
 * ステータスに応じた背景色を取得
 * @param status - タスクのステータス
 * @returns 背景色のカラーコード
 */
export function getStatusColor(status: TaskData['status']): string {
  switch (status) {
    case 'pending':
      return '#fff3cd'; // 黄色（未着手）
    case 'completed':
      return '#d1ecf1'; // 青（承認待ち）
    case 'approved':
      return '#d4edda'; // 緑（承認済み）
    default:
      return '#f5f5f5';
  }
}

/**
 * ステータスのラベルを取得
 * @param status - タスクのステータス
 * @returns ステータスのラベル（日本語）
 */
export function getStatusLabel(status: TaskData['status']): string {
  switch (status) {
    case 'pending':
      return '未着手';
    case 'completed':
      return '承認待ち';
    case 'approved':
      return '承認済み';
    default:
      return status;
  }
}

/**
 * 日時を日本語形式でフォーマット
 * @param date - フォーマットする日時
 * @returns フォーマットされた日時文字列
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * 特定のユーザー（こども）の承認済み合計ポイントを計算
 * @param tasks - タスク一覧
 * @param userId - 集計したいユーザーのID
 * @returns 合計ポイント
 */
export function calculateTotalPoints(tasks: TaskData[], userId: string): number {
  return tasks
    .filter(task => task.status === 'approved' && task.assignedTo === userId)
    .reduce((sum, task) => sum + task.rewardPoints, 0);
}

// Made with Bob