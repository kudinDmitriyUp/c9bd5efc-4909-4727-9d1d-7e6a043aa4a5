"use client";

import { useEffect, useImperativeHandle, useRef, type ReactNode, type Ref } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type Shape = "rect" | "ribbon" | "circle" | "star";

export type ConfettiBurstHandle = {
  burst: (x?: number, y?: number) => void;
};

interface ConfettiBurstProps {
  children?: ReactNode;
  as?: "div" | "span";
  trigger?: "click" | "hover" | "view" | "all";
  count?: number;
  spread?: number;
  power?: number;
  shapes?: Shape[];
  colors?: string[];
  className?: string;
  ref?: Ref<ConfettiBurstHandle>;
}

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  flip: number;
  flipSpeed: number;
  wobble: number;
  wobbleSpeed: number;
  drag: number;
  size: number;
  shape: Shape;
  color: string;
  age: number;
  life: number;
};

const GRAVITY = 1100;
const FADE = 0.6;
const DEFAULT_SHAPES: Shape[] = ["rect", "ribbon", "circle", "star"];
const DEFAULT_COLORS = ["primary", "accent", "foreground", "card-foreground"];

const star = (() => {
  const path = typeof Path2D === "undefined" ? null : new Path2D();
  if (!path) return null;
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 1 : 0.45;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    if (i === 0) path.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else path.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  path.closePath();
  return path;
})();

const overlay: { canvas: HTMLCanvasElement | null; ctx: CanvasRenderingContext2D | null; pieces: Piece[]; frame: number; last: number } = {
  canvas: null,
  ctx: null,
  pieces: [],
  frame: 0,
  last: 0,
};

const fit = () => {
  const canvas = overlay.canvas;
  if (!canvas) return 1;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(window.innerWidth * dpr);
  const h = Math.round(window.innerHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return dpr;
};

const teardown = () => {
  cancelAnimationFrame(overlay.frame);
  overlay.canvas?.remove();
  overlay.canvas = null;
  overlay.ctx = null;
  overlay.pieces = [];
  overlay.frame = 0;
  overlay.last = 0;
};

const draw = (piece: Piece, ctx: CanvasRenderingContext2D, dpr: number) => {
  const fade = Math.min(1, (piece.life - piece.age) / FADE);
  const flip = Math.cos(piece.flip);
  const sway = Math.sin(piece.wobble) * piece.size * 0.6;
  ctx.globalAlpha = Math.max(fade, 0);
  ctx.fillStyle = piece.color;
  ctx.setTransform(dpr, 0, 0, dpr, (piece.x + sway) * dpr, piece.y * dpr);
  ctx.rotate(piece.rotation);
  ctx.scale(1, Math.abs(flip) < 0.08 ? 0.08 : flip);
  const s = piece.size;
  if (piece.shape === "rect") ctx.fillRect(-s * 0.6, -s * 0.4, s * 1.2, s * 0.8);
  else if (piece.shape === "ribbon") ctx.fillRect(-s * 0.2, -s * 1.1, s * 0.4, s * 2.2);
  else if (piece.shape === "circle") {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else if (star) {
    ctx.scale(s * 0.7, s * 0.7);
    ctx.fill(star);
  }
};

const tick = (now: number) => {
  overlay.frame = 0;
  const ctx = overlay.ctx;
  if (!ctx) return;
  const dt = Math.min((now - (overlay.last || now)) / 1000, 1 / 30);
  overlay.last = now;
  const dpr = fit();
  const height = window.innerHeight;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, overlay.canvas!.width, overlay.canvas!.height);
  overlay.pieces = overlay.pieces.filter((piece) => {
    piece.age += dt;
    const drag = Math.exp(-piece.drag * dt);
    piece.vx *= drag;
    piece.vy = piece.vy * drag + GRAVITY * dt;
    piece.x += piece.vx * dt;
    piece.y += piece.vy * dt;
    piece.rotation += piece.spin * dt;
    piece.flip += piece.flipSpeed * dt;
    piece.wobble += piece.wobbleSpeed * dt;
    if (piece.age >= piece.life || piece.y - piece.size * 2 > height) return false;
    draw(piece, ctx, dpr);
    return true;
  });
  ctx.globalAlpha = 1;
  if (overlay.pieces.length) overlay.frame = requestAnimationFrame(tick);
  else teardown();
};

const launch = (pieces: Piece[]) => {
  if (!overlay.canvas) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "1000" });
    document.body.appendChild(canvas);
    overlay.canvas = canvas;
    overlay.ctx = ctx;
  }
  overlay.pieces.push(...pieces);
  if (!overlay.frame) overlay.frame = requestAnimationFrame(tick);
};

