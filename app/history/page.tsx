"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useWorldTheme } from '@/hooks/useWorldTheme';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { buildTaskData } from '@/lib/taskUtils';
import { TaskData } from '@/types';

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { colors } = useWorldTheme();

  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userNameMap, setUserNameMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (loading || !user || !user.familyId) return;

    const fetchHistory = async () => {
      setIsFetching(true);
      setError(null);

      try {
        const tasksRef = collection(db, 'tasks');

        const taskQuery = user.role === 'parent'
          ? query(
              tasksRef,
              where('family_id', '==', user.familyId),
              where('status', '==', 'approved'),
              orderBy('approved_at', 'desc')
            )
          : query(
              tasksRef,
              where('family_id', '==', user.familyId),
              where('status', '==', 'approved'),
              where('assigned_to', '==', user.userId),
              orderBy('approved_at', 'desc')
            );

        if (user.role === 'parent') {
          const membersQuery = query(
            collection(db, 'family_members'),
            where('family_id', '==', user.familyId)
          );

          const [taskSnapshot, membersSnapshot] = await Promise.all([
            getDocs(taskQuery),
            getDocs(membersQuery),
          ]);

          const userIds = membersSnapshot.docs.map(
            (doc) => doc.data().user_id as string
          );

          if (userIds.length > 0) {
            const usersSnapshot = await getDocs(
              query(
                collection(db, 'users'),
                where('__name__', 'in', userIds)
              )
            );

            const nameMap = new Map<string, string>();
            usersSnapshot.docs.forEach((doc) => {
              nameMap.set(doc.id, doc.data().name as string);
            });
            setUserNameMap(nameMap);
          }

          const historyTasks: TaskData[] = taskSnapshot.docs.map((doc) =>
            buildTaskData(doc.data(), doc.id)
          );
          setTasks(historyTasks);

        } else {
          const taskSnapshot = await getDocs(taskQuery);
          const historyTasks: TaskData[] = taskSnapshot.docs.map((doc) =>
            buildTaskData(doc.data(), doc.id)
          );
          setTasks(historyTasks);
        }

      } catch (err) {
        console.error('履歴取得エラー:', err);
        if (err instanceof Error) {
          console.error('エラーコード:', (err as any).code);
        }
        setError('履歴の取得に失敗しました。再読み込みしてください。');
      } finally {
        setIsFetching(false);
      }
    };

    fetchHistory();
  }, [user, loading]);

  if (loading || isFetching) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', color: colors.muted }}>
        読み込み中...
      </div>
    );
  }

  if (!user) return null;

  return (
    <main style={{
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'sans-serif',
      color: colors.text,
    }}>
      <header style={{
        borderBottom: `2px solid ${colors.cardBorder}`,
        paddingBottom: '20px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
              backgroundColor: colors.panelBgMuted,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: '4px',
              cursor: 'pointer',
              color: colors.text,
            }}
          >
            ← 戻る
          </button>
          <h1 style={{ fontSize: '24px', margin: 0 }}>
            {user.role === 'parent' ? '📋 承認履歴（家族全員）' : '🏆 自分の獲得履歴'}
          </h1>
        </div>
        <p style={{ color: colors.subtle, margin: '10px 0 0 0', fontSize: '14px' }}>
          ログイン中: {user.email}
        </p>
      </header>

      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: colors.errorBg,
          color: colors.errorText,
          borderRadius: '6px',
          marginBottom: '20px',
          fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      {tasks.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: colors.muted,
          fontSize: '16px',
        }}>
          {user.role === 'parent'
            ? 'まだ承認済みのタスクがありません。'
            : 'まだ獲得した報酬がありません。お手伝いをしてみよう！'}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {tasks.map((task) => (
            <li
              key={task.taskId}
              style={{
                padding: '16px',
                marginBottom: '12px',
                backgroundColor: colors.cardBg,
                borderRadius: '8px',
                border: `1px solid ${colors.cardBorder}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div>
                <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '16px' }}>
                  {task.title}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: colors.muted }}>
                  承認日: {task.approvedAt
                    ? task.approvedAt.toLocaleDateString('ja-JP')
                    : '不明'}
                </p>
                {user.role === 'parent' && task.assignedTo && (
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: colors.muted }}>
                    担当: {userNameMap.get(task.assignedTo) ?? task.assignedTo}
                  </p>
                )}
              </div>

              <div style={{
                padding: '6px 14px',
                backgroundColor: colors.successBg,
                color: colors.successText,
                borderRadius: '50px',
                fontWeight: 'bold',
                fontSize: '16px',
                whiteSpace: 'nowrap',
              }}>
                +{task.rewardPoints} pt
              </div>
            </li>
          ))}
        </ul>
      )}

      {user.role === 'child' && tasks.length > 0 && (
        <div style={{
          marginTop: '24px',
          padding: '16px 20px',
          backgroundColor: colors.warningBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontWeight: 'bold', color: colors.warningText }}>
            獲得ポイント合計
          </span>
          <span style={{ fontSize: '22px', fontWeight: 'bold', color: colors.warningText }}>
            {tasks.reduce((sum, t) => sum + t.rewardPoints, 0)} pt
          </span>
        </div>
      )}

      <footer style={{
        marginTop: '40px',
        paddingTop: '20px',
        borderTop: `1px solid ${colors.cardBorder}`,
        fontSize: '12px',
        color: colors.muted,
        textAlign: 'center',
      }}>
        Family Reward App — Built by Claude (sub for Bob)
      </footer>
    </main>
  );
}
