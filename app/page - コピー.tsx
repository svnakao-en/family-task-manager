"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import LoginForm from '@/components/LoginForm';
import { TaskList } from '@/components/TaskList'; 
import { TaskCard } from '@/components/TaskCard';
import { TaskForm } from '@/components/TaskForm';
import { calculateTotalPoints } from '@/lib/taskUtils'; // ボブの計算エンジン
import { TaskData } from '@/types'; 

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // ポイント管理用のステート
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    if (!loading && user && (!user.role || user.role === 'unknown')) {
      router.push('/auth/role-selection');
    }
  }, [user, loading, router]);

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>読み込み中...</div>;
  if (!user) return <LoginForm />;

  return (
    <main style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif', color: '#333' }}>
      {/* ヘッダーセクション */}
      <header style={{ borderBottom: '2px solid #eee', paddingBottom: '20px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>
          {user.role === 'parent' ? '👨‍👩‍👧‍👦 パパ・ママ用管理画面' : '👦 こども用お手伝い画面'}
        </h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <p style={{ color: '#666', margin: 0 }}>ログイン中: {user.email}</p>
          
          {/* ポイント表示（こどもの時だけキラキラさせる） */}
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
              現在のポイント: <span style={{ fontSize: '20px' }}>{totalPoints}</span> pt
            </div>
          )}
        </div>
      </header>

      {/* 投稿フォーム（親のみ） */}
      {user.role === 'parent' && (
        <section style={{ marginBottom: '30px' }}>
          <TaskForm currentUser={user} />
        </section>
      )}

      {/* タスク一覧セクション */}
      <section>
        <TaskList 
          currentUser={user} 
          // TaskListがデータを取ってきたら、この中でポイントを計算する
          onTasksLoaded={(tasks) => {
            if (user.role === 'child') {
              const points = calculateTotalPoints(tasks, user.userId);
              setTotalPoints(points);
            }
          }}

          renderTask={(task: TaskData) => (
            <TaskCard 
              key={task.taskId} 
              task={task} 
              currentUser={user} 
              onTaskUpdate={() => {
                // TaskList側でリアルタイム更新されるため、ここでは何もしなくてOK
              }} 
            />
          )} 
        />
      </section>

      <footer style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #eee', fontSize: '12px', color: '#ccc', textAlign: 'center' }}>
        Family Reward App — Building with Bob & Director
      </footer>
    </main>
  );
}