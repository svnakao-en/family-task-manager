## 🚀 将来的な課題・改善リスト (Director's Note)
## 最終更新: 2026-05-18

---

### Phase 8.8: 導線開通とルーティング一本化（進行中 - 2026-05-18）

[x] Step 1: トップページ（/）に役割別の導線ボタン追加
[x] Step 2: 旧 `/tasks` ルートを `redirect('/')` 化
[ ] Step 3: Vercel 本番デプロイ・動作確認
[ ] Step 4（発見済み）: `/store/requests` への導線を `/parent/rewards` に追加

---

### Phase 8.7: AuthContext 一本化（完了 - 2026-05-17）

[x] `AuthContext` / `AuthRole` 型を `lib/auth/types.ts` に定義
[x] `UnauthorizedError` を `lib/errors/auth.ts` に定義
[x] `getCurrentParent()` ゲート関数を `lib/auth/getCurrentParent.ts` に定義
[x] `rewardActions.ts` の全4関数を `auth: AuthContext` 第1引数に統一
[x] `RewardManageCard.tsx` を `auth: AuthContext` Props に移行・try/catch 化
[x] `app/parent/rewards/page.tsx` を `getCurrentParent(user)` パターンに移行
[x] `router.refresh()` を完全削除（onSnapshot が自動同期）

---

### Phase 9: クエリレイヤー実装（完了 - 2026-05-16）

[x] `lib/rewardQueries.ts`: `unstable_cache` + Admin SDK による SSR クエリ層
[x] `PlainReward` 型（Timestamp → `updated_at_ms: number` でキャッシュ安全に）
[x] `useParentRewards` フック（onSnapshot によるリアルタイムストリーム）
[x] `rewardConverter.ts` によるカラム変換

---

### Phase 8 FIX版: 即時交換決済エンジン（完了 - 2026-05-14）

[x] Firebase Admin SDK 導入（`lib/firebase-admin.ts`）
[x] `purchaseRequestId`（UUID v4）による冪等性保証（TTL 7日）
[x] `reward_exchanges` / `idempotency_keys` の Security Rules を完全遮断
[x] `users` read ルールを親が家族メンバーを読めるよう調整（履歴ページ対応）
[x] 構造化ロギング（purchaseRequestId / transactionPhase / result）
[x] `rewards` に `version` フィールド追加（楽観的排他制御）
[x] `loadedVersion` を必須化（optional にすると排他制御が無効化される）
[x] `normalizeText()` による undefined/空文字 → null 正規化
[x] `restoreReward()` 関数追加（同名重複チェック付き）

---

### Phase 8: ご褒美ストア機能（完了 - 2026-05-12）

[x] ご褒美マスター CRUD（親画面）
[x] 子のストア画面（閲覧・交換申請）
[x] 承認ワークフロー型交換（exchanges コレクション）
[x] 状態遷移の有限状態機械（State Machine）化
[x] ポイント申請時即時減算 ＆ 却下時安全返金アーキテクチャ
[x] 在庫管理（stock カウンター、0=売り切れ）
[x] 監査ログ（delivered_by / rejected_by）

---

### Phase 7: 利便性向上（完了 - 2026-05-14）

[x] タスク複製機能: 既存タスクを元に「コピーして作成」。DB書き込みはフォーム送信時のみ。

---

### Phase 6: 運用改善機能（完了 - 2026-05-14）

[x] ステータス拡張: `working`（作業中）追加
[x] 差し戻し機能: 承認前（completed/working）を pending に戻す
[x] 確認ダイアログ: RejectButton に window.confirm を追加
[x] 物理削除: `pending` のみ対象。確認ダイアログあり。
[x] 担当者指名: 作成時に特定の家族（child）を選択可能。未選択で先着順。
[x] タスク編集: `pending` 時のみ、タイトル・説明・ポイントの変更が可能。
[x] 子アカウント登録バグ修正: Security Rules の family_id 初回設定ブロックを修正。

---

### 次フェーズ候補（優先順）

[ ] 削除済みご褒美の復元ボタン（親管理画面）
[ ] 子のストアUI改善（在庫表示・ポイント不足時の案内）
[ ] 交換履歴画面（子が自分の交換記録を確認）

---

### 機能追加 (Features)

[ ] 通知機能: 親が投稿したら子のスマホに通知が飛ぶようにする。
[ ] 写真投稿: 「本当にお皿を洗ったよ！」という証拠写真を添付できる機能。

---

### ユーザー体験 (UX/UI)

[ ] アニメーション: タスクを完了した時に「ジャジャーン！」と音が鳴る演出。
[ ] ダークモード対応: 夜に使うパパ・ママの目に優しく。

---

### 技術的負債 (Technical Debt)

[ ] any 型の排除: `lib/taskActions.ts` や `lib/taskUtils.ts` で使われている `: any` を正しい型定義に修正。
[ ] startTask / rejectTask の Transaction 化: 現在 writeBatch を使用。競合防御を強化するなら runTransaction に移行。
[ ] `taskActions.approveTask` / `storeActions.createExchange`, `rejectExchange` を Admin SDK に移行後、`users` write を `allow write: if false;` に完全封鎖。
[ ] テストコード: 投稿ボタンを連打しても二重投稿されないかのチェック。
