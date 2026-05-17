# 🤖 AI_CONTEXT.md - Family Task Management & Reward System
## 📅 最終更新: 2026-05-17 | ステータス: 本番稼働中・Phase 8.7 完了

---

## 🎯 CURRENT_SPEC（現行仕様 - 絶対真実）

### 1. タスク管理 ステータス遷移フロー

```
pending (未着手) → working (作業中) → completed (完了報告) → approved (承認済み・不変)
                    ↑                                         |
                    └──── 差し戻し（親のみ）──────────────────┘
                         ※ approved からの差し戻しは禁止（不変）
```

### 2. ご褒美ストア ステータス遷移フロー

厳密な有限状態機械（State Machine）として定義。右方向への不可逆な遷移のみ許可。

```
requested (交換申請中) ──[親の承認]──→ delivered (お渡し完了・確定不変)
         │
         └──[親の却下（自動返金＆在庫復元）]──→ rejected (却下・確定不変)
```

---

## 型定義（types/index.ts）

### UserData
```typescript
export interface UserData {
  userId: string;       // Firebase Auth UID
  email: string | null;
  name: string;
  totalReward: number;  // 現在の保有ポイント
  familyId?: string;    // オプショナル（役割未設定時は存在しない）
  role: 'parent' | 'child' | 'unknown' | null;
}
```

### TaskData（TypeScript: camelCase）
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

### RewardData（Phase 8 追加・Phase 8.7 更新）
```typescript
export interface RewardData {
  rewardId: string;
  familyId: string;
  title: string;
  description?: string;
  requiredPoints: number;
  stock?: number | null;   // undefined/null=無限、0=売り切れ
  isActive: boolean;
  isDeleted: boolean;      // 論理削除（過去履歴保護のため物理削除禁止）
  version: number;         // 楽観的排他制御用（更新時 FieldValue.increment(1)）
  createdBy: string;
  createdAt: Date;
}

// 親CRUD入力DTO（Omit/Pick 禁止ルール#9のため独立型として定義）
export interface CreateRewardInput {
  title: string;
  description?: string;
  requiredPoints: number;
  stock?: number | null;
}

export interface UpdateRewardInput {
  title?: string;
  description?: string;
  requiredPoints?: number;
  stock?: number | null;
  isActive?: boolean;
}
```

### ExchangeData（Phase 8 追加）
```typescript
export type ExchangeStatus = 'requested' | 'delivered' | 'rejected';
export type RejectedReason = 'parent_rejected' | 'out_of_stock';

export interface ExchangeData {
  exchangeId: string;
  familyId: string;
  rewardId: string;
  rewardTitle: string;      // 申請時スナップショット保全
  childName: string;        // 申請時スナップショット（N+1防止・非正規化）
  requiredPoints: number;   // 交換時点の消費ポイントスナップショット
  status: ExchangeStatus;
  rejectedReason?: RejectedReason;
  requestedBy: string;
  deliveredBy?: string;
  deliveredAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### AuthContext（Phase 8.7 追加）
```typescript
// lib/auth/types.ts
export type AuthRole = Exclude<UserRole, 'unknown' | null>;

export interface AuthContext {
  readonly uid: string;
  readonly familyId: string;
  readonly role: AuthRole;
}

