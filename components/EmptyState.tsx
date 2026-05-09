"use client";

/**
 * EmptyState コンポーネントのProps
 */
interface EmptyStateProps {
  message: string;
  submessage?: string;
  icon?: string;
}

/**
 * 空状態を表示するコンポーネント
 * タスクが0件の場合や、データが存在しない場合に使用
 */
export function EmptyState({
  message,
  submessage,
  icon = '📭',
}: EmptyStateProps): JSX.Element {
  return (
    <div
      style={{
        padding: '48px 16px',
        textAlign: 'center',
        color: '#666',
      }}
    >
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>
        {icon}
      </div>
      <p style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>
        {message}
      </p>
      {submessage && (
        <p style={{ margin: 0, fontSize: '14px', color: '#999' }}>
          {submessage}
        </p>
      )}
    </div>
  );
}

// Made with Bob