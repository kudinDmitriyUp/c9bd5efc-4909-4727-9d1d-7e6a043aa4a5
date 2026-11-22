"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

gsap.registerPlugin(ScrollTrigger);

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface SwipeCardDeckProps {
  items?: ({ imageSrc: string; videoSrc?: never } | { videoSrc: string; imageSrc?: never })[];
  className?: string;
}

const DEFAULT_ITEMS: NonNullable<SwipeCardDeckProps["items"]> = [
  { imageSrc: "https://images.pexels.com/photos/39219673/pexels-photo-39219673.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/8436617/pexels-photo-8436617.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/10499488/pexels-photo-10499488.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/20768597/pexels-photo-20768597.jpeg?auto=compress&cs=tinysrgb&w=1200" },
];

type Side = "left" | "right";

const SWIPE_THRESHOLD = 80;

const targetFor = (slot: number) => {
  const depth = Math.min(slot, 2);
  const dir = depth === 0 ? 0 : depth % 2 === 1 ? 1 : -1;
  return { x: dir * 22, y: 0, scale: depth === 0 ? 1 : 0.94, rotation: dir * 1.5 };
};

const SwipeCardDeck = ({ items = DEFAULT_ITEMS, className = "" }: SwipeCardDeckProps) => {
  const total = items.length;
  const [pos, setPos] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const depthZ = useRef<string[]>([]);
  const exits = useRef<(gsap.core.Timeline | null)[]>([]);
  const prevPos = useRef(0);
  const exitSide = useRef<Side>("right");
  const mounted = useRef(false);
  const drag = useRef<{ id: number; startX: number; dx: number } | null>(null);

  useEffect(() => {
    if (!total) return;
    const leaving = prevPos.current;
    const moved = mounted.current && pos !== leaving;
    prevPos.current = pos;
    mounted.current = true;

    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const slot = (((i - pos) % total) + total) % total;
      const target = targetFor(slot);
      const z = String(Math.max(3 - slot, 0));

      el.style.pointerEvents = slot === 0 ? "auto" : "none";
      el.inert = slot !== 0;
      const video = el.querySelector("video");
      if (video) {
        if (slot === 0) void video.play().catch(() => undefined);
        else video.pause();
      }

      depthZ.current[i] = z;
      exits.current[i]?.kill();
      exits.current[i] = null;
      el.style.zIndex = z;

      if (!moved) {
        gsap.set(el, target);
        return;
      }

      if (i === leaving) {
        const exitX = (exitSide.current === "right" ? 1 : -1) * el.getBoundingClientRect().width * 1.15;
        const toDepth = () => {
          el.style.zIndex = depthZ.current[i];
        };
        el.style.zIndex = "4";
        exits.current[i] = gsap
          .timeline({ defaults: { overwrite: "auto" }, onComplete: toDepth, onInterrupt: toDepth })
          .to(el, { x: exitX, rotation: exitX * 0.02, duration: 0.2, ease: "power2.out" })
          .to(el, { ...target, duration: 0.5, ease: "power3.out", onStart: toDepth });
      } else {
        gsap.to(el, { ...target, duration: 0.4, ease: "power3.out", overwrite: "auto" });
      }
    });
  }, [pos, total]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      const cards = cardRefs.current.filter(Boolean).slice().reverse();
      gsap.from(cards, {
        y: 120,
        opacity: 0,
        duration: 1,
        ease: "expo.out",
        stagger: 0.08,
        scrollTrigger: { trigger: wrap, start: "top 80%", once: true },
      });
    }, wrap);
    return () => ctx.revert();
  }, []);

  const advance = (step: 1 | -1, side: Side) => {
    exitSide.current = side;
    setPos((current) => (current + step + total) % total);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    drag.current = { id: event.pointerId, startX: event.clientX, dx: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    state.dx = event.clientX - state.startX;
    gsap.set(event.currentTarget, { x: state.dx, rotation: state.dx * 0.03 });
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    drag.current = null;
    if (!state || state.id !== event.pointerId) return;
    if (state.dx <= -SWIPE_THRESHOLD) advance(1, "left");
    else if (state.dx >= SWIPE_THRESHOLD) advance(-1, "right");
    else gsap.to(event.currentTarget, { ...targetFor(0), duration: 0.4, ease: "power3.out", overwrite: "auto" });
  };

  return (
    <div ref={wrapRef} className={cn("flex flex-col items-center gap-8", className)}>
      <div className="relative w-64 md:w-80 aspect-4/5">
        {items.map((item, index) => (
          <div
            key={index}
            ref={(el) => {
              cardRefs.current[index] = el;
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="absolute inset-0 overflow-hidden rounded card cursor-grab select-none touch-pan-y active:cursor-grabbing will-change-transform"
          >
            {item.videoSrc ? (
              <video src={item.videoSrc} className="w-full h-full object-cover pointer-events-none" loop muted playsInline />
            ) : (
              <img src={item.imageSrc} alt="" draggable={false} className="w-full h-full object-cover pointer-events-none" />
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Previous card"
          onClick={() => advance(-1, "right")}
          className="flex items-center justify-center size-9 cursor-pointer rounded btn-primary bg-primary text-primary-foreground"
        >
          <ArrowLeft className="size-4 text-primary-foreground" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          aria-label="Next card"
          onClick={() => advance(1, "left")}
          className="flex items-center justify-center size-9 cursor-pointer rounded btn-primary bg-primary text-primary-foreground"
        >
          <ArrowRight className="size-4 text-primary-foreground" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};

export default SwipeCardDeck;
