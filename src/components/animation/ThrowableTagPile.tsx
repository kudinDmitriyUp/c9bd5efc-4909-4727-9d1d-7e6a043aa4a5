"use client";

import { useEffect, useRef, useState } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface ThrowableTagPileProps {
  tags?: string[];
  className?: string;
}

type Body = {
  x: number;
  y: number;
  a: number;
  vx: number;
  vy: number;
  w: number;
  half: number;
  r: number;
  im: number;
  ii: number;
  active: boolean;
  sleep: number;
  rx: number;
  ry: number;
  ra: number;
  width: number;
  height: number;
};

type Vec = [number, number];

const GRAVITY = 2400;
const STEP = 1 / 120;
const ITERATIONS = 10;
const FRICTION = 0.6;
const SPAWN_GAP = 0.09;
const SLOP = 0.3;
const CORRECTION = 0.8;
const MAX_SPEED = 3500;
const MAX_SPIN = 25;
const SLEEP_DRIFT = 1.5;
const WAKE_SPEED = 60;
const SLEEP_STEPS = 40;

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

const ends = (body: Body): [Vec, Vec] => {
  const cx = Math.cos(body.a) * body.half;
  const cy = Math.sin(body.a) * body.half;
  return [
    [body.x - cx, body.y - cy],
    [body.x + cx, body.y + cy],
  ];
};

const closest = (p1: Vec, q1: Vec, p2: Vec, q2: Vec): [Vec, Vec] => {
  const d1x = q1[0] - p1[0];
  const d1y = q1[1] - p1[1];
  const d2x = q2[0] - p2[0];
  const d2y = q2[1] - p2[1];
  const rx = p1[0] - p2[0];
  const ry = p1[1] - p2[1];
  const a = d1x * d1x + d1y * d1y;
  const e = d2x * d2x + d2y * d2y;
  const f = d2x * rx + d2y * ry;
  let s = 0;
  let t = 0;
  if (a < 1e-6 && e < 1e-6) {
    s = 0;
    t = 0;
  } else if (a < 1e-6) {
    t = clamp01(f / e);
  } else {
    const c = d1x * rx + d1y * ry;
    if (e < 1e-6) {
      s = clamp01(-c / a);
    } else {
      const b = d1x * d2x + d1y * d2y;
      const denom = a * e - b * b;
      s = denom !== 0 ? clamp01((b * f - c * e) / denom) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp01(-c / a);
      } else if (t > 1) {
        t = 1;
        s = clamp01((b - c) / a);
      }
    }
  }
  return [
    [p1[0] + d1x * s, p1[1] + d1y * s],
    [p2[0] + d2x * t, p2[1] + d2y * t],
  ];
};

const resolve = (a: Body, b: Body | null, cp: Vec, nx: number, ny: number, depth: number) => {
  const imB = b ? b.im : 0;
  const iiB = b ? b.ii : 0;
  const ax = cp[0] - a.x;
  const ay = cp[1] - a.y;
  const bx = b ? cp[0] - b.x : 0;
  const by = b ? cp[1] - b.y : 0;
  const vax = a.vx - a.w * ay;
  const vay = a.vy + a.w * ax;
  const vbx = b ? b.vx - b.w * by : 0;
  const vby = b ? b.vy + b.w * bx : 0;
  const rvx = vbx - vax;
  const rvy = vby - vay;
  const vn = rvx * nx + rvy * ny;

  const total = a.im + imB;
  if (total > 0) {
    const push = (Math.max(depth - SLOP, 0) * CORRECTION) / total;
    a.x -= nx * push * a.im;
    a.y -= ny * push * a.im;
    if (b) {
      b.x += nx * push * b.im;
      b.y += ny * push * b.im;
    }
  }
  if (vn > 0) return;

  const raN = ax * ny - ay * nx;
  const rbN = bx * ny - by * nx;
  const denom = a.im + imB + raN * raN * a.ii + rbN * rbN * iiB;
  if (denom <= 0) return;
  const bounce = vn < -120 ? 0.25 : 0;
  const j = (-(1 + bounce) * vn) / denom;
  a.vx -= nx * j * a.im;
  a.vy -= ny * j * a.im;
  a.w -= raN * j * a.ii;
  if (b) {
    b.vx += nx * j * b.im;
    b.vy += ny * j * b.im;
    b.w += rbN * j * b.ii;
  }

  const tx = -ny;
  const ty = nx;
  const vt = rvx * tx + rvy * ty;
  const raT = ax * ty - ay * tx;
  const rbT = bx * ty - by * tx;
  const denomT = a.im + imB + raT * raT * a.ii + rbT * rbT * iiB;
  if (denomT <= 0) return;
  const jt = Math.max(Math.min(-vt / denomT, j * FRICTION), -j * FRICTION);
  a.vx -= tx * jt * a.im;
  a.vy -= ty * jt * a.im;
  a.w -= raT * jt * a.ii;
  if (b) {
    b.vx += tx * jt * b.im;
    b.vy += ty * jt * b.im;
    b.w += rbT * jt * b.ii;
  }
};

