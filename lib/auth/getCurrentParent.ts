import type { UserData } from '@/types';
import type { AuthContext } from './types';
import { UnauthorizedError } from '@/lib/errors/auth';

/**
 * UserData から親専用の AuthContext を生成する最上流ゲート
 * - 失敗時は throw（nullable にしない）
 * - 成功時のみ AuthContext を返す（role/familyId が確定した個体のみ通過）
 */
export function getCurrentParent(user: UserData): AuthContext {
  if (user.role !== 'parent' || !user.familyId) {
    throw new UnauthorizedError('親アカウントの認証情報が不正、または家族IDが存在しません');
  }
  return {
    uid: user.userId,
    familyId: user.familyId,
    role: 'parent',
  };
}
