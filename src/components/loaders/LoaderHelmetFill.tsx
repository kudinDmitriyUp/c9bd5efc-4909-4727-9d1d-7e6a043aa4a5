"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import { introSignal } from "@/components/kit/introSignal";
import { localMediaSrc } from "@/components/kit/mediaSrc";

type LoaderHelmetFillProps = {
  brand?: string;
  maskSrc?: string;
  maxWait?: number;
  onComplete?: () => void;
};

const spring = (stiffness: number, damping: number, delay = 0) => ({ type: "spring" as const, stiffness, damping, mass: 1, delay, restDelta: 0.001 });

export default function LoaderHelmetFill({ brand = "Lewis Hamilton", maskSrc = "https://storage.googleapis.com/webild/default/templates/racing-driver/helmet-mask.png", maxWait = 8, onComplete }: LoaderHelmetFillProps) {
  const reduce = useReducedMotion();
  const [playing] = useState(() => {
    if (typeof window === "undefined" || introSignal.isRevealed()) return false;
    introSignal.claim();
    return true;
  });
  const [gone, setGone] = useState(false);
  const finish = useRef(onComplete);
  const veilRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLParagraphElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const barFillRef = useRef<HTMLDivElement>(null);
  const mask = maskSrc ? `url("${localMediaSrc(maskSrc)}") center / contain no-repeat` : undefined;

  useEffect(() => {
    finish.current = onComplete;
  });

  useEffect(() => {
    const veil = veilRef.current;
    const inner = innerRef.current;
    const fillEl = fillRef.current;
    const nameEl = nameRef.current;
    const bar = barRef.current;
    const barFill = barFillRef.current;
    if (!playing || !veil || !inner || !fillEl || !nameEl || !bar || !barFill) return;
    const fillTo = (to: number, options: ReturnType<typeof spring>) => [animate(fillEl, { transform: `scaleY(${to})` }, options), animate(barFill, { transform: `scaleX(${to})` }, options)];
    const wait = fillTo(0.7, spring(10, 30));
    const label = animate(nameEl, { opacity: 1, transform: "translateY(0rem)" }, spring(110, 26, 0.26));
    let timer = 0;
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      wait.forEach((a) => a.stop());
      fillTo(1, spring(170, 26));
      animate(inner, { opacity: 0, transform: "translateY(-0.75rem)" }, spring(140, 26));
      animate(bar, { opacity: 0 }, spring(140, 26));
      timer = window.setTimeout(() => {
        introSignal.reveal();
        animate(veil, { opacity: 0 }, spring(70, 24)).then(() => {
          setGone(true);
          finish.current?.();
        });
      }, reduce ? 0 : 670);
    };
    const hasScene = !!document.querySelector("[data-intro-scene]");
    const stop = introSignal.onReady(go);
    const cap = window.setTimeout(go, (hasScene ? maxWait : 1.2) * 1000);
    return () => {
      stop();
      wait.forEach((a) => a.stop());
      label.stop();
      window.clearTimeout(timer);
      window.clearTimeout(cap);
    };
  }, [playing, reduce, maxWait]);

  if (!playing || gone) return null;

  return (
    <div ref={veilRef} role="status" aria-label={`Loading ${brand}`} className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-background text-foreground">
      <div ref={innerRef} className="flex flex-col items-center">
        <div aria-hidden="true" style={{ mask, WebkitMask: mask }} className={`relative h-[8.5rem] w-[7.2rem] overflow-hidden ${mask ? "" : "rounded-[45%_45%_40%_40%]"}`}>
          <div className="absolute inset-0 bg-foreground/12" />
          <div ref={fillRef} style={{ transform: "scaleY(0)" }} className="absolute inset-0 origin-top bg-foreground" />
        </div>
        <p ref={nameRef} style={{ opacity: 0, transform: "translateY(0.6rem)" }} className="mt-7 text-[length:var(--text-body-lg)] uppercase leading-[0.9] tracking-[0.18em]">
          {brand}
        </p>
      </div>
      <div ref={barRef} aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-border">
        <div ref={barFillRef} style={{ transform: "scaleX(0)" }} className="absolute inset-0 origin-left bg-accent" />
      </div>
    </div>
  );
}
