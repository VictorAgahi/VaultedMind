import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// List of protected routes
const protectedRoutes = ["/dashboard", "/import"];
const authRoutes = ["/login", "/register"];

export function middleware(request: NextRequest) {

  const token = request.cookies.get("auth_token")?.value;
  const { pathname } = request.nextUrl;

  if (protectedRoutes.some(route => pathname.startsWith(route)) && !token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (authRoutes.some(route => pathname.startsWith(route)) && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/import/:path*", "/login", "/register"],
};
