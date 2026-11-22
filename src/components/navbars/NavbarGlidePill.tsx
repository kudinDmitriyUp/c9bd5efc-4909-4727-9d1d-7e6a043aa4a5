"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import DotArrowButton from "@/components/kit/DotArrowButton";
import { introSignal } from "@/components/kit/introSignal";
import useMenuDialog from "@/components/kit/useMenuDialog";

type NavbarGlidePillProps = {
  brand?: string;
  navItems?: { name: string; href: string }[];
  primaryButton?: { text: string; href: string };
  secondaryButton?: { text: string; href: string };
  className?: string;
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function NavbarGlidePill({
  brand = "Halo",
  navItems = [
    { name: "Features", href: "#features" },
    { name: "Plans", href: "#plans" },
    { name: "Pricing", href: "#pricing" },
    { name: "Support", href: "#faq" },
  ],
  primaryButton = { text: "Get started", href: "#contact" },
  secondaryButton,
  className,
}: NavbarGlidePillProps) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  useMenuDialog(open, panelRef, () => setOpen(false));

  useEffect(() => introSignal.onReveal(() => setReady(true)), []);

  const glide = (el: HTMLElement) => {
    const pill = pillRef.current;
    if (!pill) return;
    pill.style.width = `${el.offsetWidth}px`;
    pill.style.transform = `translateX(${el.offsetLeft}px)`;
    pill.style.opacity = "1";
  };
  const hidePill = () => {
    if (pillRef.current) pillRef.current.style.opacity = "0";
  };

  const rise = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: 26 },
    animate: ready || reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 26 },
    transition: { duration: 1, ease: EASE, delay: i * 0.09 + 0.25 },
  });

  return (
    <header className={`fixed inset-x-0 top-0 z-50 text-foreground ${className ?? ""}`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[linear-gradient(180deg,color-mix(in_srgb,var(--background)_55%,transparent),transparent)]" />
      <div ref={panelRef} className="relative mx-auto w-[var(--container)]">
        <div className="grid grid-cols-[1fr_auto] items-center gap-4 py-4 min-[94.5rem]:grid-cols-[1fr_auto_1fr]">
          <motion.a {...rise(0)} href="#home" className="flex items-center gap-2.5 justify-self-start text-[length:var(--text-body-lg)] font-medium tracking-[-0.02em]">
            <svg viewBox="0 0 20 20" aria-hidden="true" className="size-6">
              <path d="M16.2 6.4A7 7 0 1 0 17 10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <p className="whitespace-nowrap">{brand}</p>
          </motion.a>
          <motion.nav
            {...rise(1)}
            aria-label="Main"
            onPointerLeave={hidePill}
            className="relative hidden h-[3.125rem] items-center rounded-full bg-[color-mix(in_srgb,var(--glass-ink,white)_12%,transparent)] px-1 backdrop-blur-[14px] min-[94.5rem]:flex"
          >
            <div
              ref={pillRef}
              aria-hidden="true"
              className="absolute bottom-1 left-0 top-1 w-0 rounded-full bg-[color-mix(in_srgb,var(--glass-ink,white)_12%,transparent)] opacity-0 transition-[transform,width,opacity] duration-[450ms,450ms,300ms] ease-[var(--ease-out)]"
            />
            {navItems.map((item) => (
              <a
                key={item.href + item.name}
                href={item.href}
                onPointerEnter={(e) => glide(e.currentTarget)}
                onFocus={(e) => glide(e.currentTarget)}
                onBlur={hidePill}
                className="relative z-[1] whitespace-nowrap px-4 text-[length:var(--text-body)] tracking-[-0.01em] text-foreground/85 transition-colors duration-300 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
              >
                {item.name}
              </a>
            ))}
          </motion.nav>
          <motion.div {...rise(2)} className="flex items-center gap-3 justify-self-end">
            {secondaryButton && <DotArrowButton text={secondaryButton.text} href={secondaryButton.href} variant="secondary" className="hidden min-[94.5rem]:inline-flex" />}
            <DotArrowButton text={primaryButton.text} href={primaryButton.href} className="hidden lg:inline-flex" />
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="relative flex size-[3.125rem] items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--glass-ink,white)_12%,transparent)] backdrop-blur-[14px] min-[94.5rem]:hidden"
            >
              <div aria-hidden="true" className={`absolute h-px w-3.5 bg-current transition-transform duration-300 ${open ? "rotate-45" : "-translate-y-[3px]"}`} />
              <div aria-hidden="true" className={`absolute h-px w-3.5 bg-current transition-transform duration-300 ${open ? "-rotate-45" : "translate-y-[3px]"}`} />
            </button>
          </motion.div>
        </div>
        <div className={`grid transition-[grid-template-rows] duration-500 ease-[var(--ease-out)] lg:ml-auto lg:w-[22rem] min-[94.5rem]:hidden ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`} inert={!open}>
          <div className="overflow-hidden">
            <nav aria-label="Mobile" className="kit-card flex flex-col p-[1.375rem] lg:p-[1.125rem]">
              {navItems.map((item) => (
                <a key={item.href + item.name} href={item.href} onClick={() => setOpen(false)} className="border-b border-border py-3.5 text-[length:var(--text-h3)] tracking-[-0.035em] lg:py-3 lg:text-[length:var(--text-body-lg)] lg:tracking-[-0.02em]">
                  {item.name}
                </a>
              ))}
              <div className={`mt-5 flex gap-3 ${secondaryButton ? "" : "lg:hidden"}`}>
                {secondaryButton && <DotArrowButton text={secondaryButton.text} href={secondaryButton.href} variant="secondary" onClick={() => setOpen(false)} className="flex-1" />}
                <DotArrowButton text={primaryButton.text} href={primaryButton.href} onClick={() => setOpen(false)} className="flex-1 lg:hidden" />
              </div>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
