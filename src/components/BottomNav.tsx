"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/I18nProvider";

const ITEMS = [
  { href: "/", key: "nav.discover", icon: "🧭" },
  { href: "/feed", key: "nav.feed", icon: "📰" },
  { href: "/post/new", key: "nav.post", icon: "➕" },
  { href: "/collections", key: "nav.collections", icon: "🗺️" },
  { href: "/favorites", key: "nav.saved", icon: "❤️" },
];

export function BottomNav() {
  const pathname = usePathname();
  const t = useT();

  return (
    <nav className="glass glass-edge bottom-nav" aria-label="Điều hướng chính">
      {ITEMS.map((it) => {
        const active =
          it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`bottom-nav-item${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className="bottom-nav-icon">{it.icon}</span>
            <span className="bottom-nav-label">{t(it.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
