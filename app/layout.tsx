// app/layout.tsx
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className} style={{ margin: 0, padding: 0 }}>
        {/* 今はRoleGuardを入れず、中身だけを素直に出す設定にします */}
        {children}
      </body>
    </html>
  );
}