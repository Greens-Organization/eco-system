import MatrixBackground from '@/app/(home)/components/matrix-background';
import Features from './components/features';
import Hero from './components/hero';

export default function Home() {
  return (
    <main className="relative">
      <MatrixBackground />
      <div className="relative z-10 flex flex-col gap-12 pb-8">
        <Hero />
        <Features />
      </div>
    </main>
  );
}
