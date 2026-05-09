"use client";

import { useEffect, useState } from 'react';

/**
 * トースト通知の型定義
 */
export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

/**
 * トースト通知コンポーネント
 * シンプルで軽量な実装
 */
export function Toast({ 
  message, 
  type, 
  onClose 
}: { 
  message: string; 
  type: 'success' | 'error' | 'info'; 
  onClose: () => void;
}): JSX.Element {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000); // 4秒後に自動で閉じる

    return () => clearTimeout(timer);
  }, [onClose]);

  const backgroundColor = 
    type === 'success' ? '#4CAF50' : 
    type === 'error' ? '#f44336' : 
    '#2196F3';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor,
        color: 'white',
        padding: '16px 24px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
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
            color: 'white',
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

/**
 * トースト通知を管理するカスタムフック
 */
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