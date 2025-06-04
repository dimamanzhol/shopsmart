import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "ShopSmart - Умные списки покупок",
  description: "Создавайте и управляйте списками покупок с легкостью",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="ru">
        <body className={inter.className}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
