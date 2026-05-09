"use client";

import { useState } from 'react';
import { completeTask } from '@/lib/taskActions';
import { UserData } from '@/types';

/**
 * CompleteButton コンポーネントのProps
 */
interface CompleteButtonProps {
  taskId: string;
  taskStatus: string;
  assignedTo?: string;
  currentUser: UserData;
  onSuccess: () => void; // 成功時のコールバック（一覧再取得など）
  onError?: (error: string) => void; // エラー時のコールバック（トースト表示など）
}

/**
 * タスク完了ボタンコンポーネント（子供用）
 *
 * ApproveButton との対称性:
 * - ApproveButton: 親が completed → approved に変更
 * - CompleteButton: 子が pending → completed に変更
 * - 両方とも「サーバーの状態を正解とする」設計
 * - 両方とも「理由を明示する」UX
 *
 * 設計思想（マネージャー最終修正命令の厳守）:
 * 1. ローカルステートの越権行為を是正（taskStatus を正解とする）
 * 2. 「消えるボタン」から「説明するUI」へ（理由を明示）
 * 3. 非同期処理の鉄壁のfinally（必ずsetIsLoading(false)）
 */
export function CompleteButton({
  taskId,
  taskStatus,
  assignedTo,
  currentUser,
  onSuccess,
  onError,
}: CompleteButtonProps): JSX.Element | null {
  const [isLoading, setIsLoading] = useState(false);

  // ガード1: 子供以外にボタンを見せない（憲法）
  if (currentUser.role !== 'child') {
    return null;
  }

  // UIは常にDBの影（Shadow）であるべき
  // ローカルステートではなく、taskStatus（サーバーから降ってきた状態）を正解とする
  const isPending = taskStatus === 'pending';
  const isCompleted = taskStatus === 'completed';
  const isApproved = taskStatus === 'approved';

  // 「消えるボタン」から「説明するUI」へ
  // 担当者が設定されていて、自分ではない場合は理由を明示
  if (assignedTo && assignedTo !== currentUser.userId) {
    return (
      <button
        disabled
        aria-label="他の人に割り当てられているため完了報告できません"
        style={{
          padding: '8px 16px',
          backgroundColor: '#e0e0e0',
          color: '#757575',
          border: 'none',
          borderRadius: '4px',
          cursor: 'not-allowed',
          fontSize: '14px',
          fontWeight: 'bold',
        }}
      >
        担当外です
      </button>
    );
  }

  // 既に完了報告済みの場合は状態を明示
  if (isCompleted) {
    return (
      <button
        disabled
        aria-label="完了報告済み（親の承認待ち）"
        style={{
          padding: '8px 16px',
          backgroundColor: '#e0e0e0',
          color: '#757575',
          border: 'none',
          borderRadius: '4px',
          cursor: 'not-allowed',
          fontSize: '14px',
          fontWeight: 'bold',
        }}
      >
        承認待ち
      </button>
    );
  }

  // 既に承認済みの場合は状態を明示
  if (isApproved) {
    return (
      <button
        disabled
        aria-label="承認済み"
        style={{
          padding: '8px 16px',
          backgroundColor: '#e0e0e0',
          color: '#757575',
          border: 'none',
          borderRadius: '4px',
          cursor: 'not-allowed',
          fontSize: '14px',
          fontWeight: 'bold',
        }}
      >
        承認済み
      </button>
    );
  }

  // 完了報告可能な状態でない場合は非表示
  if (!isPending) {
    return null;
  }

  /**
   * 完了ボタンクリック時の処理
   */
  const handleComplete = async () => {
    // 連打防止: 処理中は何もしない
    if (isLoading) return;

    setIsLoading(true);

    try {
      // completeTask を呼び出し（4つのガードが実行される）
      await completeTask(taskId, currentUser);

      // 成功時のコールバック（親コンポーネントに通知）
      // 親コンポーネントで一覧を再取得することで、taskStatus が 'completed' に更新される
      onSuccess();
    } catch (error) {
      // 失敗時: エラーメッセージをそのまま表示（具体的かつ親切）
      const errorMessage = error instanceof Error ? error.message : 'タスクの完了報告に失敗しました';
      
      if (onError) {
        onError(errorMessage);
      } else {
        // フォールバック: alertで表示
        alert(errorMessage);
      }
    } finally {
      // 鉄壁のfinally
      // 成功・失敗に関わらず、必ずisLoadingをfalseに戻す
      // これにより、ボタンが永久にフリーズすることを防ぐ
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
        backgroundColor: isLoading ? '#ccc' : '#2196F3',
        color: 'white',
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