"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useProgress } from "@react-three/drei";
import { useKitMotion } from "@/components/kit/kitMotion";

type LoaderJewelRevealProps = {
  brand?: string;
  script?: string;
  exitAt?: number;
  maxWait?: number;
  onComplete?: () => void;
};

const FADE = 0.6;

const LoaderJewelReveal = ({ brand = "Maison Arden", script = "loading the light", exitAt = 1.8, maxWait = 12, onComplete }: LoaderJewelRevealProps) => {
  const reduce = useReducedMotion();
  const { ease } = useKitMotion();
  const { active, progress } = useProgress();
  const [minDone, setMinDone] = useState(false);
  const [capped, setCapped] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [done, setDone] = useState(false);
  const [count, setCount] = useState(0);
  const finish = useRef(onComplete);
  const loaded = !active || capped;
  const target = loaded ? 100 : Math.min(99, progress);
  const ready = loaded && count >= 100;
  const words = brand.split(/\s+/).filter(Boolean);

  useEffect(() => {
    finish.current = onComplete;
  });

  const start = useRef(0);
  const targetRef = useRef(target);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    if (!start.current) start.current = last;
    const pace = Math.max(0.8, reduce ? 0.8 : exitAt - 0.2);
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const t = Math.min(1, (now - start.current) / 1000 / pace);
      const ramp = 100 * (1 - Math.pow(1 - t, 2));
      setCount((value) => {
        const goal = Math.min(targetRef.current, Math.max(ramp, value));
        if (value >= goal) return value;
        return Math.min(goal, value + Math.max(dt * 30, (goal - value) * (1 - Math.exp(-dt * 10))));
      });
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [reduce, exitAt]);

  useEffect(() => {
    const min = window.setTimeout(() => setMinDone(true), (reduce ? 0 : exitAt) * 1000);
    const cap = window.setTimeout(() => setCapped(true), maxWait * 1000);
    return () => {
      window.clearTimeout(min);
      window.clearTimeout(cap);
    };
  }, [reduce, exitAt, maxWait]);

  useEffect(() => {
    if (!minDone || !ready || leaving) return;
    setLeaving(true);
    window.dispatchEvent(new CustomEvent("kit:intro"));
  }, [minDone, ready, leaving]);

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(
      () => {
        setDone(true);
        finish.current?.();
      },
      (reduce ? 0 : FADE) * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [leaving, reduce]);

  if (done) return null;

  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 1, y: "0vh" }}
      animate={leaving ? { opacity: 0, y: reduce ? "0vh" : "-4vh" } : { opacity: 1, y: "0vh" }}
      transition={{ duration: reduce ? 0 : FADE, ease }}
      className={`${leaving ? "pointer-events-none" : "pointer-events-auto"} fixed inset-0 z-[100000] flex items-center justify-center bg-background [background-image:var(--backdrop-light)] text-foreground`}
    >
      <div className="flex w-[var(--container)] flex-col items-center text-center">
        <div className="-mb-[0.15em] overflow-hidden pb-[0.15em]">
          <motion.p
            initial={reduce ? false : { y: "110%" }}
            animate={{ y: "0%" }}
            transition={{ duration: 1.2, ease, delay: 0.1 }}
            className="font-script text-[length:var(--text-script)] leading-[1.25] text-accent"
          >
            {script}
          </motion.p>
        </div>
        <div className="flex flex-wrap justify-center text-balance font-serif text-[length:var(--text-h1)] leading-[0.92]">
          {words.map((word, i) => (
            <div key={i} className="-mb-[0.12em] -mt-[0.14em] overflow-hidden pb-[0.12em] pt-[0.14em] [&:not(:last-child)]:mr-[0.25em]">
              <motion.p
                initial={reduce ? false : { y: "105%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 1.3, ease, delay: 0.2 + i * 0.07 }}
                className="inline-block"
              >
                {word}
              </motion.p>
            </div>
          ))}
        </div>
        <div className="relative mt-[1.5rem] h-px w-[min(18rem,60vw)] overflow-hidden">
          <div className="absolute inset-0 bg-foreground/15" />
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: Math.max(0.02, count / 100) }}
            transition={{ duration: 0.2, ease: "linear" }}
            className="absolute inset-0 origin-center bg-foreground/70"
          />
        </div>
      </div>
    </motion.div>
  );
};

export default LoaderJewelReveal;
