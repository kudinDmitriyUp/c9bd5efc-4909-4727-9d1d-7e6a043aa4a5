"use client";

import { useEffect, useRef, useState } from "react";
import { introSignal } from "@/components/kit/introSignal";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { Sparkle, type LucideIcon } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import useMenuDialog from "@/components/kit/useMenuDialog";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type NavItem = { name: string; href: string };
type Button = { text: string; href: string };

type NavbarHairlineProps = {
  brand?: string;
  logoSrc?: string;
  logoIcon?: LucideIcon;
  navItems?: NavItem[];
  textLink?: Button;
  primaryButton?: Button;
  menuText?: string;
  closeText?: string;
  className?: string;
};

const DEFAULT_ITEMS: NavItem[] = [
  { name: "Features", href: "#features" },
  { name: "Use cases", href: "#product" },
  { name: "Pricing", href: "#pricing" },
  { name: "FAQ", href: "#faq" },
];

const NavbarHairline = ({
  brand = "Northlane",
  logoSrc,
  logoIcon: LogoIcon = Sparkle,
  navItems = DEFAULT_ITEMS,
  textLink,
  primaryButton = { text: "Start free", href: "#pricing" },
  menuText = "Menu",
  closeText = "Close",
  className,
}: NavbarHairlineProps) => {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(() => typeof window === "undefined" || !introSignal.isClaimed() || introSignal.isRevealed());
  useEffect(() => introSignal.onReveal(() => setShown(true)), []);
  const panelRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  useMenuDialog(open, panelRef, () => setOpen(false));

  useMotionValueEvent(scrollY, "change", (value) => {
    if (navRef.current) navRef.current.dataset.scrolled = String(value > 24);
  });

  return (
    <>
      <nav
        ref={navRef}
        aria-label="Main"
        className={cn(
          "fixed inset-x-0 top-0 z-50 h-16 border-b border-transparent transition-[opacity,background-color,border-color] duration-700 data-[scrolled=true]:border-foreground/[0.08] data-[scrolled=true]:bg-background/55 data-[scrolled=true]:backdrop-blur-[16px]",
          !shown && "opacity-0",
          open && "border-foreground/[0.08] bg-background/55 backdrop-blur-[16px]",
          className,
        )}
      >
        <div className="mx-auto flex h-full w-[var(--container)] items-center justify-between gap-4">
          <a href="#" className="flex min-w-0 shrink-0 items-center gap-2 min-[94.5rem]:flex-1">
            {logoSrc ? (
              <img src={logoSrc} alt={brand} loading="lazy" decoding="async" className="h-7 w-auto max-w-[9rem] object-contain" />
            ) : (
              <>
                <div className="flex size-6 shrink-0 items-center justify-center rounded-[0.375rem] bg-foreground text-background">
                  <LogoIcon aria-hidden="true" strokeWidth={2} className="size-3.5" />
                </div>
                <p className="truncate py-0.5 text-[length:var(--text-body-lg)] font-medium leading-[1.2] tracking-[-0.02em]">{brand}</p>
              </>
            )}
          </a>

          {navItems.length > 0 && (
            <ul className="hidden items-center gap-6 min-[94.5rem]:flex">
              {navItems.map((item, i) => (
                <li key={`${i}-${item.href}`}>
                  <a href={item.href} className="whitespace-nowrap text-[length:var(--text-small)] leading-none text-foreground/85 transition-colors duration-300 hover:text-foreground">
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          )}

          <div className="flex shrink-0 items-center justify-end gap-4 min-[94.5rem]:flex-1">
            {textLink && (
              <a href={textLink.href} className="hidden whitespace-nowrap text-[length:var(--text-small)] leading-none text-foreground/85 transition-colors duration-300 hover:text-foreground min-[94.5rem]:block">
                {textLink.text}
              </a>
            )}
            {primaryButton && (
              <a href={primaryButton.href} className="btn-secondary hidden h-11 items-center rounded-[var(--radius-button)] px-4 text-[length:var(--text-small)] lg:inline-flex">
                {primaryButton.text}
              </a>
            )}
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? closeText : menuText}
              onClick={() => setOpen((value) => !value)}
              className="btn-secondary relative flex size-11 items-center justify-center rounded-[var(--radius-button)] min-[94.5rem]:hidden"
            >
              <div aria-hidden="true" className={cn("absolute h-px w-4 bg-current transition-transform duration-300", open ? "rotate-45" : "-translate-y-[0.1875rem]")} />
              <div aria-hidden="true" className={cn("absolute h-px w-4 bg-current transition-transform duration-300", open ? "-rotate-45" : "translate-y-[0.1875rem]")} />
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 min-[94.5rem]:hidden"
          />
        )}
        {open && (
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={menuText}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 top-16 z-50 min-[94.5rem]:hidden"
          >
            <div className="kit-card mx-auto mt-2 flex w-[var(--container)] flex-col gap-1 p-4 lg:mr-[calc((100%-var(--container))/2)] lg:w-[22rem]">
              {navItems.map((item, i) => (
                <a
                  key={`${i}-${item.href}`}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex h-11 items-center border-b border-foreground/[0.06] text-[length:var(--text-body-lg)] leading-none"
                >
                  {item.name}
                </a>
              ))}
              <div className={cn("mt-3 flex flex-col gap-2", !textLink && "lg:hidden")}>
                {primaryButton && (
                  <a href={primaryButton.href} onClick={() => setOpen(false)} className="btn-primary inline-flex h-11 w-full items-center px-4 rounded-[var(--radius-button)] text-[length:var(--text-small)] lg:hidden">
                    {primaryButton.text}
                  </a>
                )}
                {textLink && (
                  <a href={textLink.href} onClick={() => setOpen(false)} className="btn-secondary inline-flex h-11 w-full items-center px-4 rounded-[var(--radius-button)] text-[length:var(--text-small)]">
                    {textLink.text}
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NavbarHairline;
