import { type NextRequest, NextResponse } from "next/server";

// Protected path prefixes — redirect to login if __session cookie is absent.
// NOTE: Firebase Admin cannot run in Edge (middleware). We only check cookie
// presence here; full token verification happens in server components via
// getServerUser() which uses the Admin SDK.
const PROTECTED = ["/dashboard", "/session"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (isProtected) {
    const session = request.cookies.get("__session")?.value;
    if (!session) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/auth/login";
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

