"use client";

import { useSession, signIn } from "next-auth/react";
import { NewPostForm } from "@/components/NewPostForm";
import { useT } from "@/components/I18nProvider";

export default function NewPostPage() {
  const { data: session, status } = useSession();
  const t = useT();

  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 16 }}>{t("newpost.title")}</h1>
      {status === "loading" ? null : session?.user ? (
        <NewPostForm />
      ) : (
        <div className="glass glass-edge" style={{ padding: 24, textAlign: "center" }}>
          <p style={{ marginBottom: 16 }}>{t("newpost.loginPrompt")}</p>
          <button className="glass-btn glass-btn-primary" onClick={() => signIn("google")}>
            {t("auth.loginGoogle")}
          </button>
        </div>
      )}
    </main>
  );
}
