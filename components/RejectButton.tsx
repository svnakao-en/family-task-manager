"use client";

import { useState } from 'react';
import { rejectTask } from '@/lib/taskActions';
import { UserData } from '@/types';

interface RejectButtonProps {
  taskId: string;
  taskStatus: string;
  currentUser: UserData;
  onSuccess: () => void;
  onError?: (error: string) => void;
}

export function RejectButton({
  taskId,
  taskStatus,
  currentUser,
  onSuccess,
  onError,
}: RejectButtonProps): JSX.Element | null {
  const [isLoading, setIsLoading] = useState(false);

  // 親のみ表示
  if (currentUser.role !== 'parent') return null;

  // completed または working のみ表示
  if (taskStatus !== 'completed' && taskStatus !== 'working') return null;

  const handleReject = async () => {
    if (isLoading) return;
    if (!window.confirm('このタスクを差し戻しますか？\n子供の進捗がリセットされます。')) return;
    setIsLoading(true);
    try {
      await rejectTask(taskId, currentUser);
      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : '差し戻しに失敗しました';
      onError ? onError(message) : alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleReject}
      disabled={isLoading}
      aria-label="タスクを差し戻す"
      style={{
        padding: '8px 16px',
        backgroundColor: isLoading ? '#ccc' : '#FF5722',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        fontWeight: 'bold',
        transition: 'background-color 0.2s',
      }}
    >
      {isLoading ? '差し戻し中...' : '差し戻す'}
    </button>
  );
}