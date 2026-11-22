import { useSyncExternalStore } from "react";

export type CanFlavourState = { index: number; direction: 1 | -1; count: number; by: "user" | "drag" };

let state: CanFlavourState = { index: 0, direction: 1, count: 0, by: "user" };
const listeners = new Set<() => void>();

const emit = (next: CanFlavourState) => {
  state = next;
  listeners.forEach((fn) => fn());
};

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const get = () => state;

const wrap = (i: number) => (state.count > 0 ? ((i % state.count) + state.count) % state.count : Math.max(0, i));

export const canFlavour = {
  get,
  subscribe,
  set: (index: number, direction?: number, by: CanFlavourState["by"] = "user") => {
    const next = wrap(index);
    if (next === state.index) return;
    const dir = direction ? (direction > 0 ? 1 : -1) : index > state.index ? 1 : -1;
    emit({ ...state, index: next, direction: dir, by });
  },
  step: (direction: number) => canFlavour.set(state.index + (direction > 0 ? 1 : -1), direction),
  setCount: (count: number) => {
    if (count === state.count) return;
    emit({ ...state, count, index: count > 0 ? Math.min(state.index, count - 1) : 0 });
  },
};

export const useCanFlavour = () => useSyncExternalStore(subscribe, get, get);
