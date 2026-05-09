"use client";

import { useAuth } from '@/hooks/useAuth';
import LoginForm from '@/components/LoginForm';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

/**
 * メインページ
 * ログイン状態に応じて表示を切り替える
 */
export default function Home(): JSX.Element {
  const { user, loading } = useAuth();

  // ログアウト処理
  const handleLogout = async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  // ローディング中
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>読み込み中...</div>
      </div>
    );
  }

  // 未ログイン時：ログインフォームを表示
  if (!user) {
    return <LoginForm />;
  }

  // ログイン済み：ユーザー情報を表示
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>成果報酬型こづかい管理アプリ</h1>
        
        <div style={styles.userInfo}>
          <h2 style={styles.subtitle}>ログイン情報</h2>
          <div style={styles.infoRow}>
            <span style={styles.label}>ユーザー名:</span>
            <span style={styles.value}>{user.name}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.label}>メールアドレス:</span>
            <span style={styles.value}>{user.email}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.label}>役割:</span>
            <span style={styles.value}>
              {user.role === 'parent' ? '👨‍👩‍👧‍👦 親' : user.role === 'child' ? '👶 子供' : '❓ 不明'}
            </span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.label}>累計獲得報酬:</span>
            <span style={styles.value}>¥{user.totalReward?.toLocaleString() || 0}</span>
          </div>
        </div>

        <div style={styles.successMessage}>
          ✅ ログインに成功しました！<br />
          Firestoreにユーザーデータが作成されています。
        </div>

        <button onClick={handleLogout} style={styles.logoutButton}>
          ログアウト
        </button>

        <div style={styles.note}>
          <p style={styles.noteTitle}>📝 次のステップ</p>
          <ul style={styles.noteList}>
            <li>Firebaseコンソールでデータを確認してください</li>
            <li>users, families, family_membersコレクションが作成されています</li>
            <li>次回以降の実装でタスク機能を追加します</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// インラインスタイル
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: '18px',
    color: '#666',
  },
  card: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '600px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '30px',
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: '#555',
  },
  userInfo: {
    backgroundColor: '#f9f9f9',
    padding: '20px',
    borderRadius: '6px',
    marginBottom: '20px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #eee',
  },
  label: {
    fontWeight: '500',
    color: '#666',
  },
  value: {
    fontWeight: 'bold',
    color: '#333',
  },
  successMessage: {
    backgroundColor: '#d4edda',
    color: '#155724',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '20px',
    textAlign: 'center',
    lineHeight: '1.6',
  },
  logoutButton: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: '#dc3545',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginBottom: '20px',
  },
  note: {
    backgroundColor: '#fff3cd',
    padding: '20px',
    borderRadius: '6px',
    border: '1px solid #ffc107',
  },
  noteTitle: {
    fontWeight: 'bold',
    marginBottom: '10px',
    color: '#856404',
  },
  noteList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#856404',
    lineHeight: '1.8',
  },
};

// Made with Bob