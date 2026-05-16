"use client";

/**
 * 親用：ご褒美マスター一覧リアルタイムストリーム（Phase 9 ルートA）
 *
 * Stream: rewards（家族の論理削除されていない全ご褒美・新しい順）
 * ※ Firebase Console で複合インデックス必要:
 *   family_id (ASC) + is_deleted (ASC) + created_at (DESC)
 */

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserData, RewardData } from '@/types';
import { rewardConverter } from '@/lib/converters/rewardConverter';

interface UseParentRewardsResult {
  rewards: RewardData[];
  isReady: boolean;
  error: boolean;
}

export function useParentRewards(parentUser: UserData): UseParentRewardsResult {
  const [rewards, setRewards] = useState<RewardData[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!parentUser.familyId) return;

    const q = query(
      collection(db, 'rewards').withConverter(rewardConverter),
      where('family_id', '==', parentUser.familyId),
      where('is_deleted', '==', false),
      orderBy('created_at', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setRewards(snap.docs.map((d) => d.data()));
        setIsReady(true);
      },
      (err) => {
        console.error('Parent Rewards Stream エラー:', err);
        setIsReady(true);
        setError(true);
      }
    );

    return () => unsub();
  }, [parentUser.familyId]);

  return { rewards, isReady, error };
}
