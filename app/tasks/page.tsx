import { redirect } from 'next/navigation';

/**
 * 🚨 マネージャー制約:
 * /tasks は役目を終えた旧ルートであるため、アクセスはすべてホーム（/）へ強制回収する。
 * 将来的に本番アクセスログから流入ゼロが確認された後、このディレクトリごと完全物理削除する。
 */
export default function TasksRedirectPage() {
  redirect('/');
}
