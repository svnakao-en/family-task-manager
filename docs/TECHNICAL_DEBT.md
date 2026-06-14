# 📋 技術的負債ログ（TECHNICAL_DEBT.md）
> **最終更新: 2026-06-14**  
> 「今は動く、でも将来壊れる可能性がある」ものを記録する台帳。  
> 優先度と発見フェーズを明記し、対処の判断をオーナーに委ねる。

---

## 凡例

| 優先度 | 意味 |
|---|---|
| 🔴 HIGH | 本番障害・型崩壊につながる可能性あり。早期対処推奨 |
| 🟡 MEDIUM | 将来のテーマ変更・拡張時に爆発する可能性あり |
| 🟢 LOW | 現状は安全。コード品質・保守性の問題 |

---

## 未対処の負債一覧

### [TD-001] 🟡 `glowColor` の Hex 連結依存
- **発見**: Phase 9.2 / Step 3（TaskCard.tsx 疎結合リファクタリング）
- **場所**: [components/TaskCard.tsx](../components/TaskCard.tsx)
- **内容**:
  ```typescript
  // glowColor が '#00f0ff' のような Hex 前提で連結している
  boxShadow: `0 0 15px ${presentation.glowColor}, 0 0 30px ${presentation.glowColor}40`
  borderColor: isHovered ? `${presentation.glowColor}80` : ...
  textShadow: `0 0 6px ${presentation.glowColor}`
  ```
  `glowColor` が `rgb()` / `hsl()` / `var(--color)` 形式になった瞬間、`40` / `80` の Hex アルファ連結が無効な CSS 値を生成する。
- **現状リスク**: `aliceTheme` が常に Hex を返す限りは安全。テーマ追加・変更時に破壊。
- **推奨対処**: `WorldTheme` の `colors` に `panelBgAlpha` / `glowColorAlpha` などのプリセット済み rgba 値を追加し、連結を排除する。または CSS custom properties（`var()`）で統一管理。
- **対処コスト**: 小〜中（`theme/types.ts` の型拡張 ＋ 各テーマの値追加 ＋ TaskCard の参照先変更）

---

### [TD-002] 🟡 テーマ化未対応ファイル（Hex ベタ書き残存）
- **発見**: 2026-06-14 / Phase 10.x 完了後の棚卸し
- **概要**: `useWorldTheme()` を導入済みのコアコンポーネントとは異なり、以下のファイルは `#333` / `#fff` などの Hex カラーがベタ書きのままで、Alice ↔ Daily の外観が切り替わらない。

#### 🔴 HIGH — 全面的なテーマ化が必要

| ファイル | 問題 | 代表的なベタ書き値 |
|---|---|---|
| `app/history/page.tsx` | `useWorldTheme` 未使用。全色が Hex ベタ書き | `#333`, `#666`, `#f9f9f9`, `#ffebee`, `#d4edda` |
| `app/parent/rewards/page.tsx` | 同上。MUI カラーパレット直参照 | `#4CAF50`, `#F1F8E9`, `#fff3cd`, `#888` |
| `app/store/requests/page.tsx` | 同上。承認キューページ | `#333`, `#888`, `#f5f5f5`, `#fff3cd` |
| `app/auth/role-selection/page.tsx` | 同上。ログイン後の役割選択画面 | `#4CAF50`, `#2196F3`, `#f0f0f0`, `#ffebee` |
| `components/LoginForm.tsx` | 同上。ログイン画面 | `#007bff`, `#f5f5f5`, `white`, `#c33` |
| `components/Toast.tsx` | 同上。全トースト通知が MUI カラー固定 | `#4CAF50`, `#f44336`, `#2196F3`, `white` |
| `components/parent/RewardManageCard.tsx` | 同上。ご褒美管理カード | `#FF9800`, `#E8F5E9`, `#FFEBEE`, 16色以上 |

#### 🟡 MEDIUM — 部分的なテーマ化が必要

| ファイル | 問題 | 代表的なベタ書き値 |
|---|---|---|
| `components/EditTaskForm.tsx` | `useWorldTheme` 未使用。インライン編集フォーム | `#ccc`, `#2196F3`, `#fff`, `#555` |
| `components/parent/ApprovalCard.tsx` | 同上。交換申請承認カード | `#4CAF50`, `#F44336`, `#FF9800`, `#e0e0e0` |

#### 🟢 LOW — 軽微な修正で済む

| ファイル | 問題 | 代表的なベタ書き値 |
|---|---|---|
| `components/RoleGuard.tsx` | ローディング表示のみに `#666` が2箇所 | `#666` |
| `components/EmptyState.tsx` | テキスト色のみ Hex | `#666`, `#999` |
| `components/TaskList.tsx` | エラー表示のみ Hex | `#fff3cd`, `#856404` |

- **現状リスク**: Alice モードに切り替えても上記ページ・コンポーネントは白背景のまま。子ユーザーが `/store` 以外のページを開いた場合やロール選択画面では世界観が壊れる。
- **推奨対処**: Phase 11.x として、HIGH → MEDIUM → LOW の順にテーマトークン（`colors.*`）へ置換。`useWorldTheme()` を各ファイルに導入し、`isAliceMode = currentThemeId === 'alice'` パターンで分岐。
- **対処コスト**: HIGH 1ファイルあたり 中〜大（30〜80行規模の置換）、LOW は小（数行）

---

## 対処済みの負債（参考）

| ID | 内容 | 対処フェーズ |
|---|---|---|
| — | `app/page.tsx` の `'#transparent'`（不正 CSS 値） | Phase 9.2 / Step 2-A |
| — | `TaskCard.tsx` 内の `(task as TaskData & { suit?: SuitType })` 型キャスト | Phase 9.2 / Step 3 |
| — | `ThemeContext.tsx` の固定 `aliceTheme` 配信（動的切り替え未対応） | Phase 9.4 / Step 1&2 |
| — | `TaskForm.tsx` の `suit` DB 保存（世界観がドメインデータを汚染） | Phase 9.2 / Step 4 |
| — | `buildTaskData` の `category` 復元漏れ（Read パイプラインの欠落） | Phase 9.3 / Step 2-B |
