"use client";

import { useAuth } from '@/hooks/useAuth';
import { TaskForm } from '@/components/TaskForm';
import { TaskList } from '@/components/TaskList';
import { TaskCard } from '@/components/TaskCard';
import { useToast, Toast } from '@/components/Toast';
import { TaskData } from '@/types';

/**
 * タスクページ（メインダッシュボード）
 * 
 * 家族全員が今の状況を共有するダッシュボード
 * - 親: タスク投稿フォーム + タスク一覧（承認ボタン付き）
 * - 子: タスク一覧（完了報告ボタン付き）
 * 
 * リアルタイムの鼓動:
 * - onSnapshot で同期
 * - 子供が報告ボタンを押した0.1秒後に、親の画面で「承認待ち」のバッジが光る
 * - この「同期の快感」を極限まで高める
 */
export default function TaskPage() {
  const { user, loading } = useAuth();
  const { showToast, ToastContainer } = useToast();

  // ローディング中
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        読み込み中...
      </div>
    );
  }

  // 未ログイン
  if (!user) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        ログインしてください
      </div>
    );
  }

  // タスク更新時のコールバック（一覧を再取得するためのトリガー）
  const handleTaskUpdate = () => {
    // TaskList は onSnapshot でリアルタイム同期しているため、
    // 自動的に更新される。ここでは成功メッセージを表示するのみ。
    showToast('更新しました', 'success');
  };

  // エラー時のコールバック
  const handleError = (error: string) => {
    showToast(error, 'error');
  };

  // タスクカードのレンダリング関数
  const renderTask = (task: TaskData) => (
    <TaskCard
      task={task}
      currentUser={user}
      onTaskUpdate={handleTaskUpdate}
      onError={handleError}
    />
  );

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '24px',
      backgroundColor: '#f9f9f9',
      minHeight: '100vh'
    }}>
      {/* ヘッダー */}
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '32px', 
          fontWeight: 'bold',
          color: '#333'
        }}>
          タスク管理
        </h1>
        <p style={{ 
          margin: 0, 
          fontSize: '16px', 
          color: '#666'
        }}>
          {user.role === 'parent' ? '子供にタスクを投稿しましょう' : 'タスクを完了して報酬を獲得しましょう'}
        </p>
        <div style={{ 
          marginTop: '16px',
          padding: '12px 16px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          border: '1px solid #ddd'
        }}>
          <div style={{ fontSize: '14px', color: '#666' }}>
            ようこそ、<strong>{user.name}</strong> さん
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
            役割: <strong>{user.role === 'parent' ? '親' : '子供'}</strong> | 
            総報酬: <strong style={{ color: '#4CAF50' }}>{user.totalReward} ポイント</strong>
          </div>
        </div>
      </header>

      {/* 親: タスク投稿フォーム */}
      {user.role === 'parent' && (
        <section style={{ marginBottom: '32px' }}>
          <TaskForm
            currentUser={user}
            onSuccess={() => showToast('タスクを投稿しました', 'success')}
            onError={handleError}
          />
        </section>
      )}

      {/* タスク一覧（リアルタイム同期） */}
      <section>
        <TaskList
          currentUser={user}
          onError={handleError}
          renderTask={renderTask}
        />
      </section>

      {/* トースト通知コンテナ */}
      <ToastContainer />
    </div>
  );
}

// Made with Bob
// 「家族の経済圏」を支えるインフラ
// お父さんとお母さんの「ありがとう」と、子供たちの「頑張ったよ」をリアルタイムで繋ぐ