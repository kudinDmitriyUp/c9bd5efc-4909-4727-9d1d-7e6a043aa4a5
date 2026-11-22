"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useMotionValue, useMotionTemplate } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const randomChars = () => Array.from({ length: 1500 }, () => CHARS[Math.floor(Math.random() * 62)]).join("");

interface LetterSpotlightCardProps {
  children?: React.ReactNode;
  className?: string;
}

const DEFAULT_CHILDREN = (
  <div className="bg-card text-foreground rounded-theme p-6">
    <h3 className="text-xl font-semibold">Design that ships</h3>
    <p className="text-sm">Built for the long run.</p>
  </div>
);

const LetterSpotlightCard = ({ children = DEFAULT_CHILDREN, className = "" }: LetterSpotlightCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [chars, setChars] = useState(randomChars);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!isMobile || !el) return;
    let frame = 0;
    let lastY = -Infinity;

    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const progress = Math.min(Math.max((window.innerHeight - rect.top) / (window.innerHeight + rect.height), 0), 1);
      const spotY = rect.height * progress;
      x.set(rect.width / 2);
      y.set(spotY);
      if (Math.abs(spotY - lastY) > 24) {
        lastY = spotY;
        setChars(randomChars());
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [isMobile, x, y]);

  const mask = useMotionTemplate`radial-gradient(${isMobile ? 200 : 250}px at ${x}px ${y}px, white, transparent)`;
  const base = "absolute inset-0 rounded-[inherit] transition-opacity duration-300";

  return (
    <div
      ref={ref}
      className={cn("group/pattern relative rounded-lg", className)}
      onMouseMove={isMobile ? undefined : (e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        x.set(e.clientX - rect.left);
        y.set(e.clientY - rect.top);
        setChars(randomChars());
      }}
    >
      {children}
      <div className="pointer-events-none absolute inset-0 rounded-[inherit]">
        <div className={cn(base, isMobile ? "opacity-25" : "opacity-0 group-hover/pattern:opacity-25")} style={{ background: "linear-gradient(var(--foreground), transparent)" }} />
        <motion.div className={cn(base, "bg-linear-to-r from-accent to-accent/50 backdrop-blur-xl", isMobile ? "opacity-100" : "opacity-0 group-hover/pattern:opacity-100")} style={{ maskImage: mask, WebkitMaskImage: mask }} />
        <motion.div className={cn(base, "mix-blend-overlay", isMobile ? "opacity-100" : "opacity-0 group-hover/pattern:opacity-100")} style={{ maskImage: mask, WebkitMaskImage: mask }}>
          <p className="absolute inset-0 h-full whitespace-pre-wrap wrap-break-word font-mono text-xs font-bold text-foreground">{chars}</p>
        </motion.div>
      </div>
    </div>
  );
};

export default LetterSpotlightCard;
