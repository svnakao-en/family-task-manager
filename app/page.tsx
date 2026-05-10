"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import LoginForm from '@/components/LoginForm';
// ボブが作ったメインのコンポーネントたち（名前が違う場合は適宜調整します）
import TaskList from '@/components/TaskList'; 
import FamilyHeader from '@/components/FamilyHeader';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // ログイン済みだが役割がまだの場合は、役割選択へ飛ばす
    if (!loading && user && (!user.role || user.role === 'unknown')) {
      router.push('/auth/role-selection');
    }
  }, [user, loading, router]);

  if (loading) return <div style={{ padding: '50px' }}>読み込み中...</div>;
  if (!user) return <LoginForm />;

  // 役割が決まっている場合、メインのアプリ画面を表示
  return (
    <main style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <FamilyHeader user={user} />
      <div style={{ marginTop: '30px' }}>
        <h2>お手伝いミッション</h2>
        <TaskList user={user} />
      </div>
    </main>
  );
}