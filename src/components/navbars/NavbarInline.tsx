"use client";


interface NavbarInlineProps {
  logo?: string;
  navItems?: { name: string; href: string }[];
  ctaButton?: { text: string; href: string };
}

const DEFAULT_NAV_ITEMS = [
  { name: "Work", href: "#work" },
  { name: "Services", href: "#services" },
  { name: "About", href: "#about" },
  { name: "Contact", href: "#contact" },
];

const DEFAULT_CTA = { text: "Get started", href: "#contact" };

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

const NavbarInline = ({ logo = "Northwind", navItems = DEFAULT_NAV_ITEMS, ctaButton = DEFAULT_CTA }: NavbarInlineProps) => {
  return (
    <nav data-section="navbar" className="fixed z-1000 top-5 left-1/2 -translate-x-1/2 w-full max-w-6xl px-6">
      <div className="flex items-center justify-between p-2 xl:p-3 2xl:p-4 rounded-xl backdrop-blur-sm bg-card text-card-foreground border">
        <a href="/" className="pl-2 text-xl font-medium text-foreground">{logo}</a>

        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-6">
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

        <a href={ctaButton.href} className="flex items-center justify-center h-10 px-6 text-sm rounded-lg cursor-pointer btn-primary bg-primary text-primary-foreground">{ctaButton.text}</a>
      </div>
    </nav>
  );
};

export default NavbarInline;
