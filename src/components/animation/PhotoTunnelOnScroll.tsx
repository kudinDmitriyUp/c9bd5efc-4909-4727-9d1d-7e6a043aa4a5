"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

gsap.registerPlugin(ScrollTrigger);

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const GAP = 260;
const FADE_IN = 5200;
const PASS = 700;
const RATE = 4;

interface PhotoTunnelOnScrollProps {
  items?: ({ imageSrc: string; videoSrc?: never } | { videoSrc: string; imageSrc?: never })[];
  titles?: string[];
  className?: string;
  titleClassName?: string;
  photoClassName?: string;
  children?: React.ReactNode;
}

const DEFAULT_TITLES = ["Built for the long run", "Made by hand", "Shaped by every season", "Ready when you are"];

const DEFAULT_ITEMS: NonNullable<PhotoTunnelOnScrollProps["items"]> = [
  { imageSrc: "https://images.pexels.com/photos/39219673/pexels-photo-39219673.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/8436617/pexels-photo-8436617.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/10499488/pexels-photo-10499488.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/20768597/pexels-photo-20768597.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/38975946/pexels-photo-38975946.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/4129384/pexels-photo-4129384.jpeg?auto=compress&cs=tinysrgb&w=1200" },
];

const PhotoTunnelOnScroll = ({ items = DEFAULT_ITEMS, titles = DEFAULT_TITLES, className = "", titleClassName, photoClassName, children }: PhotoTunnelOnScrollProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(36);
  const [step, setStep] = useState(0);
  const steps = titles.length;
  const words = (titles[Math.min(step, steps - 1)] ?? "").split(" ");

  useEffect(() => {
    const onResize = () => setCount(window.innerWidth < 768 ? 20 : 36);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    if (!wrap || !stage || !items.length) return;

    const ctx = gsap.context(() => {
      const photos = Array.from(stage.children) as HTMLElement[];
      const travel = GAP * (photos.length + 1);
      const isMobile = window.innerWidth < 768;
      const spreadX = window.innerWidth * (isMobile ? 0.42 : 0.4);
      const spreadY = window.innerHeight * (isMobile ? 0.36 : 0.36);
      const state = { progress: 0 };
      let pin: [number, number] = [0.25, 0.75];
      const layout = photos.map((_, index) => {
        const angle = index * 2.39996 + 0.6;
        const ring = 0.7 + ((index * 7) % 5) / 12;
        return { x: Math.cos(angle) * spreadX * ring, y: Math.sin(angle) * spreadY * ring, z: -GAP * (index + 1) };
      });

      const render = () => {
        const camera = state.progress * travel - GAP;
        photos.forEach((photo, index) => {
          const { x, y, z } = layout[index];
          const current = z + camera;
          const appear = gsap.utils.clamp(0, 1, (current + FADE_IN) / (FADE_IN * 0.5));
          const pass = gsap.utils.clamp(0, 1, (PASS - current) / PASS);
          const drift = 1 + gsap.utils.clamp(0, 1, (current + GAP * 2) / (GAP * 2 + PASS)) * 0.6;
          gsap.set(photo, {
            x: x * drift,
            y: y * drift,
            z: current,
            opacity: appear * appear * pass,
            visibility: current > PASS ? "hidden" : "visible",
          });
        });
        const through = gsap.utils.clamp(0, 0.999, (state.progress - pin[0]) / (pin[1] - pin[0]));
        setStep(Math.floor(through * steps));
      };

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        state.progress = 0.3;
        render();
        setStep(0);
        return;
      }

      render();

      gsap.to(state, {
        progress: 1,
        ease: "none",
        onUpdate: render,
        scrollTrigger: {
          trigger: wrap,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
          onRefresh: (self) => {
            const total = self.end - self.start;
            const view = window.innerHeight;
            const pinned = total - view * 2;
            pin = [view / total, (view + pinned) / total];
            render();
          },
        },
      });
    }, wrap);

    return () => ctx.revert();
  }, [items, count, steps]);

  const photos = Array.from({ length: count }, (_, index) => items[index % items.length]);

  return (
    <div
      ref={wrapRef}
      style={{ "--tunnel": `${(GAP * (count + 1)) / RATE}px` } as React.CSSProperties}
      className={cn("relative h-[max(150svh,calc(var(--tunnel)_-_100svh))] motion-reduce:h-svh", className)}
    >
      <div className="sticky top-0 flex h-svh w-full items-center justify-center overflow-hidden perspective-[1000px] mask-[linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]">
        <div ref={stageRef} aria-hidden="true" className="absolute inset-0 flex items-center justify-center transform-3d">
          {photos.map((item, index) => (
            <div
              key={index}
              className={cn("absolute w-[30vw] md:w-[13vw] aspect-4/5 overflow-hidden rounded bg-card opacity-0 will-change-transform", photoClassName)}
            >
              {item.videoSrc ? (
                <video src={item.videoSrc} className="h-full w-full object-cover" autoPlay loop muted playsInline />
              ) : (
                <img src={item.imageSrc} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              )}
            </div>
          ))}
        </div>
        {steps > 0 && (
          <div role="heading" aria-level={2} aria-label={titles[Math.min(step, steps - 1)]} className={cn("relative z-10 max-w-4xl px-6 text-center text-5xl md:text-7xl font-medium leading-[1.1] tracking-tight text-balance", titleClassName)}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={step} aria-hidden="true" initial="enter" animate="show" exit="leave">
                {words.map((word, index) => (
                  <Fragment key={index}>
                    <div className="inline-block overflow-hidden whitespace-nowrap pb-[0.15em] -mb-[0.15em] align-top">
                      <motion.div
                        variants={{ enter: { y: "110%" }, show: { y: "0%" }, leave: { y: "-110%" } }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: index * 0.05 }}
                        className="inline-block will-change-transform"
                      >
                        {word}
                      </motion.div>
                    </div>
                    {index < words.length - 1 && " "}
                  </Fragment>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
        {children}
        <div aria-hidden="true" className="absolute inset-x-0 top-0 z-20 h-1/5 backdrop-blur-md pointer-events-none mask-[linear-gradient(to_bottom,black,transparent)]" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-20 h-1/5 backdrop-blur-md pointer-events-none mask-[linear-gradient(to_top,black,transparent)]" />
      </div>
    </div>
  );
};

export default PhotoTunnelOnScroll;
