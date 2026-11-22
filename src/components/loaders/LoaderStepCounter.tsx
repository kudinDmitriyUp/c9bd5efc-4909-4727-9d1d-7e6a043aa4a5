"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useReducedMotion } from "motion/react";

type LoaderStepCounterProps = {
  onComplete?: () => void;
};

const WAIT = 0.5;
const COUNT = 2;
const HOLD = 0.372;
const STEP = 6;
const CAP = 96;
const BLUR_AFTER = 0.5;
const HANDOFF = 0.5;
const FADE = 1;
const UNMOUNT = 1.6;
const slowdown = [0, 0, 0, 1] as const;

const LoaderStepCounter = ({ onComplete }: LoaderStepCounterProps) => {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);
  const [phase, setPhase] = useState<"count" | "full" | "blur" | "fade" | "done">("count");
  const done = useRef(onComplete);

  useEffect(() => {
    done.current = onComplete;
  });

  useEffect(() => {
    if (reduce) {
      setPhase("done");
      done.current?.();
      return;
    }
    const controls = animate(0, 1, {
      duration: COUNT,
      delay: WAIT,
      ease: slowdown,
      onUpdate: (latest) => setValue(Math.min(CAP, Math.floor((latest * 100) / STEP) * STEP)),
    });
    const full = WAIT + COUNT;
    const exiting = full + HOLD;
    const timers = [
      window.setTimeout(() => {
        setValue(100);
        setPhase("full");
      }, full * 1000),
      window.setTimeout(() => setPhase("blur"), (full + BLUR_AFTER) * 1000),
      window.setTimeout(() => setPhase("fade"), (exiting + HANDOFF) * 1000),
      window.setTimeout(() => {
        setPhase("done");
        done.current?.();
      }, (exiting + UNMOUNT) * 1000),
    ];
    return () => {
      controls.stop();
      timers.forEach(window.clearTimeout);
    };
  }, [reduce]);

  if (reduce || phase === "done") return null;

  const digits = String(value).split("");

  return (
    <motion.div
      aria-hidden="true"
      initial={false}
      animate={{ opacity: phase === "fade" ? 0 : 1 }}
      transition={{ duration: FADE, ease: "easeInOut" }}
      className={phase === "fade" || phase === "blur" ? "pointer-events-none fixed inset-0 z-[120] flex items-center justify-center bg-background text-foreground" : "fixed inset-0 z-[120] flex items-center justify-center bg-background text-foreground"}
    >
      <div className="flex font-[family-name:var(--font-label)] text-[length:var(--text-small)] font-light leading-none tabular-nums tracking-[var(--label-tracking)]">
        {digits.map((digit, i) => (
          <motion.p
            key={`${digits.length}-${i}`}
            initial={false}
            animate={phase === "blur" || phase === "fade" ? { filter: "blur(20px)", opacity: 0 } : { filter: "blur(0px)", opacity: 1 }}
            transition={{ type: "spring", duration: 0.6, bounce: 0.5, delay: i * 0.05 }}
          >
            {digit}
          </motion.p>
        ))}
      </div>
    </motion.div>
  );
};

export default LoaderStepCounter;
