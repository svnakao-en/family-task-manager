"use client";

/**
 * 親向け：交換申請キュー（FIFOソート保証）ストリームフック
 *
 * - requested_at の asc（古いおねがい順）でサーバーソートを強制
 * - 子供の名前を一括Readして合成
 * - isReady フラグでハングアップを防止
 */

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserData, ExchangeData } from '@/types';
import { buildExchangeData } from '@/lib/storeUtils';

export interface ExchangeWithChildName extends ExchangeData {
  childName: string;
}

interface UseApprovalQueueResult {
  queue: ExchangeWithChildName[];
  isReady: boolean;
  error: string | null;
}

export function useApprovalQueue(parentUser: UserData): UseApprovalQueueResult {
  const [queue, setQueue] = useState<ExchangeWithChildName[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!parentUser.familyId) return;

    const exchangesQuery = query(
      collection(db, 'exchanges'),
      where('family_id', '==', parentUser.familyId),
      where('status', '==', 'requested'),
      orderBy('created_at', 'asc') // FIFO: 古いお願い順
    );

    const unsubscribe = onSnapshot(
      exchangesQuery,
      async (snap) => {
        const exchanges: ExchangeData[] = [];
        snap.forEach((d) => {
          try { exchanges.push(buildExchangeData(d.data(), d.id)); } catch { /* スキップ */ }
        });

        // 子供の名前を一括取得
        const uniqueChildIds = Array.from(new Set(exchanges.map((e) => e.requestedBy)));
        const nameMap = new Map<string, string>();

        if (uniqueChildIds.length > 0) {
          try {
            // Firestore in() は最大10件まで
            const chunks = chunkArray(uniqueChildIds, 10);
            for (const chunk of chunks) {
              const usersSnap = await getDocs(
                query(
                  collection(db, 'users'),
                  where('__name__', 'in', chunk)
                )
              );
              usersSnap.forEach((d) => {
                nameMap.set(d.id, (d.data().name as string) ?? '不明');
              });
            }
          } catch { /* 名前取得失敗時は「不明」で継続 */ }
        }

        setQueue(
          exchanges.map((e) => ({
            ...e,
            childName: nameMap.get(e.requestedBy) ?? '不明',
          }))
        );
        setIsReady(true);
      },
      () => {
        setIsReady(true);
        setError('申請一覧の読み込みに失敗しました');
      }
    );

    return () => unsubscribe();
  }, [parentUser.familyId]);

  return { queue, isReady, error };
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
