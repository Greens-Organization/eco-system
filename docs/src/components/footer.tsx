import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
        <p className="text-center text-muted-foreground text-sm leading-loose md:text-left">
          Based on{' '}
          <Link
            href="https://github.com/haydenbleasel/next-forge"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-4 hover:text-emerald-500"
          >
            next-forge
          </Link>{' '}
          built with love by{' '}
          <Link
            href="https://x.com/haydenbleasel"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-4 hover:text-emerald-500"
          >
            Hayden Bleasel
          </Link>
          .
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="/docs/overview"
            className="font-medium text-sm underline-offset-4 hover:text-emerald-500"
          >
            Documentation
          </Link>
          <Link
            href="https://github.com/eco-system/eco-system"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sm underline-offset-4 hover:text-emerald-500"
          >
            GitHub
          </Link>
        </div>
      </div>
    </footer>
  );
}
