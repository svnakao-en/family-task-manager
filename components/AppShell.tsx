import { ReactNode } from 'react';
import { AppThemeLayer } from './AppThemeLayer';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps): JSX.Element {
  return (
    <div className="app-shell" style={{ width: '100%' }}>
      <AppThemeLayer>
        {children}
      </AppThemeLayer>
    </div>
  );
}
