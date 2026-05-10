import { RoleGuard } from '@/components/RoleGuard';

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard>{children}</RoleGuard>;
}