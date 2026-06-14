import { TaskData, TaskCategory } from '@/types';
import { SuitType, TaskPresentation, WorldTheme, CategoryPresentation, ActiveButtonStyle } from './types';

// ─── スート定数 ───────────────────────────────────────────────────────────────
const SUITS: readonly SuitType[] = ['spade', 'diamond', 'clover', 'heart'];

/** アリス世界観のネオンカラー */
const SUIT_GLOW: Record<SuitType, string> = {
  spade:   '#00f0ff', // ネオンシアン  ─ 肉体型
  diamond: '#ffea00', // ネオンイエロー ─ 知力型
  clover:  '#39ff14', // ネオングリーン ─ 協調型
  heart:   '#ff0055', // ネオンレッド  ─ 心理型
};

/** スートの表示ラベル */
const SUIT_LABEL: Record<SuitType, string> = {
  spade:   '♠︎ SPADE（肉体型）',
  diamond: '♦︎ DIAMOND（知力型）',
  clover:  '♣︎ CLOVER（協調型）',
  heart:   '♥︎ HEART（心理型）',
};

// ─── カテゴリー→スート マッピング定数 ─────────────────────────────────────────
const CATEGORY_TO_SUIT: Record<TaskCategory, SuitType> = {
  exercise:  'spade',
  study:     'diamond',
  housework: 'clover',
  help:      'clover',
  life:      'heart',
};

/**
 * task.category が有効な TaskCategory かどうかを型安全に検証する型ガード。
 * undefined・null・タイポなど「型定義をすり抜けた未知の値」もすべて false で受け止める。
 */
function isValidCategory(cat: unknown): cat is TaskCategory {
  return typeof cat === 'string' && cat in CATEGORY_TO_SUIT;
}

// ─── キーワード→スート マッピングテーブル ────────────────────────────────────
// 優先度: 先に定義したエントリが優先される（早期リターン設計）
const KEYWORD_SUIT_MAP: ReadonlyArray<{ keywords: readonly string[]; suit: SuitType }> = [
  // spade: 肉体的・運動的・物理的作業
  {
    keywords: ['掃除', '片付け', '洗い', '洗濯', '料理', '運動', '走', '泳', '体操', '風呂', 'そうじ', 'かたづけ'],
    suit: 'spade',
  },
  // diamond: 知的・学習・技術系
  {
    keywords: ['宿題', '勉強', '読書', '算数', '国語', '理科', '英語', '数学', '練習', 'テスト', 'ドリル', 'かだい'],
    suit: 'diamond',
  },
  // clover: 協調・家族・チームワーク
  {
    keywords: ['手伝い', 'てつだい', '協力', 'いっしょ', '家族', 'お世話', 'せわ', '準備', 'じゅんび', 'おつかい'],
    suit: 'clover',
  },
  // heart: 規律・ルール・心理・感情
  {
    keywords: ['ルール', '約束', 'やくそく', 'マナー', 'あいさつ', '挨拶', '礼', '感謝', 'かんしゃ', '反省', 'はんせい'],
    suit: 'heart',
  },
];

/**
 * タイトルと説明文からキーワードマッチでスートを判定する。
 * マッチしない場合は null を返す（呼び出し側でフォールバック処理）。
 */
function suitFromKeywords(title: string, description: string | undefined): SuitType | null {
  const haystack = `${title}${description ?? ''}`.toLowerCase();
  for (const entry of KEYWORD_SUIT_MAP) {
    for (const kw of entry.keywords) {
      if (haystack.includes(kw)) {
        return entry.suit;
      }
    }
  }
  return null;
}

/**
 * タスクIDの文字コード総和から決定論的にスートへマッピングする（最終フォールバック）。
 */
function suitFromTaskId(taskId: string): SuitType {

  let sum = 0;
  for (let i = 0; i < taskId.length; i++) {
    sum += taskId.charCodeAt(i);
  }
  return SUITS[sum % SUITS.length];
}

// ─── カテゴリー別プレゼンテーション（α値事前合成・Hex連結禁止） ──────────────
const CATEGORY_PRESENTATION: Record<TaskCategory, CategoryPresentation> = {
  exercise: {
    color:      '#00f0ff',
    bgActive:   'rgba(0, 240, 255, 0.08)',
    boxShadow:  '0 0 12px rgba(0, 240, 255, 0.50), inset 0 0 8px rgba(0, 240, 255, 0.06)',
    textShadow: '0 0 8px rgba(0, 240, 255, 0.80)',
  },
  study: {
    color:      '#ffea00',
    bgActive:   'rgba(255, 234, 0, 0.08)',
    boxShadow:  '0 0 12px rgba(255, 234, 0, 0.50), inset 0 0 8px rgba(255, 234, 0, 0.06)',
    textShadow: '0 0 8px rgba(255, 234, 0, 0.80)',
  },
  housework: {
    color:      '#39ff14',
    bgActive:   'rgba(57, 255, 20, 0.08)',
    boxShadow:  '0 0 12px rgba(57, 255, 20, 0.50), inset 0 0 8px rgba(57, 255, 20, 0.06)',
    textShadow: '0 0 8px rgba(57, 255, 20, 0.80)',
  },
  help: {
    color:      '#39ff14',
    bgActive:   'rgba(57, 255, 20, 0.08)',
    boxShadow:  '0 0 12px rgba(57, 255, 20, 0.50), inset 0 0 8px rgba(57, 255, 20, 0.06)',
    textShadow: '0 0 8px rgba(57, 255, 20, 0.80)',
  },
  life: {
    color:      '#ff0055',
    bgActive:   'rgba(255, 0, 85, 0.08)',
    boxShadow:  '0 0 12px rgba(255, 0, 85, 0.50), inset 0 0 8px rgba(255, 0, 85, 0.06)',
    textShadow: '0 0 8px rgba(255, 0, 85, 0.80)',
  },
};

