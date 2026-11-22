"use client";

import type { LucideIcon } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export type UiPanelConfig =
  | { kind: "form"; title: string; fields: { label: string; value: string; multiline?: boolean }[]; button?: string }
  | { kind: "list"; title: string; badge?: string; rows: { label: string; meta?: string; status?: string; idle?: boolean; icon?: LucideIcon }[] }
  | { kind: "table"; title: string; badge?: string; columns: string[]; rows: { cells: string[]; status?: string; idle?: boolean }[] }
  | { kind: "board"; title?: string; columns: { title: string; cards: { title: string; meta?: string }[] }[] }
  | { kind: "timeline"; title: string; badge?: string; rows: { label: string; meta?: string; done?: boolean }[] }
  | { kind: "stat"; title: string; value: string; delta?: string; bars?: number[] };

type UiPanelProps = { panel: UiPanelConfig; className?: string };

const Chip = ({ text, idle }: { text: string; idle?: boolean }) => (
  <div className={cn("flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5", idle ? "bg-foreground/5 text-muted-foreground" : "kit-chip")}>
    <div aria-hidden="true" className={cn("size-1 rounded-full", idle ? "bg-muted-foreground/60" : "bg-accent")} />
    <p className="whitespace-nowrap text-[length:calc(var(--text-label)*0.78)] leading-none">{text}</p>
  </div>
);

const Head = ({ title, badge }: { title?: string; badge?: string }) =>
  title || badge ? (
    <div className="flex items-center justify-between gap-2">
      {title && <p className="min-w-0 truncate text-[length:calc(var(--text-label)*0.95)] font-medium leading-tight text-foreground">{title}</p>}
      {badge && <Chip text={badge} />}
    </div>
  ) : null;

