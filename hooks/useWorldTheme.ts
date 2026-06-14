import { useContext } from 'react';
import { ThemeContext, ThemeId } from '@/context/ThemeContext';
import { WorldTheme } from '@/theme/types';

interface UseWorldThemeReturn {
  currentThemeId: ThemeId | null;
  colors:         WorldTheme['colors'];
  effects:        WorldTheme['effects'];
  themeConfig:    WorldTheme;
  setTheme:       (themeId: ThemeId) => void;
}

export function useWorldTheme(): UseWorldThemeReturn {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error(
      '[useWorldTheme] ThemeProvider の外側で呼び出されています。' +
      ' app/layout.tsx などのルートで <ThemeProvider> を設定してください。'
    );
  }

  return {
    currentThemeId: context.themeState,
    colors:         context.themeConfig.colors,
    effects:        context.themeConfig.effects,
    themeConfig:    context.themeConfig,
    setTheme:       context.setTheme,
  };
}
