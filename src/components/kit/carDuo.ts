import { useSyncExternalStore } from "react";

export type CarPaint = { name?: string; color: string; metalness: number; roughness: number; carbon?: boolean };

type CarDuoState = { car: number; progress: number; swatch: number[]; lit: boolean; swapping: boolean; failed: boolean };

type Commands = { pick: (car: number) => void; paint: (paint: CarPaint) => void };

let state: CarDuoState = { car: 0, progress: 0, swatch: [], lit: false, swapping: false, failed: false };
const listeners = new Set<() => void>();
let commands: Commands | null = null;

const set = (next: Partial<CarDuoState>) => {
  state = { ...state, ...next };
  listeners.forEach((fn) => fn());
};

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const get = () => state;

export const carDuo = {
  get,
  set,
  subscribe,
  connect: (next: Commands | null) => {
    commands = next;
  },
  pick: (car: number) => commands?.pick(car),
  paint: (index: number, paint: CarPaint) => {
    const swatch = [...state.swatch];
    swatch[state.car] = index;
    set({ swatch });
    commands?.paint(paint);
  },
};

export const useCarDuo = () => useSyncExternalStore(subscribe, get, get);

export const pickFor = <T,>(list: T[] | undefined, car: number): T | undefined => (list && list.length ? list[Math.min(car, list.length - 1)] : undefined);
