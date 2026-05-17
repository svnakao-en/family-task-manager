# 🚀 PRODUCTION_CHECKLIST.md
## 本番投入・運用チェックリスト

**最終更新**: 2026-05-17  
**対象**: 未来の開発者・AI・監督  
**目的**: このファイル単体で迷わず本番投入と運用ができる状態にする

---

## ⚠️ 重要: 本番投入前に必ず全項目を確認すること

---

## 1. 環境変数一覧（.env.local）

### 必須: Firebase Web SDK
```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

### 必須（Phase 8 FIX以降）: Firebase Admin SDK
```env
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```
> **取得**: Firebase Console → プロジェクト設定 → サービスアカウント → 新しい秘密鍵を生成  
> `FIREBASE_ADMIN_PRIVATE_KEY` は改行が `\n` のまま Vercel に貼り付けること（自動解釈される）

### 将来必要: App Check
```env
NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN=
FIREBASE_APP_CHECK_SITE_KEY=
```

### Vercel デプロイ時
```env
VERCEL_URL=
VERCEL_ENV=production
```

**取得方法:**
1. Firebase Console → プロジェクト設定 → 全般
2. 「マイアプリ」セクションから Web アプリの設定を確認
3. 値をコピーして `.env.local` に貼り付け

**注意:**
- `.env.local` は `.gitignore` に含まれている（コミット禁止）
- 本番環境では Vercel の Environment Variables に設定

---

## 2. Firestore 複合インデックス設定

### 🚨 必須インデックス（これがないとアプリがクラッシュする）

#### インデックス1: tasks コレクション
- **Collection**: `tasks`
- **Field 1**: `family_id` (Ascending)
- **Field 2**: `created_at` (Descending)
- **Query Scope**: Collection

**理由:**
```typescript
// TaskList.tsx で使用
query(
  collection(db, 'tasks'),
  where('family_id', '==', currentUser.familyId),
  orderBy('created_at', 'desc')
)
```

#### インデックス2: rewards コレクション（Phase 8 以降）
- **Collection**: `rewards`
- **Field 1**: `family_id` (Ascending)
- **Field 2**: `is_deleted` (Ascending)
- **Field 3**: `created_at` (Descending)
- **Query Scope**: Collection

**理由:**
```typescript
// useParentRewards.ts で使用
query(
  collection(db, 'rewards'),
  where('family_id', '==', familyId),
  where('is_deleted', '==', false),
  orderBy('created_at', 'desc')
)
```

### 作成手順
1. Firebase Console にログイン
2. Firestore Database → インデックス → 複合インデックス
3. 「インデックスを追加」をクリック
4. 上記の設定を入力
5. 「作成」をクリック
6. ステータスが「有効」になるまで待機（数分）

### エラー発生時の対処
**エラーメッセージ:**
```
The query requires an index. You can create it here: [URL]
```

**対処:**
1. エラーメッセージ内のURLをクリック
2. 自動的にインデックス作成画面が開く
3. 「作成」をクリック
4. 数分待機

**確認方法:**
1. アプリを起動
2. タスク一覧ページにアクセス
3. ブラウザのコンソールにエラーが出ないことを確認

---

## 3. デプロイ手順

### 3-1. ローカルでの最終確認
```bash
# 依存関係のインストール
npm install

# Lint チェック
npm run lint

# ビルド確認
npm run build

# ローカルで動作確認
npm run dev
```

### 3-2. Firebase へのデプロイ（Security Rules）
```bash
# Firebase にログイン
firebase login

# プロジェクトを選択
firebase use <project-id>

# Security Rules のみデプロイ
firebase deploy --only firestore:rules

# デプロイ確認
firebase firestore:rules get
```

### 3-3. Vercel へのデプロイ（Next.js アプリ）
```bash
# Vercel にログイン
vercel login

# 本番デプロイ
vercel --prod

