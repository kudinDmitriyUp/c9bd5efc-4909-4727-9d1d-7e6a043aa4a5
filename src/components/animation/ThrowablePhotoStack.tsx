"use client";

import { useEffect, useRef } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface ThrowablePhotoStackProps {
  items?: ({ title?: string } & ({ imageSrc: string; videoSrc?: never } | { videoSrc: string; imageSrc?: never }))[];
  cursorLabel?: string;
  className?: string;
}

const DEFAULT_ITEMS: NonNullable<ThrowablePhotoStackProps["items"]> = [
  { title: "Design that ships", imageSrc: "https://images.pexels.com/photos/39219673/pexels-photo-39219673.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { title: "Clear systems", imageSrc: "https://images.pexels.com/photos/8436617/pexels-photo-8436617.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { title: "Fast delivery", imageSrc: "https://images.pexels.com/photos/10499488/pexels-photo-10499488.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { title: "Honest craft", imageSrc: "https://images.pexels.com/photos/20768597/pexels-photo-20768597.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { title: "Real support", imageSrc: "https://images.pexels.com/photos/38975946/pexels-photo-38975946.jpeg?auto=compress&cs=tinysrgb&w=1200" },
];

type Photo = {
  x: number;
  y: number;
  a: number;
  vx: number;
  vy: number;
  va: number;
  w: number;
  h: number;
  lift: number;
  drop: number;
  delay: number;
  tx: number;
  ty: number;
  bx: number;
  by: number;
  z: number;
};

const STEP = 1 / 120;
const FRICTION = 3.2;
const SPIN_FRICTION = 4;
const BOUNCE = 0.35;
const THROW = 0.55;
const MAX_SPEED = 2600;
const DROP_GAP = 0.12;
const DROP_TIME = 0.55;

const seeded = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const ThrowablePhotoStack = ({ items = DEFAULT_ITEMS, cursorLabel = "Drag", className = "" }: ThrowablePhotoStackProps) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const photoRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const stage = stageRef.current;
    const els = photoRefs.current.filter((el): el is HTMLDivElement => !!el);
    if (!stage || !els.length) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const order = els.map((_, index) => index).sort((a, b) => seeded(a + 41) - seeded(b + 41));
    const photos: Photo[] = els.map((el, index) => ({
      x: 0,
      y: 0,
      a: (seeded(index + 3) - 0.5) * 0.42,
      vx: 0,
      vy: 0,
      va: 0,
      w: el.offsetWidth,
      h: el.offsetHeight,
      lift: 0,
      drop: reduce ? 1 : 0,
      delay: order.indexOf(index) * DROP_GAP,
      tx: 0,
      ty: 0,
      bx: reduce ? 0 : (seeded(index + 61) - 0.5) * 12,
      by: reduce ? 0 : (seeded(index + 83) - 0.5) * 16,
      z: order.indexOf(index) + 1,
    }));
    const drag = { index: -1, ox: 0, oy: 0, px: 0, py: 0, lx: 0, ly: 0, lt: 0, vx: 0, vy: 0, time: 0 };
    let width = stage.clientWidth;
    let height = stage.clientHeight;
    let top = els.length;
    let started = reduce;
    let clock = 0;
    let frame = 0;
    let last = 0;
    let acc = 0;
    let visible = false;

    const scatter = () => {
      width = stage.clientWidth;
      height = stage.clientHeight;
      photos.forEach((photo, index) => {
        photo.w = els[index].offsetWidth;
        photo.h = els[index].offsetHeight;
      });
      const w = photos[0]?.w ?? 0;
      const h = photos[0]?.h ?? 0;
      const rx = Math.max(width / 2 - w * 0.6, w * 0.3);
      const ry = Math.max(height / 2 - h * 0.6, h * 0.3);
      const placed: [number, number][] = [];
      photos.forEach((photo, index) => {
        let best: [number, number] = [width / 2, height / 2];
        let bestScore = -1;
        for (let k = 0; k < 24; k++) {
          const angle = seeded(index * 131 + k * 7 + 3) * Math.PI * 2;
          const radius = Math.sqrt(seeded(index * 173 + k * 11 + 5));
          const cx = width / 2 + Math.cos(angle) * radius * rx;
          const cy = height / 2 + Math.sin(angle) * radius * ry;
          const score = placed.length
            ? Math.min(...placed.map(([px, py]) => Math.hypot((cx - px) / w, (cy - py) / h)))
            : 1 - Math.hypot((cx - width / 2) / rx, (cy - height / 2) / ry);
          if (score > bestScore) {
            bestScore = score;
            best = [cx, cy];
          }
        }
        placed.push(best);
        photo.x = best[0];
        photo.y = best[1];
      });
    };

    const contain = (photo: Photo) => {
      const rx = (Math.abs(Math.cos(photo.a)) * photo.w + Math.abs(Math.sin(photo.a)) * photo.h) / 2;
      const ry = (Math.abs(Math.sin(photo.a)) * photo.w + Math.abs(Math.cos(photo.a)) * photo.h) / 2;
      const minX = Math.min(rx, width / 2);
      const minY = Math.min(ry, height / 2);
      if (photo.x < minX) {
        photo.x = minX;
        photo.vx = Math.abs(photo.vx) * BOUNCE;
      } else if (photo.x > width - minX) {
        photo.x = width - minX;
        photo.vx = -Math.abs(photo.vx) * BOUNCE;
      }
      if (photo.y < minY) {
        photo.y = minY;
        photo.vy = Math.abs(photo.vy) * BOUNCE;
      } else if (photo.y > height - minY) {
        photo.y = height - minY;
        photo.vy = -Math.abs(photo.vy) * BOUNCE;
      }
    };

    const simulate = () => {
      clock += STEP;
      photos.forEach((photo, index) => {
        if (started && photo.drop < 1) photo.drop = Math.min(Math.max((clock - photo.delay) / DROP_TIME, 0), 1);
        const target = drag.index === index ? 1 : 0;
        photo.lift += (target - photo.lift) * 0.12;
        if (drag.index === index) {
          const nx = drag.px - (drag.ox * Math.cos(photo.a) - drag.oy * Math.sin(photo.a));
          const ny = drag.py - (drag.ox * Math.sin(photo.a) + drag.oy * Math.cos(photo.a));
          const mx = nx - photo.x;
          const my = ny - photo.y;
          photo.va = 0;
          photo.vx = mx / STEP;
          photo.vy = my / STEP;
          photo.x = nx;
          photo.y = ny;
        } else {
          const damp = Math.exp(-FRICTION * STEP);
          photo.vx *= damp;
          photo.vy *= damp;
          photo.va *= Math.exp(-SPIN_FRICTION * STEP);
          photo.x += photo.vx * STEP;
          photo.y += photo.vy * STEP;
          photo.a += photo.va * STEP;
          if (Math.hypot(photo.vx, photo.vy) < 4) photo.vx = photo.vy = 0;
          if (Math.abs(photo.va) < 0.01) photo.va = 0;
        }
        contain(photo);
        photo.tx += (Math.max(-12, Math.min(12, photo.vx * 0.012)) * photo.lift - photo.tx) * 0.15;
        photo.ty += (Math.max(-12, Math.min(12, -photo.vy * 0.012)) * photo.lift - photo.ty) * 0.15;
      });
    };

    const render = () => {
      photos.forEach((photo, index) => {
        const el = els[index];
        const drop = 1 - (1 - photo.drop) ** 3;
        const lift = Math.max(photo.lift, 1 - drop);
        el.style.zIndex = String(photo.z);
        el.style.opacity = String(drop);
        el.style.transform = `translate3d(${photo.x - photo.w / 2}px, ${photo.y - photo.h / 2}px, ${lift * 60}px) rotate(${photo.a}rad) rotateX(calc(${photo.ty + photo.bx}deg + var(--tilt-x, 0deg))) rotateY(calc(${photo.tx + photo.by}deg + var(--tilt-y, 0deg))) scale(${1 + (1 - drop) * 0.2 + photo.lift * 0.04})`;
        el.style.setProperty("--lift", lift.toFixed(3));
        el.style.setProperty("--sheen", `${50 - photo.tx * 3 - photo.a * 30}%`);
        el.style.setProperty("--lx", `${50 - photo.tx * 2.5 - photo.a * 40}%`);
        el.style.setProperty("--ly", `${12 + photo.ty * 2.5}%`);
        el.style.setProperty("--shade", `${0.28 + Math.min(Math.abs(photo.tx) / 12 + Math.abs(photo.ty) / 12, 1) * 0.35 + lift * 0.08}`);
      });
    };

    const settled = () =>
      drag.index < 0 &&
      photos.every((photo) => photo.drop >= 1 && photo.vx === 0 && photo.vy === 0 && photo.va === 0 && photo.lift < 0.002 && Math.abs(photo.tx) < 0.02 && Math.abs(photo.ty) < 0.02);

    const tick = (now: number) => {
      frame = 0;
      acc += Math.min((now - last) / 1000, 0.05);
      last = now;
      while (acc >= STEP) {
        simulate();
        acc -= STEP;
      }
      render();
      if (!settled() && visible && !document.hidden) frame = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (frame || !visible) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    const local = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      return [event.clientX - rect.left, event.clientY - rect.top];
    };

    const onDown = (event: PointerEvent) => {
      const index = els.indexOf(event.currentTarget as HTMLDivElement);
      if (index < 0 || photos[index].drop < 1) return;
      event.preventDefault();
      (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
      const photo = photos[index];
      const [px, py] = local(event);
      const dx = px - photo.x;
      const dy = py - photo.y;
      drag.index = index;
      drag.ox = dx * Math.cos(-photo.a) - dy * Math.sin(-photo.a);
      drag.oy = dx * Math.sin(-photo.a) + dy * Math.cos(-photo.a);
      drag.px = drag.lx = px;
      drag.py = drag.ly = py;
      drag.lt = performance.now();
      drag.vx = drag.vy = 0;
      photo.vx = photo.vy = photo.va = 0;
      top += 1;
      photo.z = top;
      wake();
    };

    const onMove = (event: PointerEvent) => {
      if (drag.index < 0) return;
      const [px, py] = local(event);
      const now = performance.now();
      const dt = Math.max((now - drag.lt) / 1000, 0.001);
      drag.vx = drag.vx * 0.6 + ((px - drag.lx) / dt) * 0.4;
      drag.vy = drag.vy * 0.6 + ((py - drag.ly) / dt) * 0.4;
      drag.lx = drag.px = px;
      drag.ly = drag.py = py;
      drag.lt = now;
      wake();
    };

    const onUp = () => {
      if (drag.index < 0) return;
      const photo = photos[drag.index];
      const fresh = performance.now() - drag.lt < 80;
      const k = reduce || !fresh ? 0 : THROW;
      const speed = Math.hypot(drag.vx, drag.vy) * k;
      const scale = speed > MAX_SPEED ? MAX_SPEED / speed : 1;
      photo.vx = drag.vx * k * scale;
      photo.vy = drag.vy * k * scale;
      photo.va = 0;
      drag.index = -1;
      wake();
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !started) {
        started = true;
        clock = 0;
      }
      wake();
    });

    const resize = new ResizeObserver(() => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      if (!width || !height) scatter();
      else
        photos.forEach((photo) => {
          photo.x *= w / width;
          photo.y *= h / height;
        });
      width = w;
      height = h;
      photos.forEach(contain);
      render();
      wake();
    });

    const onVisibility = () => wake();

    const pill = pillRef.current;
    const badge = pill?.firstElementChild as HTMLElement | null;
    const cursor = { x: 0, y: 0, cx: 0, cy: 0, frame: 0, shown: false };
    const moveCursor = () => {
      cursor.frame = 0;
      if (!pill) return;
      const k = reduce ? 1 : 0.18;
      cursor.cx += (cursor.x - cursor.cx) * k;
      cursor.cy += (cursor.y - cursor.cy) * k;
      pill.style.transform = `translate3d(${cursor.cx + 6}px, ${cursor.cy + 2}px, 0)`;
      if (Math.abs(cursor.x - cursor.cx) + Math.abs(cursor.y - cursor.cy) > 0.2) cursor.frame = requestAnimationFrame(moveCursor);
    };
    const tilt = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, frame: 0 };
    const tiltTick = () => {
      tilt.frame = 0;
      tilt.vx = (tilt.vx + (tilt.tx - tilt.x) * 0.06) * 0.8;
      tilt.vy = (tilt.vy + (tilt.ty - tilt.y) * 0.06) * 0.8;
      tilt.x += tilt.vx;
      tilt.y += tilt.vy;
      stage.style.setProperty("--tilt-x", `${tilt.y.toFixed(3)}deg`);
      stage.style.setProperty("--tilt-y", `${tilt.x.toFixed(3)}deg`);
      stage.style.setProperty("--glare-x", `${(50 + tilt.x * 3.6).toFixed(2)}%`);
      if (Math.abs(tilt.tx - tilt.x) + Math.abs(tilt.ty - tilt.y) + Math.abs(tilt.vx) + Math.abs(tilt.vy) > 0.01) tilt.frame = requestAnimationFrame(tiltTick);
    };
    const aimTilt = (nx: number, ny: number) => {
      if (reduce) return;
      tilt.tx = nx * 9;
      tilt.ty = -ny * 6;
      if (!tilt.frame) tilt.frame = requestAnimationFrame(tiltTick);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !pill) return;
      const [px, py] = local(event);
      aimTilt((px / Math.max(width, 1)) * 2 - 1, (py / Math.max(height, 1)) * 2 - 1);
      cursor.x = px;
      cursor.y = py;
      if (!cursor.shown) {
        cursor.shown = true;
        cursor.cx = px;
        cursor.cy = py;
        if (badge) badge.dataset.state = "shown";
      }
      if (badge) badge.dataset.drag = drag.index >= 0 ? "true" : "false";
      if (!cursor.frame) cursor.frame = requestAnimationFrame(moveCursor);
    };
    const onPointerLeave = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !pill || drag.index >= 0) return;
      aimTilt(0, 0);
      cursor.shown = false;
      if (badge) badge.dataset.state = "hidden";
    };
    const onPointerRelease = () => {
      if (badge) badge.dataset.drag = "false";
    };

    scatter();
    render();
    observer.observe(stage);
    resize.observe(stage);
    els.forEach((el) => {
      el.addEventListener("pointerdown", onDown);
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("pointercancel", onUp);
    });
    document.addEventListener("visibilitychange", onVisibility);
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerleave", onPointerLeave);
    stage.addEventListener("pointerup", onPointerRelease);

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(cursor.frame);
      cancelAnimationFrame(tilt.frame);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerleave", onPointerLeave);
      stage.removeEventListener("pointerup", onPointerRelease);
      observer.disconnect();
      resize.disconnect();
      els.forEach((el) => {
        el.removeEventListener("pointerdown", onDown);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
        el.removeEventListener("pointercancel", onUp);
      });
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [items.length]);

  return (
    <div ref={stageRef} className={cn("relative w-full h-full overflow-hidden perspective-[1400px]", className)}>
      {items.map((item, index) => (
        <div
          key={index}
          ref={(el) => {
            photoRefs.current[index] = el;
          }}
          style={{
            opacity: 0,
            boxShadow:
              "0 calc(6px + var(--lift, 0) * 26px) calc(14px + var(--lift, 0) * 40px) color-mix(in oklab, black calc(38% - var(--lift, 0) * 10%), transparent)",
          }}
          className={cn(
            "absolute top-0 left-0 flex w-36 sm:w-48 md:w-60 flex-col cursor-grab touch-none select-none will-change-transform active:cursor-grabbing",
            "gap-2 md:gap-2.5 p-2 md:p-2.5 card rounded"
          )}
        >
          <div className="relative aspect-square overflow-hidden rounded">
            {item.videoSrc ? (
              <video src={item.videoSrc} className="h-full w-full object-cover pointer-events-none" autoPlay loop muted playsInline />
            ) : (
              <img src={item.imageSrc} alt="" draggable={false} className="h-full w-full object-cover pointer-events-none" />
            )}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_color-mix(in_oklab,black_14%,transparent),inset_0_2px_6px_color-mix(in_oklab,black_20%,transparent)]" />
          </div>
          {item.title && <p className="px-1 text-sm md:text-base font-medium leading-tight">{item.title}</p>}
          <div
            aria-hidden="true"
            style={{ opacity: "var(--shade, 0.28)" }}
            className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(140%_110%_at_var(--lx,50%)_var(--ly,12%),transparent_40%,color-mix(in_oklab,black_50%,transparent)_100%)]"
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] bg-linear-to-b from-[color-mix(in_oklab,white_12%,transparent)] to-[color-mix(in_oklab,black_8%,transparent)] mix-blend-soft-light" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(60%_80%_at_var(--glare-x,50%)_10%,color-mix(in_oklab,white_22%,transparent),color-mix(in_oklab,white_6%,transparent)_40%,transparent_72%)] mix-blend-soft-light" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_color-mix(in_oklab,white_16%,transparent),inset_0_-1px_0_color-mix(in_oklab,black_25%,transparent)]" />
          <div
            aria-hidden="true"
            style={{ backgroundPosition: "var(--sheen, 50%) 0" }}
            className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(115deg,transparent_38%,color-mix(in_oklab,white_26%,transparent)_48%,color-mix(in_oklab,white_6%,transparent)_53%,transparent_62%)] bg-size-[300%_100%] mix-blend-soft-light"
          />
        </div>
      ))}
      <div ref={pillRef} aria-hidden="true" className="pointer-events-none absolute top-0 left-0 z-[9999] hidden [@media(hover:hover)]:block">
        <div
          data-state="hidden"
          className="-translate-y-full origin-bottom-left rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg transition-[scale,opacity] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] data-[drag=true]:scale-90 data-[state=hidden]:scale-0 data-[state=hidden]:opacity-0 motion-reduce:duration-200 motion-reduce:ease-linear"
        >
          {cursorLabel}
        </div>
      </div>
    </div>
  );
};

export default ThrowablePhotoStack;
