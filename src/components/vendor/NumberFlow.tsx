import { useEffect, useRef, useState } from "react";

/**
 * Drop-in stand-in for `@number-flow/react` (the designer's sections import
 * it; the sandbox image doesn't carry the package). Same prop surface the
 * sections use — value / format / locales / prefix / suffix / className /
 * transformTiming / spinTiming — animated as an eased count-up instead of the
 * per-digit spin.
 */
type Timing = { duration?: number; easing?: string };

interface NumberFlowProps {
  value: number;
  format?: Intl.NumberFormatOptions;
  locales?: string | string[];
  prefix?: string;
  suffix?: string;
  className?: string;
  transformTiming?: Timing;
  spinTiming?: Timing;
  willChange?: boolean;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const NumberFlow = ({
  value,
  format,
  locales,
  prefix = "",
  suffix = "",
  className,
  transformTiming,
  spinTiming,
}: NumberFlowProps) => {
  const [display, setDisplay] = useState(value);
  const shownRef = useRef(value);
  const duration = spinTiming?.duration ?? transformTiming?.duration ?? 900;

  useEffect(() => {
    const from = shownRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const next = p < 1 ? from + (to - from) * easeOutCubic(p) : to;
      shownRef.current = next;
      setDisplay(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const integer = Number.isInteger(value) && (format?.maximumFractionDigits ?? 0) === 0;
  const text = new Intl.NumberFormat(locales, format).format(integer ? Math.round(display) : display);
  return (
    <span className={className}>
      {prefix}
      {text}
      {suffix}
    </span>
  );
};

export default NumberFlow;
