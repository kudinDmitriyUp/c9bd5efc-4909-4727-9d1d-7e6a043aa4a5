"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { introSignal } from "@/components/kit/introSignal";
import { useCarDuo } from "@/components/kit/carDuo";

type LoaderStudioWarmupProps = {
  label?: string;
  errorLabel?: string;
  maxWait?: number;
  onComplete?: () => void;
};

export default function LoaderStudioWarmup({ label = "Warming up", errorLabel = "Could not load the models", maxWait = 20, onComplete }: LoaderStudioWarmupProps) {
  const reduce = useReducedMotion();
  const { progress, failed } = useCarDuo();
  const [playing] = useState(() => {
    if (typeof window === "undefined" || introSignal.isRevealed()) return false;
    introSignal.claim();
    return true;
  });
  const [leaving, setLeaving] = useState(false);
  const [done, setDone] = useState(!playing);
  const finish = useRef(onComplete);

  useEffect(() => {
    finish.current = onComplete;
  });

  useEffect(() => {
    if (!playing) return;
    let end = 0;
    const go = () => {
      if (end) return;
      introSignal.reveal();
      setLeaving(true);
      end = window.setTimeout(
        () => {
          setDone(true);
          finish.current?.();
        },
        reduce ? 0 : 1200,
      );
    };
    const cap = window.setTimeout(go, maxWait * 1000);
    const off = introSignal.onReady(go);
    return () => {
      off();
      window.clearTimeout(cap);
      window.clearTimeout(end);
    };
  }, [playing, reduce, maxWait]);

  if (done) return null;

  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 1 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: reduce ? 0 : 1, delay: reduce ? 0 : 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className={`${leaving ? "pointer-events-none" : "pointer-events-auto"} fixed inset-0 z-[100000] grid place-items-center bg-deep text-deep-foreground`}
    >
      <div className="w-[15rem]">
        <div className="flex items-center gap-[0.625rem]">
          <div className="size-[6px] shrink-0 rounded-full bg-accent" />
          <p className="text-[length:var(--text-label)] font-medium leading-[normal] tracking-[0.01em] text-deep-foreground/62">{failed ? errorLabel : label}</p>
        </div>
        <div className="mt-[1rem] h-px bg-deep-foreground/12">
          <div className="h-full origin-left bg-deep-foreground transition-transform duration-300" style={{ transform: `scaleX(${progress})` }} />
        </div>
      </div>
    </motion.div>
  );
}
