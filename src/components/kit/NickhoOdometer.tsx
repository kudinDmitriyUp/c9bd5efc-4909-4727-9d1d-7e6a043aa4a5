"use client";

import { motion, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type Ease = readonly [number, number, number, number];

type NickhoOdometerProps = {
  value?: number | string;
  prefix?: string;
  suffix?: string;
  play?: boolean;
  delay?: number;
  duration?: number;
  stagger?: number;
  ease?: Ease;
  className?: string;
};

const STEP = 1.1;
const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const POWER3_OUT: Ease = [0.215, 0.61, 0.355, 1];

const decimalsOf = (value: number) => (String(value).split(".")[1] ?? "").length;

const formatOdometer = (value: number | string, prefix = "", suffix = "") => {
  if (typeof value === "string") return `${prefix}${value}${suffix}`;
  const decimals = decimalsOf(value);
  return `${prefix}${value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
};

const NickhoOdometer = ({ value = 2480, prefix, suffix, play = true, delay = 0, duration = 1, stagger = 0.06, ease = POWER3_OUT, className }: NickhoOdometerProps) => {
  const reduce = useReducedMotion();
  const text = formatOdometer(value);
  const show = play || Boolean(reduce);
  let digitIndex = 0;

  return (
    <div className={cn("relative inline-flex whitespace-nowrap leading-[1.1]", className)}>
      <p className="sr-only">{String(value)}</p>
      {prefix && <div aria-hidden="true" className="h-[1.1em] whitespace-pre leading-[1.1em]">{prefix}</div>}
      <div aria-hidden="true" className="flex leading-[1.1em]">
        {Array.from(text).map((char, index) => {
          if (!/\d/.test(char)) {
            return (
              <div key={index} className="h-[1.1em] whitespace-pre">
                {char}
              </div>
            );
          }
          const order = digitIndex++;
          const target = Number(char);
          return (
            <div key={index} className="relative h-[1.1em] overflow-hidden">
              <div className="invisible">{char}</div>
              <motion.div
                initial={reduce ? false : { y: "0em" }}
                animate={{ y: show ? `${-target * STEP}em` : "0em" }}
                transition={{ duration, ease, delay: delay + order * stagger }}
                className="absolute inset-x-[-0.2em] top-0 flex flex-col items-center"
              >
                {DIGITS.map((digit) => (
                  <div key={digit} className="h-[1.1em]">
                    {digit}
                  </div>
                ))}
              </motion.div>
            </div>
          );
        })}
      </div>
      {suffix && <div aria-hidden="true" className="h-[1.1em] whitespace-pre leading-[1.1em]">{suffix}</div>}
    </div>
  );
};

export default NickhoOdometer;
