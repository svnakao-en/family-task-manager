"use client";

import { useState, useEffect, useRef, FormEvent } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserData, TaskCategory } from '@/types';
import { AVAILABLE_THEMES, THEME_MAP } from '@/context/ThemeContext';
import { useWorldTheme } from '@/hooks/useWorldTheme';
import { taskDataToFirestore } from '@/lib/taskUtils';

// ─── カテゴリー選択肢（世界観に依存しないドメイン語彙） ──────────────────────
const CATEGORY_OPTIONS: { value: TaskCategory; label: string; icon: string }[] = [
  { value: 'exercise',  label: '運動・肉体労働', icon: '🏋️' },
  { value: 'study',     label: '勉強・知力',     icon: '✏️' },
  { value: 'housework', label: '家事・作業',     icon: '🧹' },
  { value: 'help',      label: 'お手伝い・貢献', icon: '🤝' },
  { value: 'life',      label: '生活・その他',   icon: '🧘' },
];

// ─── Props ────────────────────────────────────────────────────────────────────
export interface InitialTaskData {
  title: string;
  description?: string;
  rewardPoints: number;
  assignedTo?: string;
  category?: TaskCategory;
}

interface TaskFormProps {
  currentUser: UserData;
  initialData?: InitialTaskData;
  onInitialDataUsed?: () => void;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface ChildOption {
  userId: string;
  name: string;
}

export function TaskForm({
  currentUser,
  initialData,
  onInitialDataUsed,
  onSuccess,
  onError,
}: TaskFormProps): JSX.Element | null {
  // ─ フック（すべて無条件に先頭で呼び出す） ─────────────────────────────────
  const { themeConfig, colors, effects, setTheme, currentThemeId } = useWorldTheme();
  const isAliceMode = currentThemeId === 'alice';
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rewardPoints, setRewardPoints] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [category, setCategory] = useState<TaskCategory>('housework');
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [submitHovered, setSubmitHovered] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // initialData が渡されたらフォームに注入してスクロール
  useEffect(() => {
    if (!initialData) return;
    setTitle(initialData.title);
    setDescription(initialData.description ?? '');
    setRewardPoints(String(initialData.rewardPoints));
    setAssignedTo(initialData.assignedTo ?? '');
    if (initialData.category) setCategory(initialData.category);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onInitialDataUsed?.();
  }, [initialData]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!currentUser.familyId) return;

    const fetchChildren = async () => {
      try {
        const membersSnap = await getDocs(
          query(
            collection(db, 'family_members'),
            where('family_id', '==', currentUser.familyId),
            where('role', '==', 'child')
          )
        );
        const userIds = membersSnap.docs.map((doc) => doc.data().user_id as string);
        if (userIds.length === 0) return;

        const usersSnap = await getDocs(
          query(collection(db, 'users'), where('__name__', 'in', userIds))
        );
        const childOptions: ChildOption[] = usersSnap.docs.map((doc) => ({
          userId: doc.id,
          name: doc.data().name as string,
        }));
        setChildren(childOptions);
      } catch (err) {
        console.error('子供一覧取得エラー:', err);
      }
    };

