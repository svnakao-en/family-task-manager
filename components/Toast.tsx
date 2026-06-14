"use client";

import { useEffect, useState } from 'react';
import { useWorldTheme } from '@/hooks/useWorldTheme';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}): JSX.Element {
  const { colors, effects } = useWorldTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colorMap = {
    success: { bg: colors.successBg, text: colors.successText },
    error:   { bg: colors.errorBg,   text: colors.errorText   },
    info:    { bg: colors.btnPrimaryBg, text: colors.btnPrimaryText },
  } as const;

  const { bg, text } = colorMap[type];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: bg,
        color: text,
        padding: '16px 24px',
        borderRadius: '8px',
        boxShadow: effects.cardShadow,
        zIndex: 9999,
        maxWidth: '400px',
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '16px', lineHeight: '1.5' }}>{message}</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: text,
            cursor: 'pointer',
            fontSize: '20px',
            padding: '0',
            marginLeft: 'auto',
          }}
          aria-label="閉じる"
        >
          ×
        </button>
      </div>
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const ToastContainer = () => (
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  );

  return { showToast, ToastContainer };
}

// Made with Bob
