"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { TaskForm, InitialTaskData } from '@/components/TaskForm';
import { TaskList } from '@/components/TaskList';
import { TaskCard } from '@/components/TaskCard';
import { useToast, Toast } from '@/components/Toast';
import { TaskData } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function TaskPage() {
  const { user, loading } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const [userNameMap, setUserNameMap] = useState<Map<string, string>>(new Map());
  const [initialTaskData, setInitialTaskData] = useState<InitialTaskData | undefined>();

  useEffect(() => {
    if (loading || !user || !user.familyId) return;

    const fetchUserNames = async () => {
      try {
        if (user.role === 'parent') {
          const membersSnapshot = await getDocs(
            query(collection(db, 'family_members'), where('family_id', '==', user.familyId))
          );
          const userIds = membersSnapshot.docs.map((doc) => doc.data().user_id as string);
          if (userIds.length === 0) return;

          const usersSnapshot = await getDocs(
            query(collection(db, 'users'), where('__name__', 'in', userIds))
          );

          const nameMap = new Map<string, string>();
          usersSnapshot.docs.forEach((doc) => {
            nameMap.set(doc.id, doc.data().name as string);
          });
          setUserNameMap(nameMap);
        } else {
          const nameMap = new Map<string, string>();
          nameMap.set(user.userId, user.name);
          setUserNameMap(nameMap);
        }
      } catch (err) {
        console.error('ユーザー名取得エラー:', err);
      }
    };

    fetchUserNames();
  }, [user, loading]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        読み込み中...
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        ログインしてください
      </div>
    );
  }

  const handleTaskUpdate = () => {
    showToast('更新しました', 'success');
  };

  const handleError = (error: string) => {
    showToast(error, 'error');
  };

  const handleCopy = (task: TaskData) => {
    setInitialTaskData({
      title: task.title,
      description: task.description,
      rewardPoints: task.rewardPoints,
      assignedTo: task.assignedTo,
    });
  };

  const renderTask = (task: TaskData) => (
    <TaskCard
      key={task.taskId}
      task={task}
      currentUser={user}
      userNameMap={userNameMap}
      onTaskUpdate={handleTaskUpdate}
      onCopy={handleCopy}
      onError={handleError}
    />
  );

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '24px',
      backgroundColor: '#f9f9f9',
      minHeight: '100vh'
    }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{
          margin: '0 0 8px 0',
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#333'
        }}>
          タスク管理
        </h1>
        <p style={{
          margin: 0,
          fontSize: '16px',
          color: '#666'
        }}>
          {user.role === 'parent' ? '子供にタスクを投稿しましょう' : 'タスクを完了して報酬を獲得しましょう'}
        </p>
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          border: '1px solid #ddd'
        }}>
          <div style={{ fontSize: '14px', color: '#666' }}>
            ようこそ、<strong>{user.name}</strong> さん
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
            役割: <strong>{user.role === 'parent' ? '親' : '子供'}</strong> |
            総報酬: <strong style={{ color: '#4CAF50' }}>{user.totalReward} ポイント</strong>
          </div>
        </div>
      </header>

      {user.role === 'parent' && (
        <section style={{ marginBottom: '32px' }}>
          <TaskForm
            currentUser={user}
            initialData={initialTaskData}
            onInitialDataUsed={() => setInitialTaskData(undefined)}
            onSuccess={() => showToast('タスクを投稿しました', 'success')}
            onError={handleError}
          />
        </section>
      )}

      <section>
        <TaskList
          currentUser={user}
          onError={handleError}
          renderTask={renderTask}
        />
      </section>

      <ToastContainer />
    </div>
  );
}

// Made with Bob
// 「家族の経済圏」を支えるインフラ
// お父さんとお母さんの「ありがとう」と、子供たちの「頑張ったよ」をリアルタイムで繋ぐ
