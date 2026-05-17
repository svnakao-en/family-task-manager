# 成果報酬型こづかい管理Webアプリ (TS v3.2)

## 🛠 技術スタック
- **Language**: TypeScript (Strict Mode)
- **Framework**: Next.js 14 (App Router)
- **Database**: Firebase (Auth / Firestore / Admin SDK)
- **Deploy**: Vercel（本番稼働中）

## 📏 開発規約
- **命名規則**: フロントエンドは `camelCase` 統一。DBは `snake_case` を使用し、マッピング層で変換する。
- **初期状態**: 新規ユーザーは `role: 'unknown'` で作成される。
- **ステータス遷移**: `pending → working → completed → approved`（承認後は不変）

## 🚀 現在のステータス
Phase 8.7 完了・本番稼働中。

**稼働中の機能:**
- タスク管理（作成・着手・完了・承認・差し戻し・複製・削除）
- ご褒美マスター管理（親が追加・編集・削除・表示切替・復元）
- ご褒美ストア（子が閲覧・即時交換、二重購入防止・冪等性保証済み）

## 🚀 開発の進め方
AIと協力して開発する場合、`docs/AI_CONTEXT.md` を最新のセーブデータとして各AIに読み込ませてください。

現在の開発状況は `docs/PROGRESS.md` を参照してください。
