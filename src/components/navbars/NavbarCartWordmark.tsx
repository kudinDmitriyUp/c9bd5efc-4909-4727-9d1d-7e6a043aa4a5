"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { localMediaSrc } from "@/components/kit/mediaSrc";

type NavItem = { name: string; href: string };
type ShopProduct = { name: string; description: string; price: string; imageSrc: string; imageAlt?: string; href: string; tag?: string };

type NavbarCartWordmarkProps = {
  brand?: string;
  logoSrc?: string;
  homeHref?: string;
  shopItem?: NavItem;
  products?: ShopProduct[];
  shopButton?: { text: string; href: string };
  navItems?: NavItem[];
  accountItem?: NavItem;
  cartText?: string;
  cartCount?: number;
  cartHref?: string;
};

type Ease = [number, number, number, number];
const NAV: Ease = [0.569, 0.006, 0.072, 0.993];
const POWER1_IN: Ease = [0.55, 0.085, 0.68, 0.53];
const MEDIA = "https://storage.googleapis.com/webild/default/templates/prebiotic-soda";

const panelVariants: Variants = {
  open: { height: "auto", opacity: 1, transition: { duration: 0.5, ease: NAV } },
  closed: { height: 0, opacity: 0, transition: { height: { duration: 0.5, ease: NAV }, opacity: { duration: 0.3, ease: POWER1_IN, delay: 0.175 } } },
};

const itemVariants: Variants = {
  open: ([i]: [number, number]) => ({ opacity: 1, y: "0%", transition: { duration: 0.5, ease: NAV, delay: i * 0.06 } }),
  closed: ([i, n]: [number, number]) => ({ opacity: 0, y: "35%", transition: { duration: 0.25, ease: NAV, delay: Math.max(0, n - i) * 0.03 } }),
};

function Wordmark({ src, label, id }: { src: string; label: string; id: string }) {
  return (
    <svg viewBox="0 0 1017 318" role="img" aria-label={label} className="block h-full w-auto">
      <defs>
        <mask id={id}>
          <image href={localMediaSrc(src)} width="1017" height="318" />
        </mask>
      </defs>
      <rect width="1017" height="318" fill="currentColor" mask={`url(#${id})`} />
    </svg>
  );
}

function NavText({ children }: { children: string }) {
  return (
    <div className="-my-[calc(var(--g)*0.125)] flex overflow-clip py-[calc(var(--g)*0.125)]">
      <p className="whitespace-nowrap text-[length:var(--text-body)] leading-[1]">{children}</p>
    </div>
  );
}

