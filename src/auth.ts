import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "@/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [Google],
  // Behind the Cloudflare tunnel the app sees Host=localhost:3001, so Auth.js
  // must be told to trust the forwarded host. The canonical public URL is
  // pinned via AUTH_URL in the environment.
  trustHost: true,
  session: { strategy: "database" },
  events: {
    // The adapter stores the Google profile in name/image; mirror them into the
    // app's display_name/avatar_url so posts, comments and reviews show the user.
    async createUser({ user }) {
      if (!user.id) return;
      await db
        .update(users)
        .set({ displayName: user.name, avatarUrl: user.image })
        .where(eq(users.id, user.id));
    },
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
