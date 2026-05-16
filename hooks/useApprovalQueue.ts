"use client";

/**
 * 親向け：交換申請キュー（FIFOソート保証）ストリームフック
 *
 * child_name が exchange ドキュメントに非正規化されているため、
 * 個別の users 読み取りは不要（N+1 問題を解消済み）
 */

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserData, ExchangeData } from '@/types';
import { exchangeConverter } from '@/lib/converters/exchangeConverter';

interface UseApprovalQueueResult {
  queue: ExchangeData[];
  isReady: boolean;
  error: string | null;
}

export function useApprovalQueue(parentUser: UserData): UseApprovalQueueResult {
  const [queue, setQueue] = useState<ExchangeData[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!parentUser.familyId) return;

    const exchangesQuery = query(
      collection(db, 'exchanges').withConverter(exchangeConverter),
      where('family_id', '==', parentUser.familyId),
      where('status', '==', 'requested'),
      orderBy('created_at', 'asc') // FIFO: 古いお願い順
    );

    const unsubscribe = onSnapshot(
      exchangesQuery,
      (snap) => {
        const exchanges: ExchangeData[] = [];
        snap.forEach((d) => {
          try { exchanges.push(d.data()); } catch { /* 不正データはスキップ */ }
        });
        setQueue(exchanges);
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
