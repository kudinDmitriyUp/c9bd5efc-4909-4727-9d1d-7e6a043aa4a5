"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { introSignal } from "@/components/kit/introSignal";
import { localMediaSrc } from "@/components/kit/mediaSrc";

type LoaderScribbleUnwindProps = {
  logoSrc?: string;
  logoAlt?: string;
  onComplete?: () => void;
};

const PATH =
  "M299.654 453.865C505.574 319.225 711.494 184.585 836.054 109.945C960.614 35.3048 997.574 24.7448 944.014 110.385C890.454 196.025 745.254 378.185 571.454 634.385C397.654 890.585 199.654 1215.3 110.854 1382.58C22.0544 1549.86 48.4544 1549.86 77.8944 1540.62C107.334 1531.38 139.014 1512.9 367.854 1319.9C596.694 1126.9 1021.73 759.945 1255.21 555.065C1488.69 350.185 1517.73 318.505 1527.41 306.145C1537.09 293.785 1526.53 301.705 1346.85 618.625C1167.17 935.545 818.694 1561.22 635.214 1896.74C451.734 2232.26 443.814 2258.66 447.654 2268.3C451.494 2277.94 467.334 2270.02 511.134 2236.9C554.934 2203.78 626.214 2145.7 966.534 1817.46C1306.85 1489.22 1914.05 892.585 2263.81 557.505C2613.57 222.425 2687.49 166.985 2741.41 129.185C2795.33 91.3848 2827.01 72.9048 2843.33 67.3448C2859.65 61.7848 2859.65 69.7048 2849.09 96.2248C2838.53 122.745 2817.41 167.625 2584.77 544.505C2352.13 921.385 1370.37 2165.43 1139.25 2537.83C908.134 2910.23 902.854 2926.07 902.774 2939.51C902.694 2952.95 907.974 2963.51 1255.21 2613.87C1602.45 2264.23 2829.73 1017.54 2903.53 1071.46C2977.33 1125.38 2176.12 2817.04 2128 3037C2079.88 3256.96 2911.24 2018.56 3172 1793";

const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  const f = (t: number, a: number, b: number) => {
    const u = 1 - t;
    return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t;
  };
  return (x: number) => {
    let t = x;
    for (let i = 0; i < 5; i++) {
      const cx = f(t, x1, x2) - x;
      const dx = 3 * (1 - t) * (1 - t) * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (1 - x2);
      if (Math.abs(dx) < 1e-6) break;
      t = Math.max(0, Math.min(1, t - cx / dx));
    }
    return f(t, y1, y2);
  };
};

const unwindEase = bezier(0.645, 0.045, 0.355, 1);
const widthEase = bezier(0.75, 0.15, 0.15, 1);
const NORM = Math.sqrt((3222 * 3222 + 3114 * 3114) / 2);
const W_FULL = NORM * 0.31;
const W_END = NORM * 0.08;
const HOLD = 0.25;
const DUR = 2;

const LoaderScribbleUnwind = ({ logoSrc = "https://storage.googleapis.com/webild/default/templates/prebiotic-soda/img/weeby-logo-white.png", logoAlt = "Weeby", onComplete }: LoaderScribbleUnwindProps) => {
  const reduce = useReducedMotion();
  const [playing] = useState(() => {
    if (typeof window === "undefined" || introSignal.isRevealed()) return false;
    introSignal.claim();
    return true;
  });
  const [done, setDone] = useState(!playing);
  const finish = useRef(onComplete);
  const path = useRef<SVGPathElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const logo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finish.current = onComplete;
  });

  useEffect(() => {
    if (!playing) return;
    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      introSignal.reveal();
      setDone(true);
      finish.current?.();
    };
    if (reduce) {
      end();
      return;
    }
    const el = path.current;
    const length = el?.getTotalLength() ?? 0;
    if (el) {
      el.style.strokeDasharray = `${length} ${length}`;
      el.style.strokeDashoffset = "0";
      el.style.strokeWidth = String(W_FULL);
    }
    let frame = 0;
    let safety = 0;
    let started = false;
    let t0 = 0;
    const tick = (now: number) => {
      if (ended) return;
      const t = (now - t0) / 1000 - HOLD;
      if (t < 0) {
        frame = requestAnimationFrame(tick);
        return;
      }
      introSignal.reveal();
      const p = Math.min(t / DUR, 1);
      if (el) {
        el.style.strokeDashoffset = String(-length * unwindEase(p));
        el.style.strokeWidth = String(W_FULL + (W_END - W_FULL) * widthEase(p));
      }
      if (fill.current) fill.current.style.opacity = String(Math.max(0, 1 - p / 0.18));
      if (t >= 0.95 && logo.current) logo.current.style.opacity = "0";
      if (p < 1) frame = requestAnimationFrame(tick);
      else end();
    };
    const start = () => {
      if (started) return;
      started = true;
      t0 = performance.now();
      frame = requestAnimationFrame(tick);
      safety = window.setTimeout(end, 4500);
    };
    const offReady = introSignal.onReady(start);
    const cap = window.setTimeout(start, 10000);
    return () => {
      offReady();
      window.clearTimeout(cap);
      window.clearTimeout(safety);
      cancelAnimationFrame(frame);
    };
  }, [playing, reduce]);

  if (done || reduce) return null;

  return (
    <div aria-hidden="true" className="fixed inset-0 z-[100000] text-accent">
      <div ref={fill} className="absolute inset-0 bg-accent" />
      <svg viewBox="0 0 3222 3114" preserveAspectRatio="none" className="absolute inset-0 size-full">
        <path ref={path} d={PATH} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div ref={logo} className="absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-[250ms]">
        <img src={localMediaSrc(logoSrc)} alt={logoAlt} loading="eager" decoding="async" className="block h-auto w-[min(56vw,clamp(14rem,45vh,30rem))] max-w-none" />
      </div>
    </div>
  );
};

export default LoaderScribbleUnwind;
