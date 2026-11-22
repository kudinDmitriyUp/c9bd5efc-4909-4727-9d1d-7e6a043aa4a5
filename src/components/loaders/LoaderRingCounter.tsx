"use client";

import { useEffect, useId, useRef, useState } from "react";
import { introSignal } from "@/components/kit/introSignal";

type LoaderRingCounterProps = {
  brand?: string;
  maxWait?: number;
  exit?: "slide" | "fade";
  onComplete?: () => void;
};

const ARC = 377;

export default function LoaderRingCounter({ brand = "Halo", maxWait = 6000, exit = "slide", onComplete }: LoaderRingCounterProps) {
  const [playing] = useState(() => !introSignal.isRevealed());
  const [lifted, setLifted] = useState(false);
  const [gone, setGone] = useState(false);
  const countRef = useRef<HTMLParagraphElement>(null);
  const arcRef = useRef<SVGCircleElement>(null);
  const finish = useRef(onComplete);
  const gradId = `ring${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    finish.current = onComplete;
  });

  useEffect(() => {
    if (!playing) return;
    introSignal.claim();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const load = reduced ? 300 : 1900;
    const t0 = performance.now();
    let ready = false;
    const offReady = introSignal.onReady(() => {
      ready = true;
    });
    let raf = 0;
    let lift = 0;
    let end = 0;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - t0) / load));
      const e = 1 - Math.pow(1 - p, 3);
      if (countRef.current) countRef.current.textContent = String(Math.round(e * 100));
      if (arcRef.current) arcRef.current.style.strokeDashoffset = String(ARC * (1 - e));
      if (p < 1 || (!ready && now - t0 < maxWait)) {
        raf = requestAnimationFrame(tick);
        return;
      }
      lift = window.setTimeout(() => {
        setLifted(true);
        introSignal.reveal();
        end = window.setTimeout(() => {
          setGone(true);
          finish.current?.();
        }, reduced ? 50 : 1000);
      }, 220);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(lift);
      window.clearTimeout(end);
      offReady();
    };
  }, [playing, maxWait]);

  if (!playing || gone) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[200] grid place-items-center bg-background text-foreground duration-1000 ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:duration-[10ms] ${exit === "fade" ? "transition-opacity" : "transition-transform"} ${lifted ? (exit === "fade" ? "opacity-0" : "-translate-y-full") : ""}`}
    >
      {brand && (
        <div className="absolute left-1/2 top-5 flex w-[var(--container)] -translate-x-1/2 items-center gap-2.5 text-[length:var(--text-body)] font-medium">
          <svg viewBox="0 0 20 20" className="size-5">
            <path d="M16.2 6.4A7 7 0 1 0 17 10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <p>{brand}</p>
        </div>
      )}
      <div className="relative grid size-[8.25rem] place-items-center">
        <svg viewBox="0 0 132 132" className="absolute inset-0 -rotate-90">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--accent)" />
              <stop offset="1" stopColor="var(--foreground)" />
            </linearGradient>
          </defs>
          <circle cx="66" cy="66" r="60" fill="none" stroke="color-mix(in srgb, var(--foreground) 12%, var(--background))" strokeWidth="2" />
          <circle ref={arcRef} cx="66" cy="66" r="60" fill="none" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeDasharray={ARC} strokeDashoffset={ARC} />
        </svg>
        <p ref={countRef} className="text-[length:var(--text-h3)] font-normal tabular-nums">
          0
        </p>
      </div>
    </div>
  );
}
