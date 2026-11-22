"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type NavTheme = "dark" | "light" | "fluor" | "accent";

type NavbarGooeyPillsProps = {
  brand: string;
  logoSrc?: string;
  navItems: { name: string; href: string }[];
  activeHref?: string;
  menuLabel?: string;
  closeLabel?: string;
  className?: string;
};

const NavbarGooeyPills = ({ brand, logoSrc, navItems, activeHref, menuLabel = "Menu", closeLabel = "Close", className = "" }: NavbarGooeyPillsProps) => {
  const navRef = useRef<HTMLElement>(null);
  const [theme, setTheme] = useState<NavTheme>("dark");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let frame = 0;
    const probe = () => {
      frame = 0;
      const nav = navRef.current;
      if (!nav) return;
      const rect = nav.getBoundingClientRect();
      const under = document
        .elementsFromPoint(window.innerWidth / 2, rect.top + rect.height / 2)
        .find((el) => !nav.contains(el) && el.closest("[data-nav-theme]"));
      const value = under?.closest("[data-nav-theme]")?.getAttribute("data-nav-theme");
      setTheme(value === "light" || value === "fluor" || value === "accent" ? value : "dark");
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(probe);
    };
    probe();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const pill =
    theme === "fluor"
      ? "bg-accent text-accent-foreground hover:bg-[color-mix(in_oklab,var(--accent),var(--accent-foreground)_8%)]"
      : "bg-popover text-popover-foreground hover:bg-[color-mix(in_oklab,var(--popover),var(--popover-foreground)_8%)]";
  const logoTone = theme === "light" ? "text-background" : theme === "fluor" ? "text-accent" : theme === "accent" ? "text-accent-foreground" : "text-foreground";

  return (
    <nav ref={navRef} aria-label="Main" className={cn("fixed inset-x-0 top-0 z-1000 flex items-center justify-between gap-4 py-6 px-[var(--grid-margin)] pointer-events-none", className)}>
      <a href="/" aria-label={brand} className={cn("pointer-events-auto flex items-center min-w-0 transition-colors duration-1000 ease-[cubic-bezier(.19,1,.22,1)]", logoTone)}>
        {logoSrc ? (
          <img src={logoSrc} alt={brand} className="h-[25px] w-auto" decoding="async" />
        ) : (
          <p className="truncate text-[length:var(--title-7)] font-semibold leading-none tracking-[-0.04em] pb-[0.2em] -mb-[0.2em]">{brand}</p>
        )}
      </a>

      <div className="hidden lg:flex gap-[6px] pointer-events-auto">
        {navItems.map((item) => (
          <a
            key={item.href + item.name}
            href={item.href}
            aria-current={item.href === activeHref ? "page" : undefined}
            className={cn("relative rounded-[12px] px-5 py-[10px] text-[12px] font-semibold uppercase leading-[1.4] tracking-normal text-foreground transition-colors duration-200", pill)}
          >
            <p>{item.name}</p>
            {item.href === activeHref && <div aria-hidden="true" className="absolute bottom-[3px] left-1/2 size-1 -translate-x-1/2 rounded-full bg-current" />}
          </a>
        ))}
      </div>

      <div className="relative lg:hidden pointer-events-auto">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className={cn("rounded-[12px] px-5 py-[10px] text-[12px] font-semibold uppercase leading-[1.4] text-foreground cursor-pointer transition-colors duration-200", pill)}
        >
          {open ? closeLabel : menuLabel}
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-[calc(100%+6px)] flex flex-col items-end gap-[6px]"
            >
              {navItems.map((item) => (
                <a
                  key={item.href + item.name}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={item.href === activeHref ? "page" : undefined}
                  className={cn("relative whitespace-nowrap rounded-[12px] px-5 py-[10px] text-[12px] font-semibold uppercase leading-[1.4] text-foreground transition-colors duration-200", pill)}
                >
                  <p>{item.name}</p>
                  {item.href === activeHref && <div aria-hidden="true" className="absolute bottom-[3px] left-1/2 size-1 -translate-x-1/2 rounded-full bg-current" />}
                </a>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default NavbarGooeyPills;
