"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionTemplate, useMotionValue, useReducedMotion } from "motion/react";
import { introSignal } from "@/components/kit/introSignal";

type LoaderGlowRiseProps = {
  wordmark?: string[];
  introDelay?: number;
  onComplete?: () => void;
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const OPEN: [number, number, number, number] = [0.65, 0, 0.35, 1];

export default function LoaderGlowRise({ wordmark = ["Facet"], introDelay = 1.3, onComplete }: LoaderGlowRiseProps) {
  const reduce = useReducedMotion();
  const [playing] = useState(() => {
    if (typeof window === "undefined" || introSignal.isRevealed()) return false;
    introSignal.claim();
    return true;
  });
  const [done, setDone] = useState(!playing);
  const finish = useRef(onComplete);
  const iris = useMotionValue(-14);
  const mask = useMotionTemplate`radial-gradient(circle at var(--intro-x, 50%) var(--intro-y, 50%), transparent ${iris}vmax, black calc(${iris}vmax + 14vmax))`;
  const brand = wordmark.filter((w) => w.trim()).join(" ");

  useEffect(() => {
    finish.current = onComplete;
  });

  useEffect(() => {
    if (!playing) return;
    const quick = !!reduce;
    const t0 = performance.now();
    let controls: ReturnType<typeof animate> | null = null;
    let open = 0;
    let end = 0;
    const go = () => {
      window.clearTimeout(open);
      if (end) return;
      introSignal.reveal();
      if (!quick) controls = animate(iris, 150, { duration: 0.75, ease: OPEN });
      end = window.setTimeout(
        () => {
          setDone(true);
          finish.current?.();
        },
        (quick ? 0.4 : 0.75) * 1000,
      );
    };
    if (quick) go();
    else open = window.setTimeout(go, (introDelay + 1.5) * 1000);
    const offReady = quick
      ? () => {}
      : introSignal.onReady(() => {
          const late = (performance.now() - t0) / 1000;
          const at = Math.min(late > 0.25 ? late + introDelay : introDelay, introDelay + 1.5);
          window.clearTimeout(open);
          open = window.setTimeout(go, Math.max(0, at - late) * 1000);
        });
    return () => {
      offReady();
      window.clearTimeout(open);
      window.clearTimeout(end);
      controls?.stop();
    };
  }, [playing, reduce, introDelay, iris]);

  if (done) return null;

  if (reduce) {
    return <motion.div aria-hidden="true" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.4 }} className="pointer-events-none fixed inset-0 z-[200] bg-background" />;
  }

  return (
    <motion.div aria-hidden="true" style={{ maskImage: mask, WebkitMaskImage: mask }} className="pointer-events-none fixed inset-0 z-[200] h-svh overflow-clip bg-background">
      <div className="absolute left-[var(--intro-x,50%)] top-[var(--intro-y,50%)] size-[min(120vw,70rem)] -translate-x-1/2 -translate-y-[38%]">
        <motion.div
          initial={{ opacity: 0, scale: 0.55, y: "18%" }}
          animate={{ opacity: 1, scale: 1, y: "0%" }}
          transition={{ duration: introDelay + 0.2, ease: EASE }}
          className="size-full rounded-full bg-[radial-gradient(closest-side,var(--glow-low)_0%,var(--glow-mid)_32%,var(--glow-deep)_62%,transparent_100%)]"
        />
      </div>
      {brand && (
        <div className="absolute inset-x-0 bottom-[clamp(1.5rem,6vh,3rem)] flex justify-center overflow-hidden pb-[0.15em]">
          <motion.p
            initial={{ y: "110%" }}
            animate={{ y: ["110%", "0%", "0%", "-110%"] }}
            transition={{ duration: introDelay, times: [0, 0.3, 0.75, 1], ease: EASE }}
            className="whitespace-nowrap text-[length:var(--text-label)] uppercase leading-[1] tracking-[0.3em] text-muted-foreground"
          >
            {brand}
          </motion.p>
        </div>
      )}
    </motion.div>
  );
}
