// app/layout.tsx
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/context/ThemeContext";
import { AppShell } from "@/components/AppShell";
import { FamilyThemeSync } from "@/components/FamilyThemeSync";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className} style={{ margin: 0, padding: 0 }}>
        <ThemeProvider>
          {/* 親の世界観設定を Firestore 経由で子デバイスへ同期 */}
          <FamilyThemeSync />
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
