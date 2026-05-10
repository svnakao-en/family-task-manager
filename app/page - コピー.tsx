"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import LoginForm from '@/components/LoginForm';
import { TaskList } from '@/components/TaskList'; 
import { TaskCard } from '@/components/TaskCard';
import { TaskForm } from '@/components/TaskForm'; // ボブの指定通り名前付きインポート

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && (!user.role || user.role === 'unknown')) {
      router.push('/auth/role-selection');
    }
  }, [user, loading, router]);

  if (loading) return <div style={{ padding: '50px' }}>読み込み中...</div>;
  if (!user) return <LoginForm />;

  return (
    <main style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px' }}>
          {user.role === 'parent' ? '👨‍👩‍👧‍👦 パパ・ママ用管理画面' : '👦 こども用お手伝い画面'}
        </h1>
        <p style={{ color: '#666' }}>ログイン中: {user.email}</p>
      </header>

      {/* 1. タスク投稿フォーム（親だけに見える） */}
      {user.role === 'parent' && (
        <section style={{ marginBottom: '30px' }}>
          <TaskForm currentUser={user} />
        </section>
      )}

      {/* 2. タスク一覧（リアルタイム同期） */}
      <section>
        <TaskList 
          currentUser={user} 
          renderTask={(task: any) => (
            <TaskCard 
              key={task.taskId} 
              task={task} 
              currentUser={user} 
              onTaskUpdate={() => {}} 
            />
          )} 
        />
      </section>

      <footer style={{ marginTop: '40px', fontSize: '12px', color: '#ccc', textAlign: 'center' }}>
        Family Reward App - Approved by Director & Bob
      </footer>
    </main>
  );
}