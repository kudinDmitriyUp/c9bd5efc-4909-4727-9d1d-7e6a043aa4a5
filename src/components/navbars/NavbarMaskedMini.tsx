"use client";

import { useLayoutEffect, useRef, useState } from "react";
import useMenuDialog from "@/components/kit/useMenuDialog";
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import ButtonRollDot from "@/components/buttons/ButtonRollDot";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const easeSecondary = [0.16, 1, 0.35, 1] as const;
const easeMenu = [0.7, 0, 0.22, 1] as const;

interface NavbarMaskedMiniProps {
  brand: string;
  navItems: { name: string; href: string }[];
  cta?: { text: string; href: string };
  menuText?: string;
  closeText?: string;
  introDelay?: number;
  className?: string;
}

const NavbarMaskedMini = ({
  brand,
  navItems,
  cta,
  menuText = "Menu",
  closeText = "Close",
  introDelay = 0,
  className = "",
}: NavbarMaskedMiniProps) => {
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (v) => setShow(v > 500));

  useLayoutEffect(() => {
    const row = rowRef.current;
    const list = listRef.current;
    const ctaBox = ctaRef.current;
    if (!row || !list || !ctaBox) return;
    const wide = window.matchMedia("(min-width: 768px)");
    const measure = () => {
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      const need = list.offsetWidth + gap + ctaBox.offsetWidth;
      setCompact(!wide.matches || need > row.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    ro.observe(list);
    ro.observe(ctaBox);
    wide.addEventListener("change", measure);
    let alive = true;
    document.fonts?.ready.then(() => alive && measure());
    return () => {
      alive = false;
      ro.disconnect();
      wide.removeEventListener("change", measure);
    };
  }, []);

  useMenuDialog(open, panelRef, () => setOpen(false));

  const rise = (from: string, delay: number) =>
    reduce
      ? {}
      : {
          initial: { y: from },
          animate: { y: "0%" },
          transition: { duration: 1, ease: easeSecondary, delay: introDelay + delay },
        };

  const miniItems = [
    <button
      key="menu"
      type="button"
      onClick={() => setOpen(true)}
      aria-expanded={open}
      className="grid place-items-center h-12 min-w-12 px-3 rounded-full bg-secondary text-secondary-foreground text-sm uppercase font-[650] leading-none cursor-pointer"
    >
      {menuText}
    </button>,
    cta ? <ButtonRollDot key="cta" text={cta.text} href={cta.href} className="hidden h-12 py-0 lg:inline-flex [&_p]:-mt-[0.08em]" /> : null,
  ];

  return (
    <>
      <nav aria-label="Main" className={cn("absolute inset-x-0 top-0 z-20 px-[var(--site-margin)] pt-[calc(var(--site-margin)*0.9)] text-primary-foreground", className)}>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-2 gap-x-[var(--grid-gap)] items-center">
          <div className="overflow-hidden min-w-0">
            <motion.a href="/" {...rise("120%", 0.1)} className="block w-fit max-w-full truncate text-[calc(var(--h4)*1.35)] leading-[1.1] tracking-[-0.04em]">
              {brand}
            </motion.a>
          </div>
          <div ref={rowRef} className="relative flex min-w-0 items-center justify-end lg:justify-between gap-x-[var(--grid-gap)]">
            <ul ref={listRef} className={cn("flex w-max shrink-0 gap-x-[0.5em] text-sm uppercase font-[650] leading-none", compact && "invisible absolute right-0")}>
              {navItems.map((item, i) => (
                <li key={item.name} className="shrink-0 overflow-hidden pb-[0.15em] -mb-[0.15em]">
                  <motion.a href={item.href} {...rise("200%", 0.2 + i * 0.0625)} className="block whitespace-nowrap hover:opacity-70 transition-opacity">
                    {item.name}
                    {i < navItems.length - 1 ? "," : ""}
                  </motion.a>
                </li>
              ))}
            </ul>
            <div ref={ctaRef} className={cn("w-max shrink-0 overflow-hidden", compact && "invisible absolute right-0")}>
              {cta && (
                <motion.div {...rise("120%", 0.39)}>
                  <ButtonRollDot text={cta.text} href={cta.href} className="h-12 py-0 [&_p]:-mt-[0.08em]" />
                </motion.div>
              )}
            </div>
            <div className={cn("ml-auto shrink-0 overflow-hidden", !compact && "invisible absolute right-0")}>
              <motion.div {...rise("120%", 0.39)}>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  aria-expanded={open}
                  className="grid place-items-center h-12 min-w-12 px-3 rounded-full bg-secondary text-secondary-foreground text-sm uppercase font-[650] leading-none cursor-pointer"
                >
                  {menuText}
                </button>
              </motion.div>
            </div>
          </div>
        </div>
      </nav>

      <div className="fixed top-[calc(var(--site-margin)*0.9)] right-[var(--site-margin)] z-[60] flex flex-row-reverse items-center gap-2 pointer-events-none">
        {miniItems.map((item, i) =>
          item ? (
            <div key={i} className={cn("overflow-hidden", i === 1 && "hidden lg:block")}>
              <motion.div
                initial={false}
                animate={{ y: show ? "0%" : "102%" }}
                transition={{ duration: 0.875, ease: easeSecondary, delay: show ? i * 0.1 : i * 0.05 }}
                inert={!show}
                className={cn(show && "pointer-events-auto")}
              >
                {item}
              </motion.div>
            </div>
          ) : null
        )}
      </div>

      <motion.div
        ref={panelRef}
        data-lenis-prevent
        role="dialog"
        aria-modal="true"
        aria-label={menuText}
        inert={!open}
        initial={false}
        animate={{ clipPath: open ? "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" : "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)" }}
        transition={{ duration: open ? 1 : 0.5, ease: easeMenu }}
        className={cn("fixed inset-0 z-[70] flex flex-col h-svh bg-foreground text-background", open ? "pointer-events-auto" : "pointer-events-none")}
      >
        <div className="flex items-center justify-between gap-4 px-[var(--site-margin)] pt-[calc(var(--site-margin)*0.9)]">
          <p className="truncate text-[calc(var(--h4)*1.35)] leading-[1.1] tracking-[-0.04em]">{brand}</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            tabIndex={open ? 0 : -1}
            className="grid place-items-center h-12 min-w-12 px-3 rounded-full bg-secondary text-secondary-foreground text-sm uppercase font-[650] leading-none cursor-pointer"
          >
            {closeText}
          </button>
        </div>
        <ul className="flex flex-col justify-end flex-1 gap-1 px-[var(--site-margin)] pb-[calc(var(--site-margin)*2)]">
          {navItems.map((item, i) => (
            <li key={item.name} className="overflow-hidden">
              <motion.a
                href={item.href}
                tabIndex={open ? 0 : -1}
                onClick={() => setOpen(false)}
                initial={false}
                animate={{ y: open ? "0%" : "102%" }}
                transition={open ? { duration: 1.15, ease: easeSecondary, delay: 0.55 + i * 0.0425 } : { duration: 0, delay: 0.5 }}
                className="block w-fit text-[clamp(2.5rem,1.6rem+3.1vw,4.5rem)] uppercase leading-[1] tracking-[-0.03em] hover:opacity-60 transition-opacity"
              >
                {item.name}
              </motion.a>
            </li>
          ))}
        </ul>
      </motion.div>
    </>
  );
};

export default NavbarMaskedMini;
