import { Metadata } from 'next';
import { ReactNode } from 'react';
import { RoleGuard } from '@/components/RoleGuard';

export const metadata: Metadata = {
  title: '成果報酬型こづかい管理アプリ',
  description: '家族向けのタスク管理・報酬管理アプリ',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
  return (
    <html lang="ja">
      <body style={{ margin: 0, padding: 0, fontFamily: 'sans-serif' }}>
        <RoleGuard>
          {children}
        </RoleGuard>
      </body>
    </html>
  );
}

// Made with Bob