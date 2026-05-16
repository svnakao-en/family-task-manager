"use client";

/**
 * 子供向け：ご褒美ストアの3ストリーム合成フック（要塞化版）
 *
 * Stream 1: rewards（家族のアクティブなご褒美一覧・新しい順）
 * Stream 2: exchanges（自分の申請中exchangeのみ）
 * Stream 3: users（自分のリアルタイム残高ウォレット）
 *
 * 各ストリームに独立したReadyフラグとエラーフラグを持ち、
 * 一部が遅れても画面がハングアップしない設計。
 */

import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserData, RewardData, ExchangeData } from '@/types';
import { rewardConverter } from '@/lib/converters/rewardConverter';
import { exchangeConverter } from '@/lib/converters/exchangeConverter';

export type RewardCardState = 'available' | 'pending' | 'sold_out' | 'insufficient';

export interface StoreProduct {
  rewardId: string;
  title: string;
  description?: string;
  requiredPoints: number;
  stock?: number;
  cardState: RewardCardState;
  pendingExchangeId?: string;
}

export interface StreamErrors {
  rewards?: boolean;
  exchanges?: boolean;
  wallet?: boolean;
}

interface UseStoreProductsResult {
  products: StoreProduct[];
  walletBalance: number;
  isReady: boolean;
  error: StreamErrors | null;
}

export function useStoreProducts(childUser: UserData): UseStoreProductsResult {
  const [rewards, setRewards] = useState<RewardData[]>([]);
  const [pendingExchanges, setPendingExchanges] = useState<ExchangeData[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(childUser.totalReward ?? 0);

  const [rewardsReady, setRewardsReady] = useState(false);
  const [exchangesReady, setExchangesReady] = useState(false);
  const [walletReady, setWalletReady] = useState(false);
  const [streamErrors, setStreamErrors] = useState<StreamErrors>({});

  useEffect(() => {
    if (!childUser.familyId || !childUser.userId) return;

    const unsubscribers: (() => void)[] = [];

    // --- Stream 1: アクティブなご褒美一覧（新しい順）---
    // withConverter で DocumentData(any) を完全追放
    // ※ family_id + is_active + created_at の複合インデックスが Firebase Console で必要
    const rewardsQuery = query(
      collection(db, 'rewards').withConverter(rewardConverter),
      where('family_id', '==', childUser.familyId),
      where('is_active', '==', true),
      orderBy('created_at', 'desc')
    );
    unsubscribers.push(
      onSnapshot(
        rewardsQuery,
        (snap) => {
          setRewards(snap.docs.map((d) => d.data()));
          setRewardsReady(true);
        },
        (err) => {
          console.error('Rewards Stream エラー:', err);
          setRewardsReady(true);
          setStreamErrors((prev) => ({ ...prev, rewards: true }));
        }
      )
    );

    // --- Stream 2: 自分の申請中のみ（status: requested）---
    const exchangesQuery = query(
      collection(db, 'exchanges').withConverter(exchangeConverter),
      where('requested_by', '==', childUser.userId),
      where('status', '==', 'requested')
    );
    unsubscribers.push(
      onSnapshot(
        exchangesQuery,
        (snap) => {
          setPendingExchanges(snap.docs.map((d) => d.data()));
          setExchangesReady(true);
        },
        (err) => {
          console.error('Exchanges Stream エラー:', err);
          setExchangesReady(true);
          setStreamErrors((prev) => ({ ...prev, exchanges: true }));
        }
      )
    );

    // --- Stream 3: 自分のリアルタイム残高 ---
    const userRef = doc(db, 'users', childUser.userId);
    unsubscribers.push(
      onSnapshot(
        userRef,
        (snap) => {
          if (snap.exists()) {
            setWalletBalance(snap.data().total_reward ?? 0);
          }
          setWalletReady(true);
        },
        (err) => {
          console.error('Wallet Stream エラー:', err);
          setWalletReady(true);
          setStreamErrors((prev) => ({ ...prev, wallet: true }));
        }
      )
    );

    return () => { unsubscribers.forEach((unsub) => unsub()); };
  }, [childUser.familyId, childUser.userId]);

  // --- ViewModel合成（純粋ロジック・100%型安全）---
  const pendingByRewardId = new Map<string, string>(
    pendingExchanges.map((e) => [e.rewardId, e.exchangeId])
  );

  const products: StoreProduct[] = rewards.map((reward) => {
    const pendingExchangeId = pendingByRewardId.get(reward.rewardId);

    let cardState: RewardCardState;
    if (pendingExchangeId) {
      cardState = 'pending';
    } else if (reward.stock !== undefined && reward.stock <= 0) {
      cardState = 'sold_out';
    } else if (walletBalance < reward.requiredPoints) {
      cardState = 'insufficient';
    } else {
      cardState = 'available';
    }

    return {
      rewardId: reward.rewardId,
      title: reward.title,
      description: reward.description,
      requiredPoints: reward.requiredPoints,
      stock: reward.stock,
      cardState,
      pendingExchangeId,
    };
  });

  const hasError = Object.keys(streamErrors).length > 0;

  return {
    products,
    walletBalance,
    isReady: rewardsReady && exchangesReady && walletReady,
    error: hasError ? streamErrors : null,
  };
}