export default function UiPanel({ panel, className }: UiPanelProps) {
  return (
    <div className={cn("@container kit-card flex w-full flex-col gap-3 rounded-[0.75rem] p-3.5", className)}>
      {panel.kind === "form" && (
        <>
          <Head title={panel.title} />
          {panel.fields.map((field, i) => (
            <div key={i} className="flex flex-col gap-1">
              <p className="text-[length:calc(var(--text-label)*0.75)] leading-none text-muted-foreground">{field.label}</p>
              <div className={cn("rounded-[0.375rem] bg-foreground/[0.04] px-2.5 py-2 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--foreground)_7%,transparent)]", field.multiline && "min-h-[3.5rem]")}>
                <p className={cn("text-[length:calc(var(--text-label)*0.85)] leading-snug", field.multiline ? "text-muted-foreground" : "truncate text-foreground")}>{field.value}</p>
              </div>
            </div>
          ))}
          {panel.button && (
            <div className="mt-1 flex h-8 items-center justify-center rounded-[0.5rem] bg-foreground px-3">
              <p className="truncate text-[length:calc(var(--text-label)*0.85)] font-medium leading-[1.3] text-background">{panel.button}</p>
            </div>
          )}
        </>
      )}

      {panel.kind === "list" && (
        <>
          <Head title={panel.title} badge={panel.badge} />
          <div className="flex flex-col gap-1.5">
            {panel.rows.map((row, i) => {
              const Icon = row.icon;
              return (
                <div key={i} className="flex items-center gap-2 rounded-[0.375rem] bg-foreground/[0.03] px-2.5 py-2">
                  {Icon && <Icon aria-hidden="true" strokeWidth={1.5} className="size-3.5 shrink-0 text-muted-foreground" />}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="truncate text-[length:calc(var(--text-label)*0.85)] leading-tight text-foreground">{row.label}</p>
                    {row.meta && <p className="truncate text-[length:calc(var(--text-label)*0.72)] leading-tight text-muted-foreground">{row.meta}</p>}
                  </div>
                  {row.status && <Chip text={row.status} idle={row.idle} />}
                </div>
              );
            })}
          </div>
        </>
      )}

      {panel.kind === "table" && (
        <>
          <Head title={panel.title} badge={panel.badge} />
          <div className="flex flex-col overflow-hidden rounded-[0.5rem] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--foreground)_7%,transparent)]">
            <div className="flex items-center gap-3 bg-foreground/[0.04] px-2.5 py-1.5">
              {panel.columns.map((column, i) => (
                <p key={i} className={cn("min-w-0 flex-1 truncate text-[length:calc(var(--text-label)*0.72)] leading-tight text-muted-foreground", i === 0 && "flex-[1.6]", i > 1 && "hidden @md:block")}>
                  {column}
                </p>
              ))}
              {panel.rows.some((row) => row.status) && <div className="w-20 shrink-0" />}
            </div>
            {panel.rows.map((row, r) => (
              <div key={r} className="flex items-center gap-3 border-t border-foreground/[0.06] px-2.5 py-2">
                {row.cells.map((cell, i) => (
                  <p key={i} className={cn("min-w-0 flex-1 truncate text-[length:calc(var(--text-label)*0.8)] leading-tight", i === 0 ? "flex-[1.6] text-foreground" : "text-muted-foreground", i > 1 && "hidden @md:block")}>
                    {cell}
                  </p>
                ))}
                {panel.rows.some((item) => item.status) && <div className="flex w-20 shrink-0 justify-end">{row.status && <Chip text={row.status} idle={row.idle} />}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {panel.kind === "board" && (
        <>
          <Head title={panel.title} />
          <div className="flex gap-2">
            {panel.columns.map((column, c) => (
              <div key={c} className={cn("flex min-w-0 flex-1 flex-col gap-1.5 rounded-[0.5rem] bg-foreground/[0.03] p-1.5", c > 1 && "hidden @sm:flex")}>
                <div className="flex items-center justify-between gap-1 px-1 pt-0.5">
                  <p className="truncate text-[length:calc(var(--text-label)*0.75)] leading-tight text-muted-foreground">{column.title}</p>
                  <p className="text-[length:calc(var(--text-label)*0.72)] leading-tight text-muted-foreground">{column.cards.length}</p>
                </div>
                {column.cards.map((card, i) => (
                  <div key={i} className="flex flex-col gap-1 rounded-[0.375rem] bg-card px-2 py-1.5 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--foreground)_7%,transparent)]">
                    <p className="text-[length:calc(var(--text-label)*0.8)] leading-snug text-foreground">{card.title}</p>
                    {card.meta && <p className="truncate text-[length:calc(var(--text-label)*0.7)] leading-tight text-muted-foreground">{card.meta}</p>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {panel.kind === "timeline" && (
        <>
          <Head title={panel.title} badge={panel.badge} />
          <div className="flex flex-col">
            {panel.rows.map((row, i) => (
              <div key={i} className="flex gap-2.5">
                <div className="flex w-2 shrink-0 flex-col items-center">
                  <div aria-hidden="true" className={cn("mt-1 size-2 shrink-0 rounded-full", row.done ? "bg-accent" : "shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--foreground)_30%,transparent)]")} />
                  {i < panel.rows.length - 1 && <div aria-hidden="true" className="w-px flex-1 bg-foreground/10" />}
                </div>
                <div className="flex min-w-0 flex-1 items-start justify-between gap-2 pb-3">
                  <p className={cn("min-w-0 text-[length:calc(var(--text-label)*0.85)] leading-snug", row.done ? "text-foreground" : "text-muted-foreground")}>{row.label}</p>
                  {row.meta && <p className="shrink-0 whitespace-nowrap text-[length:calc(var(--text-label)*0.72)] leading-snug text-muted-foreground">{row.meta}</p>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {panel.kind === "stat" && (
        <>
          <Head title={panel.title} />
          <div className="flex items-end justify-between gap-2">
            <p className="text-[length:var(--text-h2)] font-medium leading-none tracking-[var(--heading-tracking)] text-foreground">{panel.value}</p>
            {panel.delta && <Chip text={panel.delta} />}
          </div>
          {panel.bars && panel.bars.length > 0 && (
            <div className="flex h-16 items-end gap-1">
              {panel.bars.map((bar, i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  style={{ height: `${Math.max(6, Math.min(100, bar))}%` }}
                  className={cn("min-w-0 flex-1 rounded-[0.1875rem]", i === panel.bars!.length - 1 ? "bg-accent" : "bg-foreground/15")}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
