import type { EnvModule } from "@/components/kit/env/EnvStage";

const parts = (env: EnvModule, variant?: string) => (variant ?? "").split("+").map((v) => env.variants?.[v.trim()]).filter((v) => !!v);

export const envDefaults = (env: EnvModule, variant?: string) => Object.assign(Object.fromEntries(env.params.map((p) => [p.key, p.value])), ...parts(env, variant).map((v) => v.params ?? {})) as Record<string, number>;

export const envColors = (env: EnvModule, variant?: string) => Object.assign(Object.fromEntries(Object.values(env.palette).map((c) => [c.cssVar, c.fallback])), ...parts(env, variant).map((v) => v.colors ?? {})) as Record<string, string>;
