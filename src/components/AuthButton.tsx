"use client";
import { useSession, signIn, signOut } from "next-auth/react";

export function AuthButton() {
  const { data: session, status } = useSession();
  if (status === "loading") return null;
  if (session?.user) {
    return (
      <button className="glass-btn" onClick={() => signOut()}>
        {session.user.name ?? "Đăng xuất"} · Thoát
      </button>
    );
  }
  return (
    <button className="glass-btn" onClick={() => signIn("google")}>
      Đăng nhập Google
    </button>
  );
}
