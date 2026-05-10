"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';

export default function RoleSelectionPage(): JSX.Element {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'parent' | 'child' | null>(null);
  // 変更点①: 名前入力用ステートを追加
  const [userName, setUserName] = useState<string>('');
  const [familyName, setFamilyName] = useState<string>('');
  const [familyId, setFamilyId] = useState<string>('');
  const [createdFamilyId, setCreatedFamilyId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    router.push('/');
    return <div>リダイレクト中...</div>;
  }

  if (user.role && user.role !== 'unknown') {
    router.push('/');
    return <div>リダイレクト中...</div>;
  }

  /**
   * 親として登録する処理
   */
  const handleParentRegistration = async (): Promise<void> => {
    // 変更点②: 名前のバリデーションを追加
    if (!userName.trim()) {
      setError('お名前を入力してください');
      return;
    }
    if (!familyName.trim()) {
      setError('家族名を入力してください');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const batch = writeBatch(db);

      // families に新規ドキュメントを作成
      const familyRef = doc(collection(db, 'families'));
      batch.set(familyRef, {
        name: familyName.trim(),
      });
      const newFamilyId = familyRef.id;

      // family_members を更新
      const familyMembersRef = collection(db, 'family_members');
      const q = query(familyMembersRef, where('user_id', '==', user.userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const memberDocRef = querySnapshot.docs[0].ref;
        batch.update(memberDocRef, {
          family_id: newFamilyId,
          role: 'parent',
        });
      } else {
        const newMemberRef = doc(collection(db, 'family_members'));
        batch.set(newMemberRef, {
          user_id: user.userId,
          family_id: newFamilyId,
          role: 'parent',
        });
      }

      // 変更点③: users コレクションに名前を保存
      const userRef = doc(db, 'users', user.userId);
      batch.update(userRef, {
        name: userName.trim(),
      });

      await batch.commit();
      setCreatedFamilyId(newFamilyId);
    } catch (err) {
      console.error('親登録エラー:', err);
      setError('登録に失敗しました。もう一度お試しください。');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 子として登録する処理
   */
  const handleChildRegistration = async (): Promise<void> => {
    // 変更点②: 名前のバリデーションを追加
    if (!userName.trim()) {
      setError('お名前を入力してください');
      return;
    }
    if (!familyId.trim()) {
      setError('家族IDを入力してください');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // 家族IDの存在確認
      const familyDocRef = doc(db, 'families', familyId.trim());
      const familyDoc = await getDoc(familyDocRef);

      if (!familyDoc.exists()) {
        setError('入力された家族IDが見つかりません。正しいIDを入力してください。');
        return;
      }

      const batch = writeBatch(db);

      // family_members を更新
      const familyMembersRef = collection(db, 'family_members');
      const q = query(familyMembersRef, where('user_id', '==', user.userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const memberDocRef = querySnapshot.docs[0].ref;
        batch.update(memberDocRef, {
          family_id: familyId.trim(),
          role: 'child',
        });
      } else {
        const newMemberRef = doc(collection(db, 'family_members'));
        batch.set(newMemberRef, {
          user_id: user.userId,
          family_id: familyId.trim(),
          role: 'child',
        });
      }

      // 変更点③: users コレクションに名前を保存
      const userRef = doc(db, 'users', user.userId);
      batch.update(userRef, {
        name: userName.trim(),
      });

      await batch.commit();
      router.push('/');
    } catch (err) {
      console.error('子登録エラー:', err);
      setError('登録に失敗しました。もう一度お試しください。');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyFamilyId = async (): Promise<void> => {
    if (!createdFamilyId) return;
    try {
      await navigator.clipboard.writeText(createdFamilyId);
      alert('家族IDをクリップボードにコピーしました！');
    } catch (err) {
      console.error('コピーエラー:', err);
      alert('コピーに失敗しました');
    }
  };

  // 親登録完了後の画面
  if (createdFamilyId) {
    return (
      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        <h1>登録完了！</h1>
        <p>{userName} さん、おかえりなさい。家族が作成されました。</p>
        <p>以下の家族IDを子供に共有してください。</p>
        <div style={{
          padding: '15px',
          backgroundColor: '#f0f0f0',
          borderRadius: '5px',
          marginTop: '20px',
          marginBottom: '20px',
        }}>
          <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>家族ID:</p>
          <p style={{
            margin: '0',
            fontSize: '18px',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          }}>
            {createdFamilyId}
          </p>
        </div>
        <button
          onClick={handleCopyFamilyId}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            marginRight: '10px',
          }}
        >
          IDをコピー
        </button>
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          ホームへ
        </button>
      </div>
    );
  }

  // 役割選択画面
  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>はじめの設定</h1>
      <p>役割とお名前を教えてください。</p>

      {error && (
        <div style={{
          padding: '10px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '5px',
          marginBottom: '20px',
        }}>
          {error}
        </div>
      )}

      {/* 変更点①: 名前入力欄（役割選択より先に表示） */}
      <div style={{ marginTop: '20px', marginBottom: '30px' }}>
        <h2>お名前</h2>
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="例: たろう"
          disabled={isProcessing}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '16px',
            borderRadius: '5px',
            border: '1px solid #ccc',
          }}
        />
      </div>

      {/* 役割選択 */}
      <div>
        <h2>役割</h2>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              name="role"
              value="parent"
              checked={selectedRole === 'parent'}
              onChange={() => { setSelectedRole('parent'); setError(''); }}
              disabled={isProcessing}
              style={{ marginRight: '10px' }}
            />
            <span style={{ fontSize: '18px' }}>親（新しい家族を作成）</span>
          </label>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              name="role"
              value="child"
              checked={selectedRole === 'child'}
              onChange={() => { setSelectedRole('child'); setError(''); }}
              disabled={isProcessing}
              style={{ marginRight: '10px' }}
            />
            <span style={{ fontSize: '18px' }}>子供（既存の家族に参加）</span>
          </label>
        </div>
      </div>

      {selectedRole === 'parent' && (
        <div style={{ marginTop: '20px' }}>
          <h2>家族名</h2>
          <input
            type="text"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="例: 田中家"
            disabled={isProcessing}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '16px',
              borderRadius: '5px',
              border: '1px solid #ccc',
              marginBottom: '20px',
            }}
          />
          <button
            onClick={handleParentRegistration}
            disabled={isProcessing}
            style={{
              padding: '10px 20px',
              backgroundColor: isProcessing ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontSize: '16px',
            }}
          >
            {isProcessing ? '登録中...' : '親として登録'}
          </button>
        </div>
      )}

      {selectedRole === 'child' && (
        <div style={{ marginTop: '20px' }}>
          <h2>家族ID</h2>
          <p style={{ fontSize: '14px', color: '#666' }}>
            親から共有された家族IDを入力してください
          </p>
          <input
            type="text"
            value={familyId}
            onChange={(e) => setFamilyId(e.target.value)}
            placeholder="家族IDを入力"
            disabled={isProcessing}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '16px',
              borderRadius: '5px',
              border: '1px solid #ccc',
              marginBottom: '20px',
            }}
          />
          <button
            onClick={handleChildRegistration}
            disabled={isProcessing}
            style={{
              padding: '10px 20px',
              backgroundColor: isProcessing ? '#ccc' : '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontSize: '16px',
            }}
          >
            {isProcessing ? '登録中...' : '子供として登録'}
          </button>
        </div>
      )}
    </div>
  );
}