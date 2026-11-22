"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Media from "@/components/kit/Media";
import useMenuDialog from "@/components/kit/useMenuDialog";

type Link = { text: string; href: string };
type Photo = { imageSrc: string; imageAlt?: string };

type NavbarStackedWordmarkProps = {
  brandFirst?: string;
  brandLast?: string;
  badge?: string;
  badgeNote?: string;
  button?: Link;
  links?: Link[];
  images?: Photo[];
  note?: string;
  socials?: Link[];
};

const BUCKET = "https://storage.googleapis.com/webild/default/templates/racing-driver";

const BagIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 fill-none stroke-current [stroke-width:1.5]">
    <path d="M3 5.5h10l-.8 8.5H3.8L3 5.5Z M5.5 5.5V4a2.5 2.5 0 0 1 5 0v1.5" />
  </svg>
);

const Wordmark = ({ first, last }: { first: string; last: string }) => (
  <div className="flex flex-col uppercase leading-[0.82]">
    <p className="font-[family-name:var(--font-serif)] text-[1.5rem] tracking-[-0.01em] lg:text-[2.1rem]">{first}</p>
    <p className="font-[family-name:var(--font-heading)] text-[1.25rem] tracking-[-0.03em] lg:text-[1.75rem]">{last}</p>
  </div>
);

