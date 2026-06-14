"use client";

import { useWorldTheme } from '@/hooks/useWorldTheme';

interface EmptyStateProps {
  message: string;
  submessage?: string;
  icon?: string;
}

export function EmptyState({
  message,
  submessage,
  icon = '📭',
}: EmptyStateProps): JSX.Element {
  const { colors } = useWorldTheme();

  return (
    <div
      style={{
        padding: '48px 16px',
        textAlign: 'center',
        color: colors.subtle,
      }}
    >
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>
        {icon}
      </div>
      <p style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>
        {message}
      </p>
      {submessage && (
        <p style={{ margin: 0, fontSize: '14px', color: colors.muted }}>
          {submessage}
        </p>
      )}
    </div>
  );
}

// Made with Bob