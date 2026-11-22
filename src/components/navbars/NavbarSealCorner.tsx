"use client";

import { useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import useMenuDialog from "@/components/kit/useMenuDialog";

type NavItem = { name: string; href: string };

type NavbarSealCornerProps = {
  brand?: string;
  navItems?: NavItem[];
  cta?: { text: string; href: string };
  menuText?: string;
  closeText?: string;
  delay?: number;
};

const EASE_OUT: [number, number, number, number] = [0.25, 1, 0.5, 1];

const NavbarSealCorner = ({
  brand = "Villa Solenne",
  navItems = [],
  cta = { text: "Book a stay", href: "#contact" },
  menuText = "Menu",
  closeText = "Close",
  delay = 2.2,
}: NavbarSealCornerProps) => {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const ringId = useId();
  const { scrollYProgress } = useScroll();
  const percent = useTransform(scrollYProgress, (v) => String(Math.round(v * 100)).padStart(2, "0"));
  useMenuDialog(open, panelRef, () => setOpen(false));
  const ring = `${brand} · ${brand} · `;

  return (
    <>
      <motion.nav
        aria-label="Main"
        initial={reduce || !delay ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay }}
        className="pointer-events-none fixed inset-0 z-50 text-white mix-blend-difference"
      >
        <a href="#" aria-label={brand} className="pointer-events-auto absolute left-[var(--gutter)] top-[clamp(1rem,3vh,1.75rem)] block size-[4.5rem]">
          <svg viewBox="0 0 100 100" fill="none" className="absolute inset-0 size-full animate-[spin_30s_linear_infinite] motion-reduce:animate-none">
            <defs>
              <path id={ringId} d="M50 50 m-38 0 a38 38 0 1 1 76 0 a38 38 0 1 1 -76 0" />
            </defs>
            <text fill="currentColor" className="text-[length:var(--text-label)] uppercase tracking-[0.3em]">
              <textPath href={`#${ringId}`} textLength="236">
                {ring}
              </textPath>
            </text>
          </svg>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="absolute left-1/2 top-1/2 size-[1.25rem] -translate-x-1/2 -translate-y-1/2">
            {[0, 45, 90, 135].map((deg) => (
              <path key={deg} d="M12 1 V23" transform={`rotate(${deg} 12 12)`} />
            ))}
            <circle cx="12" cy="12" r="3.2" />
          </svg>
        </a>

        <div className="pointer-events-auto absolute right-[var(--gutter)] top-[clamp(1rem,3vh,1.75rem)] flex h-[4.5rem] items-center gap-[0.75rem]">
          {cta && (
            <a href={cta.href} className="flex h-[2.75rem] items-center whitespace-nowrap rounded-full border border-current px-[1.25rem] text-[length:var(--text-label)] font-semibold uppercase tracking-[var(--label-tracking)] transition-opacity duration-300 hover:opacity-70">
              {cta.text}
            </a>
          )}
          {navItems.length > 0 && (
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? closeText : menuText}
              onClick={() => setOpen((v) => !v)}
              className="flex size-[2.75rem] flex-col items-center justify-center gap-[0.3rem] rounded-full border border-current lg:hidden"
            >
              <div aria-hidden="true" className="h-px w-[1rem] bg-current" />
              <div aria-hidden="true" className="h-px w-[1rem] bg-current" />
            </button>
          )}
        </div>

        <div className="absolute left-[calc(var(--gutter)+2.25rem)] top-1/2 hidden -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[0.75rem] lg:flex">
          <div className="relative h-[8rem] w-px bg-current/25">
            <motion.div style={{ scaleY: scrollYProgress }} className="absolute inset-0 origin-top bg-current" />
          </div>
          <motion.p aria-hidden="true" className="text-[length:var(--text-label)] tabular-nums tracking-[0.1em]">{percent}</motion.p>
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
            initial={reduce ? { opacity: 0 } : { clipPath: "inset(0% 0% 100% 0% round 0 0 50vw 50vw)" }}
            animate={reduce ? { opacity: 1 } : { clipPath: "inset(0% 0% 0% 0% round 0 0 0vw 0vw)" }}
            exit={reduce ? { opacity: 0 } : { clipPath: "inset(0% 0% 100% 0% round 0 0 50vw 50vw)" }}
            transition={{ duration: 0.8, ease: [0.75, 0, 0.25, 1] }}
            className="fixed inset-0 z-[70] flex flex-col bg-deep px-[var(--gutter)] pb-[var(--gutter)] pt-[clamp(1rem,3vh,1.75rem)] text-deep-foreground lg:hidden"
          >
            <div className="flex justify-end">
              <button type="button" onClick={() => setOpen(false)} aria-label={closeText} className="flex size-[2.75rem] items-center justify-center rounded-full border border-current">
                <div aria-hidden="true" className="relative size-[1rem]">
                  <div className="absolute left-0 top-1/2 h-px w-full rotate-45 bg-current" />
                  <div className="absolute left-0 top-1/2 h-px w-full -rotate-45 bg-current" />
                </div>
              </button>
            </div>
            <ul className="mt-[clamp(2rem,8vh,4rem)] flex flex-col items-center gap-[0.5rem] text-center">
              {navItems.map((item, i) => (
                <li key={`${i}-${item.href}`} className="overflow-hidden">
                  <motion.a
                    href={item.href}
                    onClick={() => setOpen(false)}
                    initial={reduce ? false : { y: "100%" }}
                    animate={{ y: "0%" }}
                    transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.3 + i * 0.06 }}
                    className="block font-[family-name:var(--font-heading)] text-[length:var(--text-h1)] uppercase leading-[0.9] tracking-[-0.02em] [overflow-wrap:anywhere]"
                  >
                    {item.name}
                  </motion.a>
                </li>
              ))}
            </ul>
            {cta && (
              <div className="mt-auto flex justify-center pt-[2rem]">
                <a href={cta.href} onClick={() => setOpen(false)} className="btn-secondary w-full">
                  <p className="btn-label">{cta.text}</p>
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NavbarSealCorner;
