"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import useMenuDialog from "@/components/kit/useMenuDialog";

type NavItem = { name: string; href: string };
type Button = { text: string; href: string };

type NavbarSlashLinksProps = {
  brand?: string;
  mark?: string;
  navItems?: NavItem[];
  primaryButton?: Button;
  menuText?: string;
  closeText?: string;
  introDelay?: number;
};

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const DEFAULT_ITEMS: NavItem[] = [
  { name: "Menu", href: "#menu" },
  { name: "Events", href: "#events" },
  { name: "Workshops", href: "#workshops" },
  { name: "Journal", href: "#blog" },
  { name: "About", href: "#about" },
];

const NavbarSlashLinks = ({
  brand = "Crumb & Butter",
  mark,
  navItems = DEFAULT_ITEMS,
  primaryButton = { text: "Reserve table", href: "#contact" },
  menuText = "Menu",
  closeText = "Close",
  introDelay = 0,
}: NavbarSlashLinksProps) => {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useMenuDialog(open, panelRef, () => setOpen(false));

  return (
    <>
      <motion.nav
        aria-label="Main"
        initial={reduce ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: EASE_OUT, delay: introDelay }}
        className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background text-primary"
      >
        <div className="mx-auto flex h-[4rem] w-[var(--container)] items-center justify-between gap-[1.5rem]">
          <a href="#" className="flex min-w-0 shrink-0 items-start gap-[0.1rem]">
            <p className="-mb-[0.2em] truncate pb-[0.2em] text-[length:var(--text-body-lg)] font-semibold leading-none tracking-[-0.02em]">{brand}</p>
            {mark && <p className="text-[length:0.6em] font-semibold leading-none">{mark}</p>}
          </a>

          {navItems.length > 0 && (
            <ul className="hidden min-w-0 items-center gap-[clamp(1rem,1.8vw,1.5rem)] min-[94.5rem]:flex">
              {navItems.map((item, i) => (
                <li key={`${i}-${item.href}`}>
                  <a
                    href={item.href}
                    className="relative whitespace-nowrap font-mono text-[length:var(--text-label)] uppercase leading-none tracking-[var(--label-tracking)] after:absolute after:inset-x-0 after:-bottom-[0.3rem] after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-500 after:ease-[cubic-bezier(0.22,1,0.36,1)] hover:after:scale-x-100"
                  >
                    {`/${item.name}`}
                  </a>
                </li>
              ))}
            </ul>
          )}

          <div className="flex shrink-0 items-center">
            {primaryButton && (
              <a
                href={primaryButton.href}
                className="relative hidden whitespace-nowrap font-mono text-[length:var(--text-label)] uppercase leading-none tracking-[var(--label-tracking)] after:absolute after:inset-x-0 after:-bottom-[0.3rem] after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-500 after:ease-[cubic-bezier(0.22,1,0.36,1)] hover:after:scale-x-100 min-[94.5rem]:block"
              >
                {`/${primaryButton.text}`}
              </a>
            )}
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen(true)}
              className="flex min-h-[2.75rem] items-center font-mono text-[length:var(--text-label)] uppercase leading-none tracking-[var(--label-tracking)] min-[94.5rem]:hidden"
            >
              {`/${menuText}`}
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
            transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
            className="fixed inset-0 z-[70] flex flex-col bg-background text-primary min-[94.5rem]:hidden"
          >
            <div className="mx-auto flex h-[4rem] w-[var(--container)] flex-none items-center justify-between border-b border-border">
              <p className="-mb-[0.2em] truncate pb-[0.2em] text-[length:var(--text-body-lg)] font-semibold leading-none tracking-[-0.02em]">{brand}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex min-h-[2.75rem] items-center font-mono text-[length:var(--text-label)] uppercase leading-none tracking-[var(--label-tracking)]"
              >
                {`/${closeText}`}
              </button>
            </div>
            <ul className="mx-auto mt-[clamp(2rem,8svh,4rem)] flex w-[var(--container)] flex-col gap-[0.5rem]">
              {navItems.map((item, i) => (
                <li key={`${i}-${item.href}`} className="overflow-hidden pb-[0.1em]">
                  <motion.a
                    href={item.href}
                    onClick={() => setOpen(false)}
                    initial={reduce ? false : { y: "110%" }}
                    animate={{ y: "0%" }}
                    transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.25 + i * 0.05 }}
                    className="block font-[family-name:var(--font-heading)] text-[length:var(--text-h1)] leading-[1.05] tracking-[var(--heading-tracking)] [overflow-wrap:anywhere]"
                  >
                    {item.name}
                  </motion.a>
                </li>
              ))}
            </ul>
            {primaryButton && (
              <div className="mx-auto mt-auto w-[var(--container)] pb-[var(--gutter)] pt-[2rem]">
                <a href={primaryButton.href} onClick={() => setOpen(false)} className="btn-primary w-full">
                  <p className="btn-label">{primaryButton.text}</p>
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NavbarSlashLinks;
