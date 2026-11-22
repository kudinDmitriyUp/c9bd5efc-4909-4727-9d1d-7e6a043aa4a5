"use client";

import { useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import useMenuDialog from "@/components/kit/useMenuDialog";
import { useKitMotion } from "@/components/kit/kitMotion";

type NavItem = { name: string; href: string };
type Button = { text: string; href: string };

type NavbarTabStripProps = {
  brand?: string;
  logoSrc?: string;
  navItems?: NavItem[];
  primaryButton?: Button;
  secondaryButton?: Button;
  activeIndex?: number;
  menuText?: string;
  closeText?: string;
  introDelay?: number;
};

const RULER = Array.from({ length: 30 }, (_, i) => i);

const defaultNav: NavItem[] = [
  { name: "Home", href: "#hero" },
  { name: "About", href: "#about" },
  { name: "Work", href: "#gallery" },
  { name: "Services", href: "#services" },
  { name: "Contact", href: "#contact" },
];

const NavbarTabStrip = ({
  brand = "Bramble",
  logoSrc,
  navItems = defaultNav,
  primaryButton = { text: "Contact", href: "#contact" },
  secondaryButton,
  activeIndex = 0,
  menuText = "Menu",
  closeText = "Close",
  introDelay = 0,
}: NavbarTabStripProps) => {
  const reduce = useReducedMotion();
  const { ease, base } = useKitMotion();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useMenuDialog(open, panelRef, () => setOpen(false));

  const { scrollY } = useScroll();
  const barY = useMotionValue("0%");
  const hidden = useRef(false);
  useMotionValueEvent(scrollY, "change", (value) => {
    if (open) return;
    const prev = scrollY.getPrevious() ?? 0;
    const hide = value > prev && value > 160;
    if (value < prev || value <= 160) {
      if (!hidden.current) return;
      hidden.current = false;
      animate(barY, "0%", { duration: base * 0.6, ease });
      return;
    }
    if (hide && !hidden.current) {
      hidden.current = true;
      animate(barY, "-100%", { duration: base * 0.6, ease });
    }
  });

  const fade = reduce ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: base, ease, delay: introDelay } };

  const logo = (
    <>
      {logoSrc ? (
        <img src={logoSrc} alt={brand} loading="eager" decoding="async" className="h-[1.5rem] w-auto max-w-[8rem] object-contain" />
      ) : (
        <p className="truncate whitespace-nowrap font-[family-name:var(--font-heading)] text-[length:var(--text-body-lg)] uppercase leading-none pb-[0.2em] -mb-[0.2em]">{brand}</p>
      )}
    </>
  );

  return (
    <>
      <motion.div {...fade} aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[3rem] z-[40] h-[2.5rem] overflow-hidden border-b border-border bg-background">
        <div className="absolute inset-x-0 top-0 h-[0.7rem] bg-[linear-gradient(to_right,color-mix(in_srgb,var(--foreground)_35%,transparent)_1px,transparent_1px)] bg-[length:3.125rem_100%]" />
        <div className="absolute inset-x-0 top-0 h-[1.1rem] bg-[linear-gradient(to_right,color-mix(in_srgb,var(--foreground)_45%,transparent)_1px,transparent_1px)] bg-[length:6.25rem_100%]" />
        {RULER.map((n) => (
          <p key={n} style={{ left: `${n * 6.25}rem` }} className="absolute top-[1.35rem] -translate-x-1/2 font-[family-name:var(--font-label)] text-[length:calc(var(--text-small)*0.6)] leading-none text-muted-foreground">
            {n * 100}
          </p>
        ))}
      </motion.div>

      <motion.nav aria-label="Main" {...fade} style={{ y: barY }} className="fixed inset-x-0 top-0 z-50 h-[3rem] border-b border-border bg-background text-foreground">
        <div className="flex h-full items-stretch justify-between">
          <div className="flex min-w-0 items-stretch">
            <a href="#" aria-label={brand} className="flex min-w-0 items-center px-[1rem]">
              {logo}
            </a>
            <div aria-hidden="true" className="my-[0.75rem] w-px bg-border" />
            <ul className="hidden min-w-0 items-stretch min-[94.5rem]:flex">
              {navItems.map((item, i) => (
                <li key={`${i}-${item.href}`} className="flex">
                  <a
                    href={item.href}
                    aria-current={i === activeIndex ? "page" : undefined}
                    className={`flex items-center whitespace-nowrap px-[1rem] font-[family-name:var(--font-label)] text-[length:var(--text-small)] uppercase leading-none transition-colors duration-300 ${i === activeIndex ? "bg-secondary text-secondary-foreground" : "hover:bg-card"}`}
                  >
                    <p>{item.name}</p>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex shrink-0 items-center gap-[0.5rem] pr-[0.5rem]">
            {secondaryButton && (
              <a href={secondaryButton.href} className="btn-secondary hidden h-[2rem] px-[0.9rem] min-[94.5rem]:inline-flex">
                <p className="btn-label whitespace-nowrap">{secondaryButton.text}</p>
              </a>
            )}
            {primaryButton && (
              <a href={primaryButton.href} className="btn-primary hidden h-[2rem] px-[0.9rem] lg:inline-flex">
                <p className="btn-label whitespace-nowrap">{primaryButton.text}</p>
              </a>
            )}
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? closeText : menuText}
              onClick={() => setOpen((value) => !value)}
              className="btn-secondary h-[2rem] gap-[0.6rem] px-[0.75rem] min-[94.5rem]:hidden"
            >
              <p className="btn-label">{open ? closeText : menuText}</p>
              <div aria-hidden="true" className="relative h-[0.6rem] w-[1rem]">
                <div className={`absolute left-0 h-[1.5px] w-full bg-current transition-transform duration-300 ${open ? "top-1/2 rotate-45" : "top-0"}`} />
                <div className={`absolute left-0 h-[1.5px] w-full bg-current transition-transform duration-300 ${open ? "top-1/2 -rotate-45" : "bottom-0"}`} />
              </div>
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
              transition={{ duration: base, ease: [0.52, 0, 0, 1] }}
              className="fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-background text-foreground min-[94.5rem]:hidden"
            >
              <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_srgb,var(--foreground)_5%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_srgb,var(--foreground)_5%,transparent)_1px,transparent_1px)] bg-[length:6.25rem_6.25rem] bg-[position:center_top]" />
              <div className="relative flex h-[3rem] shrink-0 items-center justify-between border-b border-border pr-[0.5rem]">
                <a href="#" aria-label={brand} onClick={() => setOpen(false)} className="flex h-full min-w-0 items-center px-[1rem]">
                  {logo}
                </a>
                <button type="button" onClick={() => setOpen(false)} aria-label={closeText} className="btn-secondary h-[2rem] gap-[0.6rem] px-[0.75rem]">
                  <p className="btn-label">{closeText}</p>
                  <div aria-hidden="true" className="relative size-[0.9rem]">
                    <div className="absolute left-0 top-1/2 h-[1.5px] w-full rotate-45 bg-current" />
                    <div className="absolute left-0 top-1/2 h-[1.5px] w-full -rotate-45 bg-current" />
                  </div>
                </button>
              </div>
              <ul className="relative mt-[clamp(2rem,8svh,4rem)] flex flex-col items-start gap-[0.75rem] px-[var(--gutter)]">
                {navItems.map((item, i) => (
                  <motion.li
                    key={`${i}-${item.href}`}
                    initial={reduce ? false : { scale: 0.6, rotate: (i % 2 ? 2 : -2) + 8, opacity: 0 }}
                    animate={{ scale: 1, rotate: i % 2 ? 2 : -2, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 420, damping: 17, delay: 0.2 + i * 0.06 }}
                    className="max-w-full origin-left"
                  >
                    <a
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`block px-[0.6rem] py-[0.2rem] font-[family-name:var(--font-heading)] text-[length:var(--text-h2)] uppercase leading-[1] [overflow-wrap:anywhere] ${i === activeIndex ? "bg-secondary text-secondary-foreground" : ""}`}
                    >
                      {item.name}
                    </a>
                  </motion.li>
                ))}
              </ul>
              {(primaryButton || secondaryButton) && (
                <div className="relative mt-auto flex flex-col gap-[0.5rem] px-[var(--gutter)] pb-[var(--gutter)] pt-[2rem]">
                  {secondaryButton && (
                    <a href={secondaryButton.href} onClick={() => setOpen(false)} className="btn-secondary min-h-[3.25rem] w-full">
                      <p className="btn-label">{secondaryButton.text}</p>
                    </a>
                  )}
                  {primaryButton && (
                    <a href={primaryButton.href} onClick={() => setOpen(false)} className="btn-primary min-h-[3.25rem] w-full">
                      <p className="btn-label">{primaryButton.text}</p>
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

export default NavbarTabStrip;
