# 開発進捗ダッシュボード

**最終更新**: 2026-05-21  
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
- [ ] Step 2.8: 【金融システム化】ご褒美在庫減算ルールの極限緊縛（Hardening）
  - [x] `firestore.rules` に `isValidRewardStockDeduction()` を実装（確定版デプロイ待ち）
    - `affectedKeys().hasOnly(['stock', 'updated_at'])` による差分制御
    - 境界値修正: `newData.stock >= 0`（最後の1個を正しく購入可能）
    - 権限チェック（`isParent` / `belongsToFamily`）を `allow update` 外側に分離
  - [x] `storeActions.ts` の `deliverExchange` が最小 `update()` のみ使用していることを確認済み（変更不要）
  - [ ] `firebase deploy --only firestore:rules` で本番デプロイ
- [ ] Step 3: Vercel 本番環境デプロイ、および親・子アカウントでの動作確認

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

## AI との開発フロー

1. **Gemini（マネージャー）** が仕様・設計を決定
2. **Claude（技師）** が実装前にセキュリティ・型チェック → 実装・コミット
3. **ChatGPT（監査官）** が論理整合性・型・仕様の矛盾を検知
4. **オーナー** が GO/NG の最終判断

> 新しい AI セッションを始める際は `docs/AI_CONTEXT.md` を読み込ませてください。
