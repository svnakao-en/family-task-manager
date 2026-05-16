"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useStoreProducts } from '@/hooks/useStoreProducts';
import { createExchange } from '@/lib/storeActions';
import { StoreCard } from '@/components/store/StoreCard';
import { Toast } from '@/components/Toast';

export default function StorePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [inFlightId, setInFlightId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { products, walletBalance, isReady, error } = useStoreProducts(
    user ?? { userId: '', email: null, name: '', totalReward: 0, role: null }
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
        読み込み中...
      </div>
    );
  }

  if (!user || user.role !== 'child') {
    router.replace('/');
    return null;
  }

  const handleRequest = async (rewardId: string) => {
    if (inFlightId) return; // 連打防止
    setInFlightId(rewardId);
    try {
      await createExchange(rewardId, user);
      setToast({ message: 'こうかん申請したよ！おやのへんじを待ってね', type: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '申請に失敗しました';
      setToast({ message: msg, type: 'error' });
    } finally {
      setInFlightId(null);
    }
  };

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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#333' }}>
            🎁 ご褒美ストア
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#888' }}>
            ためたポイントでこうかんしよう！
          </p>
        </div>
        <div
          style={{
            backgroundColor: '#FFF9C4',
            border: '2px solid #FFD54F',
            borderRadius: '12px',
            padding: '8px 14px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#F57F17' }}>
            {walletBalance}
          </div>
          <div style={{ fontSize: '11px', color: '#F57F17' }}>ポイント</div>
        </div>
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

      {/* エラー表示（ストリームごとに原因を特定） */}
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
          電波のいいところで、もういちどためしてね
          {error.rewards && <div>・ご褒美リストの読み込みに失敗しました</div>}
          {error.exchanges && <div>・申請状況の読み込みに失敗しました</div>}
          {error.wallet && <div>・ポイント残高の読み込みに失敗しました</div>}
        </div>
      )}

      {/* ローディング */}
      {!isReady && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
          ご褒美を読み込み中...
        </div>
      )}

      {/* ご褒美一覧 */}
      {isReady && products.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 16px',
            color: '#aaa',
            fontSize: '15px',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎁</div>
          まだご褒美がないよ。<br />おやさんに追加してもらってね！
        </div>
      )}

      {isReady && products.map((product) => (
        <StoreCard
          key={product.rewardId}
          product={product}
          walletBalance={walletBalance}
          inFlightId={inFlightId}
          onRequest={handleRequest}
        />
      ))}
    </div>
  );
}
