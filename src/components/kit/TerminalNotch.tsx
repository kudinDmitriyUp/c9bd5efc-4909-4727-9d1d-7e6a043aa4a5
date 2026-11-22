"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type NotchEdge = { from?: number; to?: number; size?: number; position?: number };
type Side = "top" | "right" | "bottom" | "left";

type TerminalNotchProps = {
  top?: NotchEdge;
  right?: NotchEdge;
  bottom?: NotchEdge;
  left?: NotchEdge;
  depth?: number;
  radius?: number;
  cornerRadius?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

type Point = [number, number, number];

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.min(1, Math.max(0, t));

const roundedPath = (points: Point[]) => {
  const n = points.length;
  const d: string[] = [];
  points.forEach((p, i) => {
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    const inLen = Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    const outLen = Math.hypot(next[0] - p[0], next[1] - p[1]);
    const r = Math.min(p[2], inLen / 2, outLen / 2);
    const a = inLen ? [p[0] + ((prev[0] - p[0]) / inLen) * r, p[1] + ((prev[1] - p[1]) / inLen) * r] : [p[0], p[1]];
    const b = outLen ? [p[0] + ((next[0] - p[0]) / outLen) * r, p[1] + ((next[1] - p[1]) / outLen) * r] : [p[0], p[1]];
    d.push(`${i ? "L" : "M"}${a[0].toFixed(1)} ${a[1].toFixed(1)}`, `Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
  });
  return `${d.join(" ")} Z`;
};

const TerminalNotch = ({ top, right, bottom, left, depth, radius = 20, cornerRadius = 0, className, style, children }: TerminalNotchProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const size = useRef({ w: 0, h: 0, d: 40 });
  const reduce = useReducedMotion();
  const { scrollYProgress: enter } = useScroll({ target: ref, offset: ["start end", "start start"] });
  const { scrollYProgress: leave } = useScroll({ target: ref, offset: ["end end", "end start"] });
  const edges = { top, right, bottom, left };

  const paint = () => {
    const el = ref.current;
    const { w, h, d } = size.current;
    if (!el || !w || !h) return;
    const value = (side: Side) => {
      const edge = edges[side];
      if (!edge) return 0;
      const from = edge.from ?? -1;
      const to = edge.to ?? 1;
      if (reduce) return to;
      return lerp(from, to, (side === "bottom" ? leave : enter).get());
    };
    const inset = { top: top ? d : 0, right: right ? d : 0, bottom: bottom ? d : 0, left: left ? d : 0 };
    const x0 = inset.left;
    const x1 = w - inset.right;
    const y0 = inset.top;
    const y1 = h - inset.bottom;
    const points: Point[] = [[x0, y0, cornerRadius]];
    const tab = (side: Side, length: number, along: (t: number, out: number) => [number, number]) => {
      const edge = edges[side];
      if (!edge) return;
      const v = value(side);
      const width = (edge.size ?? 0.65) * length;
      const position = edge.position ?? 0.5;
      const center = (side === "bottom" || side === "left" ? 1 - position : position) * length;
      const slant = Math.max(12, length * 0.0125);
      const a = Math.max(radius, center - width / 2);
      const b = Math.min(length - radius, center + width / 2);
      const out = v * d;
      points.push([...along(a, 0), radius], [...along(a + slant, out), radius], [...along(b - slant, out), radius], [...along(b, 0), radius]);
    };
    tab("top", x1 - x0, (t, out) => [x0 + t, y0 - out]);
    points.push([x1, y0, cornerRadius]);
    tab("right", y1 - y0, (t, out) => [x1 + out, y0 + t]);
    points.push([x1, y1, cornerRadius]);
    tab("bottom", x1 - x0, (t, out) => [x1 - t, y1 + out]);
    points.push([x0, y1, cornerRadius]);
    tab("left", y1 - y0, (t, out) => [x0 - out, y1 - t]);
    el.style.clipPath = `path("${roundedPath(points)}")`;
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const query = window.matchMedia("(min-width: 880px)");
    const observer = new ResizeObserver(() => {
      size.current = { w: el.offsetWidth, h: el.offsetHeight, d: depth ?? (query.matches ? 40 : 20) };
      paint();
    });
    observer.observe(el);
    return () => observer.disconnect();
  });

  useMotionValueEvent(enter, "change", paint);
  useMotionValueEvent(leave, "change", paint);

  return (
    <div ref={ref} className={cn("relative", className)} style={style}>
      {children}
    </div>
  );
};

export default TerminalNotch;
