"use client";

import { useState, FormEvent } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  AuthError
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useWorldTheme } from '@/hooks/useWorldTheme';

export default function LoginForm(): JSX.Element {
  const { colors, effects } = useWorldTheme();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setEmail('');
      setPassword('');
    } catch (err) {
      handleAuthError(err as AuthError);
    } finally {
      setLoading(false);
    }
  };

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

  const inputStyle: React.CSSProperties = {
    padding: '12px',
    fontSize: '16px',
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: '4px',
    outline: 'none',
    transition: 'border-color 0.2s',
    backgroundColor: colors.inputBg,
    color: colors.text,
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: colors.bodyBg,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: colors.cardBg,
          padding: '40px',
          borderRadius: '8px',
          boxShadow: effects.cardShadow,
          border: `1px solid ${colors.cardBorder}`,
          width: '100%',
          maxWidth: '400px',
        }}
      >
        <h2
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '30px',
            textAlign: 'center',
            color: colors.title,
          }}
        >
          {isSignUp ? '新規登録' : 'ログイン'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '500', color: colors.subtle }}>
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
              placeholder="example@email.com"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '500', color: colors.subtle }}>
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
              placeholder="6文字以上"
              minLength={6}
            />
          </div>

          {error && (
            <div
              style={{
                padding: '12px',
                backgroundColor: colors.errorBg,
                color: colors.errorText,
                borderRadius: '4px',
                fontSize: '14px',
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: loading ? colors.btnDisabledText : colors.btnPrimaryText,
              backgroundColor: loading ? colors.btnDisabledBg : colors.btnPrimaryBg,
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
              marginTop: '10px',
            }}
          >
            {loading ? '処理中...' : (isSignUp ? '登録' : 'ログイン')}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: colors.link,
              fontSize: '14px',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
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
