import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// --- Configuration ---
const PUBLIC_ROUTES = new Set(["/", "/login", "/register"]);
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
 * Next.js Middleware - Edge Proxy / Interceptor
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Direct Session Extraction (No Proxy object overhead)
  const accessToken = request.cookies.get(AUTH_COOKIE_NAME)?.value || null;
  const payload = accessToken ? decodeJwt(accessToken) : null;
  const isExpired = payload?.exp ? Date.now() >= payload.exp * 1000 : false;
  const isAuthenticated = !!payload && !isExpired;

  // 2. Identify Route Category
  const isPublicRoute = PUBLIC_ROUTES.has(pathname);
  const isAuthPage = pathname === LOGIN_PATH || pathname === "/register";

  /**
   * ACCURACY LOGIC:
   * We don't just check if a cookie exists; we verify its integrity (JWT format)
   * and its expiration date at the Edge level.
   */

  // A. Redirect authenticated users away from login/register
  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL(DEFAULT_AUTH_REDIRECT, request.url));
  }

  // B. Protect all non-public routes (Deny by Default)
  if (!isPublicRoute && !isAuthenticated) {
    const loginUrl = new URL(LOGIN_PATH, request.url);

    // Preserve the intended destination for post-login redirect
    if (pathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", pathname);
    }

    const response = NextResponse.redirect(loginUrl);

    // If a token was present but invalid (expired/corrupt), clean it up
    if (accessToken) {
      response.cookies.delete(AUTH_COOKIE_NAME);
    }

    return response;
  }

  // C. Pass-through for valid sessions or public routes
  return NextResponse.next();
}

/**
 * Optimization: The matcher ensures the middleware only runs for page requests,
 * reducing latency for static assets and API calls.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt, manifest.webmanifest (metadata files)
     */
    "/((?!api|_next/static|_next/image|assets|favicon.ico|sw.js|sitemap.xml|robots.txt|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
