"use client";

import { useState, useEffect, FormEvent } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { editTask } from '@/lib/taskActions';
import { TaskData, UserData } from '@/types';

interface EditTaskFormProps {
  task: TaskData;
  currentUser: UserData;
  onSuccess: () => void;
  onCancel: () => void;
  onError?: (error: string) => void;
}

interface ChildOption {
  userId: string;
  name: string;
}

export function EditTaskForm({
  task,
  currentUser,
  onSuccess,
  onCancel,
  onError,
}: EditTaskFormProps): JSX.Element {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [rewardPoints, setRewardPoints] = useState(String(task.rewardPoints));
  const [assignedTo, setAssignedTo] = useState(task.assignedTo ?? '');
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
        setChildren(usersSnap.docs.map((doc) => ({
          userId: doc.id,
          name: doc.data().name as string,
        })));
      } catch (err) {
        console.error('子供一覧取得エラー:', err);
      }
    };

    fetchChildren();
  }, [currentUser.familyId]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const points = parseInt(rewardPoints, 10);
    if (isNaN(points) || points < 1) {
      const msg = '報酬ポイントは1以上の整数を入力してください';
      onError ? onError(msg) : alert(msg);
      return;
    }

    setIsLoading(true);
    try {
      await editTask(task.taskId, currentUser, {
        title,
        description: description || undefined,
        rewardPoints: points,
        assignedTo: assignedTo || undefined,
      });
      onSuccess();
    } catch (error) {
      const msg = error instanceof Error ? error.message : '編集に失敗しました';
      onError ? onError(msg) : alert(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        marginTop: '12px',
        padding: '12px',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        borderRadius: '6px',
      }}
    >
      {/* タスク名 */}
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 'bold' }}>
          タスク名 <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isLoading}
          required
          style={{
            width: '100%',
            padding: '6px 8px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* 説明 */}
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 'bold' }}>
          説明（任意）
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isLoading}
          rows={2}
          style={{
            width: '100%',
            padding: '6px 8px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxSizing: 'border-box',
            resize: 'vertical',
          }}
        />
      </div>

      {/* 報酬ポイント */}
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 'bold' }}>
          報酬ポイント <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          type="number"
          value={rewardPoints}
          onChange={(e) => setRewardPoints(e.target.value)}
          disabled={isLoading}
          min="1"
          step="1"
          required
          style={{
            width: '100%',
            padding: '6px 8px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* 担当者（任意） */}
      {children.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 'bold' }}>
            担当者（任意）
          </label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '6px 8px',
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

      {/* ボタン */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: isLoading ? '#ccc' : '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          {isLoading ? '保存中...' : '保存'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#fff',
            color: '#555',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
          }}
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
