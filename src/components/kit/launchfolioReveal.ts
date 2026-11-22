const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];
const SETTLE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const VIEW = { once: true, margin: "0px 0px -8% 0px" };

export const lfSlide = (index: number, reduce: boolean | null) => ({
  initial: reduce ? false : { opacity: 0.001, x: -Math.min(35, 5 * (index + 1)), filter: "blur(5px)" },
  whileInView: { opacity: 1, x: 0, filter: "blur(0px)" },
  viewport: VIEW,
  transition: { duration: 0.7, ease: EASE, delay: Math.min(index, 8) * 0.08 },
});

export const lfRise = (delay: number, reduce: boolean | null) => ({
  initial: reduce ? false : { opacity: 0.001, y: 24, filter: "blur(5px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: VIEW,
  transition: { duration: 0.8, ease: EASE, delay },
});

export const lfSettle = (reduce: boolean | null) => ({
  initial: reduce ? false : { opacity: 0.001, scale: 1.12 },
  whileInView: { opacity: 1, scale: 1 },
  viewport: VIEW,
  transition: { opacity: { duration: 0.5, ease: EASE }, scale: { duration: 1.3, ease: SETTLE } },
});
