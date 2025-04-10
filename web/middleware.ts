import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that are always accessible, even when not logged in
const publicPaths = [
  "/", // Landing page
  "/home", // Home page
  "/signin", // Sign-in page
  "/signup", // Sign-up page
  "/api/auth/signin", // Sign-in API
  "/api/auth/signup", // Sign-up API
];

// Paths that should redirect to home if the user is already authenticated
const authRedirectPaths = ["/signin", "/signup"];


/*
  4.2 User Sign-In
  REQ-7: The system shall redirect unauthenticated users to the login page when attempting to access protected features.
*/
export function middleware(request: NextRequest) {
  // return NextResponse.next() // Uncomment for simple pass through for development
  const accessToken = request.cookies.get("access_token");
  const path = request.nextUrl.pathname;

  // If the user is already authenticated and trying to access auth pages, redirect to home
  if (
    accessToken &&
    authRedirectPaths.some((authPath) => path.startsWith(authPath))
  ) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // If path is public or user is authenticated, allow access
  if (
    publicPaths.some((publicPath) => path.startsWith(publicPath)) ||
    accessToken
  ) {
    return NextResponse.next();
  }

  // Otherwise, redirect to sign-in with the original path as a redirect parameter
  const signinUrl = new URL("/signin", request.url);
  signinUrl.searchParams.set("from", path);
  return NextResponse.redirect(signinUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
