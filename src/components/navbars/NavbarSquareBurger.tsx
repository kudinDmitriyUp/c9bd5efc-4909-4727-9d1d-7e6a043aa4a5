"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const hero1 = [0.64, 0, 0.47, 0.57] as const;
const hero2 = [0.16, 0.56, 0.44, 1] as const;

type NavbarSquareBurgerProps = {
  brand: string;
  logoSrc?: string;
  navItems: { name: string; href: string }[];
  intro?: boolean;
  className?: string;
};

const NavbarSquareBurger = ({ brand, logoSrc, navItems, intro = true, className = "" }: NavbarSquareBurgerProps) => {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [onLight, setOnLight] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const playIntro = intro && !reduce;

  useEffect(() => {
    let frame = 0;
    const probe = () => {
      frame = 0;
      const nav = navRef.current;
      if (!nav) return;
      const under = document
        .elementsFromPoint(Math.min(window.innerWidth - 8, 80), 40)
        .find((el) => !nav.contains(el) && el.closest("[data-nav-theme]"));
      setOnLight(under?.closest("[data-nav-theme]")?.getAttribute("data-nav-theme") === "light");
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

  const lineTransition = open
    ? { y: { duration: 0.2 }, rotate: { duration: 0.2, delay: 0.2 }, opacity: { duration: 0.2 } }
    : { rotate: { duration: 0.2 }, y: { duration: 0.2, delay: 0.2 }, opacity: { duration: 0.2, delay: 0.2 } };

  return (
    <motion.nav
      ref={navRef}
      aria-label="Main"
      initial={playIntro ? { y: "100svh" } : false}
      animate={{ y: ["100svh", "31.9svh", "0svh"] }}
      transition={playIntro ? { duration: 1.5, delay: 0.5, times: [0, 1 / 3, 1], ease: [hero1, hero2] } : { duration: 0 }}
      className={cn("fixed inset-x-0 top-0 z-[1001] pointer-events-none", className)}
    >
      <div className="flex items-start justify-between gap-[var(--gap)] px-[var(--page-x,var(--gutter))] pt-[var(--gutter)]">
        <a
          href="/"
          aria-label={brand}
          className={cn("pointer-events-auto flex items-center h-[44px] bg-background text-foreground px-[12px] transition-colors duration-500 md:bg-transparent md:px-0", onLight && "md:text-background")}
        >
          {logoSrc ? (
            <img src={logoSrc} alt="" className="h-[60%] w-auto" decoding="async" />
          ) : (
            <p className="text-[length:max(calc(var(--text-h3)*1.33),calc(var(--text-h2)*0.94))] [font-weight:var(--heading-weight)] leading-none tracking-[-0.03em]">{brand}</p>
          )}
        </a>
        <div className="flex min-w-0 flex-col items-end gap-[6px] md:flex-row md:items-start md:gap-0">
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="square-burger-menu"
            onClick={() => setOpen((v) => !v)}
            className="pointer-events-auto relative order-1 flex shrink-0 items-center justify-center size-[44px] bg-background text-foreground cursor-pointer md:order-2 md:ml-[calc(0.42*var(--u,1vw))]"
          >
            {[-6, 0, 6].map((offset, i) => (
              <motion.div
                key={i}
                aria-hidden="true"
                initial={false}
                animate={
                  open
                    ? { y: 0, rotate: i === 0 ? -45 : i === 2 ? -135 : 0, opacity: i === 1 ? 0 : 1 }
                    : { y: offset, rotate: 0, opacity: 1 }
                }
                transition={reduce ? { duration: 0 } : lineTransition}
                className="absolute h-px w-[45%] bg-foreground"
              />
            ))}
          </button>
          <div id="square-burger-menu" className="order-2 overflow-hidden md:order-1">
            <ul
              aria-hidden={!open}
              className={cn(
                "flex flex-col items-end gap-[6px] transition-transform duration-400 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] md:flex-row md:gap-[calc(0.42*var(--u,1vw))]",
                open ? "pointer-events-auto translate-x-0 translate-y-0" : "-translate-y-[101%] md:translate-y-0 md:translate-x-[101%]"
              )}
            >
              {navItems.map((item, index) => (
                <li key={index}>
                  <a
                    href={item.href}
                    tabIndex={open ? 0 : -1}
                    onClick={() => setOpen(false)}
                    className="flex items-center h-[44px] bg-background text-foreground px-[clamp(16px,1.25vw,1.25rem)] text-[length:var(--text-body)] whitespace-nowrap transition-colors duration-200 hover:text-muted-foreground"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default NavbarSquareBurger;
