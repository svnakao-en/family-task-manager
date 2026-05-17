/**
 * ご褒美マスター クエリレイヤー（Phase 9 / Server-side Cache）
 *
 * unstable_cache でラップし、revalidateTag による tag-based 無効化と連動する。
 *
 * ⚠️ Timestamp シリアライズ地雷について：
 *   Firestore の Timestamp オブジェクトは unstable_cache がキャッシュをシリアライズ（JSON化）する際に
 *   インスタンスメソッド（.toDate()/.toMillis()等）が消滅し、復元時に TypeError を起こす。
 *   そのため、日付フィールドは必ず .toMillis()（エポックミリ秒）に変換してから返す。
 *
 * ⚠️ キャッシュキーのテナント隔離について：
 *   キャッシュキーに familyId を含めないと、A家族のデータが全家族に配信される
 *   マルチテナント漏洩事故を引き起こす。必ず ["rewards", familyId] 形式で指定すること。
 */

import { unstable_cache } from 'next/cache';
import { adminDb } from '@/lib/firebase-admin';

/**
 * unstable_cache から返す、シリアライズ安全なプレインオブジェクト型
 * Timestamp 等の非シリアライズ型を一切含まない
 */
export interface PlainReward {
  id: string;
  family_id: string;
  title: string;
  required_points: number;
  stock: number | null;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  version: number;
  inactive_reason: string | null;
  updated_at_ms: number;  // Timestamp.toMillis() で数値化（シリアライズ安全）
  updated_by: string;
}

/**
 * 親用：家族の論理削除されていないご褒美一覧を取得
 *
 * - unstable_cache でラップ済み（Server Component / Server Action から呼び出し可）
 * - キャッシュキー: ["rewards", familyId]（テナント隔離）
 * - キャッシュタグ: `rewards:${familyId}`（rewardActions.ts の revalidateTag と対応）
 * - 呼び出し元で await して使う: `const rewards = await getRewardsForParent(familyId)`
 */
export function getRewardsForParent(familyId: string): Promise<PlainReward[]> {
  return unstable_cache(
    async (): Promise<PlainReward[]> => {
      const snap = await adminDb
        .collection('rewards')
        .where('family_id', '==', familyId)
        .where('is_deleted', '==', false)
        .orderBy('created_at', 'desc')
        .get();

      return snap.docs.map((doc): PlainReward => {
        const d = doc.data();

        // Timestamp → エポックミリ秒変換（シリアライズ安全化）
        const updatedAt = d.updated_at;
        const updatedAtMs: number =
          updatedAt != null && typeof updatedAt.toMillis === 'function'
            ? (updatedAt.toMillis() as number)
            : Date.now();

        return {
          id: doc.id,
          family_id: d.family_id as string,
          title: d.title as string,
          required_points: d.required_points as number,
          stock: d.stock ?? null,
          description: d.description ?? null,
          image_url: d.image_url ?? null,
          is_active: Boolean(d.is_active),
          version: typeof d.version === 'number' ? d.version : 1,
          inactive_reason: d.inactive_reason ?? null,
          updated_at_ms: updatedAtMs,
          // updated_by がない場合は created_by にフォールバック
          updated_by: (d.updated_by ?? d.created_by ?? '') as string,
        };
      });
    },
    ['rewards', familyId],       // キャッシュキー（familyId 込みでテナント隔離）
    {
      tags: [`rewards:${familyId}`],  // revalidateTag('rewards:${familyId}') で一括無効化
    }
  )();
}
