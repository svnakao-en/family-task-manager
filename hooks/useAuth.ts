"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, DocumentData } from 'firebase/firestore';
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            await initializeUserData(firebaseUser.uid);
            const newUserDoc = await getDoc(userDocRef);
            const userData = await buildUserData(firebaseUser, newUserDoc.data());
            setUser(userData);
          } else {
            const userData = await buildUserData(firebaseUser, userDoc.data());
            setUser(userData);
          }
        } catch (error) {
          console.error('ユーザーデータの取得エラー:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
}

async function buildUserData(
  firebaseUser: FirebaseUser,
  firestoreData: DocumentData | undefined
): Promise<UserData> {
  const firestoreUser = firestoreData as FirestoreUserDocument | undefined;
  
  const { role, familyId } = await getUserRoleAndFamilyId(firebaseUser.uid);
  
  const userData: UserData = {
    userId: firebaseUser.uid,
    email: firebaseUser.email,
    name: firestoreUser?.name || 'ユーザー',
    totalReward: firestoreUser?.total_reward || 0,
    role: role,
  };

  if (familyId) {
    userData.familyId = familyId;
  }

  return userData;
}

async function getUserRoleAndFamilyId(uid: string): Promise<{ role: UserRole; familyId?: string }> {
  try {
    // 修正: ドキュメントIDが uid と一致している前提で直接参照
    const memberDocRef = doc(db, 'family_members', uid);
    const memberDoc = await getDoc(memberDocRef);
    
    if (memberDoc.exists()) {
      const data = memberDoc.data() as FirestoreFamilyMemberDocument;
      
      const result: { role: UserRole; familyId?: string } = {
        role: data.role || 'unknown',
      };
      
      if (data.family_id) {
        result.familyId = data.family_id;
      }
      
      return result;
    }
    
    return { role: null };
  } catch (error) {
    console.error('roleとfamilyIdの取得エラー:', error);
    return { role: 'unknown' };
  }
}

/**
 * 初回登録時のFirestoreデータ作成
 * ドキュメントIDを uid に固定することで Security Rules の参照を可能にする
 */
async function initializeUserData(uid: string): Promise<void> {
  try {
    // 修正: addDoc → setDoc でドキュメントIDを uid に固定
    await setDoc(doc(db, 'family_members', uid), {
      user_id: uid,
      role: 'unknown',
    });

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