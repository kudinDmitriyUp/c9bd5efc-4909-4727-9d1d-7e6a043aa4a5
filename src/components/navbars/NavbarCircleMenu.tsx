"use client";

import { useEffect, useRef, useState } from "react";
import { motion, animate, useMotionValue, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const expoOut = [0.16, 1, 0.3, 1] as const;

type NavbarCircleMenuProps = {
  brand: string;
  logoSrc?: string;
  navItems: { name: string; href: string }[];
  cta?: { text: string; href: string };
  className?: string;
};

const NavbarCircleMenu = ({ brand, logoSrc, navItems, cta, className = "" }: NavbarCircleMenuProps) => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<number | null>(null);
  const [ctaHover, setCtaHover] = useState(false);
  const reduce = useReducedMotion();
  const [overDark, setOverDark] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const brandRef = useRef<HTMLAnchorElement>(null);
  const bgX = useMotionValue("0%");
  const bgY = useMotionValue("0%");
  const bgScale = useMotionValue(1);
  const linesX = useMotionValue("0%");
  const linesY = useMotionValue("0%");
  const linesScale = useMotionValue(1);

  useEffect(() => {
    let frame = 0;
    let timer = 0;
    let last = 0;
    const run = () => {
      last = performance.now();
      update();
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame((now) => {
        frame = 0;
        window.clearTimeout(timer);
        if (now - last < 100) {
          timer = window.setTimeout(run, 100);
          return;
        }
        run();
      });
    };
    const update = () => {
      setScrolled(window.scrollY > 10);
      const brandEl = brandRef.current;
      if (!brandEl) return;
      const rect = brandEl.getBoundingClientRect();
      const under = document
        .elementsFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
        .filter((el) => !brandEl.contains(el));
      const luma = (color: string) => {
        const rgb = color.match(/[\d.]+/g)?.map(Number) ?? [];
        return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
      };
      const page = getComputedStyle(document.body);
      const ink = luma(page.color);
      const paper = luma(page.backgroundColor);
      for (const el of under) {
        const rgb = getComputedStyle(el).backgroundColor.match(/[\d.]+/g)?.map(Number);
        if (!rgb || rgb.length < 3 || (rgb.length > 3 && rgb[3] < 0.9)) continue;
        const surface = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
        setOverDark(Math.abs(surface - ink) < Math.abs(surface - paper));
        return;
      }
      setOverDark(false);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const prev = { gutter: root.style.scrollbarGutter, overflow: root.style.overflow };
    root.style.scrollbarGutter = "stable";
    root.style.overflow = "hidden";
    return () => {
      root.style.scrollbarGutter = prev.gutter;
      root.style.overflow = prev.overflow;
    };
  }, [open]);

  const onBurgerMove = (e: React.MouseEvent) => {
    if (reduce || !burgerRef.current) return;
    const rect = burgerRef.current.getBoundingClientRect();
    const rx = (e.clientX - rect.left) / rect.width - 0.5;
    const ry = (e.clientY - rect.top) / rect.height - 0.5;
    const t = { duration: 1, ease: expoOut };
    animate(bgX, `${23 * rx}%`, t);
    animate(bgY, `${23 * ry}%`, t);
    animate(linesX, `${23 * 1.6 * rx}%`, t);
    animate(linesY, `${23 * 1.6 * ry}%`, t);
  };

  const onBurgerEnter = () => {
    if (reduce) return;
    const t = { duration: 0.7, ease: expoOut };
    animate(bgScale, 1.4, t);
    animate(linesScale, 1.1, t);
  };

  const onBurgerLeave = () => {
    const t = { duration: 0.7, ease: expoOut };
    animate(bgX, "0%", t);
    animate(bgY, "0%", t);
    animate(linesX, "0%", t);
    animate(linesY, "0%", t);
    animate(bgScale, 1, t);
    animate(linesScale, 1, t);
  };

  return (
    <>
    <a
      ref={brandRef}
      href="/"
      aria-label={brand}
      className={cn(
        "fixed z-1001 left-[8.333vw] top-[calc(var(--u)*2.475)] -translate-y-1/2 flex items-center max-w-[45vw] md:max-w-[calc(100vw-8.333vw*2-var(--u)*12)] transition-colors duration-300",
        overDark && !open ? "text-background" : "text-foreground"
      )}
    >
      {logoSrc && (
        <motion.img
          src={logoSrc}
          alt=""
          animate={{ scale: scrolled ? 0 : 1 }}
          transition={{ duration: 0.4, ease: [0.55, 0.085, 0.68, 0.53] }}
          className="size-[calc(var(--u)*1.2)] mr-[calc(var(--u)*0.35)] object-contain"
        />
      )}
      <motion.div
        animate={{ x: scrolled && logoSrc ? "-1.5em" : "0em", scale: scrolled ? 0.85 : 1 }}
        transition={{ duration: 0.4, ease: [0.55, 0.085, 0.68, 0.53] }}
        className="min-w-0 origin-left"
      >
        <p className="truncate whitespace-nowrap text-[calc(var(--u)*0.63)] font-medium leading-[1.2]">{brand}</p>
      </motion.div>
    </a>
    <nav aria-label="Main" className={cn("fixed inset-x-0 top-0 z-1000 pointer-events-none", className)}>
      <motion.div
        data-lenis-prevent
        aria-hidden={!open}
        initial={false}
        animate={{ opacity: open ? 1 : 0 }}
        transition={{ duration: 0.5 }}
        onClick={() => setOpen(false)}
        className={cn("fixed inset-0 bg-foreground/60", open ? "pointer-events-auto" : "pointer-events-none")}
      />
      <motion.div
        initial={false}
        data-lenis-prevent
        animate={{ clipPath: open ? "inset(0% 0% 0% 0%)" : "inset(0% 0% 0% 100%)" }}
        transition={{ duration: 0.5, ease: expoOut }}
        className="fixed top-0 right-0 h-svh w-screen bg-background pointer-events-auto md:w-[calc(var(--u)*22)]"
      >
        <div className="flex flex-col justify-center gap-[calc(var(--u)*0.4)] h-full w-full px-[8.333vw] md:px-[calc(var(--u)*2.5)]">
          {navItems.map((item, index) => (
            <motion.a
              key={item.name}
              href={item.href}
              tabIndex={open ? 0 : -1}
              onClick={() => setOpen(false)}
              onMouseEnter={() => setHoveredLink(index)}
              onMouseLeave={() => setHoveredLink(null)}
              initial={false}
              animate={{ opacity: open ? (hoveredLink === null || hoveredLink === index ? 1 : 0.4) : 0 }}
              transition={{ duration: 0.5, ease: expoOut, delay: open && hoveredLink === null ? 0.1 + index * 0.04 : 0 }}
              className="relative block h-[1.2em] overflow-hidden text-[calc(var(--u)*1.6)] leading-[1.2] text-foreground"
            >
              <motion.p
                animate={{ y: hoveredLink === index ? "-100%" : "0%" }}
                transition={{ duration: 0.6, ease: expoOut }}
                className="whitespace-nowrap"
              >
                {item.name}
              </motion.p>
              <motion.p
                aria-hidden="true"
                animate={{ y: hoveredLink === index ? "-100%" : "0%" }}
                transition={{ duration: 0.6, ease: expoOut }}
                className="whitespace-nowrap"
              >
                {item.name}
              </motion.p>
            </motion.a>
          ))}
        </div>
      </motion.div>

      <div className="relative flex items-center justify-end px-[8.333vw] pt-[calc(var(--u)*1.55)]">
        <div className="flex items-center gap-[calc(var(--u)*0.7)] pointer-events-auto">
          {cta && (
            <a
              href={cta.href}
              onMouseEnter={() => setCtaHover(true)}
              onMouseLeave={() => setCtaHover(false)}
              className="hidden md:flex items-center h-[calc(var(--u)*1.85)] px-[calc(var(--u)*0.6)] rounded-[calc(var(--u)*0.3)] border border-background/70 bg-foreground text-background"
            >
              <div className="h-[1.5em] overflow-hidden text-[calc(var(--u)*0.63)] leading-[1.5]">
                <motion.p animate={{ y: ctaHover ? "-100%" : "0%" }} transition={{ duration: 0.6, ease: expoOut }}>
                  {cta.text}
                </motion.p>
                <motion.p aria-hidden="true" animate={{ y: ctaHover ? "-100%" : "0%" }} transition={{ duration: 0.6, ease: expoOut }}>
                  {cta.text}
                </motion.p>
              </div>
            </a>
          )}

          <button
            ref={burgerRef}
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            onMouseMove={onBurgerMove}
            onMouseEnter={onBurgerEnter}
            onMouseLeave={onBurgerLeave}
            className="relative grid place-items-center size-[calc(var(--u)*1.85*1.26)] -m-[calc(var(--u)*1.85*0.13)] cursor-pointer"
          >
            <motion.div
              style={{ x: bgX, y: bgY, scale: bgScale }}
              className="absolute inset-[11%] rounded-full border border-background/70 bg-foreground"
            />
            <motion.svg
              style={{ x: linesX, y: linesY, scale: linesScale }}
              viewBox="0 0 24 24"
              fill="none"
              className="relative size-[calc(var(--u)*0.8)] text-background"
            >
              <motion.line
                x1="4"
                x2="20"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                initial={false}
                animate={open ? { y1: 6, y2: 18 } : { y1: 9, y2: 9 }}
                transition={{ duration: 0.3, ease: [0.215, 0.61, 0.355, 1] }}
              />
              <motion.line
                x1="4"
                x2="20"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                initial={false}
                animate={open ? { y1: 18, y2: 6 } : { y1: 15, y2: 15 }}
                transition={{ duration: 0.3, ease: [0.215, 0.61, 0.355, 1], delay: 0.05 }}
              />
            </motion.svg>
          </button>
        </div>
      </div>
    </nav>
    </>
  );
};

export default NavbarCircleMenu;