export default function NavbarStackedWordmark({
  brandFirst = "Lewis",
  brandLast = "Hamilton",
  badge = "44",
  badgeNote = "Scuderia Ferrari since 2025",
  button = { text: "Store", href: "#footer" },
  links = [
    { text: "Home", href: "#hero" },
    { text: "On track", href: "#product" },
    { text: "Off track", href: "#gallery" },
    { text: "Calendar", href: "#metrics" },
  ],
  images = [
    { imageSrc: `${BUCKET}/helmet-portrait-1600.webp`, imageAlt: "Driver in his race helmet" },
    { imageSrc: `${BUCKET}/driver-portrait-1600.webp`, imageAlt: "Driver portrait" },
    { imageSrc: `${BUCKET}/race-car-front-1600.webp`, imageAlt: "The race car from the front" },
    { imageSrc: `${BUCKET}/race-car-rear-1600.webp`, imageAlt: "The race car from behind" },
  ],
  note = "Business enquiries",
  socials = [
    { text: "Instagram", href: "https://instagram.com" },
    { text: "X", href: "https://x.com" },
    { text: "YouTube", href: "https://youtube.com" },
    { text: "TikTok", href: "https://tiktok.com" },
  ],
}: NavbarStackedWordmarkProps) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useMenuDialog(open, panelRef, () => setOpen(false));

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    let queued = 0;
    const tone = () => {
      queued = 0;
      const y = 40;
      const light = Array.from(document.querySelectorAll<HTMLElement>("[data-nav-light]")).some((el) => {
        const r = el.getBoundingClientRect();
        return el.dataset.navLight === "top" ? r.top > -40 && r.top <= y : r.top <= y && r.bottom >= y;
      });
      header.toggleAttribute("data-light", light);
    };
    const onScroll = () => {
      if (!queued) queued = requestAnimationFrame(tone);
    };
    tone();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(queued);
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
    };
  }, []);

  const item = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: "0.75rem" },
    animate: { opacity: 1, y: 0 },
    transition: { type: "spring" as const, stiffness: 170, damping: 24, delay: 0.12 + i * 0.055 },
  });

  return (
    <>
      <header ref={headerRef} className="group pointer-events-none fixed inset-x-0 top-0 z-[45] flex items-start justify-between px-6 py-5 text-foreground transition-colors duration-300 data-[light]:text-secondary-foreground">
        <a href="#hero" aria-label={`${brandFirst} ${brandLast} home`} className="pointer-events-auto">
          <Wordmark first={brandFirst} last={brandLast} />
        </a>
        <p aria-hidden="true" className="absolute left-1/2 top-[1.4rem] hidden -translate-x-1/2 -skew-x-[10deg] font-[family-name:var(--font-heading)] text-[1.9rem] font-black leading-none tracking-[-0.06em] [font-stretch:125%] lg:block">
          {badge}
        </p>
        <div className="pointer-events-auto flex items-center gap-2.5">
          {button && (
            <a href={button.href} className="btn-primary !h-11 !gap-2 !px-4 lg:!h-[3.25rem] lg:!px-[1.4rem]">
              <BagIcon />
              <p className="btn-label">{button.text}</p>
            </a>
          )}
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="flex size-11 flex-col items-end justify-center gap-[0.35rem] rounded-[var(--radius-button)] border-[1.5px] border-current pr-[0.95rem] lg:size-[3.25rem]"
          >
            <div className="h-[1.5px] w-[1.15rem] bg-current" />
            <div className="h-[1.5px] w-3 bg-current" />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 190, damping: 26 }}
            className="fixed inset-0 z-[60] bg-background text-foreground"
          >
            <div className="absolute inset-x-0 top-0 z-[2] flex items-start justify-between px-6 py-5">
              <a href="#hero" onClick={() => setOpen(false)} aria-label={`${brandFirst} ${brandLast} home`}>
                <Wordmark first={brandFirst} last={brandLast} />
              </a>
              <div className="flex items-center gap-2.5">
                {button && (
                  <a href={button.href} onClick={() => setOpen(false)} className="btn-primary !h-11 !gap-2 !px-4 lg:!h-[3.25rem] lg:!px-[1.4rem]">
                    <BagIcon />
                    <p className="btn-label">{button.text}</p>
                  </a>
                )}
                <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="relative size-11 rounded-[var(--radius-button)] bg-primary text-primary-foreground lg:size-[3.25rem]">
                  <div className="absolute left-1/2 top-1/2 h-[1.5px] w-[1.1rem] -translate-x-1/2 rotate-45 bg-current" />
                  <div className="absolute left-1/2 top-1/2 h-[1.5px] w-[1.1rem] -translate-x-1/2 -rotate-45 bg-current" />
                </button>
              </div>
            </div>

            <div className="absolute inset-0 grid grid-cols-1 content-center items-center gap-8 px-6 pb-6 pt-24 min-[56.25rem]:grid-cols-2 min-[56.25rem]:content-normal">
              <div className="ml-2 hidden w-[min(100%,72vh)] grid-cols-2 gap-7 justify-self-start min-[56.25rem]:grid">
                {images.map((image, i) => (
                  <Media
                    key={i}
                    src={image.imageSrc}
                    alt={image.imageAlt ?? ""}
                    loading="lazy"
                    decoding="async"
                    sizes="20vw"
                    className="aspect-square w-full rounded-[var(--radius-image)] object-cover [filter:grayscale(1)_sepia(0.18)_contrast(1.05)_brightness(0.85)] transition-[filter] duration-[400ms] hover:[filter:none]"
                  />
                ))}
              </div>
              <nav aria-label="Menu" className="flex flex-col items-center text-center">
                <ul className="flex flex-col items-center gap-[0.2rem]">
                  {links.map((link, i) => (
                    <motion.li key={i} {...item(i)}>
                      <a
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className={`relative inline-block font-[family-name:var(--font-heading)] text-[clamp(2.75rem,5vw,5.25rem)] uppercase leading-[0.95] tracking-[-0.02em] transition-colors duration-200 hover:text-accent ${i === 0 ? "after:absolute after:inset-x-[-2%] after:top-[52%] after:h-[0.09em] after:-rotate-2 after:rounded-sm after:bg-accent" : ""}`}
                      >
                        {link.text}
                      </a>
                    </motion.li>
                  ))}
                </ul>
                <div className="mt-9 flex flex-col items-center gap-2 text-[0.625rem] font-bold uppercase tracking-[0.16em] text-foreground/55">
                  <p aria-hidden="true" className="-skew-x-[10deg] font-[family-name:var(--font-heading)] text-[1.9rem] font-black tracking-[-0.06em] text-accent [font-stretch:125%]">
                    {badge}
                  </p>
                  <p>{badgeNote}</p>
                </div>
              </nav>
            </div>

            <div className="absolute bottom-7 right-0 flex w-full flex-col items-center gap-4 text-[length:var(--text-label)] font-bold uppercase tracking-[0.12em] min-[56.25rem]:w-1/2">
              <p>{note}</p>
              <ul className="flex gap-8 text-foreground/75">
                {socials.map((link, i) => (
                  <li key={i}>
                    <a href={link.href} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-accent">
                      {link.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
