"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import useMenuDialog from "@/components/kit/useMenuDialog";

type NavItem = { name: string; href: string };
type Button = { text: string; href: string };

type NavbarSplitPillProps = {
  brand?: string;
  logoSrc?: string;
  navItems?: NavItem[];
  loginButton?: Button;
  primaryButton?: Button;
  menuText?: string;
  closeText?: string;
};

const EASE = [0.19, 1, 0.22, 1] as const;

const NavbarSplitPill = ({
  brand = "Studio",
  logoSrc,
  navItems = [
    { name: "Product", href: "#services" },
    { name: "Company", href: "#about" },
    { name: "Customers", href: "#testimonial" },
    { name: "Blog", href: "#blog" },
    { name: "Pricing", href: "#pricing" },
  ],
  loginButton,
  primaryButton = { text: "Get in touch", href: "#contact" },
  menuText = "Menu",
  closeText = "Close",
}: NavbarSplitPillProps) => {
  const reduce = useReducedMotion();
  const [intro, setIntro] = useState(false);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useMenuDialog(open, panelRef, () => setOpen(false));

  useEffect(() => {
    const onIntro = () => setIntro(true);
    window.addEventListener("kit:intro", onIntro);
    const fallback = window.setTimeout(onIntro, 3500);
    return () => {
      window.removeEventListener("kit:intro", onIntro);
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <motion.nav
      aria-label="Main"
      initial={reduce ? false : { opacity: 0, y: "-120%" }}
      animate={intro || reduce ? { opacity: 1, y: "0%" } : undefined}
      transition={{ duration: 1, ease: EASE, delay: 0.35 }}
      className="fixed inset-x-0 top-[0.9375rem] z-50 mx-auto w-[var(--container)] lg:top-[1.25rem]"
    >
      <div className="relative grid h-[3.0625rem] grid-cols-[1fr_auto] items-center gap-[1rem] rounded-[0.9375rem] bg-foreground/[0.05] pl-[1.25rem] pr-[calc((3.0625rem-2.375rem)/2)] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08),inset_0_1px_0_rgb(255_255_255/0.06),0_1.5rem_3rem_-1.5rem_rgb(0_0_0/0.6)] backdrop-blur-xl sm:pr-[calc((3.0625rem-2.4626rem-2px)/2)] lg:h-[4.5rem] min-[94.5rem]:grid-cols-[1fr_auto_1fr] lg:rounded-full lg:pl-[2.25rem] lg:pr-[calc((4.5rem-2.4626rem-2px)/2)]">
        <a href="#" className="flex min-w-0 items-center gap-[0.625rem]">
          {logoSrc ? (
            <img src={logoSrc} alt={brand} loading="eager" decoding="async" className="h-[1.25rem] w-auto max-w-[8rem] object-contain" />
          ) : (
            <>
              <div aria-hidden="true" className="relative size-[1.125rem] shrink-0 rounded-[0.375rem] bg-foreground">
                <div className="absolute inset-[0.3125rem] rounded-[0.125rem] bg-background" />
              </div>
              <p className="truncate text-[length:var(--text-body-lg)] font-medium leading-none tracking-[-0.03em] text-foreground [font-family:var(--font-heading)] pb-[0.2em] -mb-[0.2em]">{brand}</p>
            </>
          )}
        </a>

        {navItems.length > 0 && (
          <ul className="hidden items-center gap-[0.125rem] min-[94.5rem]:flex">
            {navItems.map((item, i) => (
              <li key={`${i}-${item.href}`}>
                <a
                  href={item.href}
                  className="block whitespace-nowrap rounded-full px-[clamp(0.625rem,1vw,0.875rem)] py-[0.5rem] text-[length:var(--text-small)] font-medium leading-none text-muted-foreground transition-colors duration-300 hover:bg-foreground/[0.06] hover:text-foreground"
                >
                  {item.name}
                </a>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-end gap-[0.375rem]">
          {primaryButton && (
            <a
              href={primaryButton.href}
              className="btn-secondary hidden sm:inline-flex"
            >
              <p className="btn-label">{primaryButton.text}</p>
              <ArrowUpRight aria-hidden="true" />
            </a>
          )}
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? closeText : menuText}
            onClick={() => setOpen((value) => !value)}
            className="relative flex size-[2.375rem] items-center sm:size-[calc(2.4626rem+2px)] justify-center rounded-full bg-foreground text-background min-[94.5rem]:hidden"
          >
            <div aria-hidden="true" className="relative h-[0.5rem] w-[1rem]">
              <motion.div
                animate={open ? { top: "50%", rotate: 45 } : { top: "0%", rotate: 0 }}
                transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
                className="absolute left-0 h-[1.5px] w-full bg-current"
              />
              <motion.div
                animate={open ? { top: "50%", rotate: -45 } : { top: "100%", rotate: 0 }}
                transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
                className="absolute left-0 h-[1.5px] w-full bg-current"
              />
            </div>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={menuText}
            initial={{ opacity: 0, y: "-0.75rem", scale: 0.98 }}
            animate={{ opacity: 1, y: "0rem", scale: 1 }}
            exit={{ opacity: 0, y: "-0.5rem", scale: 0.98 }}
            transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
            className="absolute inset-x-0 top-[calc(100%+0.5rem)] flex max-h-[calc(100svh-6rem)] origin-top flex-col overflow-y-auto rounded-[1.75rem] bg-card/90 p-[0.75rem] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08),0_2rem_4rem_-1rem_rgb(0_0_0/0.7)] backdrop-blur-xl lg:left-auto lg:w-[22rem] min-[94.5rem]:hidden"
          >
            <ul className="flex flex-col">
              {navItems.map((item, i) => (
                <motion.li
                  key={`${i}-${item.href}`}
                  initial={reduce ? false : { opacity: 0, y: "0.5rem" }}
                  animate={{ opacity: 1, y: "0rem" }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.05 + i * 0.04 }}
                >
                  <a
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-[1.25rem] px-[1rem] py-[0.875rem] text-[length:var(--text-h3)] leading-[1.1] tracking-[var(--heading-tracking)] text-foreground transition-colors duration-300 hover:bg-foreground/[0.06] [font-family:var(--font-heading)] lg:py-[0.75rem] lg:text-[length:var(--text-body-lg)]"
                  >
                    {item.name}
                  </a>
                </motion.li>
              ))}
            </ul>
            <div className={`mt-[0.5rem] flex flex-col gap-[0.5rem] ${loginButton ? "" : "lg:hidden"}`}>
              {loginButton && (
                <a href={loginButton.href} onClick={() => setOpen(false)} className="btn-secondary min-h-[3rem] w-full">
                  <p className="btn-label">{loginButton.text}</p>
                </a>
              )}
              {primaryButton && (
                <a
                  href={primaryButton.href}
                  onClick={() => setOpen(false)}
                  className="flex h-[3.25rem] items-center justify-between lg:hidden rounded-full bg-foreground/[0.06] py-[0.375rem] pl-[1.25rem] pr-[0.375rem] text-[length:var(--text-body)] font-medium text-foreground shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]"
                >
                  <p>{primaryButton.text}</p>
                  <div aria-hidden="true" className="flex size-[2.5rem] items-center justify-center rounded-full bg-foreground text-background">
                    <ArrowUpRight className="size-[1rem]" />
                  </div>
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default NavbarSplitPill;
