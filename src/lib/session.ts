import { auth } from "@/auth";

export class UnauthorizedError extends Error {}

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError("Login required");
  }
  return session.user;
}
