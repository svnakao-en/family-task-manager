# 🤖 AI_CONTEXT.md - Family Task Management System
## 📅 最終更新: 2026-05-14 | ステータス: 本番稼働中・Phase 6+ 開発継続

---

## 🎯 CURRENT_SPEC（現行仕様 - 絶対真実）

### ステータス遷移フロー
```
pending (未着手) → working (作業中) → completed (完了報告) → approved (承認済み・不変)
                                  ↑                        |
                                  └──── 差し戻し（親のみ）──┘
                                        ※ approved からの差し戻しは禁止（不変）
```

**遷移ルール:**
1. **pending → working**: 子供のみ実行可能（担当者が設定されるか、自分が担当の場合のみ）
2. **working → completed**: 子供のみ実行可能（自分が担当のタスクのみ）
3. **completed → approved**: 親のみ実行可能（報酬付与・会計確定）
4. **completed/working → pending（差し戻し）**: 親のみ実行可能（承認前のやり直し）
5. **approved の不変性**: 一度承認されたら、二度と動かさない（会計の鉄則）
6. **approved からの逆流禁止**: approved → completed, approved → pending は物理的に不可

### 型定義（types/index.ts）

#### UserData
```typescript
export interface UserData {
  userId: string;       // Firebase Auth UID
  email: string | null;
  name: string;
  totalReward: number;
  familyId?: string;    // オプショナル（役割未設定時は存在しない）
  role: 'parent' | 'child' | 'unknown' | null;
}
```

#### TaskData（TypeScript: camelCase）
```typescript
export interface TaskData {
  taskId: string;
  familyId: string;
  title: string;
  description?: string;
  rewardPoints: number;
  status: 'pending' | 'working' | 'completed' | 'approved';
  assignedTo?: string;
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
  approvedAt?: Date;
}
```

#### FirestoreTaskDocument（Firestore: snake_case）
```typescript
export interface FirestoreTaskDocument {
  task_id: string;
  family_id: string;
  title: string;
  description?: string;
  reward_points: number;
  status: 'pending' | 'working' | 'completed' | 'approved';
  assigned_to?: string;
  created_by: string;
  created_at: Timestamp;
  completed_at?: Timestamp;
  approved_at?: Timestamp;
}
```

### 命名規則（憲法）
- **フロントエンド/Props/Logic**: camelCase
- **Firestore**: snake_case
- **変換**: 必ず `buildTaskData()` と `taskDataToFirestore()` を使用
- **違反**: 即座に差し戻し

---

## 🛡️ SECURITY_ARCHITECTURE（セキュリティ設計）

### 監査官の格言
```
UI = 親切な案内板
Logic = 整理された手順書
Rules = 物理的な法律（最後の砦）
```

### 3層防御システム

```
┌─────────────────────────────────────────┐
│ 第1層: Firestore Security Rules        │
│ 【物理的な最後の砦】                    │
│ - 権限チェック（親/子の役割）           │
│ - 家族分離（belongsToFamily）           │
│ - ステータス遷移の物理的制限            │
│ - approved の完全 Immutable 化          │
│ - hasOnly/hasAll によるフィールド検証   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 第2層: ロジック層（taskActions.ts）    │
│ 【整理された手順書】                    │
│ - Transaction による競合防御            │
│ - 5段階ガード（approveTask）            │
│ - 報酬額の数学的検証                    │
│ - 担当者チェック（手柄の横取り防止）   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 第3層: UI層（Buttons/Forms）           │
│ 【親切な案内板】                        │
│ - サーバー状態を正解とする設計          │
│ - 理由を明示する親切なUX                │
│ - 連打防止とエラーハンドリング          │
│ - 重要操作には確認ダイアログ必須        │
└─────────────────────────────────────────┘
```

---

## ⚠️ 禁止事項（憲法違反 = 即差し戻し）

1. `user.uid` の使用禁止 → 必ず `user.userId` を参照
2. レンダリング中の副作用禁止 → 必ず `useEffect` を使用
3. バリデーションなしのDB書き込み禁止
4. 勝手な最適化禁止:
   - `getDoc` による事前チェックを省くこと
   - `Transaction` を `writeBatch` に戻すこと（approveTask / completeTask）
   - 「コードが短くなる」という理由での変更
5. 型変換の省略禁止:
   - `buildTaskData` を通さず生データをUIに流すこと
   - snake_case のデータがUIに漏れること
6. **approved ステータスの変更禁止**:
   - 一度承認されたタスクは、いかなる理由があっても変更不可
   - approved → pending の差し戻しは実装禁止（会計の鉄則）
7. **確認ダイアログの省略禁止**（Phase 6+ 追加）:
   - 削除・差し戻しなど重要な操作には必ず `window.confirm` 等を挟むこと

---