// ─── カードホバー box-shadow（α値事前合成・スート別） ───────────────────────
const SUIT_CARD_HOVER_SHADOW: Record<SuitType, string> = {
  spade:   '0 0 15px #00f0ff, 0 0 30px rgba(0, 240, 255, 0.25)',
  diamond: '0 0 15px #ffea00, 0 0 30px rgba(255, 234, 0, 0.25)',
  clover:  '0 0 15px #39ff14, 0 0 30px rgba(57, 255, 20, 0.25)',
  heart:   '0 0 15px #ff0055, 0 0 30px rgba(255, 0, 85, 0.25)',
};

// ─── テーマ切り替えボタン用アクティブスタイル（identity color ベース） ─────────
const IDENTITY_ACTIVE_STYLES: Partial<Record<string, ActiveButtonStyle>> = {
  '#00f0ff': {
    bgActive:   'rgba(0, 240, 255, 0.09)',
    boxShadow:  '0 0 10px rgba(0, 240, 255, 0.38), inset 0 0 6px rgba(0, 240, 255, 0.06)',
    textShadow: '0 0 6px rgba(0, 240, 255, 0.80)',
  },
  '#4CAF50': {
    bgActive:   'rgba(76, 175, 80, 0.09)',
    boxShadow:  '0 0 10px rgba(76, 175, 80, 0.38), inset 0 0 6px rgba(76, 175, 80, 0.06)',
    textShadow: '0 0 6px rgba(76, 175, 80, 0.80)',
  },
};

// ─── Aliceテーマ（今際の国のアリス・サイバー・ディストピア） ─────────────────
export const aliceTheme: WorldTheme = {
  displayName: '👁️ アリス（ディストピア）',

  labels: {
    task:   'GAME',
    reward: 'SUPPLY',
    point:  'VISA',
  },

  colors: {
    // 既存
    primary:    '#00f0ff',
    background: '#0a0a0c',
    accent:     '#ff0055',
    panelBg:    'rgba(255, 255, 255, 0.02)',
    border:     'rgba(255, 255, 255, 0.1)',
    // セマンティックカラー
    bodyBg:           '#0a0a0c',
    cardBg:           'rgba(255, 255, 255, 0.02)',
    cardBorder:       'rgba(255, 255, 255, 0.1)',
    cardHoverBorder:  'rgba(255, 255, 255, 0.25)',
    title:            '#ffffff',
    text:             '#aaaaaa',
    subtle:           '#666666',
    muted:            '#444444',
    statusBadgeText:  '#cccccc',
    statusBadgeBorder:'rgba(255, 255, 255, 0.2)',
    statusBadgeBg:    'rgba(255, 255, 255, 0.05)',
    inputBg:          '#121214',
    // 状態カラー
    panelBgMuted: '#0d0d10',
    link:         '#00f0ff',
    successBg:    'rgba(0, 255, 102, 0.08)',
    successText:  '#00ff66',
    errorBg:      'rgba(255, 0, 85, 0.08)',
    errorText:    '#ff0055',
    warningBg:    'rgba(255, 234, 0, 0.08)',
    warningText:  '#ffea00',
    // ボタン4系統
    btnPrimaryBg:   '#00f0ff',
    btnPrimaryText: '#0a0a0c',
    btnSuccessBg:   '#00ff66',
    btnSuccessText: '#0a0a0c',
    btnDangerBg:    '#ff0055',
    btnDangerText:  '#ffffff',
    btnDisabledBg:  '#222225',
    btnDisabledText:'#555555',
    // α事前合成トークン（accent = #ff0055）
    accentSoft:   'rgba(255, 0, 85, 0.08)',
    accentStrong: 'rgba(255, 0, 85, 0.44)',
    // α事前合成トークン（primary = #00f0ff）
    primarySoft:   'rgba(0, 240, 255, 0.08)',
    primaryStrong: 'rgba(0, 240, 255, 0.38)',
  },

  effects: {
    enableGlowText:      true,
    enableGlowCardHover: true,
    cardHoverShadow:     '0 0 15px',
    cardShadow:          '0 0 16px rgba(0, 240, 255, 0.10)',
  },

  icons: {
    task:   '♠︎',
    reward: '◈',
  },

  statusLabels: {
    pending:   'STANDBY',
    working:   'IN PROGRESS',
    completed: 'CLEARED',
    approved:  'VISA ISSUED',
  },

  getCategoryPresentation(category: TaskCategory): CategoryPresentation {
    return CATEGORY_PRESENTATION[category];
  },

  mkActiveStyle(color: string): ActiveButtonStyle {
    return IDENTITY_ACTIVE_STYLES[color] ?? {
      bgActive:   'rgba(128, 128, 128, 0.09)',
      boxShadow:  '',
      textShadow: '',
    };
  },

  getTaskPresentation(task: TaskData): TaskPresentation {
    // ① category が有効なら確定マッピング（最優先）
    if (isValidCategory(task.category)) {
      const suit = CATEGORY_TO_SUIT[task.category];
      return {
        suit,
        label:           SUIT_LABEL[suit],
        glowColor:       SUIT_GLOW[suit],
        cardHoverShadow: SUIT_CARD_HOVER_SHADOW[suit],
      };
    }

    // ② category 未定義 or 未知値 → キーワード検知 → IDハッシュの順でフォールバック
    const suit =
      suitFromKeywords(task.title, task.description) ??
      suitFromTaskId(task.taskId);

    return {
      suit,
      label:           SUIT_LABEL[suit],
      glowColor:       SUIT_GLOW[suit],
      cardHoverShadow: SUIT_CARD_HOVER_SHADOW[suit],
    };
  },
};
