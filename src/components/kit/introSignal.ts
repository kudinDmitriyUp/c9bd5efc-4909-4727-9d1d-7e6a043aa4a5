import { holdWebildReady } from "./webildReady";

const bus = new EventTarget();
const state = { claimed: false, ready: false, revealed: false };
let release = () => {};

const on = (name: "ready" | "reveal", done: boolean, cb: () => void) => {
  if (done) {
    cb();
    return () => {};
  }
  bus.addEventListener(name, cb, { once: true });
  return () => bus.removeEventListener(name, cb);
};

export const introSignal = {
  claim: () => {
    if (!state.claimed && !state.revealed) release = holdWebildReady();
    state.claimed = true;
  },
  isClaimed: () => state.claimed,
  isRevealed: () => state.revealed,
  markReady: () => {
    if (state.ready) return;
    state.ready = true;
    bus.dispatchEvent(new Event("ready"));
  },
  reveal: () => {
    if (state.revealed) return;
    state.revealed = true;
    release();
    bus.dispatchEvent(new Event("reveal"));
  },
  onReady: (cb: () => void) => on("ready", state.ready, cb),
  onReveal: (cb: () => void) => on("reveal", state.revealed, cb),
};
