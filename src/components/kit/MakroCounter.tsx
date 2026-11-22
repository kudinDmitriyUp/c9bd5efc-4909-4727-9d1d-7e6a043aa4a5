"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

const parse = (value: string) => {
  const match = value.match(/^(\D*)([\d.,]+)(.*)$/);
  if (!match) return null;
  const [, prefix, digits, suffix] = match;
  const target = Number(digits.replace(/,/g, ""));
  if (!Number.isFinite(target)) return null;
  const decimals = digits.includes(".") ? digits.split(".")[1].length : 0;
  const grouped = digits.includes(",");
  const year = !grouped && !decimals && /^(19|20)\d\d$/.test(digits);
  const from = year ? target - 40 : 0;
  const format = (current: number) =>
    `${prefix}${grouped ? current.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : current.toFixed(decimals)}${suffix}`;
  return { target, from, format };
};

type MakroCounterProps = {
  value?: string;
  srText?: string;
  className?: string;
  style?: CSSProperties;
};

const MakroCounter = ({ value = "1,250+", srText, className, style }: MakroCounterProps) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    const parsed = parse(value);
    if (!node || !parsed || reduce) return;
    if (!inView) {
      node.textContent = parsed.format(parsed.from);
      return;
    }
    const controls = animate(parsed.from, parsed.target, {
      type: "spring",
      bounce: 0,
      duration: 2,
      onUpdate: (current) => {
        node.textContent = parsed.format(current);
      },
    });
    return () => controls.stop();
  }, [inView, reduce, value]);

  const counter = (
    <p ref={ref} style={style} aria-hidden={srText === undefined ? undefined : "true"} className={className}>
      {value}
    </p>
  );
  if (srText === undefined) return counter;
  return (
    <>
      <p className="sr-only">{srText}</p>
      {counter}
    </>
  );
};

export default MakroCounter;
