import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
export function middleware(request: NextRequest) {
  const cookiesName = process.env.VERCEL_URL
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/chat")) {
    const token = request.cookies.get(cookiesName); // Retrieve the auth token from cookies
    if (!token) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }
  if (pathname === "/") {
    const token = request.cookies.get(cookiesName); // Retrieve the auth token from cookies
    if (token) {
      return NextResponse.redirect(new URL("/chat", request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