# デプロイ確認
# 表示されたURLにアクセスして動作確認
```

### 3-4. デプロイ後の確認項目
- [ ] ログイン機能が動作する
- [ ] 役割選択（親/子）が動作する
- [ ] タスク作成が動作する
- [ ] タスク完了が動作する
- [ ] タスク承認が動作する
- [ ] 報酬が正しく加算される
- [ ] ブラウザのコンソールにエラーが出ない

---

## 4. 🔥 鉄の掟（Security & Logic）

### **絶対に守るべきルール**

1. **approved は Immutable（二度と変更しない）**
   - 一度承認されたタスクは、いかなる理由があっても変更不可
   - 会計確定後は不変（会計の鉄則）
   - Security Rules で物理的に保証済み

2. **total_reward 更新は親のみ**
   - 本人は total_reward を変更不可
   - 親は total_reward の加算のみ可能（減算不可）
   - Security Rules で物理的に保証済み

3. **報酬更新は Transaction 必須**
   - approveTask は必ず runTransaction を使用
   - writeBatch への変更は憲法違反
   - 二重報酬加算を100%防止

4. **UI を信用するな。Rules を信じろ**
   - UI = 親切な案内板
   - Logic = 整理された手順書
   - **Rules = 物理的な法律（最後の砦）**

5. **Firestore は snake_case、UI/Logic は camelCase**
   - 変換は必ず buildTaskData() と taskDataToFirestore() を使用
   - 手動での snake_case 記述は憲法違反

6. **ステータス遷移は一方通行**
   - pending → completed → approved のみ
   - 逆流禁止（approved → completed, completed → pending は不可）
   - 差し戻し禁止（approved → pending も不可）

---

## 5. Rollback 方針

### 5-1. デプロイ失敗時
**症状:** アプリが起動しない、白い画面が表示される

**対処:**
```bash
# Vercel の場合
vercel rollback

# または、前回のデプロイメントを選択して再デプロイ
```

### 5-2. Security Rules ミス時
**症状:** 「permission-denied」エラーが多発

**対処:**
```bash
# 直前の firestore.rules を復元
git checkout HEAD~1 firestore.rules

