"use client";

import { useState } from 'react';
import { deliverExchange, rejectExchange } from '@/lib/storeActions';
import { UserData, ExchangeData } from '@/types';
import { formatTimeAgo } from '@/lib/storeUtils';
import { useWorldTheme } from '@/hooks/useWorldTheme';

interface ApprovalCardProps {
  exchange: ExchangeData;
  currentUser: UserData;
  onError?: (msg: string) => void;
}

type ApprovalCardState = 'idle' | 'delivering' | 'rejecting' | 'resolved' | 'error';

export function ApprovalCard({
  exchange,
  currentUser,
  onError,
}: ApprovalCardProps): JSX.Element {
  const { colors } = useWorldTheme();
  const [state, setState] = useState<ApprovalCardState>('idle');

  const isBusy = state === 'delivering' || state === 'rejecting';
  const isResolved = state === 'resolved';

  const handleDeliver = async () => {
    setState('delivering');
    try {
      await deliverExchange(exchange.exchangeId, currentUser);
      setState('resolved');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '引き渡しに失敗しました';
      onError?.(msg);
      setState('error');
    }
  };

  const handleReject = async () => {
    if (
      !window.confirm(
        `${exchange.childName}の「${exchange.rewardTitle}」の申請を却下しますか？\n${exchange.requiredPoints}ポイントは自動的に返金されます。`
      )
    ) {
      return;
    }
    setState('rejecting');
    try {
      await rejectExchange(exchange.exchangeId, currentUser);
      setState('resolved');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '却下に失敗しました';
      onError?.(msg);
      setState('error');
    }
  };

  return (
    <div
      style={{
        backgroundColor: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '12px',
        // 処理済みカードはフェードアウト + ブラー（連続誤タップ物理遮断）
        opacity: isResolved ? 0.4 : 1,
        filter: isResolved ? 'blur(0.5px)' : 'none',
        transition: 'opacity 0.4s ease, filter 0.4s ease',
        pointerEvents: isResolved ? 'none' : 'auto',
      }}
    >
      {/* 子供名 + 経過時間 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '4px',
        }}
      >
        <span style={{ fontSize: '13px', color: colors.subtle, fontWeight: 'bold' }}>
          {exchange.childName}
        </span>
        <span style={{ fontSize: '12px', color: colors.muted }}>
          {formatTimeAgo(exchange.createdAt)}
        </span>
      </div>

      {/* ご褒美タイトル */}
      <h3
        style={{
          margin: '4px 0 6px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: colors.title,
        }}
      >
        {exchange.rewardTitle}
      </h3>

      {/* 必要ポイント */}
      <p style={{ margin: '0 0 12px', fontSize: '14px', color: colors.accent, fontWeight: 'bold' }}>
        {exchange.requiredPoints} ポイント
      </p>

      {/* 処理済みバッジ */}
      {isResolved && (
        <p style={{ margin: '0', fontSize: '13px', color: colors.successText, fontWeight: 'bold' }}>
          ✓ 処理完了（リストから消えるまで少し待ってね）
        </p>
      )}

      {/* エラーメッセージ */}
      {state === 'error' && (
        <p style={{ margin: '0 0 8px', fontSize: '13px', color: colors.errorText }}>
          エラーが発生しました。もう一度試してください。
        </p>
      )}

      {/* アクションボタン */}
      {!isResolved && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleDeliver}
            disabled={isBusy}
            style={{
              flex: 1,
              padding: '10px 0',
              backgroundColor: isBusy && state === 'delivering' ? colors.btnDisabledBg : colors.btnSuccessBg,
              color: isBusy && state === 'delivering' ? colors.btnDisabledText : colors.btnSuccessText,
              border: 'none',
              borderRadius: '8px',
              cursor: isBusy ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'background-color 0.2s ease',
            }}
          >
            {state === 'delivering' ? '⏳ 処理中...' : '✅ わたす'}
          </button>
          <button
            onClick={handleReject}
            disabled={isBusy}
            style={{
              flex: 1,
              padding: '10px 0',
              backgroundColor: isBusy && state === 'rejecting' ? colors.btnDisabledBg : colors.btnDangerBg,
              color: isBusy && state === 'rejecting' ? colors.btnDisabledText : colors.btnDangerText,
              border: 'none',
              borderRadius: '8px',
              cursor: isBusy ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'background-color 0.2s ease',
            }}
          >
            {state === 'rejecting' ? '⏳ 処理中...' : '❌ やめる'}
          </button>
        </div>
      )}
    </div>
  );
}
