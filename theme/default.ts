import { TaskData, TaskCategory } from '@/types';
import { SuitType, TaskPresentation, WorldTheme, CategoryPresentation, ActiveButtonStyle } from './types';

// ─── スート定数 ───────────────────────────────────────────────────────────────
const SUITS: readonly SuitType[] = ['spade', 'diamond', 'clover', 'heart'];

const SUIT_GLOW: Record<SuitType, string> = {
  spade:   '#607D8B',
  diamond: '#9C27B0',
  clover:  '#4CAF50',
  heart:   '#E91E63',
};

const SUIT_LABEL: Record<SuitType, string> = {
  spade:   'タスク',
  diamond: 'タスク',
  clover:  'タスク',
  heart:   'タスク',
};

// ─── カテゴリー→スート マッピング定数 ─────────────────────────────────────────
const CATEGORY_TO_SUIT: Record<TaskCategory, SuitType> = {
  exercise:  'spade',
  study:     'diamond',
  housework: 'clover',
  help:      'clover',
  life:      'heart',
};

/** カテゴリーの日本語表示ラベル */
const CATEGORY_LABEL: Record<TaskCategory, string> = {
  exercise:  '運動',
  study:     '勉強',
  housework: '家事',
  help:      '手伝い',
  life:      '生活',
};

/**
 * task.category が有効な TaskCategory かどうかを型安全に検証する型ガード。
 * undefined・タイポ・未知の値はすべて false で受け止める。
 */
function isValidCategory(cat: unknown): cat is TaskCategory {
  return typeof cat === 'string' && cat in CATEGORY_TO_SUIT;
}

/**
 * タスクIDの文字コード総和から決定論的にスートへマッピングする。
 * - 同じ taskId は常に同じスートになる（ランダム性なし）
 * - ルーティングや SSR をまたいでも結果が一致する
 */
function suitFromTaskId(taskId: string): SuitType {
  let sum = 0;
  for (let i = 0; i < taskId.length; i++) {
    sum += taskId.charCodeAt(i);
  }
  return SUITS[sum % SUITS.length];
}

// ─── カテゴリー別プレゼンテーション（日常テーマ：落ち着いたパステル） ──────────
const CATEGORY_PRESENTATION: Record<TaskCategory, CategoryPresentation> = {
  exercise: {
    color:      '#607D8B',
    bgActive:   'rgba(96, 125, 139, 0.13)',
    boxShadow:  '',
    textShadow: '',
  },
  study: {
    color:      '#9C27B0',
    bgActive:   'rgba(156, 39, 176, 0.13)',
    boxShadow:  '',
    textShadow: '',
  },
  housework: {
    color:      '#4CAF50',
    bgActive:   'rgba(76, 175, 80, 0.13)',
    boxShadow:  '',
    textShadow: '',
  },
  help: {
    color:      '#4CAF50',
    bgActive:   'rgba(76, 175, 80, 0.13)',
    boxShadow:  '',
    textShadow: '',
  },
  life: {
    color:      '#E91E63',
    bgActive:   'rgba(233, 30, 99, 0.13)',
    boxShadow:  '',
    textShadow: '',
  },
};

// ─── テーマ切り替えボタン用アクティブスタイル ────────────────────────────────
const IDENTITY_ACTIVE_STYLES: Partial<Record<string, ActiveButtonStyle>> = {
  '#4CAF50': { bgActive: 'rgba(76, 175, 80, 0.13)',  boxShadow: '', textShadow: '' },
  '#00f0ff': { bgActive: 'rgba(0, 240, 255, 0.13)',  boxShadow: '', textShadow: '' },
};

// ─── デフォルトテーマ（ほのぼのファミリー向け） ──────────────────────────────
export const defaultTheme: WorldTheme = {
  displayName: '🧹 通常モード（日常）',

  labels: {
    task:   'タスク',
    reward: 'ご褒美',
    point:  'ポイント',
  },

  colors: {
    // 既存
    primary:    '#4CAF50',
    background: '#f6f8fa',
    accent:     '#FF9800',
    panelBg:    '#ffffff',
    border:     '#d0d7de',
    // セマンティックカラー
    bodyBg:           '#f6f8fa',
    cardBg:           '#ffffff',
    cardBorder:       '#d0d7de',
    cardHoverBorder:  '#0969da',
    title:            '#1f2328',
    text:             '#24292f',
    subtle:           '#57606a',
    muted:            '#8c959f',
    statusBadgeText:  '#24292f',
    statusBadgeBorder:'#d0d7de',
    statusBadgeBg:    '#eff1f3',
    inputBg:          '#ffffff',
    // 状態カラー
    panelBgMuted: '#eaeef2',
    link:         '#0969da',
    successBg:    '#dafbe1',
    successText:  '#1a7f37',
    errorBg:      '#ffebe9',
    errorText:    '#cf222e',
    warningBg:    '#fff8c5',
    warningText:  '#9a6700',
    // ボタン4系統
    btnPrimaryBg:   '#0969da',
    btnPrimaryText: '#ffffff',
    btnSuccessBg:   '#1a7f37',
    btnSuccessText: '#ffffff',
    btnDangerBg:    '#cf222e',
    btnDangerText:  '#ffffff',
    btnDisabledBg:  '#eff1f3',
    btnDisabledText:'#8c959f',
    // α事前合成トークン（accent = #FF9800）
    accentSoft:   'rgba(255, 152, 0, 0.08)',
    accentStrong: 'rgba(255, 152, 0, 0.44)',
    // α事前合成トークン（primary = #4CAF50）
    primarySoft:   'rgba(76, 175, 80, 0.08)',
    primaryStrong: 'rgba(76, 175, 80, 0.38)',
  },

  effects: {
    enableGlowText:      false,
    enableGlowCardHover: false,
    cardHoverShadow:     '0 4px 12px rgba(0, 0, 0, 0.08)',
    cardShadow:          '0 2px 10px rgba(0, 0, 0, 0.08)',
  },

  icons: {
    task:   '📋',
    reward: '🎁',
  },

  statusLabels: {
    pending:   '未着手',
    working:   '作業中',
    completed: '完了（承認待ち）',
    approved:  '承認済み',
  },

  getCategoryPresentation(category: TaskCategory): CategoryPresentation {
    return CATEGORY_PRESENTATION[category];
  },

  mkActiveStyle(color: string): ActiveButtonStyle {
    return IDENTITY_ACTIVE_STYLES[color] ?? {
      bgActive:   'rgba(128, 128, 128, 0.13)',
      boxShadow:  '',
      textShadow: '',
    };
  },

  getTaskPresentation(task: TaskData): TaskPresentation {
    // ① category が有効なら確定マッピング（日本語ラベルで表示）
    if (isValidCategory(task.category)) {
      const suit = CATEGORY_TO_SUIT[task.category];
      return {
        suit,
        label:           CATEGORY_LABEL[task.category],
        glowColor:       SUIT_GLOW[suit],
        cardHoverShadow: '',
      };
    }

    // ② category 未定義 or 未知値 → IDハッシュへフォールバック（既存レコード救済）
    const suit = suitFromTaskId(task.taskId);
    return {
      suit,
      label:           SUIT_LABEL[suit],
      glowColor:       SUIT_GLOW[suit],
      cardHoverShadow: '',
    };
  },
};
