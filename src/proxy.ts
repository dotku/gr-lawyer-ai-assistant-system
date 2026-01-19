import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { locales } from './i18n';

// Create the i18n middleware
const intlMiddleware = createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale: 'en',

  // Automatically detect the user's locale
  localeDetection: true,
});

// Protected routes that require authentication
const protectedRoutes = ['/dashboard', '/intake', '/matter', '/cases', '/clients', '/documents', '/tasks'];

export async function proxy(request: NextRequest) {
  // Run the i18n middleware first
  const response = intlMiddleware(request);

  // Check if the current path is a protected route
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.includes(route)
  );

  if (isProtectedRoute) {
    // Check for authentication token
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      // Get the locale from the pathname (e.g., /en/dashboard -> en)
      const locale = pathname.split('/')[1];
      const loginUrl = new URL(`/${locale}/auth/login`, request.url);
      // Store the intended destination to redirect after login
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
