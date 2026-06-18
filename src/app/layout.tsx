import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import { AuthButton } from "@/components/AuthButton";
import { BottomNav } from "@/components/BottomNav";
import { NotificationBell } from "@/components/NotificationBell";
import { I18nProvider } from "@/components/I18nProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getLang } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Địa Điểm Du Lịch — Travel Spots",
  description: "Tìm quán ăn & chỗ vui chơi quanh đây / Discover places nearby",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getLang();

  return (
    <html lang={lang}>
      <body>
        <I18nProvider initialLang={lang}>
          <SessionProvider>
            <header className="glass glass-edge app-header">
              <Link href="/" className="brand">
                <span className="brand-mark">📍</span>
                <span className="brand-text">
                  <span className="brand-title">{translate(lang, "brand.title")}</span>
                  <span className="brand-tagline">{translate(lang, "brand.tagline")}</span>
                </span>
              </Link>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <LanguageToggle />
                <NotificationBell />
                <AuthButton />
              </div>
            </header>
            <div className="app-content">{children}</div>
            <BottomNav />
          </SessionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
