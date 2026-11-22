"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import useMenuDialog from "@/components/kit/useMenuDialog";
import { useKitMotion } from "@/components/kit/kitMotion";

type NavItem = { name: string; href: string };
type Social = { label: string; href: string };

type NavbarCrossMenuProps = {
  brand?: string;
  logoSrc?: string;
  monogram?: string;
  navItems?: NavItem[];
  contactLabel?: string;
  contactHref?: string;
  socials?: Social[];
  menuText?: string;
  closeText?: string;
  introDelay?: number;
};

const DEFAULT_ITEMS: NavItem[] = [
  { name: "Work", href: "#work" },
  { name: "About", href: "#about" },
  { name: "Contact", href: "#contact" },
];

const useDarkUnder = (logoRef: RefObject<HTMLElement | null>, menuRef: RefObject<HTMLElement | null>) => {
  const [dark, setDark] = useState({ logo: false, menu: false });
  useEffect(() => {
    let observers: IntersectionObserver[] = [];
    const watch = () => {
      observers.forEach((o) => o.disconnect());
      const targets = document.querySelectorAll("[data-section], [data-section] > *, [data-tone='deep'], [data-nav-dark]");
      observers = (["logo", "menu"] as const).flatMap((key) => {
        const el = (key === "logo" ? logoRef : menuRef).current;
        if (!el) return [];
        const r = el.getBoundingClientRect();
        const x = Math.round(r.left + r.width / 2);
        const y = Math.round(r.top + r.height / 2);
        const hits = new Set<Element>();
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => (e.isIntersecting ? hits.add(e.target) : hits.delete(e.target)));
            let top: Element | undefined;
            hits.forEach((h) => {
              if (!top || top.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING) top = h;
            });
            const on = !!top?.matches("[data-tone='deep'], [data-nav-dark]");
            setDark((prev) => (prev[key] === on ? prev : { ...prev, [key]: on }));
          },
          { root: document, rootMargin: `${-y}px ${x + 1 - window.innerWidth}px ${y + 1 - window.innerHeight}px ${-x}px` },
        );
        targets.forEach((t) => io.observe(t));
        return [io];
      });
    };
    watch();
    window.addEventListener("resize", watch);
    return () => {
      observers.forEach((o) => o.disconnect());
      window.removeEventListener("resize", watch);
    };
  }, [logoRef, menuRef]);
  return dark;
};

const NavbarCrossMenu = ({
  brand = "Studio",
  logoSrc,
  monogram,
  navItems = DEFAULT_ITEMS,
  contactLabel = "hello@studio.com",
  contactHref = "mailto:hello@studio.com",
  socials = [],
  menuText = "Menu",
  closeText = "Close",
  introDelay,
}: NavbarCrossMenuProps) => {
  const reduce = useReducedMotion();
  const kit = useKitMotion();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLAnchorElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(false);
  useMenuDialog(open, panelRef, close);
  const dark = useDarkUnder(logoRef, menuRef);
  const glyph = monogram ?? (Array.from(brand)[0] ?? "").toLowerCase();

  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: "1.5rem" },
          animate: { opacity: 1, y: "0rem" },
          transition: { duration: kit.base, ease: kit.ease, delay },
        };

  const intro = (offset: number) => (introDelay === undefined ? {} : rise(Math.max(introDelay, 0) + offset));

  return (
    <>
      <a
        ref={logoRef}
        href="#"
        aria-label={brand}
        data-nav-chrome
        className={`fixed left-[var(--gutter)] top-[1.25rem] z-[80] flex h-[2.75rem] items-center transition-colors duration-500 ${open ? "text-background" : dark.logo ? "text-deep-foreground" : "text-foreground"}`}
      >
        <motion.div {...intro(0)} className="flex items-center">
          {logoSrc ? (
            <img src={logoSrc} alt={brand} decoding="async" className="h-[2rem] w-auto max-w-[8rem] object-contain" />
          ) : (
            <p aria-hidden={monogram ? undefined : true} className="text-[length:var(--text-h3)] font-semibold leading-none tracking-[var(--heading-tracking)]">{glyph}</p>
          )}
        </motion.div>
      </a>

      <button
        ref={menuRef}
        type="button"
        data-nav-chrome
        aria-expanded={open}
        aria-label={open ? closeText : menuText}
        onClick={() => setOpen((value) => !value)}
        className={`fixed right-[var(--gutter)] top-[1.25rem] z-[80] flex size-[2.75rem] items-center justify-center transition-colors duration-500 ${open ? "text-background" : dark.menu ? "text-deep-foreground" : "text-foreground"}`}
      >
        <motion.div {...intro(0.08)} aria-hidden="true" className="flex items-center justify-center">
          <div
            className={`relative size-[2rem] transition-transform duration-700 ease-[var(--ease-in-out)] motion-reduce:transition-none ${open ? "rotate-[135deg]" : "rotate-0"}`}
          >
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current" />
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-current" />
          </div>
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={menuText}
            initial={reduce ? { opacity: 0 } : { clipPath: "inset(0% 0% 100% 0%)" }}
            animate={reduce ? { opacity: 1 } : { clipPath: "inset(0% 0% 0% 0%)" }}
            exit={reduce ? { opacity: 0 } : { clipPath: "inset(0% 0% 100% 0%)" }}
            transition={{ duration: reduce ? 0.2 : kit.base, ease: kit.easeInOut }}
            className="fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-foreground pb-[var(--gutter)] pt-[6rem] text-background lg:pt-[7rem]"
          >
            <nav aria-label="Main" className="mx-auto flex w-[var(--container)] flex-1 flex-col justify-center">
              <ul className="flex flex-col items-start">
                {navItems.map((item, i) => (
                  <li key={`${i}-${item.href}`}>
                    <a href={item.href} onClick={close} className="block py-[0.1em]">
                      <motion.p
                        {...rise(0.3 + i * 0.06)}
                        className="text-[length:calc(var(--text-display)*0.62)] leading-[0.95] tracking-[var(--heading-tracking)] [font-weight:var(--heading-weight)] [overflow-wrap:anywhere]"
                      >
                        {item.name}
                      </motion.p>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <motion.div
              {...rise(0.3 + navItems.length * 0.06)}
              className="mx-auto mt-[2.5rem] flex w-[var(--container)] flex-col gap-[1rem] border-t border-background/20 pt-[1.25rem] lg:flex-row lg:items-center lg:justify-between"
            >
              <a href={contactHref} onClick={close} className="text-[length:var(--text-body-lg)] leading-[1.2] [overflow-wrap:anywhere]">
                {contactLabel}
              </a>
              {socials.length > 0 && (
                <div className="flex flex-wrap items-center gap-[1.25rem]">
                  {socials.map((social, i) => (
                    <a key={`${social.label}-${i}`} href={social.href} className="text-[length:var(--text-small)] font-medium leading-none opacity-70 transition-opacity duration-[var(--dur-fast)] hover:opacity-100">
                      {social.label}
                    </a>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NavbarCrossMenu;
