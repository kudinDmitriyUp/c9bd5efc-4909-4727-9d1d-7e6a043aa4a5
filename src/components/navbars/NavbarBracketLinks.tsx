"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import useMenuDialog from "@/components/kit/useMenuDialog";

type NavItem = { name: string; href: string };

interface NavbarBracketLinksProps {
  brand: string;
  navItems: NavItem[];
  menuText?: string;
  closeText?: string;
  imageSrc?: string;
  imageAlt?: string;
}

const expandEase = [0.83, 0, 0.17, 1] as const;
const premiumGlide = [0.1, 0.4, 0.15, 1] as const;

const RollWord = ({ text }: { text: string }) => (
  <div className="relative overflow-hidden">
    <p className="transition-transform duration-500 ease-[cubic-bezier(.77,0,.175,1)] group-hover:-translate-y-full">{text}</p>
    <p aria-hidden="true" className="absolute inset-0 translate-y-full transition-transform duration-500 ease-[cubic-bezier(.77,0,.175,1)] group-hover:translate-y-0">
      {text}
    </p>
  </div>
);

const BracketLink = ({ href, text, onClick }: { href?: string; text: string; onClick?: () => void }) => {
  const inner = (
    <>
      <p aria-hidden="true" className="pointer-events-none">[</p>
      <RollWord text={text} />
      <p aria-hidden="true" className="pointer-events-none">]</p>
    </>
  );
  const className = "group flex items-center gap-[0.55em] whitespace-nowrap text-[length:var(--text-small)] uppercase leading-[1.5]";
  return href ? (
    <a href={href} aria-label={text} className={className}>
      {inner}
    </a>
  ) : (
    <button type="button" onClick={onClick} aria-label={text} className={className}>
      {inner}
    </button>
  );
};

const NavbarBracketLinks = ({ brand, navItems, menuText = "Menu", closeText = "Close", imageSrc, imageAlt = "" }: NavbarBracketLinksProps) => {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const last = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const inline = navItems.length <= 4 ? navItems : navItems.slice(-1);
  const showMenuDesktop = navItems.length > 4;

  useMotionValueEvent(scrollY, "change", (value) => {
    setHidden(value > 120 && value > last.current);
    last.current = value;
  });

  useMenuDialog(open, panelRef, () => setOpen(false));

  return (
    <>
      <nav
        aria-label="Main"
        className={`fixed inset-x-0 top-0 z-40 text-white mix-blend-difference transition-[translate,opacity] duration-500 ease-[cubic-bezier(.165,.84,.44,1)] ${hidden && !open ? "max-md:-translate-y-full max-md:opacity-0" : ""}`}
      >
        <div className="mx-auto flex w-[var(--container)] items-center justify-between gap-[var(--gap)] pt-[clamp(1.25rem,3.4vw,3rem)]">
          <a href="#" className="min-w-0 truncate [font-family:var(--font-heading)] text-[length:clamp(1.25rem,1rem+0.9vw,2rem)] leading-none tracking-[0.02em] pb-[0.2em] -mb-[0.2em]">
            {brand}
          </a>
          <div className="flex items-center gap-[clamp(1.5rem,4.4vw,4rem)]">
            {inline.map((item) => (
              <div key={item.name} className="hidden lg:block">
                <BracketLink href={item.href} text={item.name} />
              </div>
            ))}
            <div className={showMenuDesktop ? "" : "lg:hidden"}>
              <BracketLink text={menuText} onClick={() => setOpen(true)} />
            </div>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            key="menu"
            ref={panelRef}
            data-lenis-prevent
            role="dialog"
            aria-modal="true"
            aria-label={menuText}
            initial={{ clipPath: "inset(0% 0% 100% 0%)" }}
            animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
            exit={{ clipPath: "inset(0% 0% 100% 0%)" }}
            transition={{ duration: 0.9, ease: expandEase }}
            className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-background text-foreground"
          >
            <div className="mx-auto flex w-[var(--container)] items-center justify-between gap-[var(--gap)] pt-[clamp(1.25rem,3.4vw,3rem)]">
              <a href="#" onClick={() => setOpen(false)} className="min-w-0 truncate [font-family:var(--font-heading)] text-[length:clamp(1.25rem,1rem+0.9vw,2rem)] leading-none tracking-[0.02em] pb-[0.2em] -mb-[0.2em]">
                {brand}
              </a>
              <BracketLink text={closeText} onClick={() => setOpen(false)} />
            </div>
            <div className="mx-auto flex w-[var(--container)] flex-1 flex-col justify-between gap-[clamp(2rem,6vh,4rem)] py-[clamp(3rem,12vh,8rem)] md:flex-row md:items-end">
              <div className="flex min-w-0 flex-col gap-[clamp(0.75rem,5.46vh,3rem)]">
                {navItems.map((item, index) => (
                  <div key={item.name} className="overflow-hidden pb-[0.08em]">
                    <motion.a
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-label={item.name}
                      initial={{ y: "110%" }}
                      animate={{ y: "0%" }}
                      transition={{ duration: 1.1, ease: premiumGlide, delay: 0.35 + index * 0.06 }}
                      className="group flex flex-wrap [font-family:var(--font-heading)] text-[length:clamp(2.25rem,5.13vw,5.5rem)] font-medium leading-none tracking-[var(--heading-tracking)]"
                    >
                      {[...item.name].map((char, i) => (
                        <div key={i} aria-hidden="true" className="relative overflow-hidden whitespace-pre">
                          <div style={{ transitionDelay: `${i * 18}ms` }} className="transition-transform duration-500 ease-[cubic-bezier(.77,0,.175,1)] group-hover:-translate-y-full">
                            {char}
                          </div>
                          <div style={{ transitionDelay: `${i * 18}ms` }} className="absolute inset-0 translate-y-full text-accent transition-transform duration-500 ease-[cubic-bezier(.77,0,.175,1)] group-hover:translate-y-0">
                            {char}
                          </div>
                        </div>
                      ))}
                    </motion.a>
                  </div>
                ))}
              </div>
              {imageSrc && (
                <motion.div
                  initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
                  animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
                  transition={{ duration: 1.2, ease: premiumGlide, delay: 0.5 }}
                  className="relative aspect-[410/221] w-full shrink-0 overflow-hidden md:w-[min(28.5vw,26rem)]"
                >
                  <img src={imageSrc} alt={imageAlt} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NavbarBracketLinks;
