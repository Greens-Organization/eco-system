export default function Hero() {
  return (
    <section className="mx-auto flex max-w-[980px] flex-col items-center gap-4 py-8 md:py-12 lg:py-24">
      <div className="inline-block rounded-lg border border-emerald-500/20 bg-emerald-900/30 px-3 py-1 text-emerald-400 text-sm backdrop-blur-sm">
        Introducing Eco-System
      </div>
      <h1 className="bg-gradient-to-r from-white to-emerald-400 bg-clip-text text-center font-bold text-3xl text-transparent leading-tight tracking-tighter md:text-5xl lg:text-6xl lg:leading-[1.1]">
        Build faster, greener applications with Next.js and Bun
      </h1>
      <p className="max-w-[750px] rounded-lg border border-emerald-500/10 bg-background/10 p-4 text-center text-lg text-muted-foreground backdrop-blur-sm sm:text-xl">
        A powerful boilerplate for creating secure and performant applications
        using the Next.js ecosystem enhanced with Bun for maximum efficiency.
      </p>
    </section>
  );
}
