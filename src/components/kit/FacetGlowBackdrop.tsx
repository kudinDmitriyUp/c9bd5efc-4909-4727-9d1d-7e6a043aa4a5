"use client";

import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

type Mote = { x: number; y: number; z: number; r: number; vx: number; vy: number; ox: number; oy: number; tint: boolean; phase: number };

const FacetDust = ({ count = 90 }: { count?: number }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const fine = matchMedia("(pointer: fine)").matches;
    const host = canvas.closest("main") ?? document.documentElement;
    let ink = "248,241,230";
    let accent = "255,138,44";
    const toRgb = (value: string, fallback: string) => {
      const probe = document.createElement("canvas").getContext("2d");
      if (!probe || !value) return fallback;
      probe.fillStyle = value;
      probe.fillRect(0, 0, 1, 1);
      const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
      return `${r},${g},${b}`;
    };
    const readColours = () => {
      const cs = getComputedStyle(host);
      ink = toRgb(cs.getPropertyValue("--foreground").trim(), ink);
      accent = toRgb(cs.getPropertyValue("--accent").trim(), accent);
    };
    readColours();
    const colourWatch = new MutationObserver(readColours);
    colourWatch.observe(host, { attributes: true });
    colourWatch.observe(document.documentElement, { attributes: true });

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      w = innerWidth;
      h = innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const motes: Mote[] = Array.from({ length: count }, () => {
      const z = 0.3 + Math.random() * 0.7;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        z,
        r: 0.5 + z * 1.2,
        vx: (Math.random() - 0.5) * 4,
        vy: -(3 + Math.random() * 7) * z,
        ox: 0,
        oy: 0,
        tint: Math.random() < 0.3,
        phase: Math.random() * Math.PI * 2,
      };
    });

    const mouse = { x: -9999, y: -9999, px: 0, py: 0, sx: 0, sy: 0 };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.px = e.clientX / w - 0.5;
      mouse.py = e.clientY / h - 0.5;
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };
    if (fine) {
      addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
    }

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      mouse.sx += (mouse.px - mouse.sx) * Math.min(1, dt * 2);
      mouse.sy += (mouse.py - mouse.sy) * Math.min(1, dt * 2);
      ctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.y < -10) {
          m.y = h + 10;
          m.x = Math.random() * w;
        }
        if (m.x < -10) m.x = w + 10;
        if (m.x > w + 10) m.x = -10;
        const px = m.x - mouse.sx * 40 * m.z;
        const py = m.y - mouse.sy * 40 * m.z;
        const dx = px + m.ox - mouse.x;
        const dy = py + m.oy - mouse.y;
        const d2 = dx * dx + dy * dy;
        const push = d2 < 14400 ? (1 - Math.sqrt(d2) / 120) * 28 : 0;
        const d = Math.sqrt(d2) || 1;
        m.ox += ((dx / d) * push - m.ox) * Math.min(1, dt * 4);
        m.oy += ((dy / d) * push - m.oy) * Math.min(1, dt * 4);
        m.phase += dt * 0.8;
        const alpha = (0.18 + 0.32 * m.z) * (0.75 + 0.25 * Math.sin(m.phase));
        ctx.fillStyle = `rgba(${m.tint ? accent : ink},${alpha})`;
        ctx.beginPath();
        ctx.arc(px + m.ox, py + m.oy, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!document.hidden) raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (raf || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const onVisibility = () => {
      if (document.hidden && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else start();
    };
    addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      colourWatch.disconnect();
      removeEventListener("resize", resize);
      removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [count]);

  return <canvas ref={ref} className="absolute inset-0 block size-full" />;
};

const FacetGlowBackdrop = ({ dim = 0.5, particles = true }: { dim?: number; particles?: boolean }) => {
  const { scrollY } = useScroll();
  const scrim = useTransform(scrollY, (y) => Math.min(1, y / (typeof window === "undefined" ? 1 : window.innerHeight)) * dim);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="facet-glow facet-breathe absolute inset-[-8%]" />
      <div className="absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
      <motion.div style={{ opacity: scrim }} className="absolute inset-0 bg-background" />
      {particles && <FacetDust />}
    </div>
  );
};

export default FacetGlowBackdrop;
