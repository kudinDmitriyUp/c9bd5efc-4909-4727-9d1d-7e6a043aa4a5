"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import useMenuDialog from "@/components/kit/useMenuDialog";

type NavItem = { name: string; href: string };

interface NavbarFloatingPillProps {
  brand: string;
  logoSrc?: string;
  navItems: NavItem[];
  cta?: { text: string; href: string };
  menuText?: string;
  closeText?: string;
  introDelay?: number;
}

const spring = { type: "spring", bounce: 0.2, duration: 1 } as const;
const variantSpring = { type: "spring", bounce: 0, duration: 0.8 } as const;

const NavbarFloatingPill = ({ brand, logoSrc, navItems, cta, menuText = "Menu", closeText = "Close", introDelay = 0 }: NavbarFloatingPillProps) => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);

  useMenuDialog(open, panelRef, () => setOpen(false));

  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      setScrolled(window.scrollY > 24);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const solid = scrolled || open;

  return (
    <motion.nav
      aria-label="Main"
      initial={reduce ? false : { opacity: 0, y: -80 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: introDelay }}
      className="fixed inset-x-0 top-[0.75rem] z-[60]"
    >
      <div
        className={`relative mx-auto w-[var(--container)] rounded-[var(--radius-card)] transition-colors duration-700 ${solid ? "bg-[color-mix(in_srgb,var(--card)_92%,transparent)] text-card-foreground backdrop-blur-[12px]" : "bg-transparent text-foreground"}`}
      >
        <div className="flex h-[3.5rem] items-center justify-between gap-[var(--gap)] pl-[1rem] pr-[0.375rem] lg:pl-[1.25rem] lg:pr-[0.625rem]">
          <a href="#" aria-label={brand} className="flex min-h-[44px] min-w-0 items-center">
            {logoSrc ? (
              <img src={logoSrc} alt={brand} loading="eager" decoding="async" className="h-[2rem] w-auto max-w-[40vw] object-contain" />
            ) : (
              <p className="truncate font-[family-name:var(--font-heading)] text-[length:var(--text-body-lg)] leading-none tracking-[var(--heading-tracking)] pb-[0.2em] -mb-[0.2em]">{brand}</p>
            )}
          </a>

          <div className="hidden min-w-0 items-center gap-[clamp(1rem,2.6vw,2.5rem)] min-[94.5rem]:flex">
            {navItems.map((item, i) => (
              <a
                key={`${i}-${item.name}`}
                href={item.href}
                className="whitespace-nowrap text-[length:var(--text-label)] leading-[1.5] opacity-75 transition-opacity duration-300 hover:opacity-100"
              >
                {item.name}
              </a>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-[0.5rem]">
            {cta && (
              <a href={cta.href} className="btn-secondary btn-nav btn-sm hidden lg:inline-flex">
                {cta.text}
              </a>
            )}
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-label={open ? closeText : menuText}
              className="relative flex size-[44px] items-center justify-center lg:size-[2.25rem] lg:rounded-[0.75rem] lg:bg-card lg:text-card-foreground min-[94.5rem]:hidden"
            >
              <div aria-hidden="true" className="relative h-[8px] w-[18px]">
                <motion.div
                  initial={false}
                  animate={open ? { top: "50%", y: "-50%", rotate: 45 } : { top: "0%", y: "0%", rotate: 0 }}
                  transition={variantSpring}
                  className="absolute left-0 h-[1.5px] w-full rounded-full bg-current"
                />
                <motion.div
                  initial={false}
                  animate={open ? { top: "50%", y: "-50%", rotate: -45 } : { top: "100%", y: "-100%", rotate: 0 }}
                  transition={variantSpring}
                  className="absolute left-0 h-[1.5px] w-full rounded-full bg-current"
                />
              </div>
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="panel"
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={menuText}
              data-lenis-prevent
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={reduce ? { duration: 0 } : variantSpring}
              className="overflow-hidden lg:absolute lg:right-0 lg:top-full lg:mt-[0.5rem] lg:w-[22rem] lg:rounded-[var(--radius-card)] lg:bg-card lg:text-card-foreground min-[94.5rem]:hidden"
            >
              <div className="flex max-h-[calc(100svh-6rem)] flex-col gap-[1.5rem] overflow-y-auto px-[1rem] pb-[1.25rem] pt-[0.5rem] lg:px-[1.25rem] lg:pt-[1rem]">
                <div className="flex flex-col">
                  {navItems.map((item, i) => (
                    <motion.a
                      key={`${i}-${item.name}`}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      initial={reduce ? false : { opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring, delay: 0.05 + i * 0.05 }}
                      className="py-[0.4rem] font-[family-name:var(--font-heading)] text-[length:var(--text-h3)] leading-[1.25] tracking-[var(--heading-tracking)] [overflow-wrap:anywhere]"
                    >
                      {item.name}
                    </motion.a>
                  ))}
                </div>
                {cta && (
                  <a href={cta.href} onClick={() => setOpen(false)} className="btn-primary self-start lg:hidden">
                    {cta.text}
                  </a>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

export default NavbarFloatingPill;
