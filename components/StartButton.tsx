"use client";

import { useState } from 'react';
import { startTask } from '@/lib/taskActions';
import { UserData } from '@/types';
import { useWorldTheme } from '@/hooks/useWorldTheme';

interface StartButtonProps {
  taskId: string;
  taskStatus: string;
  assignedTo?: string;
  currentUser: UserData;
  onSuccess: () => void;
  onError?: (error: string) => void;
}

export function StartButton({
  taskId,
  taskStatus,
  assignedTo,
  currentUser,
  onSuccess,
  onError,
}: StartButtonProps): JSX.Element | null {
  const { colors } = useWorldTheme();
  const [isLoading, setIsLoading] = useState(false);

  // 子供のみ表示
  if (currentUser.role !== 'child') return null;

  // pending のみ表示
  if (taskStatus !== 'pending') return null;

  // 担当者が設定済みで自分でない場合は非表示
  if (assignedTo && assignedTo !== currentUser.userId) return null;

  const handleStart = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await startTask(taskId, currentUser);
      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'タスクの開始に失敗しました';
      onError ? onError(message) : alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleStart}
      disabled={isLoading}
      aria-label="タスクを開始する"
      style={{
        padding: '8px 16px',
        backgroundColor: isLoading ? colors.btnDisabledBg : colors.btnPrimaryBg,
        color: isLoading ? colors.btnDisabledText : colors.btnPrimaryText,
        border: 'none',
        borderRadius: '4px',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        fontWeight: 'bold',
        transition: 'background-color 0.2s',
      }}
    >
      {isLoading ? '開始中...' : 'はじめる'}
    </button>
  );
}
