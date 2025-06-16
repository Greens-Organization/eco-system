'use client';

import { useIsMobile } from '@/hooks/use-mobile';
import { useEffect, useRef, useState } from 'react';

export default function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(null);
  const isMobile = useIsMobile();
  const [isLowPerformance, setIsLowPerformance] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const detectPerformance = () => {
      const isLowRAM =
        (navigator as any).deviceMemory && (navigator as any).deviceMemory < 4;
      const isSlowCPU =
        navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;

      return isMobile || isLowRAM || isSlowCPU;
    };

    const lowPerf = detectPerformance();
    setIsLowPerformance(lowPerf);

    const charArr = [
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
      'i',
      'j',
      'k',
      'l',
      'm',
      'n',
      'o',
      'p',
      'q',
      'r',
      's',
      't',
      'u',
      'v',
      'w',
      'x',
      'y',
      'z',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '0',
      'А',
      'В',
      'Г',
      'Д',
      'Є',
      'Ѕ',
      'З',
      'И',
      'Ѳ',
      'І',
      'К',
      'Л',
      'М',
      'Н',
      'Ѯ',
      'Ѻ',
      'П',
      'Ч',
      'Р',
      'С',
      'Т',
      'Ѵ',
      'Ф',
      'Х',
      'Ѱ',
      'Ѿ',
      'Ц',
    ];

    const techLogos = [
      { name: 'React', symbol: '⚛️', color: '#10b981' },
      { name: 'TypeScript', symbol: 'TS', color: '#059669' },
      { name: 'Next.js', symbol: '▲', color: '#047857' },
      { name: 'Tailwind', symbol: '🎨', color: '#065f46' },
      { name: 'Bun', symbol: '🫓', color: '#f9f1e1' },
      { name: 'Prisma', symbol: '🔺', color: '#10b981' },
      { name: 'Vercel', symbol: '▲', color: '#059669' },
      { name: 'Clerk', symbol: '🔐', color: '#047857' },
      { name: 'Sentry', symbol: '👁️', color: '#065f46' },
      { name: 'Radix', symbol: '◉', color: '#10b981' },
      { name: 'Neon', symbol: '⚡', color: '#059669' },
      { name: 'Resend', symbol: '📧', color: '#047857' },
      { name: 'Zod', symbol: 'Z', color: '#065f46' },
    ];

    const config = lowPerf
      ? {
          maxCharCount: 40,
          maxTechCount: 4,
          fontSize: 16,
          techSize: 20,
          frameSkip: 4,
          trailLength: 4,
          spawnRate: 0.05,
          techSpawnRate: 0.005,
          shadowBlur: 5,
          fadeOpacity: 0.15,
        }
      : {
          maxCharCount: 80,
          maxTechCount: 8,
          fontSize: 14,
          techSize: 25,
          frameSkip: 2,
          trailLength: 6,
          spawnRate: 0.09,
          techSpawnRate: 0.015,
          shadowBlur: 10,
          fadeOpacity: 0.08,
        };

    const fallingCharArr: FallingChar[] = [];
    const techFallingArr: TechFalling[] = [];

    let cw = window.innerWidth;
    let ch = window.innerHeight;
    let maxColumns = Math.floor(cw / config.fontSize);
    let frames = 0;
    let lastTime = 0;
    let fps = 0;
    let fpsCounter = 0;

    const resizeCanvas = () => {
      cw = window.innerWidth;
      ch = window.innerHeight;
      maxColumns = Math.floor(cw / config.fontSize);
      canvas.width = cw;
      canvas.height = ch;
    };

    resizeCanvas();

    const charPool: FallingChar[] = [];
    const techPool: TechFalling[] = [];

    class FallingChar {
      x = 0;
      y = 0;
      value = '';
      speed = 0;
      opacity = 1;
      trail: Array<{ x: number; y: number; value: string; opacity: number }> =
        [];
      active = true;

      reset(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.value = '';
        this.speed = 0;
        this.opacity = 0.8;
        this.trail = [];
        this.active = true;
      }

      draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;

        this.value =
          charArr[Math.floor(Math.random() * charArr.length)].toUpperCase();
        this.speed = Math.random() * config.fontSize + config.fontSize * 0.8;

        for (let i = 0; i < this.trail.length; i++) {
          const point = this.trail[i];
          const trailOpacity = (i / this.trail.length) * 0.2;
          ctx.fillStyle = `rgba(16, 185, 129, ${trailOpacity})`;
          ctx.fillText(point.value, point.x, point.y);
        }

        this.trail.push({
          x: this.x,
          y: this.y,
          value: this.value,
          opacity: this.opacity,
        });

        if (this.trail.length > config.trailLength) {
          this.trail.shift();
        }

        if (!lowPerf) {
          ctx.shadowColor = 'rgba(16, 185, 129, 0.6)';
          ctx.shadowBlur = config.shadowBlur;
        }

        ctx.fillStyle = `rgba(16, 185, 129, ${this.opacity})`;
        ctx.fillText(this.value, this.x, this.y);

        if (!lowPerf) {
          ctx.shadowBlur = 0;
        }

        this.y += this.speed;

        if (this.y > ch + 50) {
          this.active = false;
        }
      }
    }

    class TechFalling {
      x = 0;
      y = 0;
      tech: (typeof techLogos)[0] = techLogos[0];
      speed = 0;
      rotation = 0;
      rotationSpeed = 0;
      scale = 1;
      pulse = 0;
      active = true;

      reset(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.tech = techLogos[Math.floor(Math.random() * techLogos.length)];
        this.speed = Math.random() * 1.5 + 0.8;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.01;
        this.scale = Math.random() * 0.3 + 0.6;
        this.pulse = 0;
        this.active = true;
      }

      draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) {
          return;
        }

        ctx.save();

        this.pulse += 0.08;
        const pulseScale = lowPerf ? 1 : 1 + Math.sin(this.pulse) * 0.08;

        ctx.translate(this.x, this.y);
        if (!lowPerf) {
          ctx.rotate(this.rotation);
        }
        ctx.scale(this.scale * pulseScale, this.scale * pulseScale);

        if (!lowPerf) {
          ctx.shadowColor = this.tech.color;
          ctx.shadowBlur = config.shadowBlur;
        }

        ctx.fillStyle = this.tech.color;
        ctx.font = `${config.techSize}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.tech.symbol, 0, 0);

        ctx.restore();

        this.y += this.speed;
        if (!lowPerf) {
          this.rotation += this.rotationSpeed;
        }

        if (this.y > ch + 100) {
          this.active = false;
        }
      }
    }

    const getChar = (): FallingChar => {
      const char = charPool.pop() || new FallingChar();
      char.reset(
        Math.floor(Math.random() * maxColumns) * config.fontSize,
        -config.fontSize
      );
      return char;
    };

    const getTech = (): TechFalling => {
      const tech = techPool.pop() || new TechFalling();
      tech.reset(Math.random() * cw, -50);
      return tech;
    };

    const update = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      fpsCounter++;

      if (deltaTime >= 1000) {
        fps = fpsCounter;
        fpsCounter = 0;
        lastTime = currentTime;
      }

      if (frames % config.frameSkip !== 0) {
        frames++;
        animationRef.current = requestAnimationFrame(update);
        return;
      }

      if (
        fallingCharArr.length < config.maxCharCount &&
        Math.random() < config.spawnRate
      ) {
        fallingCharArr.push(getChar());
      }

      if (
        techFallingArr.length < config.maxTechCount &&
        Math.random() < config.techSpawnRate
      ) {
        techFallingArr.push(getTech());
      }

      ctx.fillStyle = `rgba(0, 0, 0, ${config.fadeOpacity})`;
      ctx.fillRect(0, 0, cw, ch);
      ctx.font = `${config.fontSize}px 'Courier New', monospace`;

      for (let i = fallingCharArr.length - 1; i >= 0; i--) {
        const char = fallingCharArr[i];
        char.draw(ctx);

        if (!char.active) {
          charPool.push(fallingCharArr.splice(i, 1)[0]);
        }
      }

      for (let i = techFallingArr.length - 1; i >= 0; i--) {
        const tech = techFallingArr[i];
        tech.draw(ctx);

        if (!tech.active) {
          techPool.push(techFallingArr.splice(i, 1)[0]);
        }
      }

      frames++;
      animationRef.current = requestAnimationFrame(update);
    };

    animationRef.current = requestAnimationFrame(update);

    const handleResize = () => {
      resizeCanvas();
    };

    const handleVisibilityChange = () => {
      if (document.hidden && animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      } else if (!document.hidden) {
        animationRef.current = requestAnimationFrame(update);
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isMobile]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(6,78,59,0.1) 50%, rgba(0,0,0,0.95) 100%)',
          opacity: isLowPerformance ? 0.25 : 0.4,
        }}
      />
    </>
  );
}
