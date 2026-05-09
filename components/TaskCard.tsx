"use client";

import { TaskData, UserData } from '@/types';
import { ApproveButton } from './ApproveButton';
import { CompleteButton } from './CompleteButton';
import { getStatusColor, getStatusLabel, formatDate } from '@/lib/taskUtils';

/**
 * TaskCard コンポーネントのProps
 */
interface TaskCardProps {
  task: TaskData;
  currentUser: UserData;
  onTaskUpdate: () => void; // タスク更新時のコールバック（一覧再取得など）
  onError?: (error: string) => void; // エラー時のコールバック
}

/**
 * タスクカードコンポーネント
 *
 * ボタンの統合:
 * - 親なら: status === 'completed' の時に ApproveButton
 * - 子なら: status === 'pending' かつ担当者の時に CompleteButton
 *
 * UIロジックの共通化:
 * - getStatusColor, getStatusLabel, formatDate は taskUtils.ts から import
 */
export function TaskCard({
  task,
  currentUser,
  onTaskUpdate,
  onError,
}: TaskCardProps): JSX.Element {

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: getStatusColor(task.status),
        borderRadius: '8px',
        border: '1px solid #ddd',
      }}
    >
      {/* ヘッダー: タイトルとステータス */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
          {task.title}
        </h3>
        <span
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            fontWeight: 'bold',
            borderRadius: '4px',
            backgroundColor: 'white',
            border: '1px solid #ccc',
          }}
        >
          {getStatusLabel(task.status)}
        </span>
      </div>

      {/* 説明（存在する場合） */}
      {task.description && (
        <p style={{ margin: '8px 0', fontSize: '14px', color: '#555' }}>
          {task.description}
        </p>
      )}

      {/* メタ情報 */}
      <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
        <div>報酬: {task.rewardPoints} ポイント</div>
        <div>作成日時: {formatDate(task.createdAt)}</div>
        {task.assignedTo && (
          <div>担当者: {task.assignedTo === currentUser.userId ? 'あなた' : task.assignedTo}</div>
        )}
        {task.completedAt && (
          <div>完了日時: {formatDate(task.completedAt)}</div>
        )}
        {task.approvedAt && (
          <div>承認日時: {formatDate(task.approvedAt)}</div>
        )}
      </div>

      {/* アクションボタン */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {/* 親: 承認ボタン（status === 'completed' の時のみ） */}
        <ApproveButton
          taskId={task.taskId}
          taskStatus={task.status}
          rewardPoints={task.rewardPoints}
          assignedTo={task.assignedTo}
          currentUser={currentUser}
          onSuccess={onTaskUpdate}
          onError={onError}
        />

        {/* 子: 完了ボタン（status === 'pending' かつ担当者の時のみ） */}
        <CompleteButton
          taskId={task.taskId}
          taskStatus={task.status}
          assignedTo={task.assignedTo}
          currentUser={currentUser}
          onSuccess={onTaskUpdate}
          onError={onError}
        />
      </div>
    </div>
  );
}

// Made with Bob