# 再デプロイ
firebase deploy --only firestore:rules
```

**予防策:**
- firestore.rules の変更前に必ずバックアップを取る
- Git でコミットしてから変更する

### 5-3. データ破損時
**症状:** ユーザーデータが消失、報酬が不正

**対処:**
1. Firebase Console → Firestore Database → データのエクスポート
2. 最新のバックアップから復元
3. 影響を受けたユーザーに連絡

**予防策:**
- 定期的な自動バックアップの設定（Phase 6 で実装予定）
- 本番環境での直接編集禁止

### 5-4. インデックス作成中
**症状:** 「The query requires an index」エラー

**対処:**
1. **本番公開を一時停止**（インデックス作成完了まで）
2. Firebase Console でインデックス作成
3. ステータスが「有効」になるまで待機（数分〜数十分）
4. 動作確認後、本番公開を再開

**予防策:**
- インデックスは本番デプロイ前に作成
- ステージング環境で事前確認

---

## 6. 未実装・β制限事項

### 🚧 現在未実装の機能（Phase 6 以降で実装予定）

#### 6-1. セキュリティ強化
- [ ] **Firebase App Check 未導入**
  - Bot 対策が未実装
  - 不正なクライアントからのアクセスを防げない
  - 影響: 大量の不正リクエストによるコスト増加のリスク

- [ ] **Rate Limiting 未導入**
  - 連続リクエストの制限なし
  - DDoS 攻撃に脆弱
  - 影響: サービス停止のリスク

#### 6-2. 監視・アラート
- [ ] **Firebase Performance Monitoring 未導入**
  - パフォーマンス問題の検知不可
  - 影響: ユーザー体験の低下に気づけない

- [ ] **Error Tracking（Sentry等）未導入**
  - エラーの自動収集なし
  - 影響: バグの早期発見が困難

- [ ] **ダッシュボード未整備**
  - リアルタイムの異常検知不可
  - 影響: 障害対応が遅れる

#### 6-3. バックアップ・リカバリ
- [ ] **Firestore 自動バックアップ未設定**
  - 手動バックアップのみ
  - 影響: データ消失時の復旧が困難

- [ ] **データ復旧手順の文書化未完了**
  - 復旧手順が不明確
  - 影響: 緊急時の対応が遅れる

- [ ] **定期的なバックアップテスト未実施**
  - バックアップの有効性が未確認
  - 影響: いざという時に復旧できない可能性

#### 6-4. スケーラビリティ
- [ ] **Custom Claims 未導入**
  - Security Rules 内で get() を多用
  - 影響: コスト増加、レイテンシ増加

- [ ] **Cloud Functions 未導入**
  - サーバーサイド処理なし
  - 影響: 複雑な処理が実装できない

- [ ] **キャッシュ戦略未実装**
  - 毎回 Firestore から読み取り
  - 影響: コスト増加、速度低下

#### 6-5. 運用ドキュメント
- [ ] **障害対応マニュアル未整備**
  - 障害時の対応手順が不明確
  - 影響: 復旧時間の長期化

- [ ] **ユーザーサポート手順未整備**
  - 問い合わせ対応が属人化
  - 影響: サポート品質のばらつき

- [ ] **データ削除・GDPR対応手順未整備**
  - 個人情報削除の手順が不明確
  - 影響: 法的リスク

---

## 7. 緊急連絡先

### Firebase プロジェクト情報
- **Project ID**: `kodukai-app`
- **Project Owner**: `[ここに記入]`
- **Firebase Console**: https://console.firebase.google.com/

### Vercel プロジェクト情報
- **Project Name**: `family-task-manager`
- **Team**: `[ここに記入]`
- **Vercel Dashboard**: https://vercel.com/dashboard

### 開発チーム
- **開発責任者**: `[ここに記入]`
- **緊急連絡先**: `[ここに記入]`

---

## 8. 定期メンテナンス

### 毎日
- [ ] エラーログの確認（ブラウザコンソール）
- [ ] ユーザーからの問い合わせ確認

### 毎週
- [ ] Firestore 使用量の確認（コスト監視）
- [ ] パフォーマンスの確認（ページ読み込み速度）

### 毎月
- [ ] 依存関係の更新（npm update）
- [ ] Security Rules の見直し
- [ ] バックアップの確認

### 四半期ごと
- [ ] セキュリティ監査
- [ ] パフォーマンス最適化
- [ ] ユーザーフィードバックの反映

---

## 9. トラブルシューティング

### 問題: ログインできない
**原因:**
- Firebase Authentication の設定ミス
- 環境変数の設定ミス

**確認:**
1. Firebase Console → Authentication → Sign-in method
2. Email/Password が有効になっているか確認
3. `.env.local` の環境変数が正しいか確認

### 問題: タスク一覧が表示されない
**原因:**
- 複合インデックスが未作成
- Security Rules のミス

**確認:**
1. ブラウザのコンソールでエラーを確認
2. 「The query requires an index」→ インデックス作成
3. 「permission-denied」→ Security Rules 確認

### 問題: 報酬が加算されない
**原因:**
- approveTask の Transaction エラー
- Security Rules の total_reward 更新制限

**確認:**
1. ブラウザのコンソールでエラーを確認
2. Firebase Console → Firestore → users コレクション
3. total_reward の値を手動確認

### 問題: デプロイが失敗する
**原因:**
- ビルドエラー
- 環境変数の未設定

**確認:**
1. `npm run build` でローカルビルド確認
2. Vercel の Environment Variables 確認
3. デプロイログの確認

---

## 10. 本番投入前の最終チェックリスト

### 環境設定
- [ ] `.env.local` の全環境変数が設定済み
- [ ] Vercel の Environment Variables が設定済み
- [ ] Firebase プロジェクトが本番用に設定済み

### Firestore 設定
- [ ] 複合インデックスが作成済み（ステータス: 有効）
- [ ] Security Rules がデプロイ済み
- [ ] テストデータが削除済み

### コード確認
- [ ] `npm run lint` がエラーなし
- [ ] `npm run build` が成功
- [ ] ローカルで全機能が動作確認済み

### セキュリティ確認
- [ ] approved の Immutable 化が実装済み
- [ ] Transaction が正しく動作
- [ ] Security Rules が正しく動作

### ドキュメント確認
- [ ] AI_CONTEXT.md が最新
- [ ] PRODUCTION_CHECKLIST.md が最新
- [ ] README.md が最新

### 動作確認
- [ ] ログイン/ログアウト
- [ ] 役割選択（親/子）
- [ ] タスク作成
- [ ] タスク完了
- [ ] タスク承認
- [ ] 報酬加算

### 緊急対応準備
- [ ] Rollback 手順の確認
- [ ] 緊急連絡先の確認
- [ ] バックアップの確認

---

## 11. 本番投入後の監視項目

### 初日
- [ ] 1時間ごとにエラーログ確認
- [ ] ユーザーからの問い合わせ対応
- [ ] Firestore 使用量の監視

### 初週
- [ ] 毎日エラーログ確認
- [ ] パフォーマンス監視
- [ ] ユーザーフィードバック収集

### 初月
- [ ] 週次でエラーログ確認
- [ ] コスト監視
- [ ] 機能改善の検討

---

**最終更新**: 2026-05-17  
**作成者**: Bob  
**ステータス**: 小規模商用β運用可能

**注意**: このチェックリストは運用事故を防ぐために作成されました。
美しさよりも実用性を優先しています。
未来の自分が「助かった」と思えるドキュメントであることを願います。