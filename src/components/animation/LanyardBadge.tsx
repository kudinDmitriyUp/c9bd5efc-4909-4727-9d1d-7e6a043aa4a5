"use client";

import { useEffect, useId, useRef } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface LanyardBadgeProps {
  imageSrc?: string;
  title?: string;
  description?: string;
  label?: string;
  tag?: string;
  code?: string;
  strapText?: string;
  children?: React.ReactNode;
  className?: string;
}

const SEGMENTS = 4;
const GRAVITY = 3600;
const STEP = 1 / 120;
const ITERATIONS = 14;
const RETAIN = 0.974;
const CARD_WEIGHT = 0.3;
const CLIP = 20;
const MAX_MOVE = 16;
const THROW = 0.25;
const DROP_SWAY = 35;

const LanyardBadge = ({ imageSrc, title, description, label, tag, code, strapText, children, className = "" }: LanyardBadgeProps) => {
  const pathId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const strapShadowRef = useRef<SVGPathElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const card = cardRef.current;
    const path = pathRef.current;
    const strapShadow = strapShadowRef.current;
    const shadow = shadowRef.current;
    if (!stage || !card || !path || !strapShadow || !shadow) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const count = SEGMENTS + 2;
    const clip = SEGMENTS;
    const bottom = SEGMENTS + 1;
    const x = new Float64Array(count);
    const y = new Float64Array(count);
    const px = new Float64Array(count);
    const py = new Float64Array(count);
    const sx = new Float64Array(count);
    const sy = new Float64Array(count);
    const inv = new Float64Array(count).fill(1);
    inv[0] = 0;
    inv[clip] = CARD_WEIGHT;
    inv[bottom] = CARD_WEIGHT;
    const lengths = new Float64Array(count - 1);
    const grab = { active: false, touch: false, x: 0, y: 0, tx: 0, ty: 0, dc: 0, db: 0 };
    let anchorX = 0;
    const anchorY = -10;
    let cardW = 0;
    let cardH = 0;
    let lift = 0;
    let droppedAt = -Infinity;
    let ry = 0;
    let rx = 0;
    let frame = 0;
    let last = 0;
    let acc = 0;
    let still = 0;
    let visible = false;
    let started = false;

    const measure = () => {
      anchorX = stage.clientWidth / 2;
      cardW = card.offsetWidth;
      cardH = card.offsetHeight;
      const rope = Math.max(110, stage.clientHeight * 0.28);
      for (let i = 0; i < SEGMENTS; i++) lengths[i] = rope / SEGMENTS;
      lengths[SEGMENTS] = CLIP + card.offsetHeight;
    };

    const place = (drop: boolean) => {
      measure();
      let offset = 0;
      for (let i = 0; i < count; i++) {
        x[i] = anchorX;
        y[i] = anchorY + offset;
        if (i < count - 1) offset += lengths[i];
      }
      if (drop) {
        droppedAt = performance.now();
        const lift = y[bottom] - anchorY + 40;
        for (let i = 1; i < count; i++) {
          x[i] += DROP_SWAY * (i / (count - 1));
          y[i] -= lift;
        }
      }
      px.set(x);
      py.set(y);
      sx.set(x);
      sy.set(y);
    };

    const link = (a: number, b: number, length: number, rope: boolean) => {
      const dx = x[b] - x[a];
      const dy = y[b] - y[a];
      const d = Math.hypot(dx, dy) || 0.0001;
      if (rope && d <= length) return;
      const w = inv[a] + inv[b];
      if (!w) return;
      const diff = (d - length) / d;
      x[a] += dx * diff * (inv[a] / w);
      y[a] += dy * diff * (inv[a] / w);
      x[b] -= dx * diff * (inv[b] / w);
      y[b] -= dy * diff * (inv[b] / w);
    };

    const pin = (i: number, length: number) => {
      const dx = x[i] - grab.x;
      const dy = y[i] - grab.y;
      const d = Math.hypot(dx, dy) || 0.0001;
      x[i] = grab.x + (dx / d) * length;
      y[i] = grab.y + (dy / d) * length;
    };

    const simulate = () => {
      for (let i = 1; i < count; i++) {
        const vx = Math.max(-MAX_MOVE, Math.min(MAX_MOVE, (x[i] - px[i]) * RETAIN));
        const vy = Math.max(-MAX_MOVE, Math.min(MAX_MOVE, (y[i] - py[i]) * RETAIN));
        px[i] = x[i];
        py[i] = y[i];
        x[i] += vx;
        y[i] += vy + GRAVITY * STEP * STEP;
      }
      if (grab.active) {
        const ease = grab.touch ? 0.3 : 1;
        grab.x += (grab.tx - grab.x) * ease;
        grab.y += (grab.ty - grab.y) * ease;
      }
      for (let n = 0; n < ITERATIONS; n++) {
        x[0] = anchorX;
        y[0] = anchorY;
        for (let i = 0; i < count - 1; i++) link(i, i + 1, lengths[i], i < SEGMENTS);
        if (grab.active) {
          pin(clip, grab.dc);
          pin(bottom, grab.db);
        }
      }
    };

    const render = () => {
      for (let i = 0; i < count; i++) {
        const ease = i === 0 || i >= clip ? 1 : 0.5;
        sx[i] += (x[i] - sx[i]) * ease;
        sy[i] += (y[i] - sy[i]) * ease;
      }
      let d = `M${sx[0]},${sy[0]}`;
      for (let i = 0; i < clip; i++) {
        const a = Math.max(i - 1, 0);
        const c = i + 1;
        const e = Math.min(i + 2, clip);
        d += ` C${sx[i] + (sx[c] - sx[a]) / 6},${sy[i] + (sy[c] - sy[a]) / 6} ${sx[c] - (sx[e] - sx[i]) / 6},${sy[c] - (sy[e] - sy[i]) / 6} ${sx[c]},${sy[c]}`;
      }
      path.setAttribute("d", d);
      strapShadow.setAttribute("d", d);

      const angle = Math.atan2(x[bottom] - x[clip], y[bottom] - y[clip]);
      const vx = (x[clip] - px[clip] + x[bottom] - px[bottom]) / 2 / STEP;
      const vy = (y[clip] - py[clip] + y[bottom] - py[bottom]) / 2 / STEP;
      const calm = 0.25 + 0.75 * Math.min(Math.max((performance.now() - droppedAt) / 2500, 0), 1);
      ry += (Math.max(-40, Math.min(40, vx * 0.03)) * calm - ry) * 0.12;
      rx += (Math.max(-15, Math.min(15, -vy * 0.012)) * calm - rx) * 0.12;
      lift += ((grab.active ? 1 : 0) - lift) * 0.14;
      card.style.transform = `translate3d(${x[clip] - cardW / 2}px, ${y[clip] + CLIP}px, ${lift * 60}px) rotate(${-angle}rad) rotateY(${ry}deg) rotateX(${rx}deg)`;
      card.style.setProperty("--ex", `${Math.sin((ry * Math.PI) / 180) * -5}px`);
      card.style.setProperty("--ey", `${Math.sin((rx * Math.PI) / 180) * 5 + 1.5}px`);
      shadow.style.width = `${cardW}px`;
      shadow.style.height = `${cardH}px`;
      shadow.style.opacity = `${0.55 - lift * 0.2}`;
      shadow.style.transform = `translate3d(${x[clip] - cardW / 2 + 22 + lift * 34 - ry * 0.6}px, ${y[clip] + CLIP + 30 + lift * 46}px, 0) rotate(${-angle}rad) scale(${Math.max(Math.cos((ry * Math.PI) / 180), 0.3) * (1 + lift * 0.05)}, ${1 + lift * 0.05})`;
      strapShadow.style.transform = `translate(${12 + lift * 10}px, ${16 + lift * 14}px)`;
      card.style.setProperty("--sheen", `${50 - ry * 1.4 - angle * 40}%`);
      card.style.setProperty("--lx", `${50 - ry * 1.6 - angle * 30}%`);
      card.style.setProperty("--ly", `${15 + rx * 2}%`);
      card.style.setProperty("--shade", `${0.35 + Math.min(Math.abs(ry) / 40 + Math.abs(rx) / 30, 1) * 0.45}`);
    };

    const tick = (now: number) => {
      frame = 0;
      acc += Math.min((now - last) / 1000, 0.05);
      last = now;
      while (acc >= STEP) {
        simulate();
        acc -= STEP;
      }
      render();
      let motion = 0;
      for (let i = 1; i < count; i++) motion += Math.abs(x[i] - px[i]) + Math.abs(y[i] - py[i]);
      still = !grab.active && motion < 0.03 && Math.abs(ry) < 0.05 && Math.abs(rx) < 0.05 ? still + 1 : 0;
      if (still < 30 && visible && !document.hidden) frame = requestAnimationFrame(tick);
    };

    const wake = () => {
      still = 0;
      if (frame || !visible || document.hidden) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    if (reduce) {
      place(false);
      render();
      return;
    }

    place(true);
    render();

    const local = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      return [event.clientX - rect.left, event.clientY - rect.top];
    };

    const onDown = (event: PointerEvent) => {
      const [gx, gy] = local(event);
      card.setPointerCapture(event.pointerId);
      grab.active = true;
      grab.touch = event.pointerType === "touch";
      grab.x = grab.tx = gx;
      grab.y = grab.ty = gy;
      grab.dc = Math.hypot(x[clip] - gx, y[clip] - gy);
      grab.db = Math.hypot(x[bottom] - gx, y[bottom] - gy);
      wake();
    };
    const onMove = (event: PointerEvent) => {
      if (!grab.active) return;
      [grab.tx, grab.ty] = local(event);
      wake();
    };
    const onUp = () => {
      if (!grab.active) return;
      grab.active = false;
      for (let i = 1; i < count; i++) {
        px[i] = x[i] - (x[i] - px[i]) * THROW;
        py[i] = y[i] - (y[i] - py[i]) * THROW;
      }
      wake();
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !started) {
        started = true;
        place(true);
      }
      wake();
    });
    const resize = new ResizeObserver(() => {
      measure();
      wake();
    });
    const onVisibility = () => wake();

    observer.observe(stage);
    resize.observe(stage);
    resize.observe(card);
    card.addEventListener("pointerdown", onDown);
    card.addEventListener("pointermove", onMove);
    card.addEventListener("pointerup", onUp);
    card.addEventListener("pointercancel", onUp);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      card.removeEventListener("pointerdown", onDown);
      card.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerup", onUp);
      card.removeEventListener("pointercancel", onUp);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div ref={stageRef} className={cn("relative w-full overflow-hidden perspective-[1200px]", className)}>
      <div ref={shadowRef} aria-hidden="true" className="absolute top-0 left-0 origin-[50%_-20px] rounded-xl bg-[color-mix(in_oklab,black_70%,transparent)] blur-xl pointer-events-none will-change-transform" />
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full overflow-visible pointer-events-none">
        <path ref={strapShadowRef} fill="none" strokeWidth={20} strokeLinecap="round" className="stroke-[color-mix(in_oklab,black_40%,transparent)] blur-[5px]" />
        <path ref={pathRef} id={pathId} fill="none" strokeWidth={20} strokeLinecap="round" className="stroke-foreground" />
        {strapText && (
          <text className="fill-background text-[9px] font-semibold uppercase tracking-[0.3em]" dominantBaseline="central">
            <textPath href={`#${pathId}`}>{`${strapText}  •  `.repeat(40)}</textPath>
          </text>
        )}
      </svg>
      <div ref={cardRef} className="absolute top-0 left-0 w-64 md:w-72 origin-[50%_-20px] cursor-grab touch-none select-none will-change-transform active:cursor-grabbing">
        <div aria-hidden="true" className="absolute -top-6 left-1/2 z-10 flex h-10 w-8 -translate-x-1/2 items-end justify-center overflow-hidden rounded-md bg-foreground pb-2 shadow-[0_4px_8px_color-mix(in_oklab,black_45%,transparent)]">
          <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-background/25" />
          <div className="absolute inset-x-0 top-0 h-px bg-background/15" />
          <div className="relative h-1.5 w-5 rounded-full bg-background shadow-[inset_0_1px_2px_color-mix(in_oklab,black_60%,transparent)]" />
        </div>
        <div aria-hidden="true" style={{ transform: "translate(var(--ex, 0px), var(--ey, 1.5px))" }} className="absolute inset-0 rounded bg-[color-mix(in_oklab,var(--color-card)_55%,black)]" />
        <div className="relative flex flex-col gap-3 overflow-hidden p-3 card rounded">
          {children ?? (
            <>
              <div className="flex aspect-3/4 flex-col justify-between gap-5 p-2">
                <div className="flex items-start justify-between gap-3">
                  {imageSrc ? (
                    <div className="size-16 md:size-20 overflow-hidden rounded-full border border-foreground/10">
                      <img src={imageSrc} alt="" draggable={false} className="h-full w-full object-cover pointer-events-none" />
                    </div>
                  ) : (
                    <span />
                  )}
                  {tag && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">{tag}</span>}
                </div>
                {title && <h3 className="text-4xl md:text-5xl font-semibold leading-[0.95] tracking-tight text-balance">{title}</h3>}
                <div className="flex flex-col gap-4">
                  {(label || description) && (
                    <div className="flex flex-col gap-1 font-mono text-[11px] uppercase leading-snug tracking-wide">
                      {label && <span>{label}</span>}
                      {description && <span className="text-foreground/50 text-balance">{description}</span>}
                    </div>
                  )}
                  {code && (
                    <div className="flex items-end justify-between gap-4 border-t border-dashed border-foreground/20 pt-4">
                      <div aria-hidden="true" className="flex h-9 flex-1 items-stretch gap-[2px]">
                        {Array.from({ length: 28 }, (_, index) => {
                          const char = code.charCodeAt(index % code.length) + index * 7;
                          return <span key={index} style={{ flexGrow: (char % 3) + 1 }} className="bg-foreground" />;
                        })}
                      </div>
                      <span className="font-mono text-[11px] uppercase tracking-wide text-foreground/60">{code}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
          <div
            aria-hidden="true"
            style={{ opacity: "var(--shade, 0.35)" }}
            className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(130%_100%_at_var(--lx,50%)_var(--ly,15%),transparent_35%,color-mix(in_oklab,black_55%,transparent)_100%)]"
          />
          <div
            aria-hidden="true"
            style={{ backgroundPosition: "var(--sheen, 50%) 0" }}
            className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(115deg,transparent_38%,color-mix(in_oklab,white_28%,transparent)_48%,color-mix(in_oklab,white_8%,transparent)_52%,transparent_62%)] bg-size-[300%_100%] mix-blend-soft-light"
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_color-mix(in_oklab,white_14%,transparent),inset_0_-1px_0_color-mix(in_oklab,black_30%,transparent)]" />
        </div>
      </div>
    </div>
  );
};

export default LanyardBadge;
