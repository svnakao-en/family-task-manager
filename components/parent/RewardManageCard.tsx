"use client";

import { useState } from 'react';
import { updateReward, deleteReward } from '@/lib/rewardActions';
import { RewardData } from '@/types';
import type { AuthContext } from '@/lib/auth/types';
import { useWorldTheme } from '@/hooks/useWorldTheme';

interface RewardManageCardProps {
  reward: RewardData;
  auth: AuthContext;
  onError?: (msg: string) => void;
  onSuccess?: (msg: string) => void;
}

type CardMode = 'view' | 'editing';
type ActionState = 'idle' | 'saving' | 'deleting' | 'toggling';

export function RewardManageCard({
  reward,
  auth,
  onError,
  onSuccess,
}: RewardManageCardProps): JSX.Element {
  const { colors } = useWorldTheme();
  const [mode, setMode] = useState<CardMode>('view');
  const [actionState, setActionState] = useState<ActionState>('idle');

  const [editTitle, setEditTitle] = useState(reward.title);
  const [editDescription, setEditDescription] = useState(reward.description ?? '');
  const [editPoints, setEditPoints] = useState(String(reward.requiredPoints));
  const [editStock, setEditStock] = useState(
    reward.stock == null ? '' : String(reward.stock)
  );

  const isBusy = actionState !== 'idle';

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    color: colors.subtle,
    marginBottom: '4px',
    marginTop: '10px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
    backgroundColor: colors.inputBg,
    color: colors.text,
  };

  const handleToggleActive = async () => {
    setActionState('toggling');
    try {
      await updateReward(auth, reward.rewardId, reward.version, { isActive: !reward.isActive });
      onSuccess?.(reward.isActive ? '非表示にしました' : '表示に戻しました');
    } catch (err: unknown) {
      onError?.((err as any).message ?? '更新に失敗しました');
    } finally {
      setActionState('idle');
    }
  };

  const handleSaveEdit = async () => {
    setActionState('saving');
    try {
      await updateReward(auth, reward.rewardId, reward.version, {
        title: editTitle,
        description: editDescription,  // 空文字は Server Action 側で null に正規化
        requiredPoints: editPoints === '' ? undefined : Number(editPoints),
        stock: editStock === '' ? null : Number(editStock),
      });
      setMode('view');
      onSuccess?.('更新しました');
    } catch (err: unknown) {
      onError?.((err as any).message ?? '更新に失敗しました');
    } finally {
      setActionState('idle');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`「${reward.title}」を削除しますか？\n削除後は子供のストアから見えなくなります。`)) {
      return;
    }
    setActionState('deleting');
    try {
      await deleteReward(auth, reward.rewardId, reward.version);
      onSuccess?.('削除しました');
    } catch (err: unknown) {
      onError?.((err as any).message ?? '削除に失敗しました');
    } finally {
      setActionState('idle');
    }
  };

  const stockLabel =
    reward.stock == null ? '無限' : reward.stock === 0 ? '在庫切れ' : `残り${reward.stock}個`;

  return (
    <div
      style={{
        backgroundColor: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '12px',
        opacity: isBusy && actionState === 'deleting' ? 0.5 : 1,
        transition: 'opacity 0.3s ease',
      }}
    >
      {mode === 'view' ? (
        <>
          {/* ヘッダー行 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: colors.title, flex: 1 }}>
              {reward.title}
            </h3>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '10px',
                backgroundColor: reward.isActive ? colors.successBg : colors.panelBgMuted,
                color: reward.isActive ? colors.successText : colors.muted,
                fontWeight: 'bold',
                marginLeft: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              {reward.isActive ? '表示中' : '非表示'}
            </span>
          </div>

          {/* 説明 */}
          {reward.description && (
            <p style={{ margin: '0 0 6px', fontSize: '13px', color: colors.subtle }}>{reward.description}</p>
          )}

          {/* ポイント・在庫 */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', color: colors.accent, fontWeight: 'bold' }}>
              {reward.requiredPoints.toLocaleString()} pt
            </span>
            <span style={{ fontSize: '13px', color: colors.muted }}>{stockLabel}</span>
          </div>

          {/* アクションボタン */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setMode('editing')}
              disabled={isBusy}
              style={{
                flex: 1,
                padding: '8px 0',
                backgroundColor: colors.panelBgMuted,
                color: colors.link,
                border: 'none',
                borderRadius: '8px',
                cursor: isBusy ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
              }}
            >
              ✏️ 編集
            </button>
            <button
              onClick={handleToggleActive}
              disabled={isBusy}
              style={{
                flex: 1,
                padding: '8px 0',
                backgroundColor: reward.isActive ? colors.warningBg : colors.successBg,
                color: reward.isActive ? colors.warningText : colors.successText,
                border: 'none',
                borderRadius: '8px',
                cursor: isBusy ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
              }}
            >
              {actionState === 'toggling' ? '⏳...' : reward.isActive ? '🙈 非表示' : '👁 表示'}
            </button>
            <button
              onClick={handleDelete}
              disabled={isBusy}
              style={{
                padding: '8px 14px',
                backgroundColor: colors.errorBg,
                color: colors.errorText,
                border: 'none',
                borderRadius: '8px',
                cursor: isBusy ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
              }}
            >
              {actionState === 'deleting' ? '⏳' : '🗑'}
            </button>
          </div>
        </>
      ) : (
        /* 編集モード */
        <>
          <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 'bold', color: colors.subtle }}>
            ✏️ 編集中
          </p>

          <label style={labelStyle}>タイトル *</label>
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            disabled={isBusy}
            style={inputStyle}
            maxLength={50}
          />

          <label style={labelStyle}>説明（任意）</label>
          <input
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            disabled={isBusy}
            style={inputStyle}
            maxLength={200}
          />

          <label style={labelStyle}>必要ポイント *</label>
          <input
            type="number"
            value={editPoints}
            onChange={(e) => setEditPoints(e.target.value)}
            disabled={isBusy}
            style={inputStyle}
            min={1}
            max={100000}
          />

          <label style={labelStyle}>在庫数（空欄 = 無限）</label>
          <input
            type="number"
            value={editStock}
            onChange={(e) => setEditStock(e.target.value)}
            disabled={isBusy}
            style={inputStyle}
            min={0}
          />

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              onClick={handleSaveEdit}
              disabled={isBusy}
              style={{
                flex: 1,
                padding: '10px 0',
                backgroundColor: isBusy ? colors.btnDisabledBg : colors.btnSuccessBg,
                color: isBusy ? colors.btnDisabledText : colors.btnSuccessText,
                border: 'none',
                borderRadius: '8px',
                cursor: isBusy ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              {actionState === 'saving' ? '⏳ 保存中...' : '💾 保存'}
            </button>
            <button
              onClick={() => {
                setEditTitle(reward.title);
                setEditDescription(reward.description ?? '');
                setEditPoints(String(reward.requiredPoints));
                setEditStock(reward.stock == null ? '' : String(reward.stock));
                setMode('view');
              }}
              disabled={isBusy}
              style={{
                flex: 1,
                padding: '10px 0',
                backgroundColor: colors.panelBgMuted,
                color: colors.subtle,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: '8px',
                cursor: isBusy ? 'not-allowed' : 'pointer',
                fontSize: '14px',
              }}
            >
              キャンセル
            </button>
          </div>
        </>
      )}
    </div>
  );
}
