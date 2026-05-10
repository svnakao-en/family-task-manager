"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import LoginForm from '@/components/LoginForm';
import { TaskList } from '@/components/TaskList'; 
import { TaskCard } from '@/components/TaskCard';

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

      <div>
        {/* ボブのTaskListPropsに100%準拠させた形 */}
        <TaskList 
          currentUser={user} 
          renderTask={(task) => (
            <TaskCard 
              key={task.taskId} // task.id ではなく task.taskId に修正！
              task={task} 
              currentUser={user} 
              onTaskUpdate={() => {}} // リアルタイム同期なので空でOK！
            />
          )} 
        />
      </div>

      <footer style={{ marginTop: '40px', fontSize: '12px', color: '#ccc' }}>
        Family Reward App - Powered by Bob's Iron Rules
      </footer>
    </main>
  );
}