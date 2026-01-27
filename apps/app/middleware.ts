import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { internationalizationMiddleware } from '@pack/i18n/middleware';
import type { NextRequest } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/:locale/sign-in(.*)',
  '/:locale/sign-up(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

export default clerkMiddleware(async (auth, request: NextRequest) => {
  // First, handle authentication
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // Then, handle internationalization
  return internationalizationMiddleware(request);
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
