"use client";

import { useState } from 'react';
import { approveTask } from '@/lib/taskActions';
import { UserData } from '@/types';

/**
 * ApproveButton コンポーネントのProps
 */
interface ApproveButtonProps {
  taskId: string;
  taskStatus: string;
  rewardPoints: number;
  assignedTo?: string;
  currentUser: UserData;
  onSuccess: () => void; // 成功時のコールバック（一覧再取得など）
  onError?: (error: string) => void; // エラー時のコールバック（トースト表示など）
}

/**
 * タスク承認ボタンコンポーネント（最終版）
 *
 * マネージャー最終修正命令の厳守事項:
 * 1. ローカルステートの越権行為を是正（taskStatus === 'approved' を正解とする）
 * 2. 「消えるボタン」から「説明するUI」へ（理由を明示）
 * 3. 非同期処理の鉄壁のfinally（必ずsetIsLoading(false)）
 */
export function ApproveButton({
  taskId,
  taskStatus,
  rewardPoints,
  assignedTo,
  currentUser,
  onSuccess,
  onError,
}: ApproveButtonProps): JSX.Element | null {
  const [isLoading, setIsLoading] = useState(false);

  // ガード1: 親以外にボタンを見せない（憲法）
  if (currentUser.role !== 'parent') {
    return null;
  }

  // 修正①: UIは常にDBの影（Shadow）であるべき
  // ローカルステートではなく、taskStatus（サーバーから降ってきた状態）を正解とする
  const isApproved = taskStatus === 'approved';
  const isCompleted = taskStatus === 'completed';

  // 修正②: 「消えるボタン」から「説明するUI」へ
  // 担当者が未設定の場合は、ボタンを消すのではなく理由を明示
  if (!assignedTo) {
    return (
      <button
        disabled
        aria-label="担当者が未設定のため承認できません"
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
        担当者が未設定です
      </button>
    );
  }

  // 既に承認済みの場合は、ボタンを消すのではなく状態を明示
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

  // 承認可能な状態でない場合は非表示
  if (!isCompleted) {
    return null;
  }

  /**
   * 承認ボタンクリック時の処理
   */
  const handleApprove = async () => {
    // 連打防止: 処理中は何もしない
    if (isLoading) return;

    setIsLoading(true);

    try {
      // approveTask を呼び出し（5つのガードが実行される）
      await approveTask(taskId, currentUser);

      // 成功時のコールバック（親コンポーネントに通知）
      // 親コンポーネントで一覧を再取得することで、taskStatus が 'approved' に更新される
      onSuccess();
    } catch (error) {
      // 失敗時: エラーメッセージをそのまま表示（具体的かつ親切）
      const errorMessage = error instanceof Error ? error.message : 'タスクの承認に失敗しました';
      
      if (onError) {
        onError(errorMessage);
      } else {
        // フォールバック: alertで表示
        alert(errorMessage);
      }
    } finally {
      // 修正③: 鉄壁のfinally
      // 成功・失敗に関わらず、必ずisLoadingをfalseに戻す
      // これにより、ボタンが永久にフリーズすることを防ぐ
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleApprove}
      disabled={isLoading}
      aria-label={`タスクを承認して${rewardPoints}ポイントを付与`}
      style={{
        padding: '8px 16px',
        backgroundColor: isLoading ? '#ccc' : '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        fontWeight: 'bold',
        transition: 'background-color 0.2s',
      }}
    >
      {isLoading ? '承認中...' : `承認する（${rewardPoints}pt）`}
    </button>
  );
}

// Made with Bob