"use client";

import { createContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import { WorldTheme } from '@/theme/types';
import { aliceTheme } from '@/theme/alice';
import { defaultTheme } from '@/theme/default';

// ─── テーマID型インフラ ────────────────────────────────────────────────────────
export const AVAILABLE_THEMES = ['default', 'alice'] as const;
export type ThemeId = typeof AVAILABLE_THEMES[number];

const THEME_STORAGE_KEY = 'parent_selected_theme' as const;

// satisfies により：将来テーマを追加した際に実装漏れがあればコンパイルエラーになる
export const THEME_MAP = {
  default: defaultTheme,
  alice:   aliceTheme,
} satisfies Record<ThemeId, WorldTheme>;

// ─── Context 型 ───────────────────────────────────────────────────────────────
export interface ThemeContextType {
  themeState:  ThemeId | null;
  setTheme:    (id: ThemeId) => void;
  themeConfig: WorldTheme;
}

// Provider 外での呼び出しを useWorldTheme 側で検知するため undefined をデフォルトにする
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────
interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
  const [theme, setThemeState] = useState<ThemeId | null>(null);

  // クライアント着地後に1度だけ localStorage から世界線を復元する
  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && (AVAILABLE_THEMES as readonly string[]).includes(saved)) {
      setThemeState(saved as ThemeId);
    } else {
      setThemeState('default');
    }
  }, []);

  // useCallback で参照を固定し、Context 配下の不要な再レンダリングを防止
  const setTheme = useCallback((newTheme: ThemeId) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    }
  }, []);

  // theme が変わったときのみ新しいオブジェクトを生成する
  const contextValue = useMemo((): ThemeContextType => {
    const resolvedTheme: ThemeId = theme ?? 'default';
    return {
      themeState: theme,
      setTheme,
      themeConfig: THEME_MAP[resolvedTheme],
    };
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}
