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

export interface ApprovalQueueErrors {
  exchanges?: boolean;
}

interface UseApprovalQueueResult {
  queue: ExchangeData[];
  isReady: boolean;
  error: ApprovalQueueErrors | null;
}

export function useApprovalQueue(parentUser: UserData): UseApprovalQueueResult {
  const [queue, setQueue] = useState<ExchangeData[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [streamErrors, setStreamErrors] = useState<ApprovalQueueErrors>({});

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
        setQueue(snap.docs.map((d) => d.data()));
        setIsReady(true);
      },
      (err) => {
        console.error('ApprovalQueue Stream エラー:', err);
        setIsReady(true);
        setStreamErrors((prev) => ({ ...prev, exchanges: true }));
      }
    );

    return () => unsubscribe();
  }, [parentUser.familyId]);

  const hasError = Object.keys(streamErrors).length > 0;
  return { queue, isReady, error: hasError ? streamErrors : null };
}
