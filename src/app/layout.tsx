import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Địa Điểm Du Lịch",
  description: "Tìm quán ăn & chỗ vui chơi quanh đây",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
