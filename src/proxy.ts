import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  AUTH_PAGES,
  AUTH_REDIRECT,
  DEFAULT_REDIRECT,
  PROTECTED_ROUTES,
} from "@/config/routes";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth-token")?.value;

  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (isProtected && !token) {
    return NextResponse.redirect(new URL(AUTH_REDIRECT, request.url));
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL(DEFAULT_REDIRECT, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand|.*\\..*).*)"],
};
