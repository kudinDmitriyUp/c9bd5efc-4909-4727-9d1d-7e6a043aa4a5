type StarButtonProps = { text: string; href: string; className?: string };

export default function StarButton({ text, href, className }: StarButtonProps) {
  return (
    <a href={href} className={`group flex gap-1.5 ${className ?? ""}`}>
      <div className="btn-primary flex-1 group-hover:bg-[#dcdcdc] group-focus-visible:bg-[#dcdcdc]">
        <p className="btn-label">{text}</p>
      </div>
      <div className="btn-primary btn-star shrink-0 group-hover:bg-[#dcdcdc] group-focus-visible:bg-[#dcdcdc]" aria-hidden="true">
        <svg viewBox="0 0 22 22" className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:rotate-90 group-focus-visible:rotate-90">
          <path d="M11 2v18M2 11h18M4.6 4.6l12.8 12.8M17.4 4.6 4.6 17.4" stroke="currentColor" strokeWidth="1.4" fill="none" />
        </svg>
      </div>
    </a>
  );
}
