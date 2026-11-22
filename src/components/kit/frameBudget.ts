const LEVELS = [1, 0.82, 0.65];

export const frameBudget = () => {
  const s = { level: 0, ceil: 0, acc: 0, n: 0, min: 99, refresh: 99, windows: 0, good: 0, upAt: -99 };
  return {
    scale: () => LEVELS[s.level],
    measure: (ms: number) => {
      if (ms <= 0 || ms > 250) return false;
      s.acc += ms;
      s.n++;
      s.min = Math.min(s.min, ms);
      if (s.acc < 1000) return false;
      const avg = s.acc / s.n;
      s.refresh = Math.max(4, Math.min(s.refresh, s.min));
      s.acc = s.n = 0;
      s.min = 99;
      s.windows++;
      if (s.windows < 3) return false;
      const before = s.level;
      if (avg > Math.min(18, s.refresh * 1.35) && s.level < LEVELS.length - 1) {
        if (s.windows - s.upAt <= 2) s.ceil = s.level + 1;
        s.level++;
        s.good = 0;
      } else if (avg < Math.min(17.5, s.refresh * 1.1) && s.level > s.ceil) {
        if (++s.good >= 5) {
          s.level--;
          s.good = 0;
          s.upAt = s.windows;
        }
      } else s.good = 0;
      return s.level !== before;
    },
  };
};
