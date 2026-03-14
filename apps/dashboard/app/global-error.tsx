'use client';

import { Button } from '@pack/design-system/components/ui/base-button';
import { fonts } from '@pack/design-system/lib/fonts';
import type NextError from 'next/error';

type GlobalErrorProperties = {
  readonly error: NextError & { digest?: string };
  readonly reset: () => void;
};

export default function GlobalError({ error: _error, reset }: GlobalErrorProperties) {
  return (
    <html lang="en" className={fonts}>
      <body className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="font-bold text-4xl">Oops, something went wrong</h1>
          <p className="text-muted-foreground">
            An unexpected error occurred. Please try again.
          </p>
          <Button onClick={() => typeof reset === 'function' ? reset() : window.location.reload()}>Try again</Button>
        </div>
      </body>
    </html>
  );
}
