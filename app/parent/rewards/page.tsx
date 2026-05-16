"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useParentRewards } from '@/hooks/useParentRewards';
import { createReward } from '@/lib/rewardActions';
import { RewardManageCard } from '@/components/parent/RewardManageCard';
import { Toast } from '@/components/Toast';

export default function ParentRewardsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 作成フォーム
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPoints, setFormPoints] = useState('');
  const [formStock, setFormStock] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { rewards, isReady, error } = useParentRewards(
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

  const parentUser = { userId: user.userId, familyId: user.familyId ?? '', role: 'parent' };

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormPoints('');
    setFormStock('');
    setShowForm(false);
  };

  const handleCreate = async () => {
    const points = formPoints === '' ? NaN : Number(formPoints);
    const stock = formStock === '' ? undefined : Number(formStock);

    if (!formTitle.trim()) {
      setToast({ message: 'タイトルを入力してください', type: 'error' });
      return;
    }
    if (!Number.isInteger(points) || points < 1 || points > 100000) {
      setToast({ message: '必要ポイントは1〜100,000の整数で入力してください', type: 'error' });
      return;
    }
    if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) {
      setToast({ message: '在庫は0以上の整数で入力してください', type: 'error' });
      return;
    }

    setIsCreating(true);
    const result = await createReward(
      {
        title: formTitle,
        description: formDescription === '' ? undefined : formDescription,
        requiredPoints: points,
        stock: formStock === '' ? null : stock,
      },
      parentUser
    );
    setIsCreating(false);

    if (result.success) {
      resetForm();
      setToast({ message: 'ご褒美を追加しました', type: 'success' });
    } else {
      setToast({ message: result.message, type: 'error' });
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
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#333' }}>
          🎁 ご褒美管理
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#888' }}>
          子供が交換できるご褒美を管理できます
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

      {/* 追加ボタン / フォーム */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: 'bold',
            marginBottom: '20px',
          }}
        >
          ＋ ご褒美を追加する
        </button>
      ) : (
        <div
          style={{
            backgroundColor: '#F1F8E9',
            border: '1px solid #AED581',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <p style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 'bold', color: '#33691E' }}>
            ＋ 新しいご褒美
          </p>

          <label style={labelStyle}>タイトル *</label>
          <input
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            disabled={isCreating}
            placeholder="例：アイスクリーム"
            style={inputStyle}
            maxLength={50}
          />

          <label style={labelStyle}>説明（任意）</label>
          <input
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            disabled={isCreating}
            placeholder="例：好きなフレーバー1個"
            style={inputStyle}
            maxLength={200}
          />

          <label style={labelStyle}>必要ポイント *</label>
          <input
            type="number"
            value={formPoints}
            onChange={(e) => setFormPoints(e.target.value)}
            disabled={isCreating}
            placeholder="例：100"
            style={inputStyle}
            min={1}
            max={100000}
          />

          <label style={labelStyle}>在庫数（空欄 = 無限）</label>
          <input
            type="number"
            value={formStock}
            onChange={(e) => setFormStock(e.target.value)}
            disabled={isCreating}
            placeholder="空欄にすると無限"
            style={inputStyle}
            min={0}
          />

          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <button
              onClick={handleCreate}
              disabled={isCreating}
              style={{
                flex: 1,
                padding: '10px 0',
                backgroundColor: isCreating ? '#A5D6A7' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isCreating ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              {isCreating ? '⏳ 追加中...' : '追加する'}
            </button>
            <button
              onClick={resetForm}
              disabled={isCreating}
              style={{
                flex: 1,
                padding: '10px 0',
                backgroundColor: '#f5f5f5',
                color: '#666',
                border: '1px solid #ddd',
                borderRadius: '8px',
                cursor: isCreating ? 'not-allowed' : 'pointer',
                fontSize: '14px',
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

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
          ご褒美一覧の読み込みに失敗しました。画面を再読み込みしてください。
        </div>
      )}

      {/* ローディング */}
      {!isReady && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
          読み込み中...
        </div>
      )}

      {/* ご褒美一覧 */}
      {isReady && rewards.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 16px',
            color: '#aaa',
            fontSize: '15px',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎁</div>
          まだご褒美がありません。<br />上のボタンから追加してみましょう！
        </div>
      )}

      {isReady && rewards.map((reward) => (
        <RewardManageCard
          key={reward.rewardId}
          reward={reward}
          currentUser={user}
          onError={(msg) => setToast({ message: msg, type: 'error' })}
          onSuccess={(msg) => setToast({ message: msg, type: 'success' })}
        />
      ))}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  color: '#555',
  marginBottom: '4px',
  marginTop: '10px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #C5E1A5',
  borderRadius: '6px',
  fontSize: '14px',
  boxSizing: 'border-box',
  backgroundColor: '#fff',
};