const DEFAULT_CHILDREN = (
  <div className="bg-card text-foreground rounded-theme p-6 cursor-pointer">
    <h3 className="text-xl font-medium">Design that ships</h3>
    <p className="text-sm opacity-70">Click for confetti</p>
  </div>
);

const ConfettiBurst = ({
  children = DEFAULT_CHILDREN,
  as: Tag = "div",
  trigger = "click",
  count = 90,
  spread = 90,
  power = 1,
  shapes = DEFAULT_SHAPES,
  colors = DEFAULT_COLORS,
  className = "",
  ref,
}: ConfettiBurstProps) => {
  const wrapRef = useRef<HTMLElement>(null);
  const optionsRef = useRef({ count, spread, power, shapes, colors });

  useEffect(() => {
    optionsRef.current = { count, spread, power, shapes, colors };
  });

  const burstRef = useRef((x?: number, y?: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const originX = x ?? rect.left + rect.width / 2;
    const originY = y ?? rect.top + rect.height / 2;
    const { count, spread, power, shapes, colors } = optionsRef.current;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const style = getComputedStyle(document.documentElement);
    const palette = colors.map((name) => style.getPropertyValue(`--color-${name}`).trim()).filter(Boolean);
    const kinds = shapes.length ? shapes : DEFAULT_SHAPES;
    if (!palette.length) return;
    const amount = calm ? Math.min(count, 14) : count;
    const force = (calm ? 0.35 : 1) * power;
    const cone = (spread * Math.PI) / 180;
    launch(
      Array.from({ length: amount }, () => {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * cone;
        const speed = (420 + Math.random() * 620) * force;
        const shape = kinds[Math.floor(Math.random() * kinds.length)];
        return {
          x: originX + (Math.random() - 0.5) * 12,
          y: originY + (Math.random() - 0.5) * 12,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          rotation: Math.random() * Math.PI * 2,
          spin: calm ? 0 : (Math.random() - 0.5) * 14,
          flip: Math.random() * Math.PI * 2,
          flipSpeed: calm ? 0 : 4 + Math.random() * 8,
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: calm ? 0 : 3 + Math.random() * 6,
          drag: shape === "ribbon" ? 2.6 : shape === "circle" ? 1.4 : 2 + Math.random(),
          size: 5 + Math.random() * 7,
          shape,
          color: palette[Math.floor(Math.random() * palette.length)],
          age: 0,
          life: (calm ? 1.1 : 2.4) + Math.random() * 1.4,
        };
      })
    );
  });

  useImperativeHandle(ref, () => ({ burst: (x, y) => burstRef.current(x, y) }), []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fire = burstRef.current;
    const onClick = (event: MouseEvent) => (event.detail === 0 ? fire() : fire(event.clientX, event.clientY));
    let lastHover = 0;
    const onEnter = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || performance.now() - lastHover < 700) return;
      lastHover = performance.now();
      fire(event.clientX, event.clientY);
    };
    const useClick = trigger === "click" || trigger === "all";
    const useHover = trigger === "hover" || trigger === "all";
    const useView = trigger === "view" || trigger === "all";
    if (useClick) el.addEventListener("click", onClick);
    if (useHover) el.addEventListener("pointerenter", onEnter);
    let seen = false;
    const observer = useView
      ? new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting && !seen) {
              seen = true;
              fire();
            }
          },
          { threshold: 0.6 }
        )
      : null;
    observer?.observe(el);
    return () => {
      el.removeEventListener("click", onClick);
      el.removeEventListener("pointerenter", onEnter);
      observer?.disconnect();
    };
  }, [trigger]);

  return (
    <Tag
      ref={(el: HTMLElement | null) => {
        wrapRef.current = el;
      }}
      className={cn(Tag === "span" ? "inline-block" : "block", className)}>
      {children}
    </Tag>
  );
};

export default ConfettiBurst;