const DEFAULT_TAGS = ["Branding", "Web design", "Strategy", "Motion", "Packaging", "Identity", "Product", "Content"];

const ThrowableTagPile = ({ tags = DEFAULT_TAGS,className = "" }: ThrowableTagPileProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const tagRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isStatic, setIsStatic] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsStatic(true);
      return;
    }
    const wrap = wrapRef.current;
    if (!wrap) return;
    const els = tagRefs.current.filter((el): el is HTMLDivElement => !!el);

    let width = wrap.clientWidth;
    let height = wrap.clientHeight;
    let frame = 0;
    let last = 0;
    let acc = 0;
    let visible = false;
    let started = false;
    let clock = 0;
    const drag = { index: -1, x: 0, y: 0, id: -1 };

    const measure = (el: HTMLDivElement) => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const r = h / 2;
      const half = Math.max(w / 2 - r, 0);
      const mass = (w * h) / 1000;
      return { width: w, height: h, r, half, im: 1 / mass, ii: 1 / (mass * ((half * half) / 3 + (r * r) / 2 + 1)) };
    };

    const bodies: Body[] = els.map((el) => ({ x: 0, y: 0, a: 0, vx: 0, vy: 0, w: 0, active: false, sleep: 0, rx: 0, ry: 0, ra: 0, ...measure(el) }));

    const remeasure = () => {
      bodies.forEach((body, index) => Object.assign(body, measure(els[index])));
    };

    const place = () => {
      bodies.forEach((body, index) => {
        const el = els[index];
        el.style.opacity = body.active ? "1" : "0";
        el.style.transform = `translate3d(${body.x - body.width / 2}px, ${body.y - body.height / 2}px, 0) rotate(${body.a}rad)`;
      });
    };

    const spawn = (body: Body, index: number) => {
      body.active = true;
      body.sleep = 0;
      body.x = body.width / 2 + Math.random() * Math.max(width - body.width, 1);
      body.y = -body.height * (1 + (index % 4) * 1.2);
      body.a = (Math.random() - 0.5) * 1.2;
      body.vx = (Math.random() - 0.5) * 120;
      body.vy = 200 + Math.random() * 200;
      body.w = (Math.random() - 0.5) * 3;
    };

    const isAsleep = (body: Body, index: number) => body.sleep >= SLEEP_STEPS && index !== drag.index;

    const walls = (body: Body) => {
      for (const point of ends(body)) {
        const r = body.r;
        if (point[1] + r > height) resolve(body, null, [point[0], height], 0, 1, point[1] + r - height);
        if (point[0] - r < 0) resolve(body, null, [0, point[1]], -1, 0, r - point[0]);
        if (point[0] + r > width) resolve(body, null, [width, point[1]], 1, 0, point[0] + r - width);
      }
    };

    const contain = (body: Body) => {
      let dx = 0;
      let dy = 0;
      for (const point of ends(body)) {
        dy = Math.min(dy, height - (point[1] + body.r));
        dx = Math.max(dx, body.r - point[0]);
        dx = Math.min(dx, width - (point[0] + body.r));
      }
      body.x += dx;
      body.y += dy;
    };

    const step = () => {
      clock += STEP;
      bodies.forEach((body, index) => {
        if (!body.active && started && clock >= index * SPAWN_GAP) spawn(body, index);
      });
      bodies.forEach((body, index) => {
        if (!body.active || isAsleep(body, index)) return;
        if (index === drag.index) {
          body.vx = (drag.x - body.x) * 18;
          body.vy = (drag.y - body.y) * 18;
          body.w *= 0.9;
        } else {
          body.vy += GRAVITY * STEP;
        }
        const speed = Math.hypot(body.vx, body.vy);
        if (speed > MAX_SPEED) {
          body.vx *= MAX_SPEED / speed;
          body.vy *= MAX_SPEED / speed;
        }
        body.w = Math.max(Math.min(body.w, MAX_SPIN), -MAX_SPIN);
        body.vx *= 0.999;
        body.vy *= 0.999;
        body.w *= 0.985;
        body.x += body.vx * STEP;
        body.y += body.vy * STEP;
        body.a += body.w * STEP;
      });
      for (let k = 0; k < ITERATIONS; k++) {
        for (let i = 0; i < bodies.length; i++) {
          const a = bodies[i];
          if (!a.active) continue;
          const aAsleep = isAsleep(a, i);
          if (!aAsleep) walls(a);
          const [ap, aq] = ends(a);
          for (let j = i + 1; j < bodies.length; j++) {
            const b = bodies[j];
            if (!b.active) continue;
            const bAsleep = isAsleep(b, j);
            if (aAsleep && bAsleep) continue;
            const reach = a.half + a.r + b.half + b.r;
            if (Math.abs(a.x - b.x) > reach || Math.abs(a.y - b.y) > reach) continue;
            const [bp, bq] = ends(b);
            const [pa, pb] = closest(ap, aq, bp, bq);
            const dx = pb[0] - pa[0];
            const dy = pb[1] - pa[1];
            const dist = Math.hypot(dx, dy);
            const depth = a.r + b.r - dist;
            if (depth <= 0) continue;
            const nx = dist > 1e-4 ? dx / dist : 0;
            const ny = dist > 1e-4 ? dy / dist : 1;
            if (aAsleep !== bAsleep && (b.vx - a.vx) * nx + (b.vy - a.vy) * ny < -WAKE_SPEED) {
              a.sleep = 0;
              b.sleep = 0;
            }
            const imA = a.im;
            const imB = b.im;
            if (isAsleep(a, i)) a.im = 0;
            if (isAsleep(b, j)) b.im = 0;
            const iiA = a.ii;
            const iiB = b.ii;
            if (a.im === 0) a.ii = 0;
            if (b.im === 0) b.ii = 0;
            resolve(a, b, [pa[0] + nx * a.r, pa[1] + ny * a.r], nx, ny, depth);
            a.im = imA;
            b.im = imB;
            a.ii = iiA;
            b.ii = iiB;
          }
        }
      }
      bodies.forEach((body, index) => {
        if (!body.active || isAsleep(body, index)) return;
        contain(body);
        const drift = Math.abs(body.x - body.rx) + Math.abs(body.y - body.ry) + Math.abs(body.a - body.ra) * (body.half + body.r);
        if (drift < SLEEP_DRIFT && index !== drag.index) body.sleep += 1;
        else {
          body.sleep = 0;
          body.rx = body.x;
          body.ry = body.y;
          body.ra = body.a;
        }
        if (body.sleep >= SLEEP_STEPS) {
          body.vx = 0;
          body.vy = 0;
          body.w = 0;
        }
      });
    };

    const tick = (now: number) => {
      frame = 0;
      const dt = Math.min((now - (last || now)) / 1000, 1 / 30);
      last = now;
      acc += dt;
      while (acc >= STEP) {
        step();
        acc -= STEP;
      }
      place();
      const settled = drag.index < 0 && bodies.every((body, index) => body.active && isAsleep(body, index));
      if (settled) {
        last = 0;
        acc = 0;
        return;
      }
      if (visible) frame = requestAnimationFrame(tick);
      else last = 0;
    };

    const wake = () => {
      if (!frame && visible && started) frame = requestAnimationFrame(tick);
    };

    const wakeAll = () => {
      bodies.forEach((body) => {
        body.sleep = 0;
      });
      wake();
    };

    const toLocal = (event: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      return [event.clientX - rect.left, event.clientY - rect.top];
    };

    const onDown = (event: PointerEvent) => {
      const index = els.indexOf(event.currentTarget as HTMLDivElement);
      if (index < 0 || !bodies[index].active) return;
      const [x, y] = toLocal(event);
      drag.index = index;
      drag.id = event.pointerId;
      drag.x = x;
      drag.y = y;
      els[index].setPointerCapture(event.pointerId);
      wake();
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== drag.id) return;
      const [x, y] = toLocal(event);
      drag.x = x;
      drag.y = y;
      wake();
    };

    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== drag.id) return;
      drag.index = -1;
      drag.id = -1;
      wake();
    };

    els.forEach((el) => {
      el.addEventListener("pointerdown", onDown);
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("pointercancel", onUp);
    });

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && entry.intersectionRatio >= 0.3) started = true;
        if (visible) wake();
      },
      { threshold: [0, 0.3] }
    );
    observer.observe(wrap);

    let alive = true;

    const refit = () => {
      if (!alive) return;
      width = wrap.clientWidth;
      height = wrap.clientHeight;
      remeasure();
      bodies.forEach((body) => {
        if (body.active) contain(body);
      });
      place();
      wakeAll();
    };

    const resize = new ResizeObserver(refit);
    resize.observe(wrap);
    document.fonts?.ready.then(refit).catch(() => {});

    place();

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      els.forEach((el) => {
        el.removeEventListener("pointerdown", onDown);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
        el.removeEventListener("pointercancel", onUp);
      });
    };
  }, [tags]);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative w-full overflow-hidden",
        isStatic && "flex flex-wrap content-end items-end justify-center gap-2 p-4",
        className
      )}
    >
      {tags.map((tag, index) => (
        <div
          key={`${tag}-${index}`}
          ref={(el) => {
            tagRefs.current[index] = el;
          }}
          className={cn(
            "flex items-center justify-center whitespace-nowrap rounded-full px-5 py-3 md:px-7 md:py-4 text-base md:text-2xl font-medium select-none",
            !isStatic && "absolute top-0 left-0 opacity-0 touch-none cursor-grab active:cursor-grabbing will-change-transform",
            index % 3 === 0 ? "btn-primary bg-primary text-primary-foreground" : "bg-background text-foreground border border-foreground/10"
          )}
        >
          {tag}
        </div>
      ))}
    </div>
  );
};

export default ThrowableTagPile;
