"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import useMenuDialog from "@/components/kit/useMenuDialog";

type NavItem = { name: string; href: string; imageSrc?: string };
type Link = { text: string; href?: string };

type NavbarEstateLineProps = {
  brand?: string;
  navItems?: NavItem[];
  menuItems?: NavItem[];
  contactLink?: { text: string; href: string };
  contactTitle?: string;
  contactLines?: Link[];
  addressTitle?: string;
  addressLines?: string[];
  socialsTitle?: string;
  socials?: Link[];
  menuText?: string;
  closeText?: string;
  introDelay?: number;
};

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

const DEFAULT_ITEMS: NavItem[] = [
  { name: "About", href: "#about" },
  { name: "Austin insights", href: "#blog" },
  { name: "Listings", href: "#gallery" },
];

const NavbarEstateLine = ({
  brand = "Marlow & Keane",
  navItems = DEFAULT_ITEMS,
  menuItems,
  contactLink = { text: "Contact", href: "#contact" },
  contactTitle = "Contact details",
  contactLines = [],
  addressTitle = "Address",
  addressLines = [],
  socialsTitle = "Follow",
  socials = [],
  menuText = "Menu",
  closeText = "Close",
  introDelay = 0,
}: NavbarEstateLineProps) => {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [past, setPast] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useMenuDialog(open, panelRef, close);
  const items = menuItems ?? [...navItems, ...(contactLink ? [{ name: contactLink.text, href: contactLink.href }] : [])];
  const cards = items.filter((item) => item.imageSrc);
  const rest = items.filter((item) => !item.imageSrc);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setPast(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const rise = (i: number) => ({
    initial: reduce ? false : { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.6, ease: EASE, delay: introDelay + 0.2 + i * 0.04 },
  });

  const fadeIn = (delay: number) => ({
    opacity: open ? 1 : 0,
    transform: open ? "translateY(0)" : `translateY(${delay ? "1.25rem" : "0"})`,
    transition: open ? `opacity 0.5s ease-out ${0.2 + delay}s, transform 0.5s ease-out ${0.2 + delay}s` : "opacity 0.25s ease-in, transform 0.25s ease-in",
  });

  const groups = [
    contactLines.length > 0 && { title: contactTitle, links: contactLines },
    addressLines.length > 0 && { title: addressTitle, links: addressLines.map((text) => ({ text })) },
    socials.length > 0 && { title: socialsTitle, links: socials, external: true },
  ].filter(Boolean) as { title: string; links: Link[]; external?: boolean }[];

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-[calc(100svh-2.75rem)] h-px w-px" />

      <header data-nav-chrome className={`fixed inset-x-0 top-0 z-[80] ${open ? "pointer-events-none" : ""}`}>
        <div aria-hidden="true" className={`absolute inset-0 border-b border-white/10 bg-background/20 backdrop-blur-sm transition-opacity duration-500 ${past ? "opacity-100" : "opacity-0"}`} />
        <div className={`relative mx-auto flex h-[4.5rem] w-[var(--container)] items-center justify-between transition-colors duration-500 ${past ? "text-foreground" : "text-deep-foreground"}`}>
          <div className="overflow-hidden pb-[0.1em] lg:absolute lg:left-1/2 lg:-translate-x-1/2">
            <motion.a
              {...rise(navItems.length)}
              href="#"
              onClick={close}
              className="block whitespace-nowrap font-[family-name:var(--font-heading)] text-[length:var(--text-body)] uppercase leading-none tracking-[0.32em] [margin-right:-0.32em] lg:text-[length:var(--text-h3)]"
            >
              {brand}
            </motion.a>
          </div>

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-[2rem]">
              {navItems.map((item, i) => (
                <li key={`${i}-${item.href}`} className="overflow-hidden pb-[0.15em]">
                  <motion.a {...rise(i)} href={item.href} className="group relative block text-[length:var(--text-label)] uppercase leading-[1.2] tracking-[var(--label-tracking)] opacity-90 transition-opacity hover:opacity-100">
                    <p>{item.name}</p>
                    <div aria-hidden="true" className="absolute inset-x-0 -bottom-[0.2em] h-px origin-right scale-x-0 bg-accent transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:origin-left group-hover:scale-x-100 group-focus-visible:origin-left group-focus-visible:scale-x-100" />
                  </motion.a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-[1rem]">
            {contactLink && (
              <div className="hidden overflow-hidden pb-[0.15em] lg:block">
                <motion.a {...rise(navItems.length + 1)} href={contactLink.href} className="group relative block text-[length:var(--text-label)] uppercase leading-[1.2] tracking-[var(--label-tracking)] opacity-90 transition-opacity hover:opacity-100">
                  <p>{contactLink.text}</p>
                  <div aria-hidden="true" className="absolute inset-x-0 -bottom-[0.2em] h-px origin-right scale-x-0 bg-accent transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:origin-left group-hover:scale-x-100 group-focus-visible:origin-left group-focus-visible:scale-x-100" />
                </motion.a>
              </div>
            )}
            <motion.button
              type="button"
              aria-expanded={open}
              aria-label={menuText}
              onClick={() => setOpen(true)}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: introDelay + 0.2 }}
              className="relative -mr-[0.625rem] flex size-[2.75rem] items-center justify-center"
            >
              <div aria-hidden="true" className="absolute h-px w-[1.5rem] -translate-y-[0.25rem] bg-current" />
              <div aria-hidden="true" className="absolute h-px w-[1.5rem] translate-y-[0.25rem] bg-current" />
            </motion.button>
          </div>
        </div>
      </header>

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={menuText}
        inert={!open}
        style={{
          clipPath: open || reduce ? "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" : "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
          opacity: reduce && !open ? 0 : 1,
          pointerEvents: open ? "auto" : "none",
          visibility: open ? "visible" : "hidden",
          transition: `clip-path 0.7s cubic-bezier(0.9,0,0.1,1), opacity 0.7s cubic-bezier(0.9,0,0.1,1), visibility 0s ${open ? "0s" : "0.7s"}`,
        }}
        className="fixed inset-0 z-[90] overflow-y-auto bg-deep/95 text-deep-foreground backdrop-blur-md"
      >
        <div className="mx-auto flex min-h-full w-[var(--container)] flex-col pb-[1.5rem] lg:h-full lg:pb-[2rem]">
          <div style={fadeIn(0.1)} className="flex h-[4.5rem] shrink-0 items-center justify-between">
            <a href="#" onClick={close} className="block whitespace-nowrap font-[family-name:var(--font-heading)] text-[length:var(--text-body)] uppercase leading-none tracking-[0.32em] lg:text-[length:var(--text-h3)]">
              {brand}
            </a>
            <button type="button" aria-label={closeText} onClick={close} className="relative -mr-[0.625rem] flex size-[2.75rem] items-center justify-center">
              <div aria-hidden="true" className="absolute h-px w-[1.5rem] rotate-45 bg-current" />
              <div aria-hidden="true" className="absolute h-px w-[1.5rem] -rotate-45 bg-current" />
            </button>
          </div>

          <div style={fadeIn(0)} className="mt-[1rem] flex flex-col gap-[1.5rem] lg:min-h-0 lg:flex-1 lg:flex-row lg:gap-[2rem]">
            {cards.length > 0 && (
              <div className="grid grid-cols-2 gap-[1rem] lg:min-h-0 lg:w-2/3 lg:grid-rows-2 lg:gap-[2rem]">
                {cards.map((item, i) => (
                  <a key={`${i}-${item.href}`} href={item.href} onClick={close} className="group relative block aspect-square overflow-hidden lg:aspect-auto lg:min-h-0">
                    <img src={item.imageSrc} alt="" aria-hidden="true" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
                    <div aria-hidden="true" className="absolute inset-0 bg-black/30 transition-colors duration-300 group-hover:bg-black/50" />
                    <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <div className="flex size-[2.5rem] items-center justify-center rounded-full bg-white text-black lg:size-[3rem]">
                        <ArrowUpRight strokeWidth={2} className="size-[1rem] lg:size-[1.25rem]" />
                      </div>
                    </div>
                    <div className="absolute bottom-[0.75rem] left-[0.75rem] flex w-fit max-w-[calc(100%-1.5rem)] items-baseline gap-[0.5rem] border border-white/10 bg-white/10 px-[0.75rem] py-[0.375rem] backdrop-blur-sm lg:px-[1rem] lg:py-[0.5rem]">
                      <p className="text-[length:var(--text-label)] leading-snug text-white/50">{String(i + 1).padStart(2, "0")}</p>
                      <p className="text-[length:var(--text-body)] leading-snug text-white lg:text-[length:var(--text-h3)]">{item.name}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {rest.length > 0 && (
              <ul className="flex flex-col gap-[0.5rem] lg:w-1/3 lg:gap-[1rem]">
                {rest.map((item, i) => (
                  <li key={`${i}-${item.href}`} className="flex items-baseline gap-[0.5rem] lg:gap-[1rem]">
                    <p className="text-[length:var(--text-small)] leading-snug text-deep-foreground/40">{String(cards.length + i + 1).padStart(2, "0")}</p>
                    <a href={item.href} onClick={close} className="group relative text-[length:var(--text-body)] leading-snug transition-opacity hover:opacity-70 lg:text-[length:var(--text-h2)]">
                      <p>{item.name}</p>
                      <div aria-hidden="true" className="absolute inset-x-0 -bottom-[0.1em] h-px origin-right scale-x-0 bg-accent transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:origin-left group-hover:scale-x-100" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {groups.length > 0 && (
            <div style={fadeIn(0.2)} className="mt-[1.5rem] border-t border-white/10 pt-[1rem] lg:mt-[2rem] lg:pt-[1.5rem]">
              <div className="grid grid-cols-1 gap-[1rem] lg:grid-cols-3 lg:gap-[1.5rem]">
                {groups.map((group) => (
                  <div key={group.title} className="flex flex-col gap-[0.75rem]">
                    <p className="text-[length:var(--text-small)] leading-snug text-deep-foreground/40">{group.title}</p>
                    <div className={group.external ? "flex flex-wrap gap-[1rem]" : "flex flex-col gap-[0.25rem]"}>
                      {group.links.map((link) =>
                        link.href ? (
                          <a
                            key={link.text}
                            href={link.href}
                            onClick={close}
                            {...(group.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                            className={`text-[length:var(--text-body)] leading-snug text-deep-foreground/60 transition-colors hover:text-deep-foreground ${group.external ? "" : "underline"}`}
                          >
                            {link.text}
                          </a>
                        ) : (
                          <p key={link.text} className="text-[length:var(--text-body)] leading-snug">{link.text}</p>
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NavbarEstateLine;
