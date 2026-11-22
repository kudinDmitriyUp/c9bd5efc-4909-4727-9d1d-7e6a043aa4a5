"use client";

type DotArrowButtonProps = {
  text: string;
  href: string;
  variant?: "primary" | "secondary" | "small";
  dot?: boolean;
  className?: string;
  onClick?: () => void;
};

export default function DotArrowButton({ text, href, variant = "primary", dot, className, onClick }: DotArrowButtonProps) {
  const base = variant === "small" ? "btn-primary btn-small" : variant === "secondary" ? "btn-secondary" : "btn-primary";
  const showArrow = dot ?? variant !== "secondary";
  return (
    <a href={href} onClick={onClick} className={`${base} ${className ?? ""}`}>
      <p className="btn-label">{text}</p>
      {showArrow && (
        <div aria-hidden="true" className="btn-dot">
          <svg viewBox="0 0 14 14">
            <path d="M2.5 7h9M7.5 3l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </a>
  );
}
