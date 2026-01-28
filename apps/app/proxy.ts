import {
  noseconeMiddleware,
  noseconeOptions,
} from '@pack/security/middleware';
import { getSessionCookie } from '@pack/auth/cookies';
import { type NextRequest, NextResponse } from 'next/server';

const securityHeaders = noseconeMiddleware(noseconeOptions);

const unauthenticatedPages = ['/sign-in', '/sign-up'];

const isProtectedRoute = (request: NextRequest) => {
  const pathname = request.nextUrl.pathname;
  return !unauthenticatedPages.some((page) => pathname.startsWith(page));
};

export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (isProtectedRoute(request) && !sessionCookie) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  const response = NextResponse.next();
  const securityResponse = await securityHeaders();

  if (securityResponse?.headers) {
    for (const [key, value] of securityResponse.headers.entries()) {
      response.headers.set(key, value);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
