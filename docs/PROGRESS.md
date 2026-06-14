# 開発進捗ダッシュボード

**最終更新**: 2026-06-07（Phase 10.9.99 完了）  
**読者**: オーナー

---

## 実現したいこと

**他機能からご褒美ストアへの導線を正しく作る**

現状、子が使う「ご褒美ストア（`/store`）」と、親が使う「ご褒美管理（`/parent/rewards`）」は画面として存在しているが、**どこからも辿り着けない孤立した状態**になっている。ユーザーがURLを直接知らないと使えない。

---

## 現状の画面マップ

```
/ (トップ)
  ├── [📋 履歴を見る] → /history             ✅ 導線あり（全ロール）
  ├── [🎁 ご褒美ストアへいく！] → /store      ✅ 導線あり（子のみ）
  └── [ご褒美を管理する] → /parent/rewards    ✅ 導線あり（親のみ）

/store（子のご褒美ストア）
  └── [← もどる] → router.back()            ✅ 戻り口はある

/parent/rewards（親のご褒美管理）
  └── [← もどる] → router.back()            ✅ 戻り口はある
  ※ /store/requests への導線がない

/store/requests（親の交換申請承認キュー）
  └── [← もどる] → router.back()            ✅ 戻り口はある
  ※ 入口がないので実質アクセス不能（/parent/rewards からの導線が必要）

/history（タスク承認履歴）
  └── [← 戻る] → / （固定リンク）           ✅ 導線あり

/tasks（旧ルート・廃止済み）
  └── redirect('/') 済み。本番流入ゼロ確認後に物理削除予定
```

---

## [Phase 8.8] 導線開通とルーティング一本化

- [x] Step 1: トップページ（/）に役割別の導線ボタン（親用管理 / 子用ポイント連動ストア）を追加
- [x] Step 2: 重複していた旧 `/tasks` ルートを安全に廃止
  - 内部リンクの全索敵と `/` への書き換え完了（該当リンクはゼロだった）
  - `app/tasks/page.tsx` を `redirect('/')` 化（本番流入ゼロ確認後に完全物理削除予定）
- [x] Step 2.5: 親の交換申請承認キュー（`/store/requests`）への導線開通
  - `app/parent/rewards/page.tsx` のナビゲーションバーに `📥 交換申請を承認する` ボタンを追加（`Link` + `/store/requests`）
- [x] Step 2.8: 【金融システム化】ご褒美在庫減算ルールの極限緊縛（Hardening）
  - [x] `firestore.rules` に `isValidRewardStockDeduction()` を実装（確定版デプロイ待ち）
    - `affectedKeys().hasOnly(['stock', 'updated_at'])` による差分制御
    - 境界値修正: `newData.stock >= 0`（最後の1個を正しく購入可能）
    - 権限チェック（`isParent` / `belongsToFamily`）を `allow update` 外側に分離
  - [x] `storeActions.ts` の `deliverExchange` が最小 `update()` のみ使用していることを確認済み（変更不要）
  - [x] `firebase deploy --only firestore:rules` で本番デプロイ
- [x] Step 3: Vercel 本番環境デプロイ、および親・子アカウントでの動作確認

---

## 今日時点でアプリでできること（参考）

### タスク管理（全機能稼働中）
- 親がタスクを作成し、子に担当を指名できる
- 子が着手（作業中）→ 完了報告ができる
- 親が承認してポイントを付与できる
- 親が差し戻し・複製・削除できる
- 子が自分の報酬履歴を確認できる

### ご褒美ストア（機能は完成・導線が未整備）
- 親がご褒美を追加・編集・削除・非表示にできる　←　**直URLでのみアクセス可**
- 子がストアでご褒美を閲覧・即時交換できる　←　**直URLでのみアクセス可**
- 交換時のポイント重複消費・在庫割れを二重ロックで防止済み

---

## インフラの確認状況

| 項目 | 状態 | 備考 |
|------|------|------|
| Vercel 環境変数（Firebase Web SDK） | 設定済み | 本番稼働中のため確認不要 |
| Vercel 環境変数（Firebase Admin SDK） | **要確認** | Phase 8 FIX から必要。登録済みの可能性あり |
| Firestore 複合インデックス（tasks） | 設定済み | 本番稼働中のため確認不要 |
| Firestore 複合インデックス（rewards） | **要確認** | エラーが出なかったので既存の可能性あり |
| Firestore Security Rules | 設定済み | 最終更新 2026-05-14（履歴ページ修正） |

