# 成果報酬型こづかい管理Webアプリ (TS v3.2)

## 🛠 技術スタック
- **Language**: TypeScript (Strict Mode)
- **Framework**: Next.js 14 (App Router)
- **Database**: Firebase (Auth / Firestore)
- **Deploy**: Vercel（本番稼働中）

## 📏 開発規約
- **命名規則**: フロントエンドは `camelCase` 統一。DBは `snake_case` を使用し、マッピング層で変換する。
- **初期状態**: 新規ユーザーは `role: 'unknown'` で作成される。
- **ステータス遷移**: `pending → working → completed → approved`（承認後は不変）

## 🚀 現在のステータス
Phase 8.8 進行中・本番稼働中。導線開通（Step 1-2完了）。次は Vercel デプロイ確認と `/store/requests` への導線追加。

## 🚀 開発の進め方
AIと協力して開発する場合、`docs/AI_CONTEXT.md` を最新のセーブデータとして各AIに読み込ませてください。