export default function NavbarCartWordmark({
  brand = "Weeby",
  logoSrc = `${MEDIA}/img/weeby-logo-white.png`,
  homeHref = "#",
  shopItem = { name: "Shop", href: "#products" },
  products = [
    { name: "Red Berry", description: "Raspberry, red berry and blueberry in one juicy, fizzy sip. 5g sugar, 2g prebiotic fiber and a splash of apple cider vinegar.", price: "$45.99", imageSrc: `${MEDIA}/img/weeby-berry-card.webp`, imageAlt: "Can of Red Berry soda", href: "#products" },
    { name: "Guava Kiwi", description: "Pink guava and ripe kiwi in a sunny, tropical fizz. Lightly sweet, gut-friendly, vacation in a can.", price: "$45.99", imageSrc: `${MEDIA}/img/weeby-guava-card.webp`, imageAlt: "Can of Guava Kiwi soda", href: "#products" },
    { name: "Lemon Lime", description: "Zesty lemon meets bright lime for the crispest sip in the fridge. Tart, sparkly and seriously refreshing.", price: "$45.99", imageSrc: `${MEDIA}/img/weeby-lemon-card.webp`, imageAlt: "Can of Lemon Lime soda", href: "#products" },
    { name: "Variety Pack", description: "All three flavours: 4 cans each of Red Berry, Guava Kiwi and Lemon Lime. One box, every mood covered.", price: "$47.99", imageSrc: `${MEDIA}/img/weeby-variety-card.webp`, imageAlt: "Variety pack box", href: "#products", tag: "Best Seller" },
  ],
  shopButton = { text: "All products", href: "#products" },
  navItems = [{ name: "For Teams", href: "#contact" }],
  accountItem = { name: "Account", href: "#" },
  cartText = "Cart",
  cartCount = 0,
  cartHref = "#",
}: NavbarCartWordmarkProps) {
  const reduce = useReducedMotion();
  const navRef = useRef<HTMLElement>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    let frame = 0;
    const sync = () => {
      frame = 0;
      const line = nav.getBoundingClientRect().bottom + 4;
      const dark = [...document.querySelectorAll('[data-nav-theme="dark"]')].some((el) => {
        const r = el.getBoundingClientRect();
        return r.top <= line && r.bottom > line;
      });
      nav.dataset.dark = dark ? "true" : "false";
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(sync);
    };
    queue();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    };
  }, []);

  const canHover = () => typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

  const cart = (
    <a href={cartHref} className="relative z-[1] block py-[calc(var(--g)*0.25)] min-[30rem]:px-[calc(var(--g)*0.25)]">
      <div className="-my-[calc(var(--g)*0.125)] flex gap-[calc(var(--g)*0.25)] overflow-clip py-[calc(var(--g)*0.125)] text-[length:var(--text-body)] leading-[1]">
        <p>{cartText}</p>
        <p className="before:content-['('] after:content-[')']">{cartCount}</p>
      </div>
    </a>
  );

  return (
      <nav
        ref={navRef}
        aria-label="Main"
        data-dark="false"
        className="fixed inset-x-0 top-0 z-[10000] bg-[color-mix(in_srgb,var(--foreground)_2.5%,var(--background))] text-foreground transition-[color,background-color] duration-[350ms] ease-[ease] [--g:calc(var(--gutter)*0.8)] min-[48rem]:bg-transparent min-[48rem]:data-[dark=true]:text-deep-foreground"
      >
        <div className="relative grid grid-cols-3 items-center gap-[var(--g)] px-[var(--gutter)] py-[var(--g)] min-[48rem]:flex min-[48rem]:justify-between">
          <div className="col-start-2 row-start-1 flex items-center justify-end gap-[var(--g)] min-[48rem]:-ml-[calc(var(--g)*0.25)] min-[48rem]:justify-start">
            <div
              className="relative z-10 flex min-[48rem]:-ml-[calc(var(--g)*0.5)] min-[48rem]:pl-[calc(var(--g)*0.5)]"
              onMouseEnter={() => canHover() && setShopOpen(true)}
              onMouseLeave={() => setShopOpen(false)}
              onFocus={() => setShopOpen(true)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setShopOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setShopOpen(false);
              }}
            >
              <a href={shopItem.href} aria-haspopup="true" aria-expanded={shopOpen} className={`relative z-[1] block py-[calc(var(--g)*0.25)] min-[30rem]:px-[calc(var(--g)*0.25)] transition-colors duration-[350ms] ${shopOpen ? "text-foreground" : ""}`}>
                <NavText>{shopItem.name}</NavText>
              </a>
              {products.length > 0 && (
                <motion.div
                  initial={false}
                  animate={shopOpen ? "open" : "closed"}
                  variants={reduce ? undefined : panelVariants}
                  style={reduce ? { height: shopOpen ? "auto" : 0, opacity: shopOpen ? 1 : 0 } : undefined}
                  inert={!shopOpen}
                  className="absolute left-0 top-0 -mt-[calc(var(--g)*0.5)] w-[calc(var(--g)*22.5)] overflow-hidden rounded-[calc(var(--g)*0.25)] bg-background text-foreground"
                >
                  <div className="flex flex-col gap-[calc(var(--g)*2)] px-[calc(var(--g)*0.5)] pb-[calc(var(--g)*0.5)] pt-[calc(var(--g)*3)]">
                    <div className="grid grid-cols-1 gap-[1rem]">
                      {products.map((product, i) => (
                        <motion.a key={i} href={product.href} custom={[i, products.length]} variants={reduce ? undefined : itemVariants} className="flex flex-col gap-[calc(var(--g)*0.5)]">
                          <div className="relative flex h-[calc(var(--g)*10.625)] items-center justify-center overflow-hidden rounded-[0.2rem] bg-card">
                            {product.tag && (
                              <div className="absolute left-[calc(var(--g)*0.5)] top-[calc(var(--g)*0.5)] z-[1] flex items-center gap-[calc(var(--g)*0.5)] rounded-[calc(var(--g)*0.25)] bg-white/65 p-[calc(var(--g)*0.5)] text-[oklch(from_var(--accent)_min(l,0.55)_c_h)]">
                                <svg aria-hidden="true" viewBox="0 0 8 8" className="size-[calc(var(--g)*0.625)]">
                                  <path fill="currentColor" d="M4.54,1.99l1.46-1.45-.53,1.99,1.99-.53-1.45,1.46,1.99.54-1.99.54,1.45,1.46-1.99-.53.53,1.99-1.46-1.46-.54,1.99-.54-1.99-1.46,1.46.53-1.99-1.99.53,1.46-1.46-1.99-.54,1.99-.54-1.46-1.46,1.99.53-.53-1.99,1.46,1.46.54-1.99.54,1.99ZM4,2.94c-.59,0-1.06.48-1.06,1.06,0,.59.48,1.06,1.06,1.06.59,0,1.06-.48,1.06-1.06,0-.59-.48-1.06-1.06-1.06Z" />
                                </svg>
                                <p className="text-[length:var(--text-small)] leading-[1]">{product.tag}</p>
                              </div>
                            )}
                            <img src={localMediaSrc(product.imageSrc)} alt={product.imageAlt ?? product.name} loading="lazy" decoding="async" className="h-full w-auto" />
                          </div>
                          <div className="flex items-start justify-between gap-[calc(var(--g)*0.5)]">
                            <div className="flex flex-col gap-[calc(var(--g)*0.125)]">
                              <p className="text-[length:var(--text-label)] font-medium leading-[1]">{product.name}</p>
                              <p className="text-[length:var(--text-small)] leading-[1]">{product.description}</p>
                            </div>
                            <p className="whitespace-nowrap text-[length:var(--text-label)] font-medium leading-[1]">{product.price}</p>
                          </div>
                        </motion.a>
                      ))}
                    </div>
                    {shopButton && (
                      <motion.a href={shopButton.href} custom={[products.length, products.length]} variants={reduce ? undefined : itemVariants} className="btn-primary w-full">
                        <p className="btn-label">{shopButton.text}</p>
                      </motion.a>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
            {navItems.map((item, i) => (
              <a key={i} href={item.href} className="relative z-[1] block py-[calc(var(--g)*0.25)] min-[30rem]:px-[calc(var(--g)*0.25)]">
                <NavText>{item.name}</NavText>
              </a>
            ))}
          </div>

          <div className="col-start-1 row-start-1 flex items-center min-[48rem]:pointer-events-none min-[48rem]:absolute min-[48rem]:inset-0 min-[48rem]:justify-center">
            <a href={homeHref} className="pointer-events-auto relative block h-[calc(var(--g)*1.25)]">
              <Wordmark src={logoSrc} label={brand} id={`wm${uid}`} />
            </a>
          </div>

          <div className="col-start-3 row-start-1 flex items-center justify-end gap-[var(--g)] min-[30rem]:justify-start min-[48rem]:-mr-[calc(var(--g)*0.25)] min-[48rem]:justify-end">
            {accountItem && (
              <a href={accountItem.href} className="relative z-[1] block py-[calc(var(--g)*0.25)] min-[30rem]:px-[calc(var(--g)*0.25)]">
                <NavText>{accountItem.name}</NavText>
              </a>
            )}
            {cart}
          </div>
        </div>
      </nav>
  );
}
