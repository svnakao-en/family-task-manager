"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/LoginForm';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // ログイン済みで、かつ読み込みが終わっていたら役割選択へ
    if (!loading && user) {
      router.push('/role-selection');
    }
  }, [user, loading, router]);

  if (loading) return <div style={{ padding: '50px' }}>読み込み中...</div>;
  if (!user) return <LoginForm />;

  return null; // 自動で移動するので、ここは何も表示しなくてOK
}