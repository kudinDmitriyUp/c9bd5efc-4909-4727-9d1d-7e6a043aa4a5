"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, ArrowRight, User, Heart, ShoppingBag } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface NavbarStoreProps {
  logo?: string;
  announcements?: string[];
  navItems?: { name: string; href: string }[];
  ctaButton?: { text: string; href: string };
  menuText?: string;
}


const DEFAULT_NAV_ITEMS = [
  { name: "Shop", href: "#shop" },
  { name: "New", href: "#new" },
  { name: "About", href: "#about" },
  { name: "Contact", href: "#contact" },
];

const DEFAULT_CTA = { text: "Shop now", href: "#shop" };

const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string, onClose?: () => void) => {
  if (href.startsWith("#")) {
    e.preventDefault();
    const element = document.getElementById(href.slice(1));
    onClose?.();
    // motion measures the closing menu (`height: auto`) and restores the scroll
    // position it saved — a scroll started in the same tick is cancelled.
    window.setTimeout(() => element?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    return;
  }
  if (href.startsWith("/#") && window.location.pathname === "/") {
    e.preventDefault();
    const element = document.getElementById(href.slice(2));
    onClose?.();
    window.setTimeout(() => element?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    return;
  }
  onClose?.();
};

const NavbarStore = ({ logo = "Northwind", announcements,navItems = DEFAULT_NAV_ITEMS, ctaButton = DEFAULT_CTA, menuText = "Menu" }: NavbarStoreProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menuOpen) setMenuOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <nav data-section="navbar" className="fixed z-1000 top-0 inset-x-0">
      {announcements && announcements.length > 0 && (
        <div className="flex overflow-hidden h-8 bg-secondary text-secondary-foreground">
          <div aria-hidden="true" className="flex shrink-0 items-center animate-marquee-horizontal [animation-duration:40s]">
            {[0, 1].map((copy) =>
              announcements.map((announcement) => (
                <span key={`${copy}-${announcement}`} className="flex shrink-0 items-center gap-8 pr-8 text-sm whitespace-nowrap">
                  {announcement}
                  <span className="size-1 rounded-full bg-current" />
                </span>
              ))
            )}
          </div>
          <p className="sr-only">{announcements.join(". ")}</p>
        </div>
      )}

      <div className="relative flex items-center justify-between h-14 border-b bg-background">
        <div className="flex items-center justify-between w-full max-w-6xl px-6 mx-auto">
          <a href="/" className="text-2xl font-semibold tracking-tight text-foreground">
            {logo}
          </a>

          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className="relative text-base text-foreground after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-current after:scale-x-0 after:origin-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-left"
              >
                {item.name}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4 text-foreground">
            <a href={ctaButton.href} onClick={(e) => handleNavClick(e, ctaButton.href)} className="hidden md:block text-base">
              {ctaButton.text}
            </a>
            <User aria-hidden="true" className="hidden md:block size-5" strokeWidth={1.5} />
            <Heart aria-hidden="true" className="hidden md:block size-5" strokeWidth={1.5} />
            <ShoppingBag aria-hidden="true" className="size-5" strokeWidth={1.5} />
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="flex md:hidden items-center justify-center shrink-0 size-9 rounded-lg cursor-pointer bg-primary text-primary-foreground"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Plus className={cn("w-1/2 h-1/2 text-primary-foreground transition-transform duration-300", menuOpen ? "rotate-45" : "rotate-0")} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            ref={menuRef}
            initial={{ y: "-135%" }}
            animate={{ y: 0 }}
            exit={{ y: "-135%" }}
            transition={{ type: "spring", damping: 26, stiffness: 170 }}
            className="md:hidden fixed z-1000 top-3 left-3 right-3 p-6 rounded-xl bg-card text-card-foreground border"
          >
            <div className="flex items-center justify-between mb-6">
              <p className="text-xl text-foreground">{menuText}</p>
              <button
                type="button"
                aria-label="Close menu"
                className="flex items-center justify-center shrink-0 size-9 rounded-lg cursor-pointer bg-primary text-primary-foreground"
                onClick={() => setMenuOpen(false)}
              >
                <Plus className="w-1/2 h-1/2 text-primary-foreground rotate-45" strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {[...navItems, { name: ctaButton.text, href: ctaButton.href }].map((item, index, all) => (
                <div key={item.name}>
                  <a
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item.href, () => setMenuOpen(false))}
                    className="flex items-center justify-between py-2 text-base font-medium text-foreground"
                  >
                    {item.name}
                    <ArrowRight className="size-4 text-foreground" strokeWidth={1.5} />
                  </a>
                  {index < all.length - 1 && <div className="h-px bg-linear-to-r from-transparent via-foreground/20 to-transparent" />}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default NavbarStore;
