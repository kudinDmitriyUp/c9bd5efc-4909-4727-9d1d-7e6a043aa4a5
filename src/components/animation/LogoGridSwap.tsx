"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView, useReducedMotion } from "motion/react";

const SLOTS = 8;
const MOBILE_SLOTS = 6;
const LOOP_DELAY = 1500;
const EASE = [0.87, 0, 0.13, 1] as const;
const INTRO_EASE = [0.16, 1, 0.3, 1] as const;
const INTRO_DELAYS = [0, 5, 2, 7, 4, 1, 6, 3].map((step) => step * 0.08);
const INTRO_DURATION = 1800;

interface LogoGridSwapProps {
  names?: string[];
  cellClassName?: string;
}

const shuffle = (values: number[]) => {
  const result = values.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const DEFAULT_NAMES = ["Northwind", "Lumen", "Atlas", "Verde", "Orbit", "Haven", "Pioneer", "Summit", "Harbor", "Ember", "Nova", "Cedar"];

const LogoGridSwap = ({ names = DEFAULT_NAMES, cellClassName = "aspect-3/2 rounded" }:LogoGridSwapProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref);
  const hasEntered = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });
  const reduceMotion = useReducedMotion();
  const isShown = hasEntered || !!reduceMotion;
  const [isReady, setIsReady] = useState(false);
  const [slots, setSlots] = useState(() => names.slice(0, SLOTS).map((_, index) => index));
  const slotsRef = useRef(slots);
  const poolRef = useRef<number[]>([]);
  const patternRef = useRef({ order: [] as number[], index: 0 });

  useEffect(() => {
    const initial = names.slice(0, SLOTS).map((_, index) => index);
    slotsRef.current = initial;
    setSlots(initial);
    poolRef.current = shuffle(names.map((_, index) => index).slice(SLOTS));
    patternRef.current = { order: [], index: 0 };
  }, [names]);

  useEffect(() => {
    if (!isShown) return;
    const timeout = setTimeout(() => setIsReady(true), reduceMotion ? 0 : INTRO_DURATION);
    return () => clearTimeout(timeout);
  }, [isShown, reduceMotion]);

  useEffect(() => {
    if (!isInView || !isReady) return;

    const interval = setInterval(() => {
      if (document.hidden || !poolRef.current.length) return;
      const visible = Math.min(slotsRef.current.length, window.matchMedia("(max-width: 991px)").matches ? MOBILE_SLOTS : SLOTS);
      const pattern = patternRef.current;
      if (pattern.order.length !== visible) {
        pattern.order = shuffle(Array.from({ length: visible }, (_, index) => index));
        pattern.index = 0;
      }
      const slot = pattern.order[pattern.index % visible];
      pattern.index++;
      const next = slotsRef.current.slice();
      poolRef.current.push(next[slot]);
      next[slot] = poolRef.current.shift()!;
      slotsRef.current = next;
      setSlots(next);
    }, LOOP_DELAY);

    return () => clearInterval(interval);
  }, [isInView, isReady]);

  return (
    <div ref={ref} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full">
      {slots.map((nameIndex, slot) => (
        <motion.div
          key={slot}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.9, y: 24 }}
          animate={isShown ? { opacity: 1, scale: 1, y: 0 } : undefined}
          transition={{ duration: 1, ease: INTRO_EASE, delay: INTRO_DELAYS[slot % INTRO_DELAYS.length] }}
          className={`relative flex items-center justify-center ${cellClassName} card overflow-hidden perspective-[40em] ${slot >= MOBILE_SLOTS ? "max-lg:hidden" : ""}`}
        >
          <AnimatePresence initial={false}>
            {isShown && (
              <motion.span
                key={nameIndex}
                initial={{ y: "50%", rotateX: -90, opacity: 0 }}
                animate={{
                  y: "0%",
                  rotateX: 0,
                  opacity: 1,
                  transition: { duration: 0.9, ease: EASE, delay: isReady ? 0.1 : INTRO_DELAYS[slot % INTRO_DELAYS.length] + 0.3 },
                }}
                exit={{ y: "-50%", rotateX: 90, opacity: 0, transition: { duration: 0.9, ease: EASE } }}
                className="absolute backface-hidden text-xl md:text-2xl 2xl:text-3xl leading-tight font-semibold whitespace-nowrap text-foreground/75"
              >
                {names[nameIndex]}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
};

export default LogoGridSwap;
