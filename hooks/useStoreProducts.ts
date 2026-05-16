"use client";

/**
 * 子供向け：ご褒美ストアの3ストリーム合成フック
 *
 * Stream 1: rewards（家族のアクティブなご褒美一覧）
 * Stream 2: exchanges（自分の申請中exchangeのみ）
 * Stream 3: users（自分のリアルタイム残高ウォレット）
 *
 * 各ストリームにReadyフラグを設け、一部が遅れても画面がハングアップしないよう設計。
 */

import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserData, RewardData, ExchangeData } from '@/types';
import { buildRewardData, buildExchangeData } from '@/lib/storeUtils';

export type RewardCardState = 'available' | 'pending' | 'sold_out' | 'insufficient';

export interface StoreProduct {
  rewardId: string;
  title: string;
  description?: string;
  requiredPoints: number;
  stock?: number;
  cardState: RewardCardState;
  pendingExchangeId?: string; // 申請中の場合のexchangeId（取り消しUI用）
}

interface UseStoreProductsResult {
  products: StoreProduct[];
  walletBalance: number;
  isReady: boolean;
  error: string | null;
}

export function useStoreProducts(childUser: UserData): UseStoreProductsResult {
  const [rewards, setRewards] = useState<RewardData[]>([]);
  const [pendingExchanges, setPendingExchanges] = useState<ExchangeData[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(childUser.totalReward ?? 0);

  const [rewardsReady, setRewardsReady] = useState(false);
  const [exchangesReady, setExchangesReady] = useState(false);
  const [walletReady, setWalletReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!childUser.familyId || !childUser.userId) return;

    const unsubscribers: (() => void)[] = [];

    // --- Stream 1: アクティブなご褒美一覧 ---
    const rewardsQuery = query(
      collection(db, 'rewards'),
      where('family_id', '==', childUser.familyId),
      where('is_active', '==', true)
    );
    unsubscribers.push(
      onSnapshot(
        rewardsQuery,
        (snap) => {
          const data: RewardData[] = [];
          snap.forEach((d) => {
            try { data.push(buildRewardData(d.data(), d.id)); } catch { /* 不正データはスキップ */ }
          });
          setRewards(data);
          setRewardsReady(true);
        },
        () => {
          // エラー時もReadyにして画面フリーズを防ぐ
          setRewardsReady(true);
          setError('ご褒美の読み込みに失敗しました');
        }
      )
    );

    // --- Stream 2: 自分の申請中のみ（status: requested） ---
    const exchangesQuery = query(
      collection(db, 'exchanges'),
      where('requested_by', '==', childUser.userId),
      where('status', '==', 'requested')
    );
    unsubscribers.push(
      onSnapshot(
        exchangesQuery,
        (snap) => {
          const data: ExchangeData[] = [];
          snap.forEach((d) => {
            try { data.push(buildExchangeData(d.data(), d.id)); } catch { /* スキップ */ }
          });
          setPendingExchanges(data);
          setExchangesReady(true);
        },
        () => {
          setExchangesReady(true);
          setError('申請状況の読み込みに失敗しました');
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
        () => {
          setWalletReady(true);
          // 残高取得失敗時はセッションの値を維持（フリーズ防止）
        }
      )
    );

    return () => { unsubscribers.forEach((unsub) => unsub()); };
  }, [childUser.familyId, childUser.userId]);

  // --- ViewModel合成 ---
  const pendingByRewardId = new Map(
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

  return {
    products,
    walletBalance,
    isReady: rewardsReady && exchangesReady && walletReady,
    error,
  };
}
