# 成果報酬型こづかい管理Webアプリ (TS v3.2)

## 🛠 技術スタック
- **Language**: TypeScript (Strict Mode)
- **Framework**: Next.js 14 (App Router)
- **Database**: Firebase (Auth / Firestore)

## 📏 開発規約
- **命名規則**: フロントエンドは `camelCase` 統一。DBは `snake_case` を使用し、マッピング層で変換する。
- **初期状態**: 新規ユーザーは `role: 'unknown'` で作成される。

## 🚀 開発の進め方
AIと協力して開発する場合、ルート直下の `AI_SYNC_DOC.md` を最新のセーブデータとして各AIに読み込ませてください。