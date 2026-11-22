"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import useMenuDialog from "@/components/kit/useMenuDialog";
import { Dribbble, Facebook, Github, Globe, Instagram, Linkedin, Mail, Twitter, Youtube, type LucideIcon } from "lucide-react";
import { socialName, type SocialPlatform } from "@/components/shared/socialPlatforms";

type NavItem = { name: string; href: string };


type Social = { platform: SocialPlatform; href: string };

interface NavbarDropLogoProps {
  brand: string;
  navItems: NavItem[];
  menuText?: string;
  closeText?: string;
  cta?: { text: string; href: string };
  socials?: Social[];
}

const socialIcons: Partial<Record<SocialPlatform, LucideIcon>> = { instagram: Instagram, linkedin: Linkedin, facebook: Facebook, youtube: Youtube, x: Twitter, github: Github, dribbble: Dribbble, email: Mail };


const power3Out = [0.215, 0.61, 0.355, 1] as const;
const power3In = [0.55, 0.055, 0.675, 0.19] as const;
const power2Out = [0.33, 1, 0.68, 1] as const;
const rollEase = [0.43, 0.195, 0.02, 1] as const;
const swapEase = [0.5, 0, 0, 1] as const;

const NavbarDropLogo = ({ brand, navItems, menuText = "Navigate", closeText = "Close", cta, socials = [] }: NavbarDropLogoProps) => {
  const [open, setOpen] = useState(false);
  const [away, setAway] = useState(false);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const letters = [...brand];
  const edge = Math.max(1, Math.floor((letters.length - 1) / 2));
  const sideLinks = navItems.slice(0, 3);
  const panelRef = useRef<HTMLDivElement>(null);

  useMotionValueEvent(scrollY, "change", (value) => setAway(value > 50));

  useMenuDialog(open, panelRef, () => setOpen(false));

  const tucked = away && !open;

  return (
    <>
      <nav aria-label="Main" className="fixed inset-x-0 top-0 z-50 isolate text-foreground">
        <motion.div
          aria-hidden="true"
          initial={false}
          animate={{ opacity: tucked ? 1 : 0 }}
          transition={{ duration: tucked ? 0.45 : 0.35, ease: tucked ? power2Out : power3In }}
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[calc(100%+clamp(1.5rem,3vw,2.5rem))] bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--background)_70%,transparent),transparent)]"
        />
        <div className="mx-auto grid w-[var(--container)] grid-cols-[1fr_auto_1fr] items-center gap-[var(--gap)] pt-[clamp(1.25rem,3.3vw,2.5rem)]">
          <motion.div
            initial={reduce ? false : { y: "-100%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1, x: tucked ? "-1rem" : "0rem" }}
            transition={{ y: { duration: 0.8, ease: power3Out }, opacity: { duration: 0.8, ease: power3Out }, x: { duration: 0.45, ease: power2Out } }}
            className={socials.length ? "hidden min-w-0 items-center gap-[clamp(0.75rem,1.4vw,1.25rem)] lg:flex" : "hidden min-w-0 items-center gap-[clamp(1.25rem,2.2vw,2rem)] lg:flex"}
          >
            {socials.length
              ? socials.map((social) => {
                  const Icon = socialIcons[social.platform] ?? Globe;
                  return (
                    <a
                      key={`${social.platform}-${social.href}`}
                      href={social.href}
                      aria-label={socialName(social.platform)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex size-[28px] items-center justify-center transition-opacity duration-300 hover:opacity-60"
                    >
                      <Icon aria-hidden="true" className="size-[15px]" strokeWidth={1.5} />
                    </a>
                  );
                })
              : sideLinks.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="whitespace-nowrap font-[family-name:var(--font-body)] text-[length:var(--text-label)] font-semibold leading-[2] tracking-[var(--label-tracking)] [text-transform:var(--label-case)] transition-opacity duration-300 hover:opacity-60"
                  >
                    {item.name}
                  </a>
                ))}
          </motion.div>

          <a href="#" aria-label={brand} className="col-start-2 flex justify-center overflow-hidden py-[0.1em]">
            {letters.map((char, i) => {
              const fromEdge = Math.min(i, letters.length - 1 - i);
              return (
                <motion.div
                  key={i}
                  aria-hidden="true"
                  style={{ fontSize: `min(var(--text-h3), ${(70 / letters.length).toFixed(2)}vw)` }}
                  initial={reduce ? false : { y: "100%" }}
                  animate={{ y: tucked ? "-110%" : "0%" }}
                  transition={
                    tucked
                      ? { duration: 0.35, ease: power3In, delay: (fromEdge / edge) * 0.04 }
                      : { duration: 0.8, ease: power3Out, delay: ((edge - fromEdge) / edge) * 0.1 }
                  }
                  className="pointer-events-none inline-block whitespace-pre font-[family-name:var(--font-heading)] text-[length:var(--text-h3)] [font-weight:var(--heading-weight)] uppercase leading-none tracking-[0.18em]"
                >
                  {char}
                </motion.div>
              );
            })}
          </a>

          <motion.div
            initial={reduce ? false : { y: "-100%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1, x: tucked ? "1rem" : "0rem" }}
            transition={{ y: { duration: 0.8, ease: power3Out, delay: 0.1 }, opacity: { duration: 0.8, ease: power3Out, delay: 0.1 }, x: { duration: 0.45, ease: power2Out } }}
            className="col-start-3 flex justify-end"
          >
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-label={open ? closeText : menuText}
              className="group flex min-h-[44px] items-center gap-[clamp(0.75rem,1.4vw,1.25rem)]"
            >
              <div aria-hidden="true" className="relative hidden overflow-hidden sm:block">
                <motion.p
                  animate={{ y: open ? "-100%" : "0%", skewY: open ? 3 : 0 }}
                  transition={{ duration: 1, ease: swapEase }}
                  className="whitespace-nowrap font-[family-name:var(--font-body)] text-[length:var(--text-label)] font-semibold leading-[2] tracking-[var(--label-tracking)] [text-transform:var(--label-case)]"
                >
                  {menuText}
                </motion.p>
                <motion.p
                  initial={false}
                  animate={{ y: open ? "-100%" : "0%", skewY: open ? 0 : 3 }}
                  transition={{ duration: 1, ease: swapEase }}
                  className="absolute left-0 top-full whitespace-nowrap font-[family-name:var(--font-body)] text-[length:var(--text-label)] font-semibold leading-[2] tracking-[var(--label-tracking)] [text-transform:var(--label-case)]"
                >
                  {closeText}
                </motion.p>
              </div>
              <motion.div
                aria-hidden="true"
                animate={{ rotate: open ? 270 : 0 }}
                transition={{ duration: 1, ease: rollEase }}
                className="relative h-[12px] w-[18px]"
              >
                <motion.div
                  animate={open ? { top: "50%", rotate: 45, y: "-50%" } : { top: "0%", rotate: 0, y: "0%" }}
                  transition={{ duration: 1, ease: rollEase }}
                  className="absolute left-0 h-px w-full bg-current"
                />
                <motion.div
                  animate={{ opacity: open ? 0 : 1 }}
                  transition={{ duration: 0.3 }}
                  className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current transition-[width] duration-500 group-hover:w-1/2"
                />
                <motion.div
                  animate={open ? { top: "50%", rotate: -45, y: "-50%" } : { top: "100%", rotate: 0, y: "-100%" }}
                  transition={{ duration: 1, ease: rollEase }}
                  className="absolute left-0 h-px w-full bg-current"
                />
              </motion.div>
            </button>
          </motion.div>
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: rollEase }}
            className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-background text-foreground"
          >
            <div className="mx-auto flex w-[var(--container)] flex-1 flex-col justify-center gap-[clamp(0.5rem,2svh,1.25rem)] py-[clamp(6rem,16svh,9rem)]">
              {navItems.map((item, index) => (
                <div key={item.name} className="overflow-hidden pb-[0.1em]">
                  <motion.a
                    href={item.href}
                    onClick={() => setOpen(false)}
                    initial={{ y: "110%" }}
                    animate={{ y: "0%" }}
                    transition={{ duration: 0.9, ease: power3Out, delay: 0.2 + index * 0.06 }}
                    className="block font-[family-name:var(--font-heading)] text-[length:min(var(--text-h1),12vw)] [font-weight:var(--heading-weight)] capitalize leading-[1.1] tracking-[var(--heading-tracking)] text-balance transition-opacity duration-300 hover:opacity-60"
                  >
                    {item.name}
                  </motion.a>
                </div>
              ))}
              {cta && (
                <motion.a
                  href={cta.href}
                  onClick={() => setOpen(false)}
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.75, ease: power2Out, delay: 0.4 + navItems.length * 0.06 }}
                  className="btn-primary mt-[clamp(1.5rem,4svh,3rem)] self-start"
                >
                  {cta.text}
                </motion.a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NavbarDropLogo;
