"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValueEvent, useMotionValue, useReducedMotion, useScroll } from "motion/react";
import useMenuDialog from "@/components/kit/useMenuDialog";
import CornerTicks from "@/components/kit/CornerTicks";
import { useKitMotion } from "@/components/kit/kitMotion";

type NavItem = { name: string; href: string };
type Button = { text: string; href: string };

type NavbarHudBarProps = {
  brand?: string;
  logoSrc?: string;
  navItems?: NavItem[];
  primaryButton?: Button;
  introDelay?: number;
  menuText?: string;
  closeText?: string;
};

const Chevron = () => (
  <div aria-hidden="true" className="grid size-[1.25rem] place-items-center rounded-[calc(var(--radius)*0.5)] bg-accent text-accent-foreground">
    <svg viewBox="0 0 12 12" className="size-[0.625rem]" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4.5 2.5 8 6l-3.5 3.5" />
    </svg>
  </div>
);

const NavbarHudBar = ({
  brand = "Mossline",
  logoSrc,
  navItems = [
    { name: "Solutions", href: "#services" },
    { name: "Technology", href: "#about" },
    { name: "Company", href: "#team" },
    { name: "Resources", href: "#faq" },
  ],
  primaryButton = { text: "Let's talk", href: "#contact" },
  introDelay = 1.4,
  menuText = "Menu",
  closeText = "Close",
}: NavbarHudBarProps) => {
  const reduce = useReducedMotion();
  const { ease } = useKitMotion();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useMenuDialog(open, panelRef, () => setOpen(false));
  const { scrollY } = useScroll();
  const y = useMotionValue("0%");
  const hidden = useRef(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    navRef.current?.toggleAttribute("data-solid", scrollY.get() > 8);
  }, [scrollY]);

  useMotionValueEvent(scrollY, "change", (now) => {
    navRef.current?.toggleAttribute("data-solid", now > 8);
    const prev = scrollY.getPrevious() ?? 0;
    const hide = now > 120 && now > prev;
    if (hide === hidden.current || Math.abs(now - prev) < 2) return;
    hidden.current = hide;
    animate(y, hide ? "-100%" : "0%", { duration: reduce ? 0 : 0.5, ease });
  });

  return (
    <>
      <motion.nav
        aria-label="Main"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, ease, delay: introDelay }}
        ref={navRef}
        style={{ y }}
        className="fixed inset-x-0 top-0 z-50 border-b border-transparent bg-transparent text-deep-foreground transition-[background-color,border-color] duration-500 data-[solid]:border-[color-mix(in_srgb,var(--deep-foreground)_14%,transparent)] data-[solid]:bg-[color-mix(in_srgb,var(--deep)_95%,transparent)] data-[solid]:backdrop-blur-[12px] [--foreground:var(--deep-foreground)] [--primary:var(--deep-foreground)] [--primary-foreground:var(--deep)]"
      >
        <div className="mx-auto flex h-[4rem] w-[var(--container)] items-center justify-between gap-[var(--gap)] lg:h-[4.5rem]">
          <a href="#" className="flex min-w-0 shrink-0 items-center gap-[0.625rem]">
            {logoSrc ? (
              <img src={logoSrc} alt={brand} loading="eager" decoding="async" className="h-[1.5rem] w-auto max-w-[9rem] object-contain" />
            ) : (
              <>
                <div aria-hidden="true" className="grid size-[1.375rem] place-items-center rounded-full border border-deep-foreground">
                  <div className="size-[0.375rem] rounded-full bg-accent" />
                </div>
                <p className="truncate text-[length:1.125rem] font-medium leading-none tracking-[-0.04em] pb-[0.2em] -mb-[0.2em]">{brand}</p>
              </>
            )}
          </a>

          {navItems.length > 0 && (
            <ul className="hidden min-w-0 items-center gap-[clamp(1.25rem,2.4vw,2.5rem)] min-[94.5rem]:flex">
              {navItems.map((item, i) => (
                <li key={`${i}-${item.href}`}>
                  <a href={item.href} className="whitespace-nowrap text-[length:var(--text-small)] leading-none text-[color-mix(in_srgb,var(--deep-foreground)_80%,transparent)] transition-colors duration-300 hover:text-deep-foreground">
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          )}

          <div className="flex shrink-0 items-center gap-[0.5rem]">
            {primaryButton && (
              <a href={primaryButton.href} className="btn-secondary hidden gap-[0.75rem] pr-[0.625rem] sm:inline-flex">
                <p className="btn-label">{primaryButton.text}</p>
                <Chevron />
              </a>
            )}
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? closeText : menuText}
              onClick={() => setOpen((value) => !value)}
              className="flex size-[2.625rem] flex-col items-center justify-center gap-[0.3rem] rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--deep-foreground)_22%,transparent)] min-[94.5rem]:hidden"
            >
              <div aria-hidden="true" className={`h-px w-[1rem] bg-current transition-transform duration-[var(--dur-fast)] ${open ? "translate-y-[calc(0.15rem+0.5px)] rotate-45" : ""}`} />
              <div aria-hidden="true" className={`h-px w-[1rem] bg-current transition-transform duration-[var(--dur-fast)] ${open ? "-translate-y-[calc(0.15rem+0.5px)] -rotate-45" : ""}`} />
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={menuText}
            initial={reduce ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
            animate={reduce ? { opacity: 1 } : { clipPath: "inset(0 0 0% 0)" }}
            exit={reduce ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.7, ease }}
            className="fixed inset-0 z-[70] flex flex-col bg-deep px-[var(--gutter)] pb-[var(--gutter)] text-deep-foreground [--foreground:var(--deep-foreground)] [--primary:var(--deep-foreground)] [--primary-foreground:var(--deep)] min-[94.5rem]:hidden"
          >
            <div className="flex h-[4rem] shrink-0 items-center justify-between">
              <p className="truncate text-[length:1.125rem] font-medium leading-none tracking-[-0.04em] pb-[0.2em] -mb-[0.2em]">{brand}</p>
              <button type="button" onClick={() => setOpen(false)} aria-label={closeText} className="flex size-[2.625rem] items-center justify-center rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--deep-foreground)_22%,transparent)]">
                <div aria-hidden="true" className="relative size-[1rem]">
                  <div className="absolute left-0 top-1/2 h-px w-full rotate-45 bg-current" />
                  <div className="absolute left-0 top-1/2 h-px w-full -rotate-45 bg-current" />
                </div>
              </button>
            </div>
            <div className="relative mt-[clamp(1.5rem,6svh,3rem)] p-[1.25rem]">
              <CornerTicks show delay={0.2} />
              <ul className="flex flex-col gap-[1.25rem]">
                {navItems.map((item, i) => (
                  <li key={`${i}-${item.href}`}>
                    <a href={item.href} onClick={() => setOpen(false)} className="flex items-center gap-[1rem]">
                      <motion.div
                        initial={reduce ? false : { clipPath: "inset(0 100% 0 0)" }}
                        animate={{ clipPath: "inset(0 0% 0 0)" }}
                        transition={{ duration: 0.4, ease, delay: 0.25 + i * 0.08 }}
                        className="shrink-0 rounded-[var(--radius)] bg-accent px-[0.4rem] py-[0.25rem] font-mono text-[length:var(--text-label)] uppercase leading-none text-accent-foreground"
                      >
                        {String(i + 1).padStart(2, "0")}
                      </motion.div>
                      <div className="min-w-0 overflow-hidden pb-[0.15em] -mb-[0.15em]">
                        <motion.p
                          initial={reduce ? false : { y: "110%" }}
                          animate={{ y: "0%" }}
                          transition={{ duration: 0.7, ease, delay: 0.35 + i * 0.08 }}
                          className="text-[length:var(--text-h3)] font-medium leading-[1.1] tracking-[-0.04em] [overflow-wrap:anywhere]"
                        >
                          {item.name}
                        </motion.p>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            {primaryButton && (
              <a href={primaryButton.href} onClick={() => setOpen(false)} className="btn-secondary mt-auto min-h-[3.25rem] w-full justify-between pr-[0.75rem]">
                <p className="btn-label">{primaryButton.text}</p>
                <Chevron />
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NavbarHudBar;
