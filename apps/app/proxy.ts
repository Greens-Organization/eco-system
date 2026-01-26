import {
  noseconeMiddleware,
  noseconeOptions,
  noseconeOptionsWithToolbar,
} from '@pack/security/middleware';
import { env } from './env';
import { NextMiddleware, NextRequest, NextResponse } from 'next/server';

const securityHeaders = env.FLAGS_SECRET
  ? noseconeMiddleware(noseconeOptionsWithToolbar)
  : noseconeMiddleware(noseconeOptions);

const prefixApi = '/auth';
const API_URL = env.API_URL;
const unauthenticatedPages = [
  '/sign-in',
  '/sign-up',
];

const isProtectedRoute = (request: NextRequest) => {
  const pathname = request.nextUrl.pathname;
  return !unauthenticatedPages.some((page) => pathname.startsWith(page));
};

const authMiddleware = async (request: NextRequest) => {
  const sessionCookie = getSessionCookie(request);

  if (isProtectedRoute(request) && !sessionCookie) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  return NextResponse.next();
};

export default authMiddleware(() =>
  securityHeaders()
) as unknown as NextMiddleware;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
