"use client";

import { useState, useEffect } from 'react';
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
  writeBatch
} from 'firebase/firestore';

/**
 * 役割選択ページ
 * 初回ログイン時にユーザーが親または子の役割を選択する
 */
export default function RoleSelectionPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'parent' | 'child' | null>(null);
  const [familyName, setFamilyName] = useState<string>('');
  const [familyId, setFamilyId] = useState<string>('');
  const [createdFamilyId, setCreatedFamilyId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // リダイレクト処理の修正
  useEffect(() => {
    if (loading) return;

    // 未ログイン時はログインページへリダイレクト
    if (!user) {
      router.push('/');
      return;
    }

    // 【重要】無限ループ防止のため、ここにあった「自動リダイレクト」を一旦削除しました。
    // 画面が表示されることを最優先にします。
  }, [user, loading, router]);

  // ローディング中
  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  // 未ログイン時の表示
  if (!user) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>リダイレクト中...</p>
      </div>
    );
  }

  /**
   * 親として登録する処理
   */
  const handleParentRegistration = async () => {
    const trimmedFamilyName = familyName.trim();
    if (!trimmedFamilyName) {
      setError('家族名を入力してください');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const batch = writeBatch(db);
      const familyRef = doc(collection(db, 'families'));
      batch.set(familyRef, { name: trimmedFamilyName });
      const newFamilyId = familyRef.id;

      const familyMembersRef = collection(db, 'family_members');
      const q = query(familyMembersRef, where('user_id', '==', user.userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        batch.update(querySnapshot.docs[0].ref, {
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

      await batch.commit();
      setCreatedFamilyId(newFamilyId);
    } catch (err) {
      console.error('親登録エラー:', err);
      setError('登録に失敗しました。');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 子として登録する処理
   */
  const handleChildRegistration = async () => {
    const trimmedFamilyId = familyId.trim();
    if (!trimmedFamilyId) {
      setError('家族IDを入力してください');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const familyDocRef = doc(db, 'families', trimmedFamilyId);
      const familyDoc = await getDoc(familyDocRef);

      if (!familyDoc.exists()) {
        setError('入力された家族IDが見つかりません。');
        return;
      }

      const batch = writeBatch(db);
      const familyMembersRef = collection(db, 'family_members');
      const q = query(familyMembersRef, where('user_id', '==', user.userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        batch.update(querySnapshot.docs[0].ref, {
          family_id: trimmedFamilyId,
          role: 'child',
        });
      } else {
        const newMemberRef = doc(collection(db, 'family_members'));
        batch.set(newMemberRef, {
          user_id: user.userId,
          family_id: trimmedFamilyId,
          role: 'child',
        });
      }

      await batch.commit();
      router.push('/');
    } catch (err) {
      console.error('子登録エラー:', err);
      setError('登録に失敗しました。');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 家族IDをクリップボードにコピー
   */
  const handleCopyFamilyId = async () => {
    if (!createdFamilyId) return;
    try {
      await navigator.clipboard.writeText(createdFamilyId);
      alert('家族IDをコピーしました！');
    } catch (err) {
      alert('コピーに失敗しました');
    }
  };

  // 親登録完了後の画面
  if (createdFamilyId) {
    return (
      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        <h1>親として登録完了</h1>
        <p>家族が作成されました。以下の家族IDを子供に共有してください。</p>
        <div style={{ padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '5px', margin: '20px 0' }}>
          <p style={{ fontWeight: 'bold' }}>家族ID: {createdFamilyId}</p>
        </div>
        <button onClick={handleCopyFamilyId} style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', marginRight: '10px' }}>IDをコピー</button>
        <button onClick={() => router.push('/')} style={{ padding: '10px 20px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '5px' }}>ホームへ</button>
      </div>
    );
  }

  // 役割選択画面本体
  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>役割を選択してください</h1>
      {error && <div style={{ color: 'red', marginBottom: '20px' }}>{error}</div>}
      
      <div style={{ marginTop: '20px' }}>
        <label style={{ display: 'block', marginBottom: '10px' }}>
          <input type="radio" name="role" value="parent" checked={selectedRole === 'parent'} onChange={() => setSelectedRole('parent')} />
          親（家族を作る）
        </label>
        <label style={{ display: 'block', marginBottom: '10px' }}>
          <input type="radio" name="role" value="child" checked={selectedRole === 'child'} onChange={() => setSelectedRole('child')} />
          子供（家族に入る）
        </label>
      </div>

      {selectedRole === 'parent' && (
        <div style={{ marginTop: '20px' }}>
          <input type="text" value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="家族名（例：田中家）" style={{ padding: '10px', width: '100%', marginBottom: '10px' }} />
          <button onClick={handleParentRegistration} disabled={isProcessing} style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}>
            {isProcessing ? '処理中...' : '親として登録'}
          </button>
        </div>
      )}

      {selectedRole === 'child' && (
        <div style={{ marginTop: '20px' }}>
          <input type="text" value={familyId} onChange={(e) => setFamilyId(e.target.value)} placeholder="家族IDを入力" style={{ padding: '10px', width: '100%', marginBottom: '10px' }} />
          <button onClick={handleChildRegistration} disabled={isProcessing} style={{ padding: '10px 20px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '5px' }}>
            {isProcessing ? '処理中...' : '子供として登録'}
          </button>
        </div>
      )}
    </div>
  );
}