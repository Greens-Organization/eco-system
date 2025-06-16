import { Code, Compass, Zap } from 'lucide-react';

export default function Features() {
  return (
    <section className="container space-y-6 py-8 md:py-12 lg:py-16">
      <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
        <h2 className="font-bold text-3xl leading-[1.1] sm:text-3xl md:text-5xl">
          Features
        </h2>
        <p className="max-w-[85%] text-muted-foreground leading-normal sm:text-lg sm:leading-7">
          Eco-System combines the best of Next.js with Bun to create a powerful
          development environment
        </p>
      </div>
      <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
        <div className="relative overflow-hidden rounded-lg border border-emerald-500/20 bg-background/50 p-6 backdrop-blur-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-900/20 text-emerald-400">
            <Zap className="h-6 w-6" />
          </div>
          <div className="mt-4 space-y-2">
            <h3 className="font-bold text-xl">Faster Builds</h3>
            <p className="text-muted-foreground">
              Powered by Bun and Turbo for improved installation and build
              performance
            </p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-lg border border-emerald-500/20 bg-background/50 p-6 backdrop-blur-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-900/20 text-emerald-400">
            <Compass className="h-6 w-6" />
          </div>
          <div className="mt-4 space-y-2">
            <h3 className="font-bold text-xl">Opinionated Setup</h3>
            <p className="text-muted-foreground">
              Curated configurations for developers familiar with Next.js
              fundamentals
            </p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-lg border border-emerald-500/20 bg-background/50 p-6 backdrop-blur-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-900/20 text-emerald-400">
            <Code className="h-6 w-6" />
          </div>
          <div className="mt-4 space-y-2">
            <h3 className="font-bold text-xl">Modern Tooling+</h3>
            <p className="text-muted-foreground">
              Enhanced with Bun integration while preserving Next.js modern
              development patterns
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
