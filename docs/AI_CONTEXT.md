# 🤖 AI_CONTEXT.md - Family Task Management & Reward System
## 📅 最終更新: 2026-05-16 | ステータス: 本番稼働中・Phase 8 バックエンドFix

---

## 🎯 CURRENT_SPEC（現行仕様 - 絶対真実）

### 1. タスク管理 ステータス遷移フロー

```
pending (未着手) → working (作業中) → completed (完了報告) → approved (承認済み・不変)
                    ↑                                         |
                    └──── 差し戻し（親のみ）──────────────────┘
                         ※ approved からの差し戻しは禁止（不変）
```

### 2. ご褒美ストア ステータス遷移フロー（Phase 8 追加）

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

### RewardData（Phase 8 追加）
```typescript
export interface RewardData {
  rewardId: string;
  familyId: string;
  title: string;
  description?: string;
  requiredPoints: number;
  stock?: number;           // 未設定時は無限、0は売り切れ
  isActive: boolean;        // 論理削除（過去履歴保持のため物理削除禁止）
  createdBy: string;
  createdAt: Date;
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
  rewardTitle: string;      // マスター変更時のスナップショット保全
  requiredPoints: number;   // 交換時点の消費ポイントスナップショット
  status: ExchangeStatus;
  rejectedReason?: RejectedReason;
  requestedBy: string;      // 子のuserId
  deliveredBy?: string;     // 承認した親のuserId（監査ログ）
  rejectedBy?: string;      // 却下した親のuserId（監査ログ）
  createdAt: Date;
  updatedAt: Date;
  deliveredAt?: Date;
  rejectedAt?: Date;
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

### FirestoreRewardDocument（Phase 8 追加）
```typescript
export interface FirestoreRewardDocument {
  reward_id: string;
  family_id: string;
  title: string;
  description?: string;
  required_points: number;
  stock?: number;
  is_active: boolean;
  created_by: string;
  created_at: Timestamp;
}
```

### FirestoreExchangeDocument（Phase 8 追加）
```typescript
export interface FirestoreExchangeDocument {
  exchange_id: string;
  family_id: string;
  reward_id: string;
  reward_title: string;
  required_points: number;
  status: ExchangeStatus;
  rejected_reason?: RejectedReason;
  requested_by: string;
  delivered_by?: string;
  rejected_by?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  delivered_at?: Timestamp;
  rejected_at?: Timestamp;
}
```

### 命名規則（憲法）
- **フロントエンド/Props/Logic**: camelCase
- **Firestore**: snake_case
- **変換**: 必ず `buildTaskData() / taskDataToFirestore()`、`buildExchangeData() / exchangeDataToFirestore()` を使用
- **違反**: 即座に差し戻し

---

## 🛡️ SECURITY_ARCHITECTURE（セキュリティ設計）

### 監査官の格言
```
UI = 親切な案内板
Logic = 整理された手順書
Rules = 物理的な法律（最後の砦）
```

### 3層防御システム（Phase 8 お金系仕様の要塞化）

**第1層: Firestore Security Rules**
- 家族分離（`belongsToFamily`）の徹底
- `exchanges` のクライアント直接 `update` は原則禁止方向（将来の完全Callable Functions化への布石）

**第2層: ロジック層（Transaction ＆ 状態機械）**
- セッション風化・DevTools改ざん対策: フロントから渡される `currentUser` のロールや家族IDを盲信せず、Transaction内部でFirestoreから最新の `UserData` を再取得して権限を二重検証する
- リトライ耐性: 在庫・ポイントの増減には `increment()` を使用し、パケット再送時の競合を完全防御する
- 二重処理・ポイント無限増殖の防止: `assertExchangeTransition()` による状態遷移の厳密固定

**第3層: UI層**
- 状態に応じたローディング（Disabled）制御、連打による重複申請の防止

---

## ⚠️ 禁止事項（憲法違反 = 即差し戻し）

1. `user.uid` の使用禁止 → 必ず `user.userId` を参照
2. レンダリング中の副作用禁止 → 必ず `useEffect` を使用
3. バリデーションなしのDB書き込み禁止
4. 勝手な最適化・共通化の禁止:
   - `Transaction` を `writeBatch` に戻すこと
   - 整合性検証のための事前 `get` を省略すること
5. **ご褒美の物理削除禁止**: 過去の交換履歴破壊を防ぐため、必ず論理削除（`is_active = false`）を徹底すること
6. **不変状態の逆流禁止**: `approved` タスク、および `delivered` / `rejected` の交換申請は、いかなる理由があっても二度とステータスを変更してはならない
7. **二重返金ガードの省略禁止**: `rejectExchange` 時、対象の申請が `requested` であることのチェックを絶対に省いてはならない（ポイント増殖バグ防止）

---

## 📊 HISTORY（開発履歴）

### Phase 1-5: 基盤・タスク管理システム完成 (完了)
- Firebase認証、役割選択、セキュリティルールの要塞化
- タスク作成・着手（working）・完了・承認（Transaction制御）の完全実装および本番実運用開始

### Phase 6-7: 運用改善 ＆ 利便性向上 (完了)
- 差し戻し（rejectTask）、物理削除（pendingのみ）、担当者指名、タスク複製（コピーして作成）の実装
- 差し戻し時に `assigned_to` をクリア（先着順に戻す）
- 編集時に担当者変更を可能に
- 子アカウント登録バグ修正（Security Rules）

### Phase 8: ご褒美ストア機能・バックエンド要塞化 (完了・本番反映待ち)
- ご褒美マスター（`rewards`）および交換履歴（`exchanges`）の設計
- 状態遷移の有限状態機械（State Machine）化
- ポイント「申請時即時減算 ＆ 却下時安全返金」アーキテクチャの採用
- Transaction内でのユーザー権限・家族IDの再検証ロジック、および `increment` 競合防御の実装
- 親の承認/却下時における監査ログ（`delivered_by` / `rejected_by`）の実装

---

## 📚 実装リファレンス（Phase 8 コアロジック）

### 1. 状態遷移の固定（State Machine）
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

### 2. createExchange（子供の交換申請）
```typescript
// 概要：子供のロール/家族IDをTransaction内で再検証。ポイント不足・在庫をチェックし、即時減算。
```

### 3. deliverExchange（親のご褒美引き渡し）
```typescript
// 概要：親の権限を再検証。状態遷移が requested -> delivered であることを固定し、監査ログを記録。
```

### 4. rejectExchange（親の却下 ＆ 安全返金）
```typescript
// 概要：状態が requested であることを厳密チェック。一括Transactionで status='rejected'化、ポイントを increment() で返金、在庫を increment(1) で復元。
```

---

Made with ❤️ by Bob
**ステータス: 本番稼働中（Phase 8 バックエンド設計 Fix・UXフェーズへ移行）**
