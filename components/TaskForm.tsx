"use client";

import { useState, FormEvent } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserData } from '@/types';
import { taskDataToFirestore } from '@/lib/taskUtils';

/**
 * TaskForm コンポーネントのProps
 */
interface TaskFormProps {
  currentUser: UserData;
  onSuccess?: () => void; // 成功時のコールバック
  onError?: (error: string) => void; // エラー時のコールバック
}

/**
 * タスク投稿フォームコンポーネント（親専用）
 *
 * 鉄則:
 * 1. バリデーション: rewardPoints は必ず1以上の整数
 * 2. マッピング: taskDataToFirestore を経由し、snake_case でDBへ
 * 3. フィールド: familyId, createdBy, status: 'pending', createdAt: serverTimestamp() を確実にセット
 */
export function TaskForm({
  currentUser,
  onSuccess,
  onError,
}: TaskFormProps): JSX.Element | null {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rewardPoints, setRewardPoints] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ガード: 親以外には表示しない
  if (currentUser.role !== 'parent') {
    return null;
  }

  // ガード: familyId が存在しない場合は表示しない
  if (!currentUser.familyId) {
    return (
      <div style={{ padding: '16px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
        <p style={{ margin: 0, color: '#856404' }}>
          家族IDが設定されていません。役割選択画面から家族を作成してください。
        </p>
      </div>
    );
  }

  /**
   * フォーム送信処理
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // バリデーション1: タイトルが空でないこと
    if (!title.trim()) {
      const errorMessage = 'タスク名を入力してください';
      if (onError) {
        onError(errorMessage);
      } else {
        alert(errorMessage);
      }
      return;
    }

    // バリデーション2: 報酬ポイントが1以上の整数であること
    const points = parseInt(rewardPoints, 10);
    if (isNaN(points) || points < 1) {
      const errorMessage = '報酬ポイントは1以上の整数を入力してください';
      if (onError) {
        onError(errorMessage);
      } else {
        alert(errorMessage);
      }
      return;
    }

    setIsLoading(true);

    try {
      // タスクデータの準備（camelCase）
      const taskData = {
        familyId: currentUser.familyId,
        title: title.trim(),
        description: description.trim() || undefined,
        rewardPoints: points,
        status: 'pending' as const,
        createdBy: currentUser.userId,
        createdAt: new Date(), // serverTimestamp の代わりに一時的に Date を使用
      };

      // マッピング: taskDataToFirestore で snake_case に変換
      const firestoreData = taskDataToFirestore(taskData);

      // Firestore に追加（serverTimestamp を直接指定）
      await addDoc(collection(db, 'tasks'), {
        ...firestoreData,
        created_at: serverTimestamp(), // serverTimestamp で上書き
      });

      // 成功時: フォームをリセット
      setTitle('');
      setDescription('');
      setRewardPoints('');

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('タスク投稿エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'タスクの投稿に失敗しました';
      
      if (onError) {
        onError(errorMessage);
      } else {
        alert(errorMessage);
      }
    } finally {
      // 鉄壁の finally: 必ず isLoading をリセット
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
      <h2 style={{ marginTop: 0, marginBottom: '16px', fontSize: '20px', fontWeight: 'bold' }}>
        新しいタスクを投稿
      </h2>

      {/* タスク名 */}
      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="task-title" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          タスク名 <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          id="task-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例: 部屋の掃除"
          disabled={isLoading}
          required
          style={{
            width: '100%',
            padding: '8px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* 説明（オプショナル） */}
      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="task-description" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          説明（任意）
        </label>
        <textarea
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="例: リビングと自分の部屋を掃除してください"
          disabled={isLoading}
          rows={3}
          style={{
            width: '100%',
            padding: '8px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxSizing: 'border-box',
            resize: 'vertical',
          }}
        />
      </div>

      {/* 報酬ポイント */}
      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="task-reward" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          報酬ポイント <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          id="task-reward"
          type="number"
          value={rewardPoints}
          onChange={(e) => setRewardPoints(e.target.value)}
          placeholder="1以上の整数"
          disabled={isLoading}
          min="1"
          step="1"
          required
          style={{
            width: '100%',
            padding: '8px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={isLoading}
        style={{
          width: '100%',
          padding: '12px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white',
          backgroundColor: isLoading ? '#ccc' : '#4CAF50',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s',
        }}
      >
        {isLoading ? '投稿中...' : 'タスクを投稿'}
      </button>
    </form>
  );
}

// Made with Bob