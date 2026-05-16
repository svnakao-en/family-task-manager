"use client";

import { StoreProduct, RewardCardState } from '@/hooks/useStoreProducts';

interface StoreCardProps {
  product: StoreProduct;
  walletBalance: number;
  inFlightId: string | null;
  onRequest: (rewardId: string) => void;
}

interface CardConfig {
  bgColor: string;
  borderColor: string;
  buttonLabel: string;
  buttonColor: string;
  badgeLabel: string;
  badgeColor: string;
  buttonDisabled: boolean;
}

function getStateConfig(state: RewardCardState, shortfall: number): CardConfig {
  switch (state) {
    case 'available':
      return {
        bgColor: '#fffdf0',
        borderColor: '#FFE082',
        buttonLabel: 'こうかんする！',
        buttonColor: '#FF9800',
        badgeLabel: 'こうかんできるよ',
        badgeColor: '#FF9800',
        buttonDisabled: false,
      };
    case 'pending':
      return {
        bgColor: '#f0f8ff',
        borderColor: '#90CAF9',
        buttonLabel: 'しんせいちゅう',
        buttonColor: '#64B5F6',
        badgeLabel: '⏳ おやのへんじまち',
        badgeColor: '#2196F3',
        buttonDisabled: true,
      };
    case 'sold_out':
      return {
        bgColor: '#f5f5f5',
        borderColor: '#e0e0e0',
        buttonLabel: 'うりきれ',
        buttonColor: '#9E9E9E',
        badgeLabel: '😢 うりきれです',
        badgeColor: '#9E9E9E',
        buttonDisabled: true,
      };
    case 'insufficient':
      return {
        bgColor: '#fff5f5',
        borderColor: '#FFCDD2',
        buttonLabel: `あと ${shortfall}pt`,
        buttonColor: '#EF9A9A',
        badgeLabel: 'ポイントがたりないよ',
        badgeColor: '#EF5350',
        buttonDisabled: true,
      };
    default: {
      // never 型による網羅性チェック（コンパイル時に未処理ステートを検知）
      const _exhaustive: never = state;
      throw new Error(`未知のカードステート: ${_exhaustive}`);
    }
  }
}

export function StoreCard({
  product,
  walletBalance,
  inFlightId,
  onRequest,
}: StoreCardProps): JSX.Element {
  const shortfall = Math.max(0, product.requiredPoints - walletBalance);
  const config = getStateConfig(product.cardState, shortfall);

  // inFlightId が一致している間はAPIが飛んでいる（物理ロック）
  const isInflight = inFlightId === product.rewardId;
  const isDisabled = config.buttonDisabled || isInflight;

  return (
    <div
      style={{
        backgroundColor: config.bgColor,
        border: `1px solid ${config.borderColor}`,
        borderRadius: '14px',
        padding: '16px',
        marginBottom: '12px',
        opacity: isInflight ? 0.65 : 1,
        transition: 'opacity 0.2s ease',
      }}
    >
      {/* ヘッダー行 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '6px',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#333',
            flex: 1,
          }}
        >
          {product.title}
        </h3>
        <span
          style={{
            backgroundColor: config.badgeColor,
            color: 'white',
            fontSize: '11px',
            fontWeight: 'bold',
            padding: '3px 10px',
            borderRadius: '12px',
            marginLeft: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          {config.badgeLabel}
        </span>
      </div>

      {/* 説明文 */}
      {product.description && (
        <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#666', lineHeight: 1.5 }}>
          {product.description}
        </p>
      )}

      {/* フッター行: ポイント + 在庫 + ボタン */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#FF9800' }}>
            {product.requiredPoints}
          </span>
          <span style={{ fontSize: '13px', color: '#888', marginLeft: '4px' }}>ポイント</span>
          {product.stock !== undefined && (
            <span style={{ fontSize: '12px', color: '#999', marginLeft: '10px' }}>
              残り {product.stock} 個
            </span>
          )}
        </div>

        <button
          onClick={() => { if (!isDisabled) onRequest(product.rewardId); }}
          disabled={isDisabled}
          style={{
            padding: '9px 20px',
            backgroundColor: isDisabled ? '#d0d0d0' : config.buttonColor,
            color: 'white',
            border: 'none',
            borderRadius: '22px',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            minWidth: '130px',
            transition: 'background-color 0.2s ease',
          }}
        >
          {isInflight ? '⏳ つうしん中...' : config.buttonLabel}
        </button>
      </div>
    </div>
  );
}
