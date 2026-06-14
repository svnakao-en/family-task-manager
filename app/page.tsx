"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useWorldTheme } from '@/hooks/useWorldTheme';
import LoginForm from '@/components/LoginForm';
import { TaskList } from '@/components/TaskList';
import { TaskCard } from '@/components/TaskCard';
import { TaskForm, InitialTaskData } from '@/components/TaskForm';
import { TaskData } from '@/types';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { colors, effects } = useWorldTheme();
  const [userNameMap, setUserNameMap] = useState<Map<string, string>>(new Map());
  const [initialTaskData, setInitialTaskData] = useState<InitialTaskData | undefined>();

  useEffect(() => {
    if (!loading && user && (!user.role || user.role === 'unknown')) {
      router.push('/auth/role-selection');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (loading || !user || !user.familyId) return;

    const fetchUserNames = async () => {
      try {
        if (user.role === 'parent') {
          const membersSnapshot = await getDocs(
            query(collection(db, 'family_members'), where('family_id', '==', user.familyId))
          );
          const userIds = membersSnapshot.docs.map((doc) => doc.data().user_id as string);
          if (userIds.length === 0) return;

          const usersSnapshot = await getDocs(
            query(collection(db, 'users'), where('__name__', 'in', userIds))
          );

          const nameMap = new Map<string, string>();
          usersSnapshot.docs.forEach((doc) => {
            nameMap.set(doc.id, doc.data().name as string);
          });
          setUserNameMap(nameMap);
        } else {
          const nameMap = new Map<string, string>();
          nameMap.set(user.userId, user.name);
          setUserNameMap(nameMap);
        }
      } catch (err) {
        console.error('ユーザー名取得エラー:', err);
      }
    };

    fetchUserNames();
  }, [user, loading]);

  if (loading) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center', color: colors.primary, fontFamily: 'monospace', fontSize: '18px', height: '100vh' }}>
        📡 RESETTING THE BORDERLINE...
      </div>
    );
  }

  if (!user) return <LoginForm />;

  const handleCopy = (task: TaskData) => {
    setInitialTaskData({
      title: task.title,
      description: task.description,
      rewardPoints: task.rewardPoints,
      assignedTo: task.assignedTo,
    });
  };

  return (
    <main style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'monospace, sans-serif', minHeight: '100vh' }}>

      {/* 緊迫のヘッダー：今際の国仕様 */}
      <header style={{ borderBottom: `1px dashed ${colors.cardBorder}`, paddingBottom: '20px', marginBottom: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
          <div>
            <h1 style={{ fontSize: '22px', margin: 0, fontWeight: 'bold', color: colors.title, letterSpacing: '2px' }}>
              {user.role === 'parent' ? '👁️ ディーラー管理画面 (親)' : '🃏 げぇむ会場へようこそ (子)'}
            </h1>
            <p style={{ color: colors.muted, margin: '5px 0 0 0', fontSize: '12px' }}>ID: {user.email}</p>
          </div>
          <Link
            href="/history"
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: '4px',
              fontSize: '12px',
              textDecoration: 'none',
              color: colors.subtle,
              letterSpacing: '1px',
              transition: 'all 0.3s',
            }}
          >
            📊 過去のげぇむログ
          </Link>
        </div>

        {/* 子判定：現在の残りビザ（お小遣いポイント） */}
        {user.role === 'child' && (
          <div style={{
            margin: '15px 0 5px 0',
            padding: '15px 20px',
            backgroundColor: colors.statusBadgeBg,
            border: `1px solid ${colors.accent}`,
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: effects.enableGlowCardHover
              ? `0 0 15px ${colors.accentStrong}`
              : effects.cardHoverShadow,
          }}>
            <span style={{ fontSize: '14px', color: colors.accent, fontWeight: 'bold', letterSpacing: '1px' }}>
              ⚠️ あなたの滞在ビザ（所持お小遣い）
            </span>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: colors.accent, fontFamily: 'monospace' }}>
              残り <span style={{
                fontSize: '32px',
                textShadow: effects.enableGlowText ? `0 0 8px ${colors.accent}` : 'none',
              }}>{user.totalReward || 0}</span> 日 (pt)
            </div>
          </div>
        )}
      </header>

      {/* ナビゲーションハブ */}
      {user.role === 'child' && (
        <section style={{ marginBottom: '30px' }}>
          <Link
            href="/store"
            style={{
              display: 'block',
              textDecoration: 'none',
              backgroundColor: colors.cardBg,
              border: `1px solid ${colors.primary}`,
              borderRadius: '6px',
              padding: '18px 20px',
              boxShadow: effects.enableGlowCardHover
                ? `0 0 10px ${colors.primaryStrong}`
                : effects.cardHoverShadow,
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: colors.primary, marginBottom: '6px', letterSpacing: '1px' }}>
              🛍️ 物資調達エリア（ご褒美ストア）へ進む
            </div>
            <div style={{ fontSize: '13px', color: colors.subtle, lineHeight: '1.4' }}>
              獲得したビザ（ポイント）を消費し、お菓子や特権などの「報酬」と交換可能。
            </div>
          </Link>
        </section>
      )}

      {user.role === 'parent' && (
        <section style={{ marginBottom: '30px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: '6px',
              padding: '16px 20px',
              gap: '16px',
            }}
          >
            <div style={{ fontSize: '13px', color: colors.subtle, lineHeight: '1.4' }}>
              ⚙️ ディーラー権限：配給物資（ご褒美の追加・編集）および在庫管理用コンソール。
            </div>
            <Link
              href="/parent/rewards"
              style={{
                flexShrink: 0,
                padding: '10px 20px',
                backgroundColor: 'transparent',
                color: colors.primary,
                border: `1px solid ${colors.primary}`,
                borderRadius: '4px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                boxShadow: effects.enableGlowCardHover
                  ? `0 0 8px ${colors.primaryStrong}`
                  : 'none',
              }}
            >
              ご褒美マスター管理
            </Link>
          </div>
        </section>
      )}

      {/* タスク作成（ディーラー専用） */}
      {user.role === 'parent' && (
        <section style={{ marginBottom: '35px', padding: '20px', backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: '6px' }}>
          <h2 style={{ fontSize: '16px', margin: '0 0 15px 0', color: colors.title, letterSpacing: '1px' }}>🃏 新規げぇむ（お手伝い）の発給</h2>
          <TaskForm
            currentUser={user}
            initialData={initialTaskData}
            onInitialDataUsed={() => setInitialTaskData(undefined)}
          />
        </section>
      )}

      {/* げぇむ一覧（メインフィールド） */}
      <section>
        <h2 style={{ fontSize: '16px', margin: '0 0 15px 0', color: colors.title, letterSpacing: '1px', borderLeft: `3px solid ${colors.primary}`, paddingLeft: '10px' }}>
          ACTIVE GAMES（現在発給中のげぇむ）
        </h2>
        <TaskList
          currentUser={user}
          renderTask={(task: TaskData) => (
            <TaskCard
              key={task.taskId}
              task={task}
              currentUser={user}
              userNameMap={userNameMap}
              onTaskUpdate={() => {}}
              onCopy={handleCopy}
            />
          )}
        />
      </section>

      <footer style={{ marginTop: '60px', paddingTop: '20px', borderTop: `1px dashed ${colors.cardBorder}`, fontSize: '11px', color: colors.muted, textAlign: 'center', letterSpacing: '2px' }}>
        NEXT-GEN GAME INTERFACE — VISUAL VERSION 1.0
      </footer>
    </main>
  );
}
