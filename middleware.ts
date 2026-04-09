import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Edge-safe auth — no Prisma adapter, no Node.js crypto
const { auth } = NextAuth(authConfig);

export async function middleware(request: NextRequest) {
  const session = await auth();
  const { pathname, searchParams } = request.nextUrl;

  const isPublic =
    pathname.startsWith("/register") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/invite") ||
    pathname.startsWith("/dev") ||
    pathname.startsWith("/uploads");

  // Unauthenticated user on a protected route → /register
  if (!isPublic && !session?.user) {
    const url = request.nextUrl.clone();
    url.pathname = "/register";
    return NextResponse.redirect(url);
  }

  // Authenticated user on /invite with a token → forward to redeem
  if (session?.user && pathname === "/invite") {
    const token = searchParams.get("token");
    if (token) {
      const url = request.nextUrl.clone();
      url.pathname = "/invite/redeem";
      return NextResponse.redirect(url);
    }
    // No token → studio home
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Authenticated user on register → studio
  if (session?.user && pathname === "/register") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
