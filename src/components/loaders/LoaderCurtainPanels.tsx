"use client";

import { useEffect, useRef, useState } from "react";
import { introSignal } from "@/components/kit/introSignal";

type LoaderCurtainPanelsProps = {
  brand?: string;
  minWait?: number;
  maxWait?: number;
  onComplete?: () => void;
};

const PART = "duration-[1500ms] ease-[cubic-bezier(0.65,0.05,0.36,1)] motion-reduce:duration-[10ms]";

export default function LoaderCurtainPanels({ brand = "", minWait = 1600, maxWait = 1900, onComplete }: LoaderCurtainPanelsProps) {
  const [playing] = useState(() => !introSignal.isRevealed());
  const [shown, setShown] = useState(false);
  const [parted, setParted] = useState(false);
  const [gone, setGone] = useState(false);
  const finish = useRef(onComplete);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finish.current = onComplete;
  });

  useEffect(() => {
    if (!playing) return;
    introSignal.claim();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const load = reduced ? 300 : minWait;
    const t0 = performance.now();
    let ready = false;
    const offReady = introSignal.onReady(() => {
      ready = true;
    });
    const show = requestAnimationFrame(() => setShown(true));
    let raf = 0;
    let end = 0;
    let p = 0;
    const paint = (value: number) => {
      if (barRef.current) barRef.current.style.transform = `scaleX(${value})`;
    };
    const tick = (now: number) => {
      const t = now - t0;
      if (t < load || (!ready && t < maxWait)) {
        const target = Math.min(1, ready ? t / load : t / Math.max(load, maxWait));
        p = Math.max(p, p + (target - p) * 0.2);
        paint(p);
        raf = requestAnimationFrame(tick);
        return;
      }
      paint(1);
      setParted(true);
      introSignal.reveal();
      end = window.setTimeout(() => {
        setGone(true);
        finish.current?.();
      }, reduced ? 50 : 1750);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(show);
      cancelAnimationFrame(raf);
      window.clearTimeout(end);
      offReady();
    };
  }, [playing, minWait, maxWait]);

  if (!playing || gone) return null;

  return (
    <div aria-hidden="true" className={`fixed inset-0 z-[200] overflow-hidden ${parted ? "pointer-events-none" : ""}`}>
      <div className={`absolute inset-y-0 left-0 w-1/2 bg-card transition-transform delay-100 ${PART} ${parted ? "-translate-x-full" : ""}`} />
      <div className={`absolute inset-y-0 right-0 w-1/2 bg-card transition-transform delay-100 ${PART} ${parted ? "translate-x-full" : ""}`} />
      <div className={`absolute inset-y-0 left-0 w-1/2 bg-background transition-transform ${PART} ${parted ? "-translate-x-full" : ""}`} />
      <div className={`absolute inset-y-0 right-0 w-1/2 bg-background transition-transform ${PART} ${parted ? "translate-x-full" : ""}`} />
      {brand && (
        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-[600ms] ${parted ? "opacity-0" : "opacity-100"}`}>
          <div className="overflow-hidden bg-background px-[1.25rem] pb-[0.15em]">
            <p
              className={`text-[length:var(--text-h3)] leading-[1.2] text-foreground transition-transform duration-[900ms] ease-[cubic-bezier(0.76,0,0.24,1)] [font-family:var(--font-heading)] [font-weight:var(--heading-weight)] ${shown && !parted ? "translate-y-0" : parted ? "-translate-y-[110%]" : "translate-y-[110%]"}`}
            >
              {brand}
            </p>
          </div>
          <div className={`mt-[0.75rem] flex items-center gap-[0.875rem] bg-background px-[1.25rem] py-[0.5rem] transition-opacity delay-200 duration-[700ms] ${shown ? "opacity-100" : "opacity-0"}`}>
            <div className="relative h-px w-[clamp(5rem,9vw,7.5rem)] overflow-hidden bg-foreground/15">
              <div ref={barRef} style={{ transform: "scaleX(0)" }} className="absolute inset-0 origin-left bg-foreground/70" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
