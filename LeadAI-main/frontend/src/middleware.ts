import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("leadai_session")?.value || request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname === "/login" || pathname === "/";
  const isDashboardPage = pathname.startsWith("/dashboard");

  // Verify authentication status (ignore invalid placeholder tokens)
  const isAuthenticated = Boolean(token && token !== "internal_admin_token" && token.trim() !== "");

  if (isDashboardPage && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && isAuthenticated) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/dashboard", "/dashboard/:path*"],
};
