import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, type Locale } from "./lib/locale";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const segments = pathname.split("/");
  if (LOCALES.includes(segments[1] as Locale)) {
    const res = NextResponse.next();
    res.headers.set("x-locale", segments[1]);
    return res;
  }

  // Unprefixed page → redirect to the preferred locale (cookie, else Bangla).
  // /api, /admin and static assets never reach here (see matcher).
  const preferred =
    request.cookies.get(LOCALE_COOKIE)?.value === "en" ? "en" : DEFAULT_LOCALE;
  const url = request.nextUrl.clone();
  url.pathname = `/${preferred}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!api|admin|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sitemap.xml|robots.txt).*)",
  ],
};
