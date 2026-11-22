"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { localMediaSrc } from "@/components/kit/mediaSrc";

type FloatingCanPillProps = {
  text?: string;
  href?: string;
  imageSrc?: string;
  imageAlt?: string;
  closeLabel?: string;
};

export default function FloatingCanPill({
  text = "psst… 5% off",
  href = "#subscribe",
  imageSrc = "https://storage.googleapis.com/webild/default/templates/prebiotic-soda/img/weeby-gold-can.webp",
  imageAlt = "Gold can",
  closeLabel = "Hide",
}: FloatingCanPillProps) {
  const reduce = useReducedMotion();
  const [gone, setGone] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const greeted = useRef(false);
  const { scrollY } = useScroll();

  const update = (y: number) => {
    const el = root.current;
    if (!el) return;
    const show = y > window.innerHeight * 0.9;
    el.dataset.in = show ? "true" : "false";
    if (show && !greeted.current) {
      greeted.current = true;
      window.setTimeout(() => {
        if (root.current) root.current.dataset.quiet = "true";
      }, 5000);
    }
  };

  useMotionValueEvent(scrollY, "change", update);
  useEffect(() => update(window.scrollY));

  if (gone) return null;

  return (
    <div
      ref={root}
      data-in="false"
      data-quiet="false"
      className="group/pop pointer-events-none fixed bottom-[14px] right-[14px] z-[900] translate-y-[24px] rotate-[6deg] opacity-0 transition-[opacity,transform] duration-[500ms,700ms] ease-[ease,cubic-bezier(0.2,0.9,0.3,1.2)] data-[in=true]:pointer-events-auto data-[in=true]:translate-y-0 data-[in=true]:rotate-0 data-[in=true]:opacity-100 motion-reduce:translate-y-0 motion-reduce:rotate-0 min-[48rem]:bottom-[22px] min-[48rem]:right-[22px]"
    >
      <a href={href} className="group/can relative block">
        <p className="absolute right-[calc(100%+8px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-accent-foreground px-[10px] pb-[6px] pt-[7px] text-[length:calc(var(--text-label)*0.923)] font-medium leading-none tracking-[0.01em] text-foreground shadow-[0_4px_14px_color-mix(in_srgb,var(--foreground)_12%,transparent)] transition-[opacity,transform] duration-300 group-data-[quiet=true]/pop:translate-x-[6px] group-data-[quiet=true]/pop:opacity-0 group-hover/can:!translate-x-0 group-hover/can:!opacity-100 group-focus-visible/can:!translate-x-0 group-focus-visible/can:!opacity-100">
          {text}
        </p>
        <motion.div animate={reduce ? undefined : { transform: ["translateY(0px)", "translateY(-5px)", "translateY(0px)"] }} transition={{ duration: 4.5, ease: "easeInOut", repeat: Infinity }}>
          <img
            src={localMediaSrc(imageSrc)}
            alt={imageAlt}
            width={163}
            height={240}
            loading="lazy"
            decoding="async"
            className="block h-auto w-[46px] rotate-[10deg] drop-shadow-[0_10px_14px_color-mix(in_srgb,var(--foreground)_25%,transparent)] transition-transform duration-[350ms] ease-[cubic-bezier(0.2,0.9,0.3,1.4)] group-hover/can:rotate-0 group-hover/can:scale-[1.08] group-focus-visible/can:rotate-0 group-focus-visible/can:scale-[1.08] min-[48rem]:w-[58px]"
          />
        </motion.div>
      </a>
      <button
        type="button"
        aria-label={closeLabel}
        onClick={() => setGone(true)}
        className="absolute -right-[6px] -top-[6px] flex size-[18px] items-center justify-center rounded-full bg-foreground text-accent-foreground opacity-0 transition-opacity duration-200 group-hover/pop:opacity-85 focus-visible:opacity-85 [@media(hover:none)]:opacity-70"
      >
        <svg aria-hidden="true" viewBox="0 0 10 10" className="size-[8px]">
          <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
