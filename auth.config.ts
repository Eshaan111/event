import type { NextAuthConfig } from "next-auth";
import Google   from "next-auth/providers/google";
import GitHub   from "next-auth/providers/github";
import LinkedIn from "next-auth/providers/linkedin";

/**
 * Edge-safe auth config — no adapter, no Node.js APIs.
 * Used by middleware (Edge runtime) and extended by auth.ts (Node.js runtime).
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId:     process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    GitHub({
      clientId:     process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
    LinkedIn({
      clientId:     process.env.AUTH_LINKEDIN_ID!,
      clientSecret: process.env.AUTH_LINKEDIN_SECRET!,
    }),
  ],

  pages: {
    signIn: "/register",
    error:  "/register",
  },

  session: { strategy: "jwt" },

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id    = user.id;
        token.image = user.image;
        token.name  = user.name;
        token.email = user.email;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.role  = (user as any).role ?? "STAFF";
      }
      return token;
    },

    session({ session, token }) {
      if (session.user && token) {
        session.user.id    = (token.id    as string) ?? session.user.id;
        session.user.image = (token.image as string) ?? session.user.image;
        session.user.name  = (token.name  as string) ?? session.user.name;
        if (typeof token.email === "string") session.user.email = token.email;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).role = (token.role as string) ?? "STAFF";
      }
      return session;
    },
  },
};
