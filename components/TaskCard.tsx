"use client";

import { useState } from 'react';
import { TaskData, UserData } from '@/types';
import { ApproveButton } from './ApproveButton';
import { CompleteButton } from './CompleteButton';
import { StartButton } from './StartButton';
import { RejectButton } from './RejectButton';
import { DeleteButton } from './DeleteButton';
import { EditTaskForm } from './EditTaskForm';
import { getStatusColor, getStatusLabel, formatDate } from '@/lib/taskUtils';

interface TaskCardProps {
  task: TaskData;
  currentUser: UserData;
  userNameMap: Map<string, string>;
  onTaskUpdate: () => void;
  onError?: (error: string) => void;
}

export function TaskCard({
  task,
  currentUser,
  userNameMap,
  onTaskUpdate,
  onError,
}: TaskCardProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);

  const handleEditSuccess = () => {
    setIsEditing(false);
    onTaskUpdate();
  };

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

      {/* 説明 */}
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
          <div>
            担当者: {task.assignedTo === currentUser.userId
              ? 'あなた'
              : (userNameMap.get(task.assignedTo) ?? task.assignedTo)}
          </div>
        )}
        {task.completedAt && (
          <div>完了日時: {formatDate(task.completedAt)}</div>
        )}
        {task.approvedAt && (
          <div>承認日時: {formatDate(task.approvedAt)}</div>
        )}
      </div>

      {/* インライン編集フォーム */}
      {isEditing && (
        <EditTaskForm
          task={task}
          currentUser={currentUser}
          onSuccess={handleEditSuccess}
          onCancel={() => setIsEditing(false)}
          onError={onError}
        />
      )}

      {/* アクションボタン */}
      {!isEditing && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* 子: はじめるボタン（pending のみ） */}
          <StartButton
            taskId={task.taskId}
            taskStatus={task.status}
            assignedTo={task.assignedTo}
            currentUser={currentUser}
            onSuccess={onTaskUpdate}
            onError={onError}
          />
          {/* 子: 完了ボタン（working のみ） */}
          <CompleteButton
            taskId={task.taskId}
            taskStatus={task.status}
            assignedTo={task.assignedTo}
            currentUser={currentUser}
            onSuccess={onTaskUpdate}
            onError={onError}
          />
          {/* 親: 承認ボタン（completed のみ） */}
          <ApproveButton
            taskId={task.taskId}
            taskStatus={task.status}
            rewardPoints={task.rewardPoints}
            assignedTo={task.assignedTo}
            currentUser={currentUser}
            onSuccess={onTaskUpdate}
            onError={onError}
          />
          {/* 親: 差し戻しボタン（completed または working） */}
          <RejectButton
            taskId={task.taskId}
            taskStatus={task.status}
            currentUser={currentUser}
            onSuccess={onTaskUpdate}
            onError={onError}
          />
          {/* 親: 編集ボタン（pending のみ） */}
          {currentUser.role === 'parent' && task.status === 'pending' && (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#FF9800',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: 'background-color 0.2s',
              }}
            >
              編集
            </button>
          )}
          {/* 親: 削除ボタン（pending のみ） */}
          <DeleteButton
            taskId={task.taskId}
            taskStatus={task.status}
            currentUser={currentUser}
            onSuccess={onTaskUpdate}
            onError={onError}
          />
        </div>
      )}
    </div>
  );
}

// Made with Bob
