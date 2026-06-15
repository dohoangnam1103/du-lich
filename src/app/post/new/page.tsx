"use client";

import { useSession, signIn } from "next-auth/react";
import { NewPostForm } from "@/components/NewPostForm";

export default function NewPostPage() {
  const { data: session, status } = useSession();

  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Đăng bài mới</h1>
      {status === "loading" ? null : session?.user ? (
        <NewPostForm />
      ) : (
        <div className="glass glass-edge" style={{ padding: 24, textAlign: "center" }}>
          <p style={{ marginBottom: 16 }}>Đăng nhập để chia sẻ chuyến đi của bạn.</p>
          <button className="glass-btn" onClick={() => signIn("google")}>
            Đăng nhập Google
          </button>
        </div>
      )}
    </main>
  );
}
