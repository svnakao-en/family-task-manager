"use client";

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserData, TaskData } from '@/types';
import { buildTaskData } from '@/lib/taskUtils';
import { EmptyState } from './EmptyState';
import { useWorldTheme } from '@/hooks/useWorldTheme';

/**
 * TaskList コンポーネントのProps
 */
interface TaskListProps {
  currentUser: UserData;
  onError?: (error: string) => void;
  renderTask: (task: TaskData) => JSX.Element; // タスクカードのレンダリング関数
  onTasksLoaded?: (tasks: TaskData[]) => void; // ← これを追加
}

/**
 * タスク一覧コンポーネント（リアルタイム同期）
 *
 * 鉄則:
 * 1. リアルタイム性: onSnapshot を使い、家族の誰かがタスクを投稿・完了・承認した瞬間に全員の画面が動く
 * 2. 型変換の門番: querySnapshot の生データ（snake_case）をUIに直接漏らすな。必ず buildTaskData で洗浄
 * 3. フィルタリング: where("family_id", "==", currentUser.familyId) は必須。他人の家のタスクが見えたら即クビ
 */
export function TaskList({
  currentUser,
  onError,
  renderTask,
  onTasksLoaded, // ← これを追加！
}: TaskListProps): JSX.Element {
  const { colors } = useWorldTheme();
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // ガード: familyId が存在しない場合は何もしない
    if (!currentUser.familyId) {
      setIsLoading(false);
      return;
    }

    // クエリの作成: 自分の家族のタスクのみ取得（作成日時の降順でソート）
    // 注意: このクエリには複合インデックスが必要
    // Firebase Console で以下のインデックスを作成すること:
    // Collection: tasks
    // Fields: family_id (Ascending), created_at (Descending)
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('family_id', '==', currentUser.familyId),
      orderBy('created_at', 'desc')
    );

    // リアルタイムリスナーの設定
    const unsubscribe = onSnapshot(
      tasksQuery,
      (querySnapshot: QuerySnapshot<DocumentData>) => {
        try {
          // 型変換の門番: snake_case → camelCase
          const tasksData: TaskData[] = [];
          
          querySnapshot.forEach((doc) => {
            try {
              // buildTaskData で洗浄（マッピング）
              const taskData = buildTaskData(doc.data(), doc.id);
              tasksData.push(taskData);
            } catch (error) {
              console.error(`タスク ${doc.id} の変換エラー:`, error);
              // 個別のタスクの変換エラーは無視して続行
            }
          });

          // ステータスと作成日時でソート
          // pending → completed → approved の順
          // 同じステータス内では新しい順
          tasksData.sort((a, b) => {
            const statusOrder = { pending: 0, working: 1, completed: 2, approved: 3 };
            const statusDiff = statusOrder[a.status] - statusOrder[b.status];
            
            if (statusDiff !== 0) {
              return statusDiff;
            }
            
            // 同じステータスなら新しい順
            return b.createdAt.getTime() - a.createdAt.getTime();
          });

          setTasks(tasksData);
          if (onTasksLoaded) {
            onTasksLoaded(tasksData); // 監督（親）に報告！
          }
          setIsLoading(false);
        } catch (error) {
          console.error('タスク一覧の処理エラー:', error);
          const errorMessage = error instanceof Error ? error.message : 'タスク一覧の取得に失敗しました';
          
          if (onError) {
            onError(errorMessage);
          }
          
          setIsLoading(false);
        }
      },
      (error) => {
        console.error('タスク一覧のリアルタイム取得エラー:', error);
        const errorMessage = 'タスク一覧のリアルタイム取得に失敗しました';
        
        if (onError) {
          onError(errorMessage);
        }
        
        setIsLoading(false);
      }
    );

    // クリーンアップ: コンポーネントのアンマウント時にリスナーを解除
    return () => {
      unsubscribe();
    };
  }, [currentUser.familyId, onError]);

  // ローディング中
  if (isLoading) {
    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <p>タスクを読み込み中...</p>
      </div>
    );
  }

  // familyId が存在しない場合
  if (!currentUser.familyId) {
    return (
      <div style={{ padding: '16px', backgroundColor: colors.warningBg, borderRadius: '4px' }}>
        <p style={{ margin: 0, color: colors.warningText }}>
          家族IDが設定されていません。役割選択画面から家族を作成または参加してください。
        </p>
      </div>
    );
  }

  // タスクが存在しない場合
  if (tasks.length === 0) {
    return (
      <EmptyState
        message="まだタスクがありません"
        submessage={
          currentUser.role === 'parent'
            ? '上のフォームから新しいタスクを投稿してください'
            : '親がタスクを投稿するまでお待ちください'
        }
        icon="📝"
      />
    );
  }

  // タスク一覧を表示
  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ marginTop: 0, marginBottom: '16px', fontSize: '20px', fontWeight: 'bold' }}>
        タスク一覧（{tasks.length}件）
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {tasks.map((task) => (
          <div key={task.taskId}>
            {renderTask(task)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Made with Bob