    fetchChildren();
  }, [currentUser.familyId]);

  // ─ ガード: 親以外には表示しない ───────────────────────────────────────────
  if (currentUser.role !== 'parent') {
    return null;
  }

  // ─ ガード: familyId が存在しない場合はエラー表示 ──────────────────────────
  if (!currentUser.familyId) {
    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: colors.errorBg,
          border: `1px solid ${colors.errorText}`,
          borderRadius: '4px',
        }}
      >
        <p
          style={{
            margin: 0,
            color: colors.errorText,
            fontFamily: 'monospace',
            fontSize: '13px',
            letterSpacing: '0.05em',
          }}
        >
          [ERROR] FAMILY_ID NOT FOUND — 役割選択画面から家族を作成してください
        </p>
      </div>
    );
  }

  // ─ handleSubmit ─────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!title.trim()) {
      const errorMessage = 'タスク名を入力してください';
      onError ? onError(errorMessage) : alert(errorMessage);
      return;
    }

    const points = parseInt(rewardPoints, 10);
    if (isNaN(points) || points < 1) {
      const errorMessage = '報酬ポイントは1以上の整数を入力してください';
      onError ? onError(errorMessage) : alert(errorMessage);
      return;
    }

    setIsLoading(true);

    try {
      const taskData = {
        familyId: currentUser.familyId,
        title: title.trim(),
        description: description.trim() || undefined,
        rewardPoints: points,
        category: category,
        status: 'pending' as const,
        createdBy: currentUser.userId,
        createdAt: new Date(),
        ...(assignedTo ? { assignedTo } : {}),
      };

      const firestoreData = taskDataToFirestore(taskData);

      await addDoc(collection(db, 'tasks'), {
        ...firestoreData,
        created_at: serverTimestamp(),
      });

      setTitle('');
      setDescription('');
      setRewardPoints('');
      setAssignedTo('');
      setCategory('housework');

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('タスク投稿エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'タスクの投稿に失敗しました';
      onError ? onError(errorMessage) : alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── 共通スタイル定義 ─────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    fontSize: '14px',
    fontFamily: 'monospace',
    backgroundColor: colors.inputBg,
    color: colors.text,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: '4px',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '11px',
    fontWeight: 'bold',
    letterSpacing: '0.1em',
    fontFamily: 'monospace',
    color: colors.subtle,
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      style={{
        padding: '20px',
        backgroundColor: 'transparent',
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: '8px',
      }}
    >
      <h2
        style={{
          marginTop: 0,
          marginBottom: '20px',
          fontSize: '15px',
          fontWeight: 'bold',
          fontFamily: 'monospace',
          letterSpacing: '0.15em',
          color: colors.title,
        }}
      >
        ▌ GAME ISSUE CONSOLE — げぇむ発給
      </h2>

      {/* ── SYSTEM ARCHITECTURE MODE（テーマ切り替えセグメント） ──────────── */}
      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>SYSTEM ARCHITECTURE MODE (世界観設定)</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {AVAILABLE_THEMES.map((optionId) => {
            const optionTheme = THEME_MAP[optionId];
            const identityColor = optionTheme.colors.primary;
            const isActive = currentThemeId === optionId;
            const activeStyle = themeConfig.mkActiveStyle(identityColor);
            return (
              <button
                key={optionId}
                type="button"
                onClick={() => setTheme(optionId)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  backgroundColor: isActive ? activeStyle.bgActive : 'transparent',
                  border: `${isActive && !isAliceMode ? '2' : '1'}px solid ${isActive ? identityColor : colors.cardBorder}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  letterSpacing: '0.04em',
                  color: isActive ? identityColor : colors.muted,
                  transition: 'all 0.2s',
                  boxShadow: isActive ? activeStyle.boxShadow : 'none',
                  textShadow: isActive ? activeStyle.textShadow : 'none',
                }}
              >
                {optionTheme.displayName}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── カテゴリー選択パネル ──────────────────────────────────────────── */}
      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>CATEGORY (タスク種別)</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {CATEGORY_OPTIONS.map((opt) => {
            const presentation = themeConfig.getCategoryPresentation(opt.value);
            const isSelected = category === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCategory(opt.value)}
                style={{
                  flex: '1 1 calc(33% - 6px)',
                  minWidth: '80px',
                  padding: '10px 6px',
                  backgroundColor: isSelected ? presentation.bgActive : 'transparent',
                  border: `${isSelected && !isAliceMode ? '2' : '1'}px solid ${isSelected ? presentation.color : colors.cardBorder}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  transition: 'all 0.2s',
                  boxShadow: isSelected ? presentation.boxShadow : 'none',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '18px',
                    lineHeight: '1.2',
                    color: isSelected ? presentation.color : colors.muted,
                    fontWeight: isSelected && !isAliceMode ? 'bold' : 'normal',
                    textShadow: isSelected ? presentation.textShadow : 'none',
                  }}
                >
                  {opt.icon}
                </div>
                <div
                  style={{
                    fontSize: '9px',
                    fontWeight: isSelected && !isAliceMode ? 'bold' : 'normal',
                    letterSpacing: '0.05em',
                    color: isSelected ? presentation.color : colors.muted,
                    marginTop: '4px',
                    lineHeight: '1.3',
                    textShadow: isSelected ? presentation.textShadow : 'none',
                  }}
                >
                  {opt.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── GAME TITLE ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="task-title" style={labelStyle}>
          GAME TITLE (げぇむ名) <span style={{ color: colors.accent }}>*</span>
        </label>
        <input
          id="task-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例: 部屋の掃除"
          disabled={isLoading}
          required
          style={inputStyle}
        />
      </div>

      {/* ── DETAILS ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="task-description" style={labelStyle}>
          DETAILS (詳細ルール)
        </label>
        <textarea
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="例: リビングと自分の部屋を掃除してください"
          disabled={isLoading}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {/* ── DIFFICULTY LEVEL ────────────────────────────────────────────── */}
      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="task-reward" style={labelStyle}>
          DIFFICULTY LEVEL (難易度/ビザ報酬pt) <span style={{ color: colors.accent }}>*</span>
        </label>
        <input
          id="task-reward"
          type="number"
          value={rewardPoints}
          onChange={(e) => setRewardPoints(e.target.value)}
          placeholder="1以上の整数"
          disabled={isLoading}
          min="1"
          step="1"
          required
          style={inputStyle}
        />
      </div>

      {/* ── TARGET PLAYER ───────────────────────────────────────────────── */}
      {children.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="task-assignee" style={labelStyle}>
            TARGET PLAYER (指名プレイヤー)
          </label>
          <select
            id="task-assignee"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            disabled={isLoading}
            style={{ ...inputStyle, backgroundColor: colors.inputBg }}
          >
            <option value="">指名なし（先着順）</option>
            {children.map((child) => (
              <option key={child.userId} value={child.userId}>
                {child.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── 発給ボタン ──────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={isLoading}
        onMouseEnter={() => setSubmitHovered(true)}
        onMouseLeave={() => setSubmitHovered(false)}
        style={{
          width: '100%',
          padding: '12px',
          fontSize: '13px',
          fontWeight: 'bold',
          letterSpacing: '0.15em',
          fontFamily: 'monospace',
          color: isLoading ? colors.btnDisabledText : colors.accent,
          backgroundColor: 'transparent',
          border: `1px solid ${isLoading ? colors.btnDisabledBg : submitHovered ? colors.accent : colors.accentStrong}`,
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          boxShadow:
            !isLoading && submitHovered
              ? effects.enableGlowCardHover
                ? `0 0 20px ${colors.accentStrong}, inset 0 0 10px ${colors.accentSoft}`
                : effects.cardHoverShadow
              : 'none',
        }}
      >
        {isLoading ? '[ ISSUING... ]' : '▶ ISSUE GAME — げぇむを発給する'}
      </button>
    </form>
  );
}

// Made with Bob
