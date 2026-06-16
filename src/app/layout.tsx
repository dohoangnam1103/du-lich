import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import { AuthButton } from "@/components/AuthButton";

export const metadata: Metadata = {
  title: "Địa Điểm Du Lịch",
  description: "Tìm quán ăn & chỗ vui chơi quanh đây",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <SessionProvider>
          <header className="glass glass-edge app-header">
            <Link href="/" className="brand">
              <span className="brand-mark">📍</span>
              <span className="brand-text">
                <span className="brand-title">Địa Điểm Du Lịch</span>
                <span className="brand-tagline">Khám phá quanh đây</span>
              </span>
            </Link>
            <AuthButton />
          </header>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
