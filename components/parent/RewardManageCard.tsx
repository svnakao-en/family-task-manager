"use client";

import { useState } from 'react';
import { updateReward, deleteReward } from '@/lib/rewardActions';
import { UserData, RewardData } from '@/types';

interface RewardManageCardProps {
  reward: RewardData;
  currentUser: UserData;
  onError?: (msg: string) => void;
  onSuccess?: (msg: string) => void;
}

type CardMode = 'view' | 'editing';
type ActionState = 'idle' | 'saving' | 'deleting' | 'toggling';

export function RewardManageCard({
  reward,
  currentUser,
  onError,
  onSuccess,
}: RewardManageCardProps): JSX.Element {
  const [mode, setMode] = useState<CardMode>('view');
  const [actionState, setActionState] = useState<ActionState>('idle');

  const [editTitle, setEditTitle] = useState(reward.title);
  const [editDescription, setEditDescription] = useState(reward.description ?? '');
  const [editPoints, setEditPoints] = useState(String(reward.requiredPoints));
  const [editStock, setEditStock] = useState(
    reward.stock == null ? '' : String(reward.stock)
  );

  const isBusy = actionState !== 'idle';
  const parentUser = { userId: currentUser.userId, familyId: currentUser.familyId ?? '', role: currentUser.role ?? '' };

  const handleToggleActive = async () => {
    setActionState('toggling');
    const result = await updateReward(reward.rewardId, { isActive: !reward.isActive }, parentUser, reward.version);
    setActionState('idle');
    if (result.success) {
      onSuccess?.(reward.isActive ? '非表示にしました' : '表示に戻しました');
    } else {
      onError?.(result.message);
    }
  };

  const handleSaveEdit = async () => {
    setActionState('saving');
    const result = await updateReward(
      reward.rewardId,
      {
        title: editTitle,
        description: editDescription,  // 空文字は Server Action 側で null に正規化
        requiredPoints: editPoints === '' ? undefined : Number(editPoints),
        stock: editStock === '' ? null : Number(editStock),
      },
      parentUser,
      reward.version  // 楽観的ロック：編集開始時点のバージョンを渡す
    );
    setActionState('idle');
    if (result.success) {
      setMode('view');
      onSuccess?.('更新しました');
    } else {
      onError?.(result.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`「${reward.title}」を削除しますか？\n削除後は子供のストアから見えなくなります。`)) {
      return;
    }
    setActionState('deleting');
    const result = await deleteReward(reward.rewardId, parentUser, reward.version);
    setActionState('idle');
    if (result.success) {
      onSuccess?.('削除しました');
    } else {
      onError?.(result.message);
    }
  };

  const stockLabel =
    reward.stock == null ? '無限' : reward.stock === 0 ? '在庫切れ' : `残り${reward.stock}個`;

  return (
    <div
      style={{
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
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
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#333', flex: 1 }}>
              {reward.title}
            </h3>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '10px',
                backgroundColor: reward.isActive ? '#E8F5E9' : '#F5F5F5',
                color: reward.isActive ? '#2E7D32' : '#9E9E9E',
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
            <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#666' }}>{reward.description}</p>
          )}

          {/* ポイント・在庫 */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', color: '#FF9800', fontWeight: 'bold' }}>
              {reward.requiredPoints.toLocaleString()} pt
            </span>
            <span style={{ fontSize: '13px', color: '#888' }}>{stockLabel}</span>
          </div>

          {/* アクションボタン */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setMode('editing')}
              disabled={isBusy}
              style={{
                flex: 1,
                padding: '8px 0',
                backgroundColor: '#E3F2FD',
                color: '#1565C0',
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
                backgroundColor: reward.isActive ? '#FFF8E1' : '#E8F5E9',
                color: reward.isActive ? '#F57F17' : '#2E7D32',
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
                backgroundColor: '#FFEBEE',
                color: '#C62828',
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
          <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 'bold', color: '#555' }}>
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
                backgroundColor: isBusy ? '#A5D6A7' : '#4CAF50',
                color: 'white',
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
                backgroundColor: '#f5f5f5',
                color: '#666',
                border: '1px solid #ddd',
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

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  color: '#666',
  marginBottom: '4px',
  marginTop: '10px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #ddd',
  borderRadius: '6px',
  fontSize: '14px',
  boxSizing: 'border-box',
};
