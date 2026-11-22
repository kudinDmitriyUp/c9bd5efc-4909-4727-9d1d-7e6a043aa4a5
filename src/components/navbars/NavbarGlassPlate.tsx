"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import useMenuDialog from "@/components/kit/useMenuDialog";

type NavItem = { name: string; href: string };
type Button = { text: string; href: string };

type NavbarGlassPlateProps = {
  brand: string;
  logoSrc?: string;
  navItems: NavItem[];
  primaryButton?: Button;
  secondaryButton?: Button;
  menuText?: string;
  closeText?: string;
};

const EXPO_OUT = [0.19, 1, 0.22, 1] as const;

const NavbarGlassPlate = ({ brand, logoSrc, navItems, primaryButton, secondaryButton, menuText = "Menu", closeText = "Close" }: NavbarGlassPlateProps) => {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useMenuDialog(open, panelRef, () => setOpen(false));

  return (
    <>
      <motion.nav
        aria-label="Main"
        initial={reduce ? false : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: EXPO_OUT, delay: 0.2 }}
        className="fixed inset-x-0 top-[1.5625rem] z-50 flex justify-center px-[var(--gutter)] lg:top-[2.875rem]"
      >
        <div className="flex w-full max-w-[58.75rem] items-center justify-between gap-[clamp(0.75rem,1.6vw,1.5rem)] rounded-[var(--radius)] bg-deep/30 p-[0.5rem] pl-[1rem] text-deep-foreground backdrop-blur-[30px] lg:p-[1.125rem]">
          <a href="#" className="flex min-w-0 shrink-0 items-center gap-[0.5rem]">
            {logoSrc ? (
              <img src={logoSrc} alt={brand} loading="eager" decoding="async" className="h-[1.6rem] w-auto max-w-[9rem] object-contain" />
            ) : (
              <p className="truncate text-[length:var(--text-body-lg)] font-medium leading-none tracking-[-0.03em] pb-[0.2em] -mb-[0.2em]">{brand}</p>
            )}
          </a>

          {navItems.length > 0 && (
            <ul className="hidden min-w-0 items-center gap-[clamp(1rem,1.6vw,1.5rem)] min-[94.5rem]:flex">
              {navItems.map((item, i) => (
                <li key={`${i}-${item.href}`}>
                  <a href={item.href} className="whitespace-nowrap text-[length:var(--text-small)] font-[450] leading-none transition-colors duration-300 hover:text-accent">
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          )}

          <div className="flex shrink-0 items-center gap-[0.375rem]">
            {primaryButton && (
              <a href={primaryButton.href} className="btn-primary hidden min-h-[2.625rem] px-[1.125rem] sm:inline-flex">
                <p className="btn-label">{primaryButton.text}</p>
              </a>
            )}
            {secondaryButton && (
              <a href={secondaryButton.href} className="btn-secondary hidden min-h-[2.625rem] bg-background px-[1.125rem] min-[94.5rem]:inline-flex">
                <p className="btn-label">{secondaryButton.text}</p>
              </a>
            )}
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? closeText : menuText}
              onClick={() => setOpen((value) => !value)}
              className={`flex size-[3rem] flex-col items-center justify-center gap-[0.3rem] rounded-[var(--radius)] bg-deep/30 min-[94.5rem]:hidden ${primaryButton ? "sm:size-[2.625rem]" : ""}`}
            >
              <div aria-hidden="true" className={`h-px w-[1.1rem] bg-current transition-transform duration-300 ${open ? "translate-y-[calc(0.15rem+0.5px)] rotate-45" : ""}`} />
              <div aria-hidden="true" className={`h-px w-[1.1rem] bg-current transition-transform duration-300 ${open ? "-translate-y-[calc(0.15rem+0.5px)] -rotate-45" : ""}`} />
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[60] bg-deep/30 min-[94.5rem]:hidden"
          />
        )}
        {open && (
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={menuText}
            initial={reduce ? { opacity: 0 } : { x: "100%" }}
            animate={reduce ? { opacity: 1 } : { x: "0%" }}
            exit={reduce ? { opacity: 0 } : { x: "100%" }}
            transition={{ duration: 0.8, ease: EXPO_OUT }}
            className="fixed inset-y-0 right-0 z-[70] flex w-[min(100%,26rem)] flex-col bg-deep/30 p-[var(--gutter)] pt-[1.5625rem] text-deep-foreground backdrop-blur-[30px] min-[94.5rem]:hidden"
          >
            <div className="flex justify-end">
              <button type="button" onClick={() => setOpen(false)} aria-label={closeText} className={`flex size-[3rem] items-center justify-center rounded-[var(--radius)] bg-deep/30 ${primaryButton ? "sm:size-[2.625rem]" : ""}`}>
                <div aria-hidden="true" className="relative size-[1.1rem]">
                  <div className="absolute left-0 top-1/2 h-px w-full rotate-45 bg-current" />
                  <div className="absolute left-0 top-1/2 h-px w-full -rotate-45 bg-current" />
                </div>
              </button>
            </div>
            <ul className="mt-[clamp(2rem,8vh,4rem)] flex flex-col gap-[1rem]">
              {navItems.map((item, i) => (
                <motion.li
                  key={`${i}-${item.href}`}
                  initial={reduce ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: EXPO_OUT, delay: 0.15 + i * 0.05 }}
                >
                  <a href={item.href} onClick={() => setOpen(false)} className="block text-[length:var(--text-h3)] leading-[1.2] tracking-[-0.02em] [overflow-wrap:anywhere]">
                    {item.name}
                  </a>
                </motion.li>
              ))}
            </ul>
            {(primaryButton || secondaryButton) && (
              <div className="mt-auto flex flex-col gap-[0.5rem] pt-[2rem]">
                {primaryButton && (
                  <a href={primaryButton.href} onClick={() => setOpen(false)} className="btn-primary min-h-[3.625rem] w-full tracking-[0.12375rem]">
                    <p className="btn-label">{primaryButton.text}</p>
                  </a>
                )}
                {secondaryButton && (
                  <a href={secondaryButton.href} onClick={() => setOpen(false)} className="btn-secondary min-h-[3.625rem] w-full bg-background tracking-[0.12375rem]">
                    <p className="btn-label">{secondaryButton.text}</p>
                  </a>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NavbarGlassPlate;
