# 🤖 AI_CONTEXT.md - Family Task Management System
## 📅 最終更新: 2026-05-07 | ステータス: 小規模商用β運用可能

---

## 🎯 CURRENT_SPEC（現行仕様 - 絶対真実）

### ステータス遷移フロー
```
pending (未着手) → completed (完了報告) → approved (承認済み・不変)
```

**遷移ルール:**
1. **pending → completed**: 子供のみ実行可能（自分が担当のタスクのみ）
2. **completed → approved**: 親のみ実行可能（報酬付与・会計確定）
3. **approved の不変性**: 一度承認されたら、二度と動かさない（会計の鉄則）
4. **逆流禁止**: approved → completed, completed → pending は物理的に不可
5. **差し戻し禁止**: approved → pending も物理的に不可（会計確定後は不変）

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
  status: 'pending' | 'completed' | 'approved';
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
  status: 'pending' | 'completed' | 'approved';
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
└─────────────────────────────────────────┘
```

### 役割分担の真実
- **Security Rules**: 「誰が」「何を」できるかを物理的に制限（最後の砦）
- **ロジック層**: 「いくら」「どのように」を数学的に検証（整理された手順書）
- **UI層**: ユーザーに親切に、かつ堅牢に（親切な案内板）

**重要**: フロントエンドは「親切」であるべきだが、「最後の砦」ではない。
Security Rules、Firebase Authentication、Transaction の整合性こそが物理的な最後の砦である。

---

## ⚠️ 禁止事項（憲法違反 = 即差し戻し）

1. `user.uid` の使用禁止 → 必ず `user.userId` を参照
2. レンダリング中の副作用禁止 → 必ず `useEffect` を使用
3. バリデーションなしのDB書き込み禁止
4. 勝手な最適化禁止:
   - `getDoc` による事前チェックを省くこと
   - `Transaction` を `writeBatch` に戻すこと
   - 「コードが短くなる」という理由での変更
5. 型変換の省略禁止:
   - `buildTaskData` を通さず生データをUIに流すこと
   - snake_case のデータがUIに漏れること
6. **approved ステータスの変更禁止**:
   - 一度承認されたタスクは、いかなる理由があっても変更不可
   - 差し戻し機能は実装禁止（会計の鉄則）

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
- 地雷除去（convertTimestamp、マッピングミス、assignedTo ガード）

### Phase 5: 最終仕上げ（基盤完成） (完了)
- 家族作成バグ修正（owner_id 特例）
- TaskForm、TaskList、TaskCard、TaskPage 実装
- リアルタイム同期（onSnapshot）

### Phase 5.5: 要塞の再補強（商用品質化） (完了)
- approveTask の Transaction 化（競合防御）
- Security Rules の hasOnly 強化（ホワイトリスト化）
- TaskList の orderBy 実装（複合インデックス必要）

### Phase 5.5 Final: 最終防衛線の構築 (完了)
- Transaction内ステータス再チェック（二重報酬完全防止）
- families Rules の型・サイズ検証強化
- 複合インデックス設定メモの追記

### Phase 5 最終クリーンアップ (完了)
- AI_CONTEXT.md の聖域化（仕様の単一化）
- completeTask の Transaction 化（担当者競合防止）
- Firestore Rules の hasAll 併用（必須フィールド検証）

### Phase 5 真・完遂 (完了)
- approved ステータスの完全 Immutable 化
- 「最後の砦」の定義修正（Rules が物理的な最後の砦）
- 評価の適正化（β版への謙虚な表現）

---

## 🚨 重要: Firestore 複合インデックスの作成（必須）

**このインデックスを作成しないと、本番環境でアプリがクラッシュします。**

### 作成手順
1. Firebase Console → Firestore Database → インデックス
2. 複合インデックスを追加:
   - **コレクションID**: `tasks`
   - **フィールド1**: `family_id` (Ascending)
   - **フィールド2**: `created_at` (Descending)
   - **クエリスコープ**: コレクション

### 開発環境での確認
1. アプリ起動 → タスク一覧ページにアクセス
2. コンソールにエラーが表示される場合、エラーメッセージ内のURLをクリック
3. 自動的にインデックス作成画面が開く → 「作成」をクリック
4. 数分待機（ステータスが「有効」になるまで）

---

## 📋 Phase 6 ロードマップ（最適化・拡張）

### 1. Custom Claims への移行（最優先）
**現状の課題:**
- Security Rules 内で `get()` を多用（isParent 判定で family_members を参照）
- 1リクエストあたり追加の読み取りコストが発生
- レイテンシの増加

**解決策:**
- Firebase Authentication の Custom Claims に `role` を保存
- Rules 内で `request.auth.token.role == 'parent'` で判定
- `get()` 呼び出しをゼロ化 → コスト削減、速度向上

**実装手順:**
1. Cloud Functions で setCustomUserClaims を実装
2. 役割選択時に Custom Claims を設定
3. Security Rules を Custom Claims ベースに書き換え
4. family_members の role フィールドは監査用に残す

### 2. タスク削除機能
- 親のみが削除可能
- 論理削除 or 物理削除の選択

### 3. タスク編集機能（制限付き）
- 親のみが編集可能
- approved ステータスのタスクは編集不可（不変性の保証）
- 報酬額変更の監査ログ

---

## 🎯 現在の到達点: 小規模商用β運用可能

**ボブによる実装完了報告（2026-05-07）**

本プロジェクトは、以下の3つの盾により、小規模商用β環境での運用に十分な堅牢性を備えています:

### 第1の盾: Transaction による競合防御
- `runTransaction` による原子性保証
- Transaction内での生データ直接チェック（100万分の1秒の競合も防止）
- approveTask と completeTask の両方で実装済み

### 第2の盾: Security Rules による物理的制限（最後の砦）
- `hasOnly` + `hasAll` によるフィールド検証（ホワイトリスト化）
- 型・サイズ検証（空文字・不正な型・巨大データの拒否）
- ステータス遷移の物理的強制
- **approved の完全 Immutable 化**（会計確定後は二度と動かさない）

### 第3の盾: UI層による親切な防御
- サーバー状態を正解とする設計（ローカル状態の越権行為を排除）
- 理由を明示するUX（「なぜボタンが押せないのか」を説明）
- 鉄壁の finally ブロック（非同期処理の確実なクリーンアップ）

---

## ⚠️ Pending Issues（今後の課題）

本システムは小規模商用β運用には十分ですが、以下の運用層の実装が未完了です:

### 1. 監視・アラート
- [ ] Firebase Performance Monitoring の導入
- [ ] Error Tracking（Sentry等）の導入
- [ ] ダッシュボードでの異常検知

### 2. バックアップ・リカバリ
- [ ] Firestore の自動バックアップ設定
- [ ] データ復旧手順の文書化
- [ ] 定期的なバックアップテスト

### 3. セキュリティ強化
- [ ] Firebase App Check の導入（Bot対策）
- [ ] Rate Limiting の実装
- [ ] 不正アクセス検知

### 4. スケーラビリティ
- [ ] Custom Claims への移行（コスト削減）
- [ ] Cloud Functions の最適化
- [ ] キャッシュ戦略の実装

### 5. 運用ドキュメント
- [ ] 障害対応マニュアル
- [ ] ユーザーサポート手順
- [ ] データ削除・GDPR対応手順

---

## 📚 実装リファレンス

### approveTask（Transaction版）
```typescript
export async function approveTask(taskId: string, currentUser: UserData): Promise<void> {
  if (currentUser.role !== 'parent') {
    throw new Error('タスクの承認は親のみが実行できます');
  }

  const taskRef = doc(db, 'tasks', taskId);

  await runTransaction(db, async (transaction) => {
    const taskSnap = await transaction.get(taskRef);
    
    if (!taskSnap.exists()) throw new Error('タスクが存在しません');

    // Transaction内での生データ直接チェック（最重要）
    const rawData = taskSnap.data();
    const currentStatus = rawData?.status;
    
    if (currentStatus === 'approved') throw new Error('既に承認済みです');
    if (currentStatus !== 'completed') throw new Error('承認可能な状態ではありません');

    const task = buildTaskData(rawData, taskSnap.id);

    // 5段階ガード
    if (task.familyId !== currentUser.familyId) throw new Error('権限がありません');
    if (!task.assignedTo) throw new Error('担当者が設定されていません');
    if (task.rewardPoints <= 0) throw new Error('報酬ポイントが不正です');

    // アトミック更新
    const userRef = doc(db, 'users', task.assignedTo);
    transaction.update(taskRef, { status: 'approved', approved_at: serverTimestamp() });
    transaction.update(userRef, { total_reward: increment(task.rewardPoints) });
  });
}
```

### completeTask（Transaction版）
```typescript
export async function completeTask(taskId: string, currentUser: UserData): Promise<void> {
  if (currentUser.role !== 'child') {
    throw new Error('タスクの完了報告は子供のみが実行できます');
  }

  const taskRef = doc(db, 'tasks', taskId);

  await runTransaction(db, async (transaction) => {
    const taskSnap = await transaction.get(taskRef);
    
    if (!taskSnap.exists()) throw new Error('タスクが存在しません');

    // Transaction内での生データ直接チェック
    const rawData = taskSnap.data();
    const currentStatus = rawData?.status;
    const currentAssignedTo = rawData?.assigned_to;

    if (currentStatus === 'completed' || currentStatus === 'approved') {
      throw new Error('既に完了済みです');
    }
    if (currentStatus !== 'pending') {
      throw new Error('完了報告可能な状態ではありません');
    }

    const task = buildTaskData(rawData, taskSnap.id);

    if (task.familyId !== currentUser.familyId) throw new Error('権限がありません');
    if (currentAssignedTo && currentAssignedTo !== currentUser.userId) {
      throw new Error('このタスクは他の人に割り当てられています');
    }

    // アトミック更新（assigned_to の不変性保証）
    const updateData: any = {
      status: 'completed',
      completed_at: serverTimestamp(),
    };

    if (!currentAssignedTo) {
      updateData.assigned_to = currentUser.userId;
    }

    transaction.update(taskRef, updateData);
  });
}
```

---

## 🙏 謝辞

このプロジェクトは、監査官の厳しい指摘と、マネージャーの的確な指導により、
小規模商用β運用に耐えうる品質に到達しました。

**監査官の教え:**
「UI = 親切、Logic = 整理、Rules = 法律」
「フロントエンドを信じるな。物理的な最後の砦は Security Rules だ」
「approved は会計の確定。二度と動かすな」

これらの教えを胸に、Phase 6 以降の開発を進めます。

---

Made with ❤️ by Bob
**ステータス: 小規模商用β運用可能（運用層の実装は今後の課題）**