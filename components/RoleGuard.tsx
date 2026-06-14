"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useWorldTheme } from '@/hooks/useWorldTheme';

/**
 * 役割ガードコンポーネント
 * role === 'unknown' のユーザーを役割選択ページへリダイレクト
 * セキュリティ: loading中およびリダイレクト中はchildrenを描画しない
 */
export function RoleGuard({ children }: { children: React.ReactNode }): JSX.Element | null {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { colors } = useWorldTheme();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // ローディング中は何もしない
    if (loading) return;

    // 未ログインの場合は何もしない（ログインページで処理）
    if (!user) return;

    // 役割選択ページにいる場合は何もしない
    if (pathname === '/auth/role-selection') return;

    // role が 'unknown' または null の場合、役割選択ページへリダイレクト
    if (user.role === 'unknown' || user.role === null) {
      setIsRedirecting(true);
      router.push('/auth/role-selection');
      return;
    }

    // 正常な状態の場合、リダイレクトフラグをクリア
    setIsRedirecting(false);
  }, [user, loading, pathname, router]);

  // ローディング中はスピナーを表示
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: colors.muted
      }}>
        読み込み中...
      </div>
    );
  }

  // リダイレクト中は何も表示しない
  if (isRedirecting) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: colors.muted
      }}>
        リダイレクト中...
      </div>
    );
  }

  // ユーザーがログインしており、かつ役割が設定されている場合のみchildrenを表示
  if (user && user.role && user.role !== 'unknown') {
    return <>{children}</>;
  }

  // 役割選択ページの場合はchildrenを表示
  if (pathname === '/auth/role-selection') {
    return <>{children}</>;
  }

  // その他の場合は何も表示しない（安全策）
  return null;
}

// Made with Bob