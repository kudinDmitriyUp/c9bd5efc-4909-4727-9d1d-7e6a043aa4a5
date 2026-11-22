"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import ScrambleText from "@/components/animation/ScrambleText";

type NavItem = { name: string; href: string };

type NavbarClockBarProps = {
  brand: string;
  tagline?: string;
  navItems: NavItem[];
  link?: { text: string; href: string };
  timeZone?: string;
  timeLabel?: string;
  menuText?: string;
  closeText?: string;
  introDelay?: number;
  transparentTop?: boolean;
};

const wipeEase = [0.5, 0, 0, 1] as const;
const navEase = [0.32, 0, 0.16, 1] as const;
const COLUMNS = 6;

const useClock = (timeZone?: string) => {
  const [parts, setParts] = useState<{ hour: string; minute: string; period: string } | null>(null);
  useEffect(() => {
    const format = () => {
      try {
        const formatted = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone }).formatToParts(new Date());
        const get = (type: string) => formatted.find((part) => part.type === type)?.value ?? "";
        setParts({ hour: get("hour"), minute: get("minute"), period: get("dayPeriod").toLowerCase() });
      } catch {
        setParts(null);
      }
    };
    format();
    const id = window.setInterval(format, 10000);
    return () => window.clearInterval(id);
  }, [timeZone]);
  return parts;
};

const NavbarClockBar = ({
  brand,
  tagline,
  navItems,
  link,
  timeZone = "UTC",
  timeLabel = "GMT",
  menuText = "menu",
  closeText = "close",
  introDelay = 0,
  transparentTop = false,
}: NavbarClockBarProps) => {
  const reduce = useReducedMotion();
  const clock = useClock(timeZone);
  const { scrollY } = useScroll();
  const solid = useTransform(scrollY, [0, 48], [0, 1]);
  const wash = useTransform(solid, (v) => 1 - v);
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [openWidth, setOpenWidth] = useState(256);
  const barRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const [hovered, setHovered] = useState<number | null>(null);
  const [curtain, setCurtain] = useState<"idle" | "in" | "out">("idle");

  useMotionValueEvent(scrollY, "change", () => {
    if (open && curtain === "idle") setOpen(false);
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const jump = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    setOpen(false);
    if (!href.startsWith("#") || reduce) return;
    const target = href === "#" ? document.body : document.getElementById(decodeURIComponent(href.slice(1)));
    if (!target) return;
    event.preventDefault();
    setCurtain("in");
    const total = (0.5 + 0.06 * (COLUMNS - 1)) * 1000;
    timers.current.push(
      window.setTimeout(() => {
        const top = href === "#" ? 0 : target.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top, behavior: "instant" as ScrollBehavior });
        timers.current.push(window.setTimeout(() => setCurtain("out"), 400), window.setTimeout(() => setCurtain("idle"), 400 + total));
      }, total),
    );
  };

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  return (
    <>
      <motion.nav
        aria-label="Main"
        initial={reduce ? false : { clipPath: "inset(0% 100% 0% 0%)" }}
        animate={{ clipPath: revealed || reduce ? "none" : "inset(0% 0% 0% 0%)" }}
        transition={revealed || reduce ? { duration: 0 } : { duration: 0.65, ease: wipeEase, delay: introDelay }}
        onAnimationComplete={() => setRevealed(true)}
        className={transparentTop ? "fixed inset-x-0 top-0 z-50 text-foreground" : "fixed inset-x-0 top-0 z-50 bg-background text-foreground"}
      >
        {transparentTop && (
          <>
            <motion.div aria-hidden="true" style={{ opacity: wash }} className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[calc(100%+2rem)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--background)_78%,transparent)_0%,color-mix(in_srgb,var(--background)_45%,transparent)_55%,transparent_100%)]" />
            <motion.div aria-hidden="true" style={{ opacity: solid }} className="pointer-events-none absolute inset-0 -z-10 bg-background" />
          </>
        )}
        <div ref={barRef} className="relative mx-auto grid h-[clamp(64px,5.3vw,76px)] w-[var(--container)] grid-cols-[1fr_auto] items-center gap-[var(--gap)] md:grid-cols-12">
          <div className="flex min-w-0 items-center gap-[clamp(0.75rem,1.2vw,1rem)] md:col-span-6 lg:col-span-5">
            <a href="#" onClick={(event) => jump(event, "#")} className="min-w-0">
              <p className="truncate font-[family-name:var(--font-body)] text-[length:var(--text-body)] font-medium leading-[1.5] tracking-normal">{brand}</p>
            </a>
            {tagline && (
              <>
                <div aria-hidden="true" className="hidden size-[4px] shrink-0 bg-current opacity-48 sm:block" />
                <p className="hidden min-w-0 truncate whitespace-nowrap font-[family-name:var(--font-body)] text-[length:var(--text-small)] font-normal leading-[1.7] tracking-normal text-muted-foreground sm:block">{tagline}</p>
              </>
            )}
          </div>

          {link && (
            <a href={link.href} onClick={(event) => jump(event, link.href)} className="hidden text-muted-foreground transition-colors duration-300 hover:text-foreground lg:col-span-3 lg:col-start-7 lg:block">
              <ScrambleText text={link.text} trigger="hover" duration={Math.max(0.3, link.text.length / 20)} className="whitespace-nowrap font-[family-name:var(--font-body)] text-[length:var(--text-small)] font-normal leading-[1.7] tracking-normal" />
            </a>
          )}

          {clock && (
            <div aria-hidden="true" className="hidden text-muted-foreground md:col-span-3 md:col-start-8 md:flex lg:col-span-2 lg:col-start-10">
              <p aria-hidden="true" className="whitespace-nowrap font-[family-name:var(--font-body)] text-[length:var(--text-small)] font-normal leading-[1.7] tracking-normal">{`${timeLabel}\u00a0${clock.hour}`}</p>
              <motion.p
                aria-hidden="true"
                animate={reduce ? undefined : { opacity: [1, 1, 0, 0] }}
                transition={{ duration: 2, ease: "linear", times: [0, 0.5, 0.5, 1], repeat: Infinity }}
                className="whitespace-nowrap font-[family-name:var(--font-body)] text-[length:var(--text-small)] font-normal leading-[1.7] tracking-normal"
              >
                :
              </motion.p>
              <p aria-hidden="true" className="whitespace-nowrap font-[family-name:var(--font-body)] text-[length:var(--text-small)] font-normal leading-[1.7] tracking-normal">{`${clock.minute}\u00a0${clock.period}`}</p>
            </div>
          )}

          <div className="relative h-[28px] w-[64px] justify-self-end md:col-span-1 md:col-start-12">
            <motion.div
              initial={false}
              animate={{ width: open ? openWidth : 64, height: open ? 28 + 8 + navItems.length * 32 + (openWidth > 256 ? 8 : 0) : 28 }}
              transition={{ duration: 0.4, ease: navEase }}
              className="absolute right-0 top-0 max-w-[calc(100vw-2*var(--gutter))] overflow-hidden bg-[color-mix(in_srgb,var(--foreground)_8%,var(--background))]"
            >
              <button
                type="button"
                onClick={() => {
                  const width = barRef.current?.clientWidth ?? 256;
                  setOpenWidth(window.matchMedia("(min-width: 768px)").matches ? 256 : width);
                  setOpen((value) => !value);
                }}
                aria-expanded={open}
                aria-label={open ? closeText : menuText}
                className="absolute right-0 top-0 flex h-[28px] w-[64px] items-center justify-center"
              >
                <p className="font-[family-name:var(--font-body)] text-[length:var(--text-small)] font-medium leading-none">{open ? closeText : menuText}</p>
              </button>
              <AnimatePresence>
                {open && (
                  <motion.ul exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-x-0 top-[32px] flex flex-col px-[0.75rem]" onMouseLeave={() => setHovered(null)}>
                    {navItems.map((item, index) => (
                      <motion.li
                        key={item.href + index}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: hovered === null || hovered === index ? 1 : 0.28, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.25, delay: hovered === null ? 0.2 + index * 0.04 : 0 }}
                        onMouseEnter={() => setHovered(index)}
                      >
                        <a href={item.href} onClick={(event) => jump(event, item.href)} className="flex h-[32px] items-center">
                          <p className="truncate font-[family-name:var(--font-body)] text-[length:var(--text-body)] font-medium leading-none pb-[0.2em] -mb-[0.2em]">{item.name}</p>
                        </a>
                      </motion.li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </motion.nav>

      {curtain !== "idle" && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[110] grid grid-cols-6">
          {Array.from({ length: COLUMNS }, (_, i) => (
            <motion.div
              key={i}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: curtain === "in" ? 1 : 0 }}
              transition={{ duration: 0.5, ease: navEase, delay: curtain === "in" ? i * 0.06 : (COLUMNS - 1 - i) * 0.06 }}
              className={curtain === "in" ? "h-full origin-top bg-muted" : "h-full origin-bottom bg-muted"}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default NavbarClockBar;
