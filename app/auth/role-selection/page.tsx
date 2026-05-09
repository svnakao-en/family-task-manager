"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
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
export default function RoleSelectionPage(): JSX.Element {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'parent' | 'child' | null>(null);
  const [familyName, setFamilyName] = useState<string>('');
  const [familyId, setFamilyId] = useState<string>('');
  const [createdFamilyId, setCreatedFamilyId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // リダイレクト処理をuseEffectに移動（副作用の適正化）
  useEffect(() => {
    if (loading) return;

    // 未ログイン時はログインページへリダイレクト
    if (!user) {
      router.push('/');
      return;
    }

    // 既に役割が設定されている場合はホームへリダイレクト
    if (user.role && user.role !== 'unknown') {
      router.push('/');
      return;
    }
  }, [user, loading, router]);

  // ローディング中
  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  // 未ログイン時またはリダイレクト待機中
  if (!user || (user.role && user.role !== 'unknown')) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>リダイレクト中...</p>
      </div>
    );
  }

  /**
   * 親として登録する処理
   */
  const handleParentRegistration = async (): Promise<void> => {
    // バリデーション強化
    const trimmedFamilyName = familyName.trim();
    if (!trimmedFamilyName) {
      setError('家族名を入力してください');
      return;
    }
    if (trimmedFamilyName.length < 2) {
      setError('家族名は2文字以上で入力してください');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const batch = writeBatch(db);

      // 1. familiesコレクションに新規ドキュメントを作成
      const familyRef = doc(collection(db, 'families'));
      batch.set(familyRef, {
        name: trimmedFamilyName,
      });
      const newFamilyId = familyRef.id;

      // 2. family_membersコレクションを更新
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
        // family_membersドキュメントが存在しない場合は新規作成
        const newMemberRef = doc(collection(db, 'family_members'));
        batch.set(newMemberRef, {
          user_id: user.userId,
          family_id: newFamilyId,
          role: 'parent',
        });
      }

      // バッチコミット
      await batch.commit();

      // 成功時、familyIdを表示
      setCreatedFamilyId(newFamilyId);
    } catch (err) {
      console.error('親登録エラー:', err);
      setError('登録に失敗しました。もう一度お試しください。');
    } finally {
      // 必ずisProcessingをfalseに戻す
      setIsProcessing(false);
    }
  };

  /**
   * 子として登録する処理
   */
  const handleChildRegistration = async (): Promise<void> => {
    // バリデーション強化
    const trimmedFamilyId = familyId.trim();
    if (!trimmedFamilyId) {
      setError('家族IDを入力してください');
      return;
    }
    if (trimmedFamilyId.length < 10) {
      setError('家族IDは10文字以上です。正しいIDを入力してください。');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // 1. familiesコレクションに該当IDが存在するか確認
      const familyDocRef = doc(db, 'families', trimmedFamilyId);
      const familyDoc = await getDoc(familyDocRef);

      if (!familyDoc.exists()) {
        setError('入力された家族IDが見つかりません。正しいIDを入力してください。');
        return;
      }

      const batch = writeBatch(db);

      // 2. family_membersコレクションを更新
      const familyMembersRef = collection(db, 'family_members');
      const q = query(familyMembersRef, where('user_id', '==', user.userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const memberDocRef = querySnapshot.docs[0].ref;
        batch.update(memberDocRef, {
          family_id: trimmedFamilyId,
          role: 'child',
        });
      } else {
        // family_membersドキュメントが存在しない場合は新規作成
        const newMemberRef = doc(collection(db, 'family_members'));
        batch.set(newMemberRef, {
          user_id: user.userId,
          family_id: trimmedFamilyId,
          role: 'child',
        });
      }

      // バッチコミット
      await batch.commit();

      // 成功時、ホームへリダイレクト
      router.push('/');
    } catch (err) {
      console.error('子登録エラー:', err);
      setError('登録に失敗しました。もう一度お試しください。');
    } finally {
      // 必ずisProcessingをfalseに戻す
      setIsProcessing(false);
    }
  };

  /**
   * 家族IDをクリップボードにコピー
   */
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
        <h1>親として登録完了</h1>
        <p>家族が作成されました。以下の家族IDを子供に共有してください。</p>
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f0f0f0', 
          borderRadius: '5px',
          marginTop: '20px',
          marginBottom: '20px'
        }}>
          <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>家族ID:</p>
          <p style={{ 
            margin: '0', 
            fontSize: '18px', 
            fontFamily: 'monospace',
            wordBreak: 'break-all'
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
            marginRight: '10px'
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
            fontSize: '16px'
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
      <h1>役割を選択してください</h1>
      <p>あなたは親ですか、それとも子供ですか？</p>

      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#ffebee', 
          color: '#c62828',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              name="role"
              value="parent"
              checked={selectedRole === 'parent'}
              onChange={() => {
                setSelectedRole('parent');
                setError('');
              }}
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
              onChange={() => {
                setSelectedRole('child');
                setError('');
              }}
              disabled={isProcessing}
              style={{ marginRight: '10px' }}
            />
            <span style={{ fontSize: '18px' }}>子供（既存の家族に参加）</span>
          </label>
        </div>
      </div>

      {selectedRole === 'parent' && (
        <div style={{ marginTop: '30px' }}>
          <h2>家族名を入力してください</h2>
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
              marginBottom: '20px'
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
              fontSize: '16px'
            }}
          >
            {isProcessing ? '登録中...' : '親として登録'}
          </button>
        </div>
      )}

      {selectedRole === 'child' && (
        <div style={{ marginTop: '30px' }}>
          <h2>家族IDを入力してください</h2>
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
              marginBottom: '20px'
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
              fontSize: '16px'
            }}
          >
            {isProcessing ? '登録中...' : '子供として登録'}
          </button>
        </div>
      )}
    </div>
  );
}

// Made with Bob