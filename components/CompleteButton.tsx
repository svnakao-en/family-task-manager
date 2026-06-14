"use client";

import { useState } from 'react';
import { completeTask } from '@/lib/taskActions';
import { UserData } from '@/types';
import { useWorldTheme } from '@/hooks/useWorldTheme';

interface CompleteButtonProps {
  taskId: string;
  taskStatus: string;
  assignedTo?: string;
  currentUser: UserData;
  onSuccess: () => void;
  onError?: (error: string) => void;
}

export function CompleteButton({
  taskId,
  taskStatus,
  assignedTo,
  currentUser,
  onSuccess,
  onError,
}: CompleteButtonProps): JSX.Element | null {
  const { colors } = useWorldTheme();
  const [isLoading, setIsLoading] = useState(false);

  // 子供以外には表示しない
  if (currentUser.role !== 'child') return null;

  const isWorking   = taskStatus === 'working';
  const isCompleted = taskStatus === 'completed';
  const isApproved  = taskStatus === 'approved';

  const disabledStyle: React.CSSProperties = {
    padding: '8px 16px',
    backgroundColor: colors.btnDisabledBg,
    color: colors.btnDisabledText,
    border: 'none',
    borderRadius: '4px',
    cursor: 'not-allowed',
    fontSize: '14px',
    fontWeight: 'bold',
  };

  // 担当者が自分でない場合は理由を明示
  if (assignedTo && assignedTo !== currentUser.userId) {
    return (
      <button disabled aria-label="他の人に割り当てられているため完了報告できません" style={disabledStyle}>
        担当外です
      </button>
    );
  }

  // pending（はじめる前）は完了ボタンを表示しない
  if (taskStatus === 'pending') return null;

  // 完了報告済み
  if (isCompleted) {
    return (
      <button disabled aria-label="完了報告済み（親の承認待ち）" style={disabledStyle}>
        承認待ち
      </button>
    );
  }

  // 承認済み
  if (isApproved) {
    return (
      <button disabled aria-label="承認済み" style={disabledStyle}>
        承認済み
      </button>
    );
  }

  // working 以外は非表示
  if (!isWorking) return null;

  const handleComplete = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await completeTask(taskId, currentUser);
      onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'タスクの完了報告に失敗しました';
      onError ? onError(errorMessage) : alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleComplete}
      disabled={isLoading}
      aria-label="タスクを完了報告する"
      style={{
        padding: '8px 16px',
        backgroundColor: isLoading ? colors.btnDisabledBg : colors.btnSuccessBg,
        color: isLoading ? colors.btnDisabledText : colors.btnSuccessText,
        border: 'none',
        borderRadius: '4px',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        fontWeight: 'bold',
        transition: 'background-color 0.2s',
      }}
    >
      {isLoading ? '報告中...' : '完了報告'}
    </button>
  );
}

// Made with Bob
