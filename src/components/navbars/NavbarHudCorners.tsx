"use client";

import { useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import useMenuDialog from "@/components/kit/useMenuDialog";

type NavItem = { name: string; href: string };
type Button = { text: string; href: string };

type NavbarHudCornersProps = {
  brand?: string;
  logoSrc?: string;
  navItems?: NavItem[];
  primaryButton?: Button;
  contactLink?: Button;
  menuText?: string;
  closeText?: string;
  introDelay?: number;
};

const EASE = [0.16, 1, 0.3, 1] as const;

const NavbarHudCorners = ({
  brand = "Northfield Labs",
  logoSrc,
  navItems = [
    { name: "Lab", href: "#about" },
    { name: "Research", href: "#services" },
    { name: "Work", href: "#gallery" },
    { name: "Team", href: "#team" },
    { name: "Contact", href: "#contact" },
  ],
  primaryButton = { text: "Let's talk", href: "#contact" },
  contactLink = { text: "hello@northfield.ai", href: "mailto:hello@northfield.ai" },
  menuText = "Menu",
  closeText = "Close",
  introDelay = 0,
}: NavbarHudCornersProps) => {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const { scrollY } = useScroll();
  useMenuDialog(open, panelRef, () => setOpen(false));

  useMotionValueEvent(scrollY, "change", (now) => {
    const prev = scrollY.getPrevious() ?? 0;
    const hide = !open && now > 120 && now > prev;
    const target = hide ? -128 : 0;
    if (y.get() !== target && Math.abs(now - prev) > 2) animate(y, target, { duration: 0.5, ease: EASE });
  });

  return (
    <>
      <motion.nav
        aria-label="Main"
        style={{ y }}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE, delay: introDelay + 0.2 }}
        className="fixed inset-x-0 top-0 z-50 text-foreground"
      >
        <div className="mx-auto flex w-[var(--container)] items-center justify-between gap-[1rem] py-[1.25rem] lg:py-[2rem]">
          <a href="#" className="flex min-w-0 shrink items-center">
            {logoSrc ? (
              <img src={logoSrc} alt={brand} loading="eager" decoding="async" className="h-[1.6rem] w-auto max-w-[9rem] object-contain" />
            ) : (
              <p className="truncate font-[family-name:var(--font-heading)] text-[length:var(--text-h3)] leading-none tracking-[-0.03em] pb-[0.2em] -mb-[0.2em]">{brand}</p>
            )}
          </a>

          <div className="flex shrink-0 items-center gap-[0.5rem]">
            {primaryButton && (
              <a href={primaryButton.href} className="btn-primary hidden h-[2.75rem] sm:inline-flex">
                <p className="btn-label">{primaryButton.text}</p>
              </a>
            )}
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? closeText : menuText}
              onClick={() => setOpen((value) => !value)}
              className="btn-secondary h-[2.75rem] gap-[0.75rem]"
            >
              <p className="btn-label">{open ? closeText : menuText}</p>
              <div aria-hidden="true" className="relative h-[0.4375rem] w-[0.875rem]">
                <div className={`absolute left-0 h-px w-full bg-current transition-transform duration-300 ${open ? "top-1/2 rotate-45" : "top-0"}`} />
                <div className={`absolute left-0 h-px w-full bg-current transition-transform duration-300 ${open ? "top-1/2 -rotate-45" : "bottom-0"}`} />
              </div>
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {open && (
          <motion.div
            key="menu"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={menuText}
            initial={reduce ? { opacity: 0 } : { clipPath: "inset(0% 0% 100% 0%)" }}
            animate={reduce ? { opacity: 1 } : { clipPath: "inset(0% 0% 0% 0%)" }}
            exit={reduce ? { opacity: 0 } : { clipPath: "inset(0% 0% 100% 0%)" }}
            transition={{ duration: 0.7, ease: EASE }}
            className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-background text-foreground"
          >
            <ul className="mx-auto mt-[clamp(6rem,16svh,9rem)] flex w-[var(--container)] flex-col items-center gap-[clamp(0.5rem,1.4svh,1rem)]">
              {navItems.map((item, i) => (
                <li key={`${i}-${item.href}`} className="overflow-hidden pb-[0.15em] -mb-[0.15em]">
                  <motion.a
                    href={item.href}
                    onClick={() => setOpen(false)}
                    initial={reduce ? false : { x: i % 2 ? "12vw" : "-12vw", opacity: 0 }}
                    animate={{ x: "0vw", opacity: 1 }}
                    transition={{ duration: 0.9, ease: EASE, delay: 0.15 + i * 0.06 }}
                    className="block text-center font-[family-name:var(--font-heading)] text-[length:var(--text-h1)] uppercase leading-[1] tracking-[-0.045em] transition-colors duration-300 [overflow-wrap:anywhere] hover:text-accent"
                  >
                    {item.name}
                  </motion.a>
                </li>
              ))}
            </ul>

            <div className="relative mt-[clamp(2rem,6svh,4rem)] flex items-center justify-center">
              <motion.div
                aria-hidden="true"
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1, ease: EASE, delay: 0.3 }}
                className="absolute inset-x-0 top-1/2 h-px bg-foreground/20"
              />
              <p aria-hidden="true" className="relative bg-background px-[0.75rem] font-mono text-[length:var(--text-body)] leading-none text-muted-foreground">
                +
              </p>
            </div>

            {contactLink && (
              <div className="mx-auto mt-auto flex w-[var(--container)] justify-center pb-[clamp(1.5rem,5svh,3rem)] pt-[2rem] lg:justify-end">
                <a href={contactLink.href} onClick={() => setOpen(false)} className="btn-link">
                  <p>{contactLink.text}</p>
                  <p aria-hidden="true">→</p>
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NavbarHudCorners;
