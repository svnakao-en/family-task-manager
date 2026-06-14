"use client";

import { ReactNode } from 'react';
import { useWorldTheme } from '@/hooks/useWorldTheme';

interface AppThemeLayerProps {
  children: ReactNode;
}

export function AppThemeLayer({ children }: AppThemeLayerProps): JSX.Element | null {
  const { currentThemeId, colors } = useWorldTheme();

  if (currentThemeId === null) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: colors.bodyBg,
        color: colors.text,
        minHeight: '100vh',
        width: '100vw',
        overflowX: 'hidden',
        transition: 'background-color 0.2s ease, color 0.2s ease',
      }}
    >
      {children}
    </div>
  );
}
