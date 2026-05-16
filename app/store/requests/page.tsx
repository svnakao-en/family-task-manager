"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useApprovalQueue } from '@/hooks/useApprovalQueue';
import { ApprovalCard } from '@/components/parent/ApprovalCard';
import { Toast } from '@/components/Toast';

export default function StoreRequestsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { queue, isReady, error } = useApprovalQueue(
    user ?? { userId: '', email: null, name: '', totalReward: 0, role: null }
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
        読み込み中...
      </div>
    );
  }

  if (!user || user.role !== 'parent') {
    router.replace('/');
    return null;
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px' }}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* ヘッダー */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#333' }}>
          📬 こうかん申請
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#888' }}>
          子供からの申請を承認または却下できます（古い順に表示）
        </p>
      </div>

      {/* 戻るボタン */}
      <button
        onClick={() => router.back()}
        style={{
          marginBottom: '16px',
          padding: '6px 14px',
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '13px',
          color: '#666',
        }}
      >
        ← もどる
      </button>

      {/* エラー表示 */}
      {error && (
        <div
          style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#856404',
          }}
        >
          申請一覧の読み込みに失敗しました。画面を再読み込みしてください。
        </div>
      )}

      {/* ローディング */}
      {!isReady && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
          申請を読み込み中...
        </div>
      )}

      {/* 申請一覧 */}
      {isReady && queue.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 16px',
            color: '#aaa',
            fontSize: '15px',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
          現在、申請はありません
        </div>
      )}

      {isReady && queue.map((exchange) => (
        <ApprovalCard
          key={exchange.exchangeId}
          exchange={exchange}
          currentUser={user}
          onError={(msg) => setToast({ message: msg, type: 'error' })}
        />
      ))}
    </div>
  );
}
