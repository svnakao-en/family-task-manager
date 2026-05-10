"use client";

import LoginForm from '@/components/LoginForm';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link'; // Linkをインポート

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ padding: '50px' }}>読み込み中...</div>;
  
  if (!user) return <LoginForm />;

  // 自動転送(useEffect)を一旦消すか、以下の画面を表示するようにします
  return (
    <div style={{ padding: '50px' }}>
      <h1>ログイン成功！</h1>
      <p>こんにちは、{user.email}さん</p>
      <Link href="/auth/role-selection" style={{ color: 'blue', textDecoration: 'underline' }}>
        👉 役割選択ページへ進む
      </Link>
    </div>
  );
}