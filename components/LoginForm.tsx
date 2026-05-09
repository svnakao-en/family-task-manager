"use client";

import { useState, FormEvent } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  AuthError
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

/**
 * ログイン・サインアップフォームコンポーネント
 */
export default function LoginForm(): JSX.Element {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  /**
   * フォーム送信処理
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        // 新規登録
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        // ログイン
        await signInWithEmailAndPassword(auth, email, password);
      }
      
      // 成功時はフォームをクリア
      setEmail('');
      setPassword('');
    } catch (err) {
      // エラーハンドリング
      handleAuthError(err as AuthError);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 認証エラーのハンドリング
   */
  const handleAuthError = (err: AuthError): void => {
    console.error('認証エラー:', err);
    
    switch (err.code) {
      case 'auth/email-already-in-use':
        setError('このメールアドレスは既に使用されています');
        break;
      case 'auth/invalid-credential':
        setError('メールアドレスまたはパスワードが正しくありません');
        break;
      case 'auth/weak-password':
        setError('パスワードは6文字以上で設定してください');
        break;
      case 'auth/invalid-email':
        setError('メールアドレスの形式が正しくありません');
        break;
      case 'auth/user-not-found':
        setError('ユーザーが見つかりません');
        break;
      case 'auth/wrong-password':
        setError('パスワードが正しくありません');
        break;
      default:
        setError('エラーが発生しました。もう一度お試しください');
    }
  };

  /**
   * ログアウト処理
   */
  const handleLogout = async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('ログアウトエラー:', err);
      setError('ログアウトに失敗しました');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formCard}>
        <h2 style={styles.title}>
          {isSignUp ? '新規登録' : 'ログイン'}
        </h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="example@email.com"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="6文字以上"
              minLength={6}
            />
          </div>

          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {}),
            }}
          >
            {loading ? '処理中...' : (isSignUp ? '登録' : 'ログイン')}
          </button>
        </form>

        <div style={styles.toggleContainer}>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            style={styles.toggleButton}
          >
            {isSignUp 
              ? 'すでにアカウントをお持ちの方はこちら' 
              : 'アカウントをお持ちでない方はこちら'}
          </button>
        </div>
      </div>
    </div>
  );
}

// インラインスタイル（シンプルなデザイン）
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  formCard: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '30px',
    textAlign: 'center',
    color: '#333',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#555',
  },
  input: {
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    padding: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: '#007bff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginTop: '10px',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
  error: {
    padding: '12px',
    backgroundColor: '#fee',
    color: '#c33',
    borderRadius: '4px',
    fontSize: '14px',
    textAlign: 'center',
  },
  toggleContainer: {
    marginTop: '20px',
    textAlign: 'center',
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    color: '#007bff',
    fontSize: '14px',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
};

// Made with Bob