"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import LoginForm from '@/components/LoginForm';
import { TaskList } from '@/components/TaskList'; 
import { TaskCard } from '@/components/TaskCard';
import { TaskForm } from '@/components/TaskForm';
import { TaskData } from '@/types';
import Link from 'next/link'; // 追加

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && (!user.role || user.role === 'unknown')) {
      router.push('/auth/role-selection');
    }
  }, [user, loading, router]);

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>読み込み中...</div>;
  if (!user) return <LoginForm />;

  return (
    <main style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif', color: '#333' }}>
      <header style={{ borderBottom: '2px solid #eee', paddingBottom: '20px', marginBottom: '20px' }}>

        {/* タイトルと履歴ボタンを横並びに */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <h1 style={{ fontSize: '24px', margin: 0 }}>
            {user.role === 'parent'
              ? '👨‍👩‍👧‍👦 パパ・ママ用管理画面'
              : user.role === 'child'
              ? '👦 こども用お手伝い画面'
              : ''}
          </h1>
          {/* 履歴ボタン */}
          <Link
            href="/history"
            style={{
              padding: '10px 15px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #ddd',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              textDecoration: 'none',
              color: '#333',
            }}
          >
            📋 履歴を見る
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <p style={{ color: '#666', margin: 0 }}>ログイン中: {user.email}</p>
          
          {user.role === 'child' && (
            <div style={{ 
              padding: '10px 20px', 
              backgroundColor: '#d4edda', 
              color: '#155724',
              borderRadius: '50px',
              border: '2px solid #c3e6cb',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              現在のポイント: <span style={{ fontSize: '20px' }}>{user.totalReward || 0}</span> pt
            </div>
          )}
        </div>
      </header>

      {user.role === 'parent' && (
        <section style={{ marginBottom: '30px' }}>
          <TaskForm currentUser={user} />
        </section>
      )}

      <section>
        <TaskList 
          currentUser={user}
          renderTask={(task: TaskData) => (
            <TaskCard 
              key={task.taskId} 
              task={task} 
              currentUser={user} 
              onTaskUpdate={() => {}} 
            />
          )} 
        />
      </section>

      <footer style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #eee', fontSize: '12px', color: '#ccc', textAlign: 'center' }}>
        Family Reward App — Refined by Claude & Bob
      </footer>
    </main>
  );
}