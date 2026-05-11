import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { User } from "./types";

/**
 * @interface SessionState
 * Encapsulates the authentication state of a request.
 */
interface SessionState {
  readonly isAuthenticated: boolean;
  readonly user: User | null;
  readonly accessToken: string | null;
}

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
    // Decode base64 payload (parts[1])
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

/**
 * Session Proxy.
 * This pattern abstracts the complexity of token extraction and validation,
 * providing a clean, immutable interface for the middleware logic.
 */
function createSessionProxy(request: NextRequest): SessionState {
  const accessToken = request.cookies.get(AUTH_COOKIE_NAME)?.value || null;
  const payload = accessToken ? decodeJwt(accessToken) : null;

  // Validation logic: check for presence and expiration
  const isExpired = payload?.exp ? Date.now() >= payload.exp * 1000 : false;
  const isValid = !!payload && !isExpired;

  const state: SessionState = {
    isAuthenticated: isValid,
    user: isValid ? payload : null,
    accessToken: accessToken,
  };

  // Using a Proxy to ensure the session state remains read-only and provides a clean API
  return new Proxy(state, {
    get(target, prop) {
      return target[prop as keyof SessionState];
    },
    set() {
      throw new Error("Session state is immutable within the middleware context.");
    },
  });
}

/**
 * Next.js Middleware - Edge Proxy / Interceptor
 * Implements a strict 'Deny by Default' security model.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Initialize Auth Proxy
  const session = createSessionProxy(request);

  // 2. Identify Route Category
  const isPublicRoute = PUBLIC_ROUTES.has(pathname);
  const isAuthPage = pathname === LOGIN_PATH || pathname === "/register";

  /**
   * ACCURACY LOGIC:
   * We don't just check if a cookie exists; we verify its integrity (JWT format)
   * and its expiration date at the Edge level.
   */

  // A. Redirect authenticated users away from login/register
  if (isAuthPage && session.isAuthenticated) {
    return NextResponse.redirect(new URL(DEFAULT_AUTH_REDIRECT, request.url));
  }

  // B. Protect all non-public routes (Deny by Default)
  if (!isPublicRoute && !session.isAuthenticated) {
    const loginUrl = new URL(LOGIN_PATH, request.url);

    // Preserve the intended destination for post-login redirect
    if (pathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", pathname);
    }

    const response = NextResponse.redirect(loginUrl);

    // If a token was present but invalid (expired/corrupt), clean it up
    if (session.accessToken) {
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
    "/((?!api|_next/static|_next/image|assets|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
