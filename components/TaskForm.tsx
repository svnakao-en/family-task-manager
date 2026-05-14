"use client";

import { useState, useEffect, useRef, FormEvent } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserData } from '@/types';
import { taskDataToFirestore } from '@/lib/taskUtils';

export interface InitialTaskData {
  title: string;
  description?: string;
  rewardPoints: number;
  assignedTo?: string;
}

interface TaskFormProps {
  currentUser: UserData;
  initialData?: InitialTaskData;
  onInitialDataUsed?: () => void;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface ChildOption {
  userId: string;
  name: string;
}

export function TaskForm({
  currentUser,
  initialData,
  onInitialDataUsed,
  onSuccess,
  onError,
}: TaskFormProps): JSX.Element | null {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rewardPoints, setRewardPoints] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // initialData が渡されたらフォームに注入してスクロール
  useEffect(() => {
    if (!initialData) return;
    setTitle(initialData.title);
    setDescription(initialData.description ?? '');
    setRewardPoints(String(initialData.rewardPoints));
    setAssignedTo(initialData.assignedTo ?? '');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onInitialDataUsed?.();
  }, [initialData]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!currentUser.familyId) return;

    const fetchChildren = async () => {
      try {
        const membersSnap = await getDocs(
          query(
            collection(db, 'family_members'),
            where('family_id', '==', currentUser.familyId),
            where('role', '==', 'child')
          )
        );
        const userIds = membersSnap.docs.map((doc) => doc.data().user_id as string);
        if (userIds.length === 0) return;

        const usersSnap = await getDocs(
          query(collection(db, 'users'), where('__name__', 'in', userIds))
        );
        const childOptions: ChildOption[] = usersSnap.docs.map((doc) => ({
          userId: doc.id,
          name: doc.data().name as string,
        }));
        setChildren(childOptions);
      } catch (err) {
        console.error('子供一覧取得エラー:', err);
      }
    };

    fetchChildren();
  }, [currentUser.familyId]);

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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!title.trim()) {
      const errorMessage = 'タスク名を入力してください';
      onError ? onError(errorMessage) : alert(errorMessage);
      return;
    }

    const points = parseInt(rewardPoints, 10);
    if (isNaN(points) || points < 1) {
      const errorMessage = '報酬ポイントは1以上の整数を入力してください';
      onError ? onError(errorMessage) : alert(errorMessage);
      return;
    }

    setIsLoading(true);

    try {
      const taskData = {
        familyId: currentUser.familyId,
        title: title.trim(),
        description: description.trim() || undefined,
        rewardPoints: points,
        status: 'pending' as const,
        createdBy: currentUser.userId,
        createdAt: new Date(),
        ...(assignedTo ? { assignedTo } : {}),
      };

      const firestoreData = taskDataToFirestore(taskData);

      await addDoc(collection(db, 'tasks'), {
        ...firestoreData,
        created_at: serverTimestamp(),
      });

      setTitle('');
      setDescription('');
      setRewardPoints('');
      setAssignedTo('');

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('タスク投稿エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'タスクの投稿に失敗しました';
      onError ? onError(errorMessage) : alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} style={{ padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
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

      {/* 担当者指名（任意・子供が存在する場合のみ表示） */}
      {children.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="task-assignee" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
            担当者（任意）
          </label>
          <select
            id="task-assignee"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '14px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxSizing: 'border-box',
              backgroundColor: 'white',
            }}
          >
            <option value="">指名なし（先着順）</option>
            {children.map((child) => (
              <option key={child.userId} value={child.userId}>
                {child.name}
              </option>
            ))}
          </select>
        </div>
      )}

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