## 📊 HISTORY（開発履歴）

### Phase 1-2: 基盤・役割選択 (完了)
- Firebase認証、役割選択機能、リダイレクトガード

### Phase 3: 要塞化（セキュリティルール） (完了)
- familyId オプショナル化
- family_members ベースの Security Rules 実装
- 本人のみ/親のみのアクセス制限

### Phase 4: タスク基盤（ロジック層・UI層） (完了)
- TaskData 型定義、buildTaskData/taskDataToFirestore 実装
- approveTask（5段階ガード）、completeTask 実装
- Toast、ApproveButton、CompleteButton 実装

### Phase 5: 最終仕上げ（基盤完成） (完了)
- 家族作成バグ修正（owner_id 特例）
- TaskForm、TaskList、TaskCard、TaskPage 実装
- リアルタイム同期（onSnapshot）
- approveTask / completeTask の Transaction 化
- Security Rules の hasOnly + hasAll 強化
- approved の完全 Immutable 化

### Phase 6: 運用改善機能（完了・本番稼働中）
## 最終更新: 2026-05-14

- [x] **ステータス拡張**: `working`（作業中）ステータス追加
  - `types/index.ts` に `'working'` 追加
  - `taskUtils.ts` に色・ラベル追加
  - `startTask()` 実装（pending → working）
  - `completeTask()` を working → completed に変更
  - `StartButton` コンポーネント実装
  - Security Rules に `isValidStart()` 追加

- [x] **差し戻し機能**: 承認前（completed/working）のみ → pending に差し戻し
  - `rejectTask()` 実装
  - `RejectButton` コンポーネント実装
  - Security Rules に `isValidRejection()` 追加

- [x] **確認ダイアログ**: `RejectButton` に `window.confirm` を追加

- [x] **物理削除**: `pending` のみ対象。確認ダイアログあり
  - `deleteTask()` 実装
  - `DeleteButton` コンポーネント実装
  - Security Rules に `allow delete`（親のみ・pending のみ）追加

- [x] **担当者指名**: タスク作成時に特定の子を選択可能
  - `TaskForm` にセレクトボックス追加（未選択 = 先着順）
  - 家族の子一覧を動的取得

- [x] **タスク編集**: `pending` 時のみ、タイトル・説明・ポイントの修正が可能
  - `editTask()` 実装
  - `EditTaskForm` コンポーネント実装（インライン表示）
  - Security Rules に `isValidEdit()` 追加

- [x] **子アカウント登録バグ修正**: 新規ユーザーが子として登録できない不具合を修正
  - `families` の get ルールを認証済みユーザー全員に開放（参加時の家族ID確認のため）
  - `family_members` の update ルールを修正（family_id の初回設定を許可）

---

## 🚨 重要: Firestore 複合インデックスの作成（必須・作成済みであること）

- **コレクションID**: `tasks`
- **フィールド1**: `family_id` (Ascending)
- **フィールド2**: `created_at` (Descending)
- **クエリスコープ**: コレクション

---

## 📚 実装リファレンス

### approveTask（Transaction版）
```typescript
export async function approveTask(taskId: string, currentUser: UserData): Promise<void> {
  // 親のみ / familyId チェック → runTransaction
  // Transaction内: status が 'completed' であること確認
  // アトミック更新: status → 'approved', total_reward += rewardPoints
}
```

### completeTask（Transaction版・working → completed）
```typescript
export async function completeTask(taskId: string, currentUser: UserData): Promise<void> {
  // 子のみ / familyId チェック → runTransaction
  // Transaction内: status が 'working' であること確認（pendingでは不可）
  // アトミック更新: status → 'completed', completed_at: serverTimestamp()
}
```

### startTask（pending → working）
```typescript
export async function startTask(taskId: string, currentUser: UserData): Promise<void> {
  // 子のみ / familyId チェック
  // status が 'pending' であること確認
  // assigned_to が自分または未設定であること確認
  // 更新: status → 'working', assigned_to セット（未設定時のみ）
}
```

### rejectTask（completed/working → pending）
```typescript
export async function rejectTask(taskId: string, currentUser: UserData): Promise<void> {
  // 親のみ / familyId チェック
  // status が 'completed' または 'working' であること確認
  // 更新: status → 'pending'
}
```

---

## 🙏 開発原則

**監査官の教え:**
「UI = 親切、Logic = 整理、Rules = 法律」
「フロントエンドを信じるな。物理的な最後の砦は Security Rules だ」
「approved は会計の確定。二度と動かすな」

**Phase 6+ の追加原則:**
「運用中のシステムに触れるときは、1機能ずつ、段階的に」
「破壊的変更はしない。拡張するだけ」

---

Made with ❤️ by Bob
**ステータス: 本番稼働中（Vercel デプロイ済み・家族内実運用中）**
