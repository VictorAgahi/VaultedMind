import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// --- Configuration ---
const PUBLIC_ROUTES = new Set(["/", "/login", "/register", "/about", "/contact", "/privacy", "/terms"]);
const AUTH_COOKIE_NAME = "access_token";
const DEFAULT_AUTH_REDIRECT = "/dashboard";
const LOGIN_PATH = "/login";

/**
 * Minimal JWT decoder for Edge Runtime compatibility.
 * Avoids heavy dependencies while maintaining accuracy for expiration checks.
 */
const decodeJwt = (token: string) => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    // Optimized decode for Edge/Browser
    const decoded = atob(base64);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i);
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
};

/**
 * Middleware de sécurité pour la gestion des accès et du cycle de vie des sessions.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Normalisation (crucial pour le Set.has)
  const normalizedPathname = pathname.length > 1 && pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname;

  const accessToken = request.cookies.get(AUTH_COOKIE_NAME)?.value || null;
  const payload = accessToken ? decodeJwt(accessToken) : null;
  const isExpired = payload?.exp ? Date.now() >= payload.exp * 1000 : false;
  const isAuthenticated = !!payload && !isExpired;

  const reason = request.nextUrl.searchParams.get("reason");
  const forceClear = reason === "session_expired" || reason === "network_error";

  const isPublicRoute = PUBLIC_ROUTES.has(normalizedPathname);
  const isAuthPage = normalizedPathname === LOGIN_PATH || normalizedPathname === "/register";

  // --- LOGIQUE DE ROUTAGE ---

  if (forceClear && isAuthPage) {
    // Le frontend demande explicitement de vider la session (ex: backend injoignable ou erreur 401)
    const response = NextResponse.next();
    if (accessToken) response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  }

  if (isPublicRoute) {
    if (isAuthPage && isAuthenticated) {
      return NextResponse.redirect(new URL(DEFAULT_AUTH_REDIRECT, request.url));
    }
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    if (normalizedPathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", normalizedPathname);
    }
    const response = NextResponse.redirect(loginUrl);
    if (accessToken) response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|assets|favicon.ico|sw.js|sitemap.xml|robots.txt|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};