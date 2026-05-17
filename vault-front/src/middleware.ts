import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = new Set(["/", "/login", "/register", "/about", "/contact", "/privacy", "/terms"]);
const AUTH_COOKIE_NAME = "access_token";
const DEFAULT_AUTH_REDIRECT = "/dashboard";
const LOGIN_PATH = "/login";

/**
 * Dynamically determines the cookie domain (wildcard or specific host)
 */
const getCookieDomain = (host: string | null): string | undefined => {
  if (!host) return undefined;
  const hostname = host.split(":")[0];
  if (hostname === "localhost" || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    return undefined;
  }
  const parts = hostname.split(".");
  if (parts.length >= 2) {
    return `.${parts.slice(-2).join(".")}`;
  }
  return undefined;
};

/**
 * Minimal JWT decoder for Edge Runtime compatibility.
 * Avoids heavy dependencies while maintaining accuracy for expiration checks.
 */
const decodeJwt = (token: string) => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(base64);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i);
    }
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    return payload;
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

  console.log(`[Middleware] Request URL: ${request.url}`);
  console.log(`[Middleware] Pathname: ${normalizedPathname}`);
  console.log(`[Middleware] Cookie present: ${!!accessToken}`);
  if (accessToken) {
    console.log(`[Middleware] Raw Cookie value starts with: ${accessToken.substring(0, 20)}...`);
  }

  const payload = accessToken ? decodeJwt(accessToken) : null;
  const isExpired = payload?.exp ? Date.now() >= payload.exp * 1000 : false;
  const isAuthenticated = !!payload && !isExpired;

  console.log(`[Middleware] isAuthenticated: ${isAuthenticated} (payload: ${!!payload}, isExpired: ${isExpired})`);

  const reason = request.nextUrl.searchParams.get("reason");
  const forceClear = reason === "session_expired" || reason === "network_error";

  const isPublicRoute = PUBLIC_ROUTES.has(normalizedPathname);
  const isAuthPage = normalizedPathname === LOGIN_PATH || normalizedPathname === "/register";

  console.log(`[Middleware] isPublicRoute: ${isPublicRoute}, isAuthPage: ${isAuthPage}, forceClear: ${forceClear}`);

  // --- LOGIQUE DE ROUTAGE ---

  if (forceClear && isAuthPage) {
    console.log(`[Middleware] Force clearing cookie due to reason: ${reason}`);
    const response = NextResponse.next();
    const domain = getCookieDomain(request.headers.get("host"));
    response.cookies.delete(AUTH_COOKIE_NAME);
    if (domain) {
      response.cookies.set(AUTH_COOKIE_NAME, "", {
        domain,
        maxAge: 0,
        path: "/",
      });
    }
    return response;
  }

  if (isPublicRoute) {
    if (isAuthPage && isAuthenticated) {
      console.log(`[Middleware] Authenticated user on auth page, redirecting to: ${DEFAULT_AUTH_REDIRECT}`);
      return NextResponse.redirect(new URL(DEFAULT_AUTH_REDIRECT, request.url));
    }
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    console.log(`[Middleware] Unauthenticated access to private route, redirecting to login`);
    const loginUrl = new URL(LOGIN_PATH, request.url);
    if (normalizedPathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", normalizedPathname);
    }
    const response = NextResponse.redirect(loginUrl);
    const domain = getCookieDomain(request.headers.get("host"));
    response.cookies.delete(AUTH_COOKIE_NAME);
    if (domain) {
      response.cookies.set(AUTH_COOKIE_NAME, "", {
        domain,
        maxAge: 0,
        path: "/",
      });
    }
    return response;
  }

  console.log(`[Middleware] Access granted to private route: ${normalizedPathname}`);
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|assets|favicon.ico|sw.js|sitemap.xml|robots.txt|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};