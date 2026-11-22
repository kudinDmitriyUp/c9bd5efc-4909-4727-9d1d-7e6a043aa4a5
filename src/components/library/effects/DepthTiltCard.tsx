"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Media from "@/components/kit/Media";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type TiltImage = string | { imageSrc: string; imageAlt?: string };

interface DepthTiltCardProps {
  images?: TiltImage[];
  maxTilt?: number;
  className?: string;
  children?: ReactNode;
}

const DEFAULT_IMAGES: TiltImage[] = [1179863, 10499488, 3184465, 1640777, 2079249, 323780].map(
  (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200`,
);

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

const DepthTiltCard = ({ images = DEFAULT_IMAGES, maxTilt = 10, className, children }: DepthTiltCardProps) => {
  const wrap = children !== undefined;
  const reduce = useReducedMotion() ?? false;
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduce || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let centers: { x: number; y: number }[] = [];
    let state: { x: number; y: number }[] = [];
    let pointer: { x: number; y: number } | null = null;
    let inView = false;
    let frame = 0;

    const measure = () => {
      centers = cardRefs.current.map((el) => {
        if (!el) return { x: 0, y: 0 };
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2 + window.scrollX, y: r.top + r.height / 2 + window.scrollY };
      });
      state = centers.map((_, i) => state[i] ?? { x: 0, y: 0 });
    };

    const tick = () => {
      frame = 0;
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      let moving = false;
      centers.forEach((c, i) => {
        const tx = pointer && inView ? clamp((pointer.x - c.x) / halfW) : 0;
        const ty = pointer && inView ? clamp((pointer.y - c.y) / halfH) : 0;
        const s = state[i];
        s.x += (tx - s.x) * 0.08;
        s.y += (ty - s.y) * 0.08;
        if (Math.abs(tx - s.x) > 0.001 || Math.abs(ty - s.y) > 0.001) moving = true;
        const card = cardRefs.current[i];
        const img = imgRefs.current[i];
        if (card) card.style.transform = `perspective(900px) rotateX(${-s.y * maxTilt}deg) rotateY(${s.x * maxTilt}deg)`;
        if (img) img.style.transform = `translate3d(${-s.x * 16}px, ${-s.y * 16}px, 0) scale(1.1)`;
      });
      if (moving) frame = requestAnimationFrame(tick);
    };

    const kick = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointer = { x: event.clientX + window.scrollX, y: event.clientY + window.scrollY };
      kick();
    };

    const onLeave = () => {
      pointer = null;
      kick();
    };

    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      kick();
    });
    const ro = new ResizeObserver(measure);

    measure();
    io.observe(root);
    ro.observe(root);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);

    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, [reduce, maxTilt, images.length, wrap]);

  if (wrap) {
    return (
      <div ref={rootRef} className={className}>
        <div
          ref={(el) => {
            cardRefs.current = [el];
            imgRefs.current = [];
          }}
          className="size-full will-change-transform"
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={cn("mx-auto grid w-full max-w-[80rem] grid-cols-2 gap-3 px-4 md:grid-cols-3 md:gap-6 md:px-6", className)}>
      {images.map((image, i) => {
        const imageSrc = typeof image === "string" ? image : image.imageSrc;
        const imageAlt = typeof image === "string" ? "" : (image.imageAlt ?? "");
        return (
          <div
            key={i}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            className="relative aspect-[4/5] w-full overflow-hidden rounded-[var(--radius,1rem)] bg-muted will-change-transform"
          >
            <Media
              ref={(el) => {
                imgRefs.current[i] = el;
              }}
              src={imageSrc}
              alt={imageAlt}
              decoding="async"
              draggable={false}
              className="absolute inset-0 size-full scale-110 object-cover will-change-transform"
            />
          </div>
        );
      })}
    </div>
  );
};

export default DepthTiltCard;