---

## アプリの構成（かんたん説明）

```
ブラウザ（Next.js）
  ├── 親画面: / , /tasks, /parent/rewards, /history
  ├── 子画面: / , /tasks, /store, /history
  └── 共通:  /auth/role-selection

サーバー（Vercel）
  └── Server Actions（lib/rewardActions.ts など）
        ↓ Admin SDK（秘密鍵で安全に接続）

Firebase
  ├── Authentication（ログイン管理）
  └── Firestore（データベース）
        ├── users（ポイント残高）
        ├── tasks（タスク）
        ├── rewards（ご褒美マスター）
        ├── reward_exchanges（交換履歴）
        └── idempotency_keys（二重購入防止）
```

---

## [Phase 9.1] テーマエンジン基盤の構築（完了 ✨）

- [x] `theme/types.ts`: `WorldTheme` インターフェース・`TaskPresentation` 型定義
- [x] `theme/default.ts`: ほのぼのファミリー向けデフォルトテーマ（taskId ハッシュでスート決定）
- [x] `theme/alice.ts`: 今際の国アリス・サイバーテーマ（キーワード検知でスート自動判定）
- [x] `context/ThemeContext.tsx`: `ThemeProvider`（Phase 9.4 で動的切り替え＆localStorage永続化に昇格）
- [x] `hooks/useWorldTheme.ts`: テーマアクセス用カスタムフック（Provider外でエラースロー）

---

## [Phase 9.2] 適用戦（各コンポーネントの真・アリス化）✨ ALL GREEN

- [x] Step 1: `app/layout.tsx` への `ThemeProvider` 設置
- [x] Step 2-A: `app/page.tsx` への最小カラー結合・疎通テスト
  - `#0a0a0c` / `#00f0ff` / `#ff0055` の Hex 3色をテーマカラーへ置換（rgba は対象外）
  - `'#transparent'` バグ（既存）を `'transparent'` に修正
- [x] Step 3: `components/TaskCard.tsx` の完全疎結合リファクタリング（完了）
  - `SUIT_CONFIG` / `SuitType` / 型キャストを完全削除
  - `theme.getTaskPresentation(task)` を先頭1回呼び出しに統一
  - `suit.color` → `presentation.glowColor`、スートラベルを `presentation.label` 1本化
- [x] Step 4: `components/TaskForm.tsx` のリファクタリング（DB汚染の撤去）（完了）🎉
  - `SuitType` / `SUIT_CONFIG` / `SUITS` 定数を完全削除
  - `suit` ステート・`setSuit` 呼び出し（useEffect・リセット処理）を完全削除
  - `taskData` および `addDoc` から `suit: suit` を除去
  - スート選択UIパネル（62行）を丸ごと撤去

---

## [Phase 9.3] 拡張戦（カテゴリーインフラの敷設戦）✨ ALL GREEN

- [x] Step 1: 型定義の拡張 & テーマエンジンの完全マッピング（完了）
  - `TaskCategory` 型（`'exercise' | 'study' | 'housework' | 'help' | 'life'`）を `types/index.ts` に追加
  - `TaskData` / `FirestoreTaskDocument` 両方に `category?: TaskCategory` を追加
  - `theme/alice.ts`: `CATEGORY_TO_SUIT` 定数 + `isValidCategory` 型ガード + 3段フォールバック実装
  - `theme/default.ts`: 同構造 + `CATEGORY_LABEL` 日本語ラベル対応
- [x] Step 2-A: `components/TaskForm.tsx` へのカテゴリー選択UI新設 & Firestore射出（完了）🎉
  - `CATEGORY_OPTIONS` 定数（世界観ゼロの5種）を定義、カテゴリー選択パネルを新設
  - `InitialTaskData` に `category?: TaskCategory` を追加
  - `taskDataToFirestore` に `category` マッピングを追加（パイプライン修復）
- [x] Step 2-B: `lib/taskUtils.ts` の `buildTaskData` 読み込み復元パッチ（完了）
  - `isValidCategory` 型ガードをローカル定義（テーマ層に非依存）
  - `buildTaskData` に `...(isValidCategory(data.category) ? { category: data.category } : {})` を追加

---

