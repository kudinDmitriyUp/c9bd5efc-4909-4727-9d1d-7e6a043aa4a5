import type { CSSProperties } from "react";

export type WordmarkStyle = "spaced" | "serif" | "soft" | "condensed" | "pill" | "wide" | "serif-caps" | "caps";
export type Wordmark = { name: string; note?: string; style?: WordmarkStyle };

const LOOK: Record<WordmarkStyle, string> = {
  spaced: "font-[family-name:var(--font-heading)] tracking-[0.12em] [font-stretch:100%]",
  serif: "font-[family-name:var(--font-serif)] text-[clamp(1.875rem,2.8vw,2.75rem)] tracking-[0.02em]",
  soft: "font-[family-name:var(--font-body)] font-medium tracking-[-0.02em]",
  condensed: "font-[family-name:var(--font-heading)] !font-black uppercase tracking-[0.04em] [font-stretch:62%]",
  pill: "rounded-full border-2 border-current px-[0.5em] py-[0.05em] font-[family-name:var(--font-heading)] !font-black uppercase italic [font-stretch:100%]",
  wide: "font-[family-name:var(--font-heading)] !font-black tracking-[-0.06em] [font-stretch:125%]",
  "serif-caps": "font-[family-name:var(--font-serif)] uppercase italic tracking-[0.06em]",
  caps: "font-[family-name:var(--font-heading)] !font-semibold uppercase tracking-[0.08em] [font-stretch:100%]",
};

const WordmarkItem = ({ item }: { item: Wordmark }) => {
  const style = item.style ?? "spaced";
  return (
    <div className={`inline-flex items-baseline gap-[0.35em] whitespace-nowrap text-[clamp(1.375rem,2vw,2rem)] ${LOOK[style]}`}>
      <p>{item.name}</p>
      {item.note && <p className={style === "caps" ? "ml-[0.15em] !font-black text-accent" : "text-[0.42em] uppercase tracking-[0.2em]"}>{item.note}</p>}
    </div>
  );
};

export default function WordmarkMarquee({ items, className = "", run = "38s" }: { items: Wordmark[]; className?: string; run?: string }) {
  return (
    <div className={`overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)] ${className}`}>
      <ul style={{ "--run": run } as CSSProperties} className="racing-marquee flex w-max items-center">
        {[0, 1].map((copy) =>
          items.map((item, i) => (
            <li key={`${copy}-${i}`} aria-hidden={copy > 0 ? "true" : undefined} className="pr-[7vw]">
              <WordmarkItem item={item} />
            </li>
          )),
        )}
      </ul>
    </div>
  );
}
