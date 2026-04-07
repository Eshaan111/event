import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

/**
 * Full auth instance — includes the Prisma adapter for user persistence.
 * Only used in Node.js runtime (server components, API routes, server actions).
 * Never import this in middleware.
 */

// Dev-only: sign in as any @aetheric.seed user by email — never active in production.
const devProvider =
  process.env.NODE_ENV === "development"
    ? Credentials({
        id: "dev-seed",
        name: "Dev Seed Login",
        credentials: { email: { label: "Email", type: "text" } },
        async authorize(credentials) {
          if (!credentials?.email) return null;
          const user = await prisma.user.findUnique({
            where:  { email: String(credentials.email) },
            select: { id: true, name: true, email: true, image: true },
          });
          return user ?? null;
        },
      })
    : null;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...authConfig.providers,
    ...(devProvider ? [devProvider] : []),
  ],
});
