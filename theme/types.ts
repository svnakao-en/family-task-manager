import { TaskData, TaskCategory } from '@/types';

// ─── Suit属性型 ───────────────────────────────────────────────────────────────
export type SuitType = 'spade' | 'diamond' | 'clover' | 'heart';

// ─── タスク1件の表示メタ情報（純粋な表示用DTO） ─────────────────────────────
export interface TaskPresentation {
  suit: SuitType;
  label: string;
  glowColor: string;
  /** enableGlowCardHover が true のときに使うカードホバー box-shadow（Theme側で事前合成済み） */
  cardHoverShadow: string;
}

// ─── カテゴリー表示バンドル（α値・発光は Theme 側で事前合成済み） ────────────
export interface CategoryPresentation {
  /** 純粋カラー（テキスト／ボーダー用） */
  color: string;
  /** 選択時背景色（rgba 済み） */
  bgActive: string;
  /** 選択時 box-shadow（非 Alice では空文字） */
  boxShadow: string;
  /** 選択時 text-shadow（非 Alice では空文字） */
  textShadow: string;
}

// ─── 汎用「アクティブボタン」スタイルバンドル ────────────────────────────────
export interface ActiveButtonStyle {
  bgActive: string;
  boxShadow: string;
  textShadow: string;
}

// ─── テーマプラグインが満たすべきコントラクト ────────────────────────────────
export interface WorldTheme {
  /** テーマ選択UIに表示する人間可読の名前 */
  displayName: string;

  /** UI上に表示するドメイン語彙の差し替えラベル */
  labels: {
    task: string;
    reward: string;
    point: string;
  };

  /** カラーパレット */
  colors: {
    // ─ 既存（app/page.tsx 等で使用中・削除不可） ──────────────────────────
    /** ブランドカラー / CTA */
    primary: string;
    /** ページ背景色（= bodyBg のエイリアス） */
    background: string;
    /** 強調アクセント */
    accent: string;
    /** カード・パネルの背景色（旧来） */
    panelBg: string;
    /** ボーダー基本色（旧来） */
    border: string;

    // ─ セマンティックカラー（Phase 10.1） ───────────────────────────────
    bodyBg: string;
    cardBg: string;
    cardBorder: string;
    cardHoverBorder: string;
    title: string;
    text: string;
    subtle: string;
    muted: string;
    statusBadgeText: string;
    statusBadgeBorder: string;
    statusBadgeBg: string;
    /** 入力欄（input/textarea/select）の背景色 */
    inputBg: string;

    // ─ 状態カラー（Phase 11.x）─────────────────────────────────────────────
    /** パネル内の入れ子要素用の、bodyBg より少し暗め／薄めの背景 */
    panelBgMuted: string;
    /** テキストリンクの色 */
    link: string;
    /** 成功・承認状態の背景色 */
    successBg: string;
    /** 成功・承認状態のテキスト色 */
    successText: string;
    /** エラー・拒否状態の背景色 */
    errorBg: string;
    /** エラー・拒否状態のテキスト色 */
    errorText: string;
    /** 警告・保留状態の背景色 */
    warningBg: string;
    /** 警告・保留状態のテキスト色 */
    warningText: string;

    // ─ ボタン4系統（Phase 10.2）── フラット定義で入れ子を禁止 ───────────
    /** 主要アクション（Start など） */
    btnPrimaryBg: string;
    btnPrimaryText: string;
    /** 承認・完了アクション */
    btnSuccessBg: string;
    btnSuccessText: string;
    /** 警告・削除・差し戻しアクション */
    btnDangerBg: string;
    btnDangerText: string;
    /** ローディング・無効化状態 */
    btnDisabledBg: string;
    btnDisabledText: string;

    // ─ アクセントカラー・α事前合成トークン（TD-001対応） ──────────────────
    /** accent を ~8% 不透明度で合成済み（内側グロウ、選択背景等） */
    accentSoft: string;
    /** accent を ~44% 不透明度で合成済み（ホバーボーダー、外側グロウ等） */
    accentStrong: string;
    /** primary を ~8% 不透明度で合成済み（極薄背景、ゴーストホバー等） */
    primarySoft: string;
    /** primary を ~38% 不透明度で合成済み（ボーダー、グロウ等） */
    primaryStrong: string;
  };

  /** 世界観の演出コンテキストを司る独立レイヤー */
  effects: {
    /** スートマークをネオン発光させるか */
    enableGlowText: boolean;
    /** カードホバー時に電脳ネオン発光させるか */
    enableGlowCardHover: boolean;
    /** 発光OFFのときに使用するホバーシャドウ文字列 */
    cardHoverShadow: string;
    /** カードの静止時シャドウ */
    cardShadow: string;
  };

  /** 各ドメインエンティティを象徴するアイコン文字 */
  icons: {
    task: string;
    reward: string;
  };

  /** ステータスの表示文字列（working は省略可） */
  statusLabels: {
    pending: string;
    working?: string;
    completed: string;
    approved?: string;
  };

  /**
   * TaskData を受け取り、表示用メタ情報だけを返す純粋関数。
   * - 副作用（Firestore / Server Action / Auth参照）完全禁止
   * - task オブジェクトを一切変更しないこと
   */
  getTaskPresentation(task: TaskData): TaskPresentation;

  /**
   * カテゴリーを受け取り、世界観別の選択状態スタイルバンドルを返す。
   * コンポーネント側での Hex α連結を完全禁止にするための大政奉還インターフェース。
   */
  getCategoryPresentation(category: TaskCategory): CategoryPresentation;

  /**
   * 任意カラー（= 各テーマの identity color）に対し、
   * 現テーマの世界観でアクティブ状態スタイルを事前合成して返す。
   * テーマ切り替えボタン等、固定色バリアントに使用。
   */
  mkActiveStyle(color: string): ActiveButtonStyle;
}
