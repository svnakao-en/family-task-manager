"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, DocumentData } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { 
  UserData, 
  UserRole, 
  UseAuthReturn, 
  FirestoreUserDocument, 
  FirestoreFamilyMemberDocument 
} from '@/types';

/**
 * 認証状態を管理するカスタムフック
 * ログイン状態の監視と初回登録時のFirestoreデータ作成を行う
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // 認証状態の変化を監視
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // ログイン済みの場合
        try {
          // usersコレクションからユーザー情報を取得
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            // usersコレクションに存在しない場合：新規作成
            await initializeUserData(firebaseUser.uid);
            
            // 作成後に再度取得
            const newUserDoc = await getDoc(userDocRef);
            const userData = await buildUserData(firebaseUser, newUserDoc.data());
            setUser(userData);
          } else {
            // 既存ユーザーの場合
            const userData = await buildUserData(firebaseUser, userDoc.data());
            setUser(userData);
          }
        } catch (error) {
          console.error('ユーザーデータの取得エラー:', error);
          setUser(null);
        }
      } else {
        // ログアウト状態
        setUser(null);
      }
      setLoading(false);
    });

    // クリーンアップ
    return () => unsubscribe();
  }, []);

  return { user, loading };
}

/**
 * FirebaseユーザーとFirestoreデータからUserDataオブジェクトを構築
 * Firestoreのsnake_caseをcamelCaseに変換
 * @param firebaseUser - Firebase認証ユーザー
 * @param firestoreData - Firestoreから取得したユーザーデータ
 * @returns UserDataオブジェクト
 */
async function buildUserData(
  firebaseUser: FirebaseUser,
  firestoreData: DocumentData | undefined
): Promise<UserData> {
  const firestoreUser = firestoreData as FirestoreUserDocument | undefined;
  
  // family_membersからroleとfamilyIdを取得
  const { role, familyId } = await getUserRoleAndFamilyId(firebaseUser.uid);
  
  const userData: UserData = {
    userId: firebaseUser.uid,
    email: firebaseUser.email,
    name: firestoreUser?.name || 'ユーザー',
    totalReward: firestoreUser?.total_reward || 0, // snake_case → camelCase
    role: role,
  };

  // familyIdが存在する場合のみプロパティを追加
  if (familyId) {
    userData.familyId = familyId;
  }

  return userData;
}

/**
 * family_membersコレクションからユーザーのroleとfamilyIdを取得
 * @param uid - ユーザーID
 * @returns role ("parent", "child", "unknown", または null) と familyId (存在する場合のみ)
 */
async function getUserRoleAndFamilyId(uid: string): Promise<{ role: UserRole; familyId?: string }> {
  try {
    const familyMembersRef = collection(db, 'family_members');
    const q = query(familyMembersRef, where('user_id', '==', uid));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const memberDoc = querySnapshot.docs[0];
      const data = memberDoc.data() as FirestoreFamilyMemberDocument;
      
      const result: { role: UserRole; familyId?: string } = {
        role: data.role || 'unknown',
      };
      
      // family_idが存在する場合のみfamilyIdプロパティを追加
      if (data.family_id) {
        result.familyId = data.family_id;
      }
      
      return result;
    }
    
    // 役割が未設定の場合はnullを返す（役割選択画面へ遷移させる準備）
    return { role: null };
  } catch (error) {
    console.error('roleとfamilyIdの取得エラー:', error);
    return { role: 'unknown' };
  }
}

/**
 * 初回登録時のFirestoreデータ作成
 * 注意: 初回登録時にroleを強制的に'parent'にしない
 * 家族は役割選択時に作成するため、ここでは作成しない
 * family_idフィールドは役割選択時に追加するため、初期登録時は含めない
 * @param uid - ユーザーID
 */
async function initializeUserData(uid: string): Promise<void> {
  try {
    // 1. family_membersコレクションに登録
    // 役割は'unknown'として登録（役割選択画面で後から設定）
    // family_idフィールドは含めない（nullを書き込まない）
    await addDoc(collection(db, 'family_members'), {
      user_id: uid,
      role: 'unknown',
    });

    // 2. usersコレクションに登録（ドキュメントIDはuidと一致）
    // Firestoreではsnake_caseで保存
    await setDoc(doc(db, 'users', uid), {
      name: 'ユーザー',
      total_reward: 0,
    });
  } catch (error) {
    console.error('初期データの作成エラー:', error);
    throw error;
  }
}

// Made with Bob