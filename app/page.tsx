"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import LoginForm from '@/components/LoginForm';
import { TaskList } from '@/components/TaskList';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 役割が決まっていない場合は役割選択へ誘導
    if (!loading && user && (!user.role || user.role === 'unknown')) {
      router.push('/auth/role-selection');
    }
  }, [user, loading, router]);

  if (loading) return <div style={{ padding: '50px' }}>読み込み中...</div>;
  if (!user) return <LoginForm />;

  return (
    <main style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      {/* 簡易ヘッダー */}
      <header style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px' }}>
          {user.role === 'parent' ? '👨‍👩‍👧‍👦 パパ・ママ用管理画面' : '👦 こども用お手伝い画面'}
        </h1>
        <p style={{ color: '#666' }}>ログイン中: {user.email}</p>
      </header>

      {/* メインコンテンツ：タスク一覧 */}
      <div>
        <h2 style={{ fontSize: '20px', marginBottom: '15px' }}>お手伝いミッション</h2>
        <TaskList user={user} />
      </div>

      <footer style={{ marginTop: '40px', fontSize: '12px', color: '#ccc' }}>
        Family Reward App - Managed by Director
      </footer>
    </main>
  );
}