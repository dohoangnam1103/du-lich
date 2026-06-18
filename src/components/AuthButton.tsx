"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import { useT } from "@/components/I18nProvider";

export function AuthButton() {
  const { data: session, status } = useSession();
  const t = useT();
  if (status === "loading") return null;
  if (session?.user) {
    return (
      <button
        className="glass-btn"
        onClick={() => signOut()}
        title="Đăng xuất"
        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px 6px 6px" }}
      >
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt=""
            style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
          />
        ) : (
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))",
              color: "#fff",
              fontSize: 13,
            }}
          >
            {(session.user.name ?? "?").charAt(0).toUpperCase()}
          </span>
        )}
        <span style={{ fontSize: 14 }}>{t("auth.logout")}</span>
      </button>
    );
  }
  return (
    <button className="glass-btn glass-btn-primary" onClick={() => signIn("google")}>
      {t("auth.login")}
    </button>
  );
}
