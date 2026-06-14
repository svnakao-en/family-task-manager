"use client";

import { useEffect, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useWorldTheme } from '@/hooks/useWorldTheme';
import { AVAILABLE_THEMES, ThemeId } from '@/context/ThemeContext';

/**
 * 親が選択したテーマを Firestore families/{familyId} に永続化し、
 * 子デバイスを含む家族全員のデバイスでテーマを同期するブリッジコンポーネント。
 * DOM は一切描画しない副作用専用コンポーネント。
 *
 * 読み書き先: families/{familyId} → フィールド theme: ThemeId
 * Firestore ルール: get = 認証済み全員、create/update = 親 + 同家族のみ
 */
export function FamilyThemeSync(): null {
  const { user } = useAuth();
  const { currentThemeId, setTheme } = useWorldTheme();

  // Firestore から読み込んだ（または書き込んだ）最新値。
  // currentThemeId との比較により、Firestore 読み込みが write エフェクトを
  // 空撃ちするのを防ぐ。
  const syncedThemeRef = useRef<ThemeId | null>(null);

  // ─ 起動時: Firestore から家族テーマを読み込み、全デバイスに適用 ──────────
  useEffect(() => {
    if (!user?.familyId) return;

    const loadFamilyTheme = async () => {
      try {
        const snap = await getDoc(doc(db, 'families', user.familyId!));
        const stored = snap.data()?.theme as string | undefined;
        if (stored && (AVAILABLE_THEMES as readonly string[]).includes(stored)) {
          const validTheme = stored as ThemeId;
          syncedThemeRef.current = validTheme; // write エフェクトの空撃ち防止
          setTheme(validTheme);
        }
      } catch (err) {
        console.error('[FamilyThemeSync] Firestore 読み込みエラー:', err);
      }
    };

    loadFamilyTheme();
  }, [user?.familyId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─ 親がテーマを変更したとき Firestore へ書き込む ────────────────────────
  useEffect(() => {
    if (
      user?.role !== 'parent'     || // 親のみ書き込み可
      !user?.familyId             ||
      !currentThemeId             || // null（未確定）は書き込まない
      currentThemeId === syncedThemeRef.current // 読み込み値と同じなら不要
    ) return;

    const saveFamilyTheme = async () => {
      try {
        await setDoc(
          doc(db, 'families', user.familyId!),
          { theme: currentThemeId },
          { merge: true },
        );
        syncedThemeRef.current = currentThemeId;
      } catch (err) {
        console.error('[FamilyThemeSync] Firestore 書き込みエラー:', err);
      }
    };

    saveFamilyTheme();
  }, [currentThemeId, user?.role, user?.familyId]);

  return null;
}