## [Phase 9.4] 勝利のファンファーレ（テーマ切り替えインフラ＆UI戦）

- [x] Step 1 & 2: `context/ThemeContext.tsx` 動的化 ＆ localStorage 完全永続化（完了）🎉
  - `AVAILABLE_THEMES` / `ThemeId` / `THEME_STORAGE_KEY` 定数を定義
  - `THEME_MAP satisfies Record<ThemeId, WorldTheme>` で型安全なテーママップを構築
  - `useState<ThemeId>` + SSRガード付き localStorage 復元（初期値 `'alice'`）
  - `setTheme` を `useCallback` でラップ（不要な再レンダリング防止）
  - `contextValue` を `useMemo` で最適化
  - `hooks/useWorldTheme.ts` を `context.themeConfig` 返却に更新（既存コンポーネントとの互換性維持）
- [ ] Step 3: 親専用タスクフォーム周辺への「テーマ切り替えセグメントボタンUI」の新設 👈 【次】

---

## [Phase 10.x] テーマシステム完全神話化（完全制覇 👑）

- [x] Phase 10.1〜10.6: 🎨 主要パーツ色彩デトックス（完全勝訴 🏆）
  - `TaskForm.tsx`・`TaskCard.tsx` の Hex ベタ書きをテーマトークンへ完全置換
  - ボタン選択UXのテーマ別表現分岐（Alice: ネオングロー / Daily: 太枠ボールド）
- [x] Phase 10.8〜10.9: 🛍️ ストア地帯の二次元並行世界化（完全勝訴 🏆）
  - `app/store/page.tsx`・`components/store/StoreCard.tsx` の Alice / Daily 完全分岐
  - `getDailyConfig` / `getAliceConfig` 二層設計によるカード外観の世界観完全制御
- [x] Phase 10.9.9: 🌋 `useWorldTheme` 状態ID一元化リファクタ（完了 🎉）
  - `currentThemeId` を Hook から直接公開、`isAliceMode = currentThemeId === 'alice'` に統一
  - 全コンポーネントの `effects.enableGlowCardHover` 多段派生依存を完全排除
- [x] Phase 10.9.95: 👑 最外殻背景支配層（AppThemeLayer）の設置（完全勝訴 🏆）
  - `AppThemeLayer` 新設・`AppShell` をサーバー互換のピュアな構造体に降格
  - 背景色の支配権を1箇所に集約（三層分離: ThemeProvider / AppShell / AppThemeLayer）
- [x] Phase 10.9.99: 🌋 最終決戦：ThemeId の NULL ロックによるフラッシュバグ完全圧殺（完全消滅 👑🎁）
  - `ThemeProvider` の初期値を `null`（未確定）に変更、`useEffect` で localStorage 復元
  - `AppThemeLayer` に `currentThemeId === null` ガードを設置、確定前の全描画をロック

---

## 将来課題（Phase 11.1 以降）

- [x] Phase 11.0: 🎨 テーマ化残存ファイルの一斉対応（完全制覇 👑）
  - ✅ HIGH: `app/parent/rewards`, `RewardManageCard`（ハードコード色を全トークン置換）
  - ✅ MEDIUM: `EditTaskForm`, `ApprovalCard`（`useWorldTheme` 導入 + トークン適用）
  - ✅ LOW: `RoleGuard`, `EmptyState`, `TaskList`（残存 Hex 色を一掃）
  - ✅ その他: `app/store/page.tsx` の警告色ブロックも同時修正
- [ ] Phase 11.1: 📐 空間統治：`radius` / `spacing` トークン化
- [ ] 文言・ラベルの `theme.labels` / `theme.statusLabels` への抽象化
- [ ] `TD-001` 対処: `glowColor` Hex 連結依存の排除（`docs/TECHNICAL_DEBT.md` 参照）

---

## AI との開発フロー

詳細は `docs/TEAM_CONSTITUTION.md` を参照。

| 役割 | 担当 | 責務 |
|---|---|---|
| プロダクトオーナー | あなた | 最終 GO/NG 判断 |
| システム設計マネージャー | Gemini | 設計・指示書作成 |
| 監査官 | ChatGPT | 設計・指示書・実装の監査 |
| 実装技師 | Claude | 型安全な実装 |

> 新しい AI セッションを始める際は `docs/AI_CONTEXT.md` を読み込ませてください。
