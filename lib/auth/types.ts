import type { UserRole } from '@/types';

// "unknown" と null を排除し、決済・運用の当事者のみに絞り込む
export type AuthRole = Exclude<UserRole, 'unknown' | null>;

export interface AuthContext {
  readonly uid: string;
  readonly familyId: string;
  readonly role: AuthRole;
}
