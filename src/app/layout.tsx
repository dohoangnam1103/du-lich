import type { Metadata } from "next";
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
          <header
            className="glass glass-edge"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              margin: 16,
            }}
          >
            <strong>Địa Điểm Du Lịch</strong>
            <AuthButton />
          </header>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
