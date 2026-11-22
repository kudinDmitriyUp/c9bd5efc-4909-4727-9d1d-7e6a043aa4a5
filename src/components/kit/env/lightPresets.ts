import * as THREE from "three";

export type LightPreset = {
  sun: number;
  sunHeight: number;
  sunK: number;
  softness: number;
  fill: number;
  bounce: number;
  fog: number;
  mist: number;
  exposure: number;
  lift: [number, number, number];
  warm: [number, number, number];
  cool: [number, number, number];
  sat: number;
  windows: number;
  colors: { sky: string; haze: string; sun: string };
};

export const LIGHT_PRESETS = {
  golden: {
    sun: -1.2,
    sunHeight: 0.2,
    sunK: 1,
    softness: 4,
    fill: 0.3,
    bounce: 0.36,
    fog: 1,
    mist: 0.3,
    exposure: 1.08,
    lift: [0.02, 0.016, 0.022],
    warm: [0.03, 0.01, -0.02],
    cool: [-0.025, 0.002, 0.035],
    sat: 1.08,
    windows: 0,
    colors: { sky: "#5a8fd4", haze: "#e4ddd2", sun: "#ffbc7a" },
  },
  morning: {
    sun: 2.3,
    sunHeight: 0.42,
    sunK: 0.95,
    softness: 3,
    fill: 0.45,
    bounce: 0.3,
    fog: 0.75,
    mist: 0.6,
    exposure: 1,
    lift: [0.022, 0.026, 0.034],
    warm: [0.012, 0.008, 0],
    cool: [-0.016, 0.004, 0.03],
    sat: 1.02,
    windows: 0,
    colors: { sky: "#5f9be0", haze: "#e2eaf0", sun: "#fff3e2" },
  },
  overcast: {
    sun: -0.6,
    sunHeight: 0.7,
    sunK: 0.16,
    softness: 14,
    fill: 1.25,
    bounce: 0.35,
    fog: 1.3,
    mist: 0.45,
    exposure: 1.08,
    lift: [0.04, 0.042, 0.044],
    warm: [0, 0, 0],
    cool: [-0.006, 0, 0.012],
    sat: 0.86,
    windows: 0,
    colors: { sky: "#9aa6b2", haze: "#d4d8da", sun: "#eceae4" },
  },
  dusk: {
    sun: -1.45,
    sunHeight: 0.07,
    sunK: 0.85,
    softness: 6,
    fill: 0.4,
    bounce: 0.35,
    fog: 1.2,
    mist: 0.7,
    exposure: 1.2,
    lift: [0.036, 0.028, 0.044],
    warm: [0.045, 0.012, -0.03],
    cool: [-0.026, -0.004, 0.04],
    sat: 1.04,
    windows: 1,
    colors: { sky: "#4c5d8a", haze: "#d8b4a4", sun: "#ff9a5a" },
  },
} satisfies Record<string, LightPreset>;

export type LightName = keyof typeof LIGHT_PRESETS;

const NAMES = Object.keys(LIGHT_PRESETS) as LightName[];

export const lightParam = { key: "light", label: "Light preset", min: 0, max: NAMES.length - 1, step: 1, value: 0 };

export const lightPreset = (i: number): LightPreset => LIGHT_PRESETS[NAMES[THREE.MathUtils.clamp(Math.round(i), 0, NAMES.length - 1)]];

export const lightVariants = (vars: { sky: string; haze: string; sun: string }): Record<string, { params: Record<string, number>; colors: Record<string, string> }> =>
  Object.fromEntries(
    NAMES.map((name, i) => {
      const p: LightPreset = LIGHT_PRESETS[name];
      return [name, { params: { light: i, sun: p.sun, sunHeight: p.sunHeight }, colors: { [vars.sky]: p.colors.sky, [vars.haze]: p.colors.haze, [vars.sun]: p.colors.sun } }];
    }),
  );
