import { useEffect, useRef } from "react";
import type { BackgroundStyle } from "../types";

interface Particle {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
  driftPhase: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  hue: string; // per-particle color, only populated for confetti
}

interface BackgroundEffectProps {
  style: BackgroundStyle;
  color: string; // hex, used when style === "custom"
  density: number; // particle count, used when style === "custom"
  speed: number; // speed multiplier, used when style === "custom"
}

const PRESET_COUNTS: Partial<Record<BackgroundStyle, number>> = {
  snow: 60,
  stars: 90,
  rain: 110,
  confetti: 60,
};

const RAIN_COLOR = "120, 170, 230";
const CONFETTI_COLORS = ["#f94144", "#f3722c", "#f9c74f", "#90be6d", "#43aa8b", "#577590", "#f8961e"];

function hexToRgbString(hex: string): string {
  const clean = hex.replace("#", "");
  const n = parseInt(clean, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/** Ambient decoration behind the window content - a themeable canvas
 * particle effect (snow, stars, rain, confetti, or a fully custom
 * color/density/speed combo). Sits in a stacking context below the rest of
 * the UI (see the `relative z-10` wrappers in App.tsx/TitleBar.tsx) so it
 * only shows through in the empty space around cards, not overlapping them. */
export default function BackgroundEffect({ style, color, density, speed }: BackgroundEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const themeColorRef = useRef("255, 255, 255");

  useEffect(() => {
    const readColor = () => {
      themeColorRef.current =
        getComputedStyle(document.documentElement).getPropertyValue("--snow-color").trim() ||
        "255, 255, 255";
    };
    readColor();
    const observer = new MutationObserver(readColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (style === "none") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const isRain = style === "rain";
    const isConfetti = style === "confetti";
    const isStars = style === "stars";
    const isCustom = style === "custom";
    const count = isCustom ? Math.round(density) : (PRESET_COUNTS[style] ?? 60);
    const speedMul = isCustom ? speed : 1;
    const customColor = isCustom ? hexToRgbString(color) : null;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];

    const makeParticle = (randomY: boolean): Particle => ({
      x: Math.random() * width,
      y: randomY ? Math.random() * height : -10,
      r: isConfetti ? Math.random() * 3 + 2 : isRain ? Math.random() * 1 + 0.6 : Math.random() * 2 + 0.6,
      speed:
        (isRain
          ? Math.random() * 3 + 4
          : isStars
            ? Math.random() * 0.08 + 0.02
            : Math.random() * 0.45 + 0.22) * speedMul,
      drift: isRain ? 0.05 : isConfetti ? Math.random() * 1.2 + 0.4 : Math.random() * 0.5 + 0.15,
      driftPhase: Math.random() * Math.PI * 2,
      opacity: isStars ? Math.random() * 0.6 + 0.3 : Math.random() * 0.45 + 0.2,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.05,
      hue: isConfetti ? CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] : "",
    });

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = Array.from({ length: count }, () => makeParticle(true));
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let time = 0;
    const tick = () => {
      time += 1;
      const sharedColor = isRain ? RAIN_COLOR : (customColor ?? themeColorRef.current);
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        if (isStars) {
          p.opacity = 0.3 + Math.abs(Math.sin(time * 0.02 + p.driftPhase)) * 0.5;
          p.x += Math.sin(time * 0.003 + p.driftPhase) * 0.03;
        } else {
          p.y += p.speed;
          p.x += Math.sin(time * 0.01 + p.driftPhase) * p.drift * (isConfetti ? 0.3 : 0.15);
          p.rotation += p.rotationSpeed;
          if (p.y - p.r > height) Object.assign(p, makeParticle(false));
        }
        if (p.x > width + 10) p.x = -10;
        if (p.x < -10) p.x = width + 10;

        if (isRain) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${sharedColor}, ${p.opacity})`;
          ctx.lineWidth = p.r;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 1.5, p.y + 14);
          ctx.stroke();
        } else if (isConfetti) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.globalAlpha = Math.min(p.opacity + 0.3, 1);
          ctx.fillStyle = p.hue;
          ctx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.shadowBlur = p.r * 2.5;
          ctx.shadowColor = `rgba(${sharedColor}, ${p.opacity * 0.5})`;
          ctx.fillStyle = `rgba(${sharedColor}, ${p.opacity})`;
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [style, color, density, speed]);

  if (style === "none") return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
    />
  );
}
