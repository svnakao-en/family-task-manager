"use client";

import { useState } from 'react';
import { deleteTask } from '@/lib/taskActions';
import { UserData } from '@/types';

interface DeleteButtonProps {
  taskId: string;
  taskStatus: string;
  currentUser: UserData;
  onSuccess: () => void;
  onError?: (error: string) => void;
}

export function DeleteButton({
  taskId,
  taskStatus,
  currentUser,
  onSuccess,
  onError,
}: DeleteButtonProps): JSX.Element | null {
  const [isLoading, setIsLoading] = useState(false);

  // 親のみ表示
  if (currentUser.role !== 'parent') return null;

  // pending のみ表示
  if (taskStatus !== 'pending') return null;

  const handleDelete = async () => {
    if (isLoading) return;
    if (!window.confirm('このタスクを削除しますか？\nこの操作は取り消せません。')) return;
    setIsLoading(true);
    try {
      await deleteTask(taskId, currentUser);
      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : '削除に失敗しました';
      onError ? onError(message) : alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isLoading}
      aria-label="タスクを削除する"
      style={{
        padding: '8px 16px',
        backgroundColor: isLoading ? '#ccc' : '#9E9E9E',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        fontWeight: 'bold',
        transition: 'background-color 0.2s',
      }}
    >
      {isLoading ? '削除中...' : '削除'}
    </button>
  );
}
