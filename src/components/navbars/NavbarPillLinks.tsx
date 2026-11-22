"use client";

import { useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { Dribbble, Facebook, Github, Globe, Instagram, Linkedin, Mail, Twitter, Youtube, type LucideIcon } from "lucide-react";
import { socialName, type SocialPlatform } from "@/components/shared/socialPlatforms";
import useMenuDialog from "@/components/kit/useMenuDialog";
import MoreArrowPill from "@/components/kit/MoreArrowPill";

type NavItem = { name: string; href: string };
type Button = { text: string; href: string };
type Social = { platform: SocialPlatform; href: string };

type NavbarPillLinksProps = {
  brand?: string;
  navItems?: NavItem[];
  primaryButton?: Button;
  socials?: Social[];
  menuText?: string;
  closeText?: string;
};

const socialIcons: Partial<Record<SocialPlatform, LucideIcon>> = { instagram: Instagram, linkedin: Linkedin, facebook: Facebook, youtube: Youtube, x: Twitter, github: Github, dribbble: Dribbble, email: Mail };

const EASE = [0.19, 1, 0.22, 1] as const;

const NavbarPillLinks = ({
  brand = "Verde",
  navItems = [
    { name: "Nutrition", href: "#product" },
    { name: "Benefits", href: "#services" },
    { name: "Reviews", href: "#testimonial" },
  ],
  primaryButton = { text: "Shop all", href: "#pricing" },
  socials = [],
  menuText = "Menu",
  closeText = "Close",
}: NavbarPillLinksProps) => {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const hidden = useRef(false);
  const shift = useMotionValue(0);
  const { scrollY } = useScroll();
  useMenuDialog(open, panelRef, () => setOpen(false));

  useMotionValueEvent(scrollY, "change", (value) => {
    const previous = scrollY.getPrevious() ?? 0;
    const hide = !open && value > 120 && value > previous;
    if (hide === hidden.current) return;
    hidden.current = hide;
    animate(shift, hide ? -160 : 0, { duration: reduce ? 0 : 0.6, ease: EASE });
  });

  return (
    <>
      <motion.nav
        aria-label="Main"
        style={{ y: shift }}
        className="fixed inset-x-0 top-0 z-50 px-[var(--gutter)] pt-[clamp(1.25rem,2.6vw,2.5rem)]"
      >
        <div className="flex items-center justify-between gap-[1rem] min-[94.5rem]:grid min-[94.5rem]:grid-cols-[1fr_auto_1fr]">
          <div className="flex min-w-0 items-center gap-[0.75rem]">
            <a href="#" className="min-w-0">
              <p className="truncate font-[family-name:var(--font-heading)] text-[length:var(--text-body-lg)] font-semibold leading-none tracking-[-0.02em] text-foreground pb-[0.2em] -mb-[0.2em]">{brand}</p>
            </a>
            {socials.length > 0 && (
              <div className="hidden items-center gap-[0.3rem] min-[94.5rem]:flex">
                {socials.map((social, i) => {
                  const Icon = socialIcons[social.platform] ?? Globe;
                  return (
                    <motion.a
                      key={`${i}-${social.href}`}
                      href={social.href}
                      aria-label={socialName(social.platform)}
                      initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.3 + i * 0.08 }}
                      className="flex size-[clamp(2.5rem,2.2rem+1vw,3rem)] items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors duration-300 hover:bg-primary hover:text-primary-foreground"
                    >
                      <Icon aria-hidden="true" className="size-[1.1rem]" strokeWidth={1.8} />
                    </motion.a>
                  );
                })}
              </div>
            )}
          </div>

          {navItems.length > 0 && (
            <ul className="hidden items-center gap-[0.6rem] min-[94.5rem]:flex">
              {navItems.map((item, i) => (
                <motion.li
                  key={`${i}-${item.href}`}
                  initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.3 + i * 0.08 }}
                >
                  <a
                    href={item.href}
                    className="flex h-[2.25rem] items-center rounded-full bg-background/70 px-[0.7em] font-[family-name:var(--font-label)] text-[length:var(--text-label)] font-semibold leading-none tracking-[var(--label-tracking)] text-foreground transition-colors duration-300 hover:bg-background"
                  >
                    <p className="whitespace-nowrap">{item.name}</p>
                  </a>
                </motion.li>
              ))}
            </ul>
          )}

          <div className="flex shrink-0 items-center justify-end gap-[0.4rem]">
            {primaryButton && <MoreArrowPill text={primaryButton.text} href={primaryButton.href} tone="light" />}
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? closeText : menuText}
              onClick={() => setOpen((value) => !value)}
              className="relative flex size-[clamp(2.5rem,2.2rem+1vw,3rem)] items-center justify-center rounded-full bg-primary text-primary-foreground min-[94.5rem]:hidden"
            >
              <div aria-hidden="true" className={`absolute h-[1.5px] w-[1rem] bg-current transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] ${open ? "rotate-45" : "-translate-y-[0.2rem]"}`} />
              <div aria-hidden="true" className={`absolute h-[1.5px] w-[1rem] bg-current transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] ${open ? "-rotate-45" : "translate-y-[0.2rem]"}`} />
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {open && (
          <motion.div
            key="sheet"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={menuText}
            initial={reduce ? { opacity: 0 } : { y: "-100%" }}
            animate={reduce ? { opacity: 1 } : { y: "0%" }}
            exit={reduce ? { opacity: 0 } : { y: "-100%" }}
            transition={{ duration: 0.8, ease: EASE }}
            className="fixed inset-x-0 top-0 z-[45] flex h-svh flex-col bg-card px-[var(--gutter)] pb-[2.5rem] pt-[clamp(6.5rem,20vw,8rem)] text-card-foreground min-[94.5rem]:hidden"
          >
            <ul className="flex flex-col gap-[0.5rem]">
              {navItems.map((item, i) => (
                <li key={`${i}-${item.href}`} className="overflow-hidden pb-[0.15em] -mb-[0.15em]">
                  <motion.a
                    href={item.href}
                    onClick={() => setOpen(false)}
                    initial={reduce ? false : { y: "110%" }}
                    animate={{ y: "0%" }}
                    transition={{ duration: 0.9, ease: EASE, delay: 0.25 + i * 0.06 }}
                    className="block font-[family-name:var(--font-heading)] text-[length:var(--text-h2)] font-semibold uppercase leading-[0.9] tracking-[-0.02em] [overflow-wrap:anywhere]"
                  >
                    {item.name}
                  </motion.a>
                </li>
              ))}
            </ul>
            {socials.length > 0 && (
              <div className="mt-auto flex items-center gap-[0.4rem]">
                {socials.map((social, i) => {
                  const Icon = socialIcons[social.platform] ?? Globe;
                  return (
                    <a
                      key={`${i}-${social.href}`}
                      href={social.href}
                      aria-label={socialName(social.platform)}
                      className="flex size-[3rem] items-center justify-center rounded-full bg-secondary text-secondary-foreground"
                    >
                      <Icon aria-hidden="true" className="size-[1.1rem]" strokeWidth={1.8} />
                    </a>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NavbarPillLinks;
