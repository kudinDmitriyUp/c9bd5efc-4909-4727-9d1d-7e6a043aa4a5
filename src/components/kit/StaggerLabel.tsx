"use client";

type StaggerLabelProps = {
  text: string;
  stagger?: number;
};

export default function StaggerLabel({ text, stagger = 0.012 }: StaggerLabelProps) {
  return (
    <div aria-hidden="true" className="pointer-events-none relative -mb-[0.14em] inline-block overflow-hidden whitespace-nowrap pb-[0.14em] leading-[1.3]">
      {[...text].map((char, i) => (
        <div
          key={i}
          className="relative inline-block whitespace-pre [text-shadow:0_1.3em_currentColor] transition-transform duration-[600ms] ease-[cubic-bezier(0.625,0.05,0,1)] [@media(hover:hover)]:in-[:is(a,button):hover]:-translate-y-[1.3em] in-[:is(a,button):focus-visible]:-translate-y-[1.3em] motion-reduce:translate-y-0! motion-reduce:transition-none"
          style={{ transitionDelay: `${i * stagger}s` }}
        >
          {char}
        </div>
      ))}
    </div>
  );
}