// lib/auth/getCurrentParent.ts
// 失敗時は throw（nullable にしない）
export function getCurrentParent(user: UserData): AuthContext {
  if (user.role !== 'parent' || !user.familyId) {
    throw new UnauthorizedError('親アカウントの認証情報が不正、または家族IDが存在しません');
  }
  return { uid: user.userId, familyId: user.familyId, role: 'parent' };
}
```

---

## Firestore スキーマ（Firestore: snake_case）

### FirestoreTaskDocument
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

### FirestoreRewardDocument（Phase 8 追加・Phase 8.7 更新）
```typescript
export interface FirestoreRewardDocument {
  reward_id: string;
  family_id: string;
  title: string;
  description: string | null;  // normalizeText() により undefined は null に正規化
  required_points: number;
  stock: number | null;        // null=無限、0=売り切れ
  is_active: boolean;
  is_deleted: boolean;         // 論理削除フラグ（物理削除禁止）
  version: number;             // 更新時は FieldValue.increment(1)
  created_by: string;
  updated_by: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: Timestamp | null;
  deleted_by: string | null;
}
```

### FirestoreExchangeDocument
```typescript
export interface FirestoreExchangeDocument {
  family_id: string;
  reward_id: string;
  reward_title: string;
  child_name: string;
  required_points: number;
  status: ExchangeStatus;
  rejected_reason?: RejectedReason;
  requested_by: string;
  delivered_by?: string;
  delivered_at?: Timestamp;
  rejected_by?: string;
  rejected_at?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
}
```

### 命名規則（憲法）
- **フロントエンド/Props/Logic**: camelCase
- **Firestore**: snake_case
- **変換**: 必ず `buildTaskData() / taskDataToFirestore()`、`buildRewardData()` / `rewardConverter` を使用
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

**第1層: Firestore Security Rules**
- 家族分離（`belongsToFamily`）の徹底
- `reward_exchanges` / `idempotency_keys` のクライアント直接アクセスを `allow read, write: if false;` で完全遮断
- `users` read: 自分のドキュメント、または親が同一家族メンバーを読む場合のみ許可

**第2層: ロジック層（Transaction ＆ 状態機械）**
- **AuthContext ゲート（Phase 8.7）**: `getCurrentParent(user)` は role/familyId が確定した個体のみ AuthContext を返す。失敗時は throw（nullable にしない）
- **楽観的排他制御**: `loadedVersion: number`（必須）。Transaction内で Read → version 検証 → Write の順を厳守
- **Read-before-Write**: Transaction内部でFirestoreから最新値を取得してから書き込む
- **二重処理防止**: `assertExchangeTransition()` による状態遷移の厳密固定
- **NaNおよび異常値の完全遮断**: Server Action の入り口で厳格な数値チェック
- **normalizeText()**: undefined/空文字 → null に正規化（Firestore undefined クラッシュ防止）

**第3層: UI層**
- 状態に応じたローディング（Disabled）制御、連打による重複申請の防止
- `onSnapshot` によるリアルタイム同期（`router.refresh()` は使用しない）

---

## ⚠️ 禁止事項（憲法違反 = 即差し戻し）

1. `user.uid` の使用禁止 → 必ず `user.userId` を参照
2. レンダリング中の副作用禁止 → 必ず `useEffect` を使用
3. バリデーションなしのDB書き込み禁止
4. **勝手な最適化・共通化の禁止（重要）**:
   - Transaction を writeBatch へ格下げする行為の禁止
   - 整合性検証のための事前 get（Read Phase）を省略する行為の禁止
5. **ご褒美の物理削除禁止**: 過去の交換履歴破壊を防ぐため、必ず論理削除（`is_deleted = true`）を徹底
6. **不変状態の逆流禁止**: `approved` タスク、`delivered` / `rejected` の交換申請は二度とステータス変更不可
7. **二重返金ガードの省略禁止**: `rejectExchange` 時、対象が `requested` であることのチェックを絶対に省略しない
8. **型キャスト `Number()` の単発使用の禁止**: 必ず `form.value === '' ? undefined : Number(form.value)` を徹底
9. **型定義における過度な `Omit/Pick` の禁止**: 入力層は独立した DTO 型（`CreateRewardInput` 等）を明示的に定義
10. **`loadedVersion` のオプショナル化禁止**: `loadedVersion?: number` にすると楽観的ロックが無効化される。必須（`loadedVersion: number`）を維持
11. **`router.refresh()` の使用禁止（ご褒美画面）**: `onSnapshot` がリアルタイム同期を担う。`router.refresh()` は不要かつ二重更新の原因になる
12. **Transaction 内での `FieldValue.increment()` 使用禁止（Exchange 系）**: `exchanges` の `createExchange` / `rejectExchange` では Read-before-Write で手動算術演算を行う。`rewardActions` の version bump は `FieldValue.increment(1)` を使用（逆は違反）

---

## 📊 HISTORY（開発履歴）

### Phase 1-5: 基盤・タスク管理システム完成（完了）
- Firebase認証、役割選択、セキュリティルールの要塞化
- タスク作成・着手（working）・完了・承認（Transaction制御）の完全実装および本番実運用開始

### Phase 6-7: 運用改善 ＆ 利便性向上（完了）
- 差し戻し（rejectTask）、物理削除（pendingのみ）、担当者指名、タスク複製の実装
- 差し戻し時に `assigned_to` をクリア（先着順に戻す）

### Phase 8: ご褒美ストア機能・バックエンド要塞化（完了）
- ご褒美マスター（`rewards`）および承認ワークフロー型交換（`exchanges`）の設計
- 状態遷移の有限状態機械（State Machine）化
- ポイント「申請時即時減算 ＆ 却下時安全返金」アーキテクチャの採用

### Phase 8 FIX版: 即時交換決済エンジン（完了）
- **2ルート並行アーキテクチャ**:
  - 承認ワークフロー型（`exchanges`）: 子がおねだりし、親が承認してポイント移動
  - 即時交換型（`reward_exchanges` + `idempotency_keys`）: EC決済と同等の即時確定
- `firebase-admin` (Admin SDK) を Server Action の信頼境界として導入
- `purchaseRequestId`（UUID v4）による冪等性保証（TTL 7日）
- `reward_exchanges` / `idempotency_keys` の Security Rules を完全遮断

### Phase 9: クエリレイヤー実装（完了）
- `lib/rewardQueries.ts`: `unstable_cache` + Admin SDK による SSR クエリ層
- `PlainReward` 型（Timestamp → `updated_at_ms: number` でキャッシュ安全に）
- `useParentRewards` フック（onSnapshot によるリアルタイムストリーム）
- `loadedVersion` を必須化、`normalizeText()` による undefined/空文字の正規化
- `restoreReward()` 追加（同名アクティブ報酬の重複チェック付き）

### Phase 8.7: AuthContext 一本化（完了 - 2026-05-17）
- `lib/auth/types.ts`: `AuthRole` / `AuthContext` インターフェース定義
- `lib/errors/auth.ts`: `UnauthorizedError` クラス定義
- `lib/auth/getCurrentParent.ts`: UserData → AuthContext ゲート関数（throw パターン）
- `lib/rewardActions.ts`: 全4関数を `auth: AuthContext` 第1引数に統一、`throwWithCode` パターン採用
- `components/parent/RewardManageCard.tsx`: `auth: AuthContext` Props、try/catch 化、`router.refresh()` 完全削除
- `app/parent/rewards/page.tsx`: `getCurrentParent(user)` で AuthContext 生成

---

## 📚 実装リファレンス（コアロジック）

### 1. AuthContext ゲート（Phase 8.7）
```typescript
// 使い方（Client Component）
const auth = getCurrentParent(user); // 失敗時は throw UnauthorizedError
await updateReward(auth, rewardId, loadedVersion, input);
```

### 2. rewardActions のエラーパターン
```typescript
// 成功: 値を return
// 失敗: throwWithCode(code, message) で throw
// 呼び出し元は try/catch で処理
try {
  await deleteReward(auth, rewardId, loadedVersion);
  onSuccess?.('削除しました');
} catch (err: unknown) {
  onError?.((err as any).message ?? '削除に失敗しました');
}
```

### 3. 状態遷移の固定（State Machine）
```typescript
function assertExchangeTransition(from: ExchangeStatus, to: ExchangeStatus): void {
  const allowed: Record<ExchangeStatus, ExchangeStatus[]> = {
    requested: ['delivered', 'rejected'],
    delivered: [],
    rejected: [],
  };
  if (!allowed[from].includes(to)) {
    throw new Error(`不正な状態遷移です: ${from} -> ${to}`);
  }
}
```

### 4. Firestore インデックス要件
```
rewards コレクション:
  family_id (ASC) + is_deleted (ASC) + created_at (DESC)

tasks コレクション:
  family_id (ASC) + created_at (DESC)
```

---

## 🔮 今後の課題（TODO）

- `taskActions.approveTask` / `storeActions.createExchange`, `rejectExchange` を Admin SDK に移行後、`users` write を `allow write: if false;` に完全封鎖
- `any` 型の排除（`lib/taskActions.ts` / `lib/taskUtils.ts`）
- `startTask` / `rejectTask` の runTransaction 化（現在 writeBatch）

---

Made with ❤️ by Bob  
**ステータス: 本番稼働中（Phase 8.7 AuthContext 一本化 完了）**
