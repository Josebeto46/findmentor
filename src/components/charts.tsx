"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { clsx } from "clsx";
import { BarChart3, Table2 } from "lucide-react";
import { money } from "@/lib/format";

/* ───────────── utilidades ───────────── */
const oneDecimal = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 });
/** $0 / $500 / $1,5 mil / $2 M */
function axisMoney(v: number) {
  const a = Math.abs(v);
  const body = a >= 1_000_000 ? `${oneDecimal.format(a / 1_000_000)} M` : a >= 1000 ? `${oneDecimal.format(a / 1000)} mil` : oneDecimal.format(a);
  return v === 0 ? "$0" : `${v < 0 ? "−" : ""}$${body}`;
}
const halo = { paintOrder: "stroke" as const, stroke: "var(--surface)", strokeWidth: 4, strokeLinejoin: "round" as const };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Marcas "agradables" para el eje Y (0 / 1.000 / 2.000…). */
function niceTicks(min: number, max: number, count = 4) {
  const lo0 = Math.min(min, 0);
  const hi0 = Math.max(max, 0);
  const span = hi0 - lo0 || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(lo0 / step) * step;
  const hi = Math.ceil(hi0 / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v / step) * step);
  return { ticks, lo, hi };
}

/** Columna con 4 px redondeados en el extremo de datos y base recta. */
function columnPath(x: number, yTop: number, w: number, yBase: number, r = 4) {
  const h = yBase - yTop;
  if (h <= 0.5) return "";
  const rr = Math.min(r, h, w / 2);
  return `M${x},${yBase}V${yTop + rr}Q${x},${yTop} ${x + rr},${yTop}H${x + w - rr}Q${x + w},${yTop} ${x + w},${yTop + rr}V${yBase}Z`;
}

/* ───────────── contenedor con vista gráfico/tabla ───────────── */
function ChartFigure({ title, subtitle, legend, chart, table }: { title: string; subtitle?: string; legend?: ReactNode; chart: ReactNode; table: ReactNode }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  return (
    <figure className="space-y-3 rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <figcaption className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        <div role="group" aria-label="Tipo de vista" className="flex rounded-lg border border-border p-0.5 text-xs">
          {(
            [
              ["chart", "Gráfico", BarChart3],
              ["table", "Tabla", Table2],
            ] as const
          ).map(([v, label, Icon]) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={clsx("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium", view === v ? "bg-brand-soft text-brand" : "text-muted hover:text-foreground")}
            >
              <Icon className="size-3.5" aria-hidden /> {label}
            </button>
          ))}
        </div>
      </figcaption>
      {view === "chart" ? (
        <>
          {legend}
          {chart}
        </>
      ) : (
        table
      )}
    </figure>
  );
}

function Tooltip({ x, width, title, rows }: { x: number; width: number; title: string; rows: { color: string; name: string; value: string }[] }) {
  const flip = x > width * 0.55;
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-2 z-10 min-w-40 space-y-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm shadow-lg"
      style={{ left: x, transform: flip ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}
    >
      <p className="text-xs text-muted">{title}</p>
      {rows.map((r) => (
        <p key={r.name} className="flex items-center gap-2">
          <span className="h-[3px] w-3 shrink-0 rounded-full" style={{ background: r.color }} aria-hidden />
          <span className="font-semibold tabular-nums">{r.value}</span>
          <span className="text-muted">{r.name}</span>
        </p>
      ))}
    </div>
  );
}

function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="max-h-72 overflow-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-surface text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            {head.map((h, i) => (
              <th key={h} className={clsx("px-3 py-2 font-medium", i > 0 && "text-right")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={clsx("px-3 py-2", j > 0 && "text-right tabular-nums")}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ───────────── columnas agrupadas: entradas vs salidas ───────────── */
export type FlowGroup = { label: string; range: string; a: number; b: number };

export function FlowBarsFigure({
  title,
  subtitle,
  groups,
  aName,
  bName,
  periodHeader = "Período",
}: {
  title: string;
  subtitle?: string;
  groups: FlowGroup[];
  aName: string;
  bName: string;
  periodHeader?: string;
}) {
  const legend = (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm" aria-label="Leyenda">
      {[
        { name: aName, color: "var(--series-1)" },
        { name: bName, color: "var(--series-2)" },
      ].map((s) => (
        <li key={s.name} className="flex items-center gap-2 text-muted">
          <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} aria-hidden /> {s.name}
        </li>
      ))}
    </ul>
  );
  return (
    <ChartFigure
      title={title}
      subtitle={subtitle}
      legend={legend}
      chart={<FlowBars groups={groups} aName={aName} bName={bName} />}
      table={
        <DataTable
          head={[periodHeader, aName, bName, "Neto"]}
          rows={groups.map((g) => [g.range, money(g.a), money(g.b), money(g.a - g.b)])}
        />
      }
    />
  );
}

function FlowBars({ groups, aName, bName }: { groups: FlowGroup[]; aName: string; bName: string }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 220;
  const m = { l: 48, r: 8, t: 16, b: 26 };
  const n = groups.length;

  const max = Math.max(1, ...groups.flatMap((g) => [g.a, g.b]));
  const { ticks, hi } = niceTicks(0, max, 4);
  const pw = Math.max(w - m.l - m.r, 0);
  const ph = H - m.t - m.b;
  const band = n ? pw / n : 0;
  const y = (v: number) => m.t + ph - (v / hi) * ph;
  const bw = Math.max(4, Math.min(24, (band - 14) / 2));

  // Etiqueta directa selectiva: solo la barra más alta.
  let peak = { g: 0, side: "a" as "a" | "b", v: -1 };
  groups.forEach((g, i) => {
    if (g.a > peak.v) peak = { g: i, side: "a", v: g.a };
    if (g.b > peak.v) peak = { g: i, side: "b", v: g.b };
  });

  return (
    <div ref={ref} className="relative" style={{ height: H }}>
      {w > 0 && (
        <svg width={w} height={H} role="group" aria-label={`${aName} y ${bName} por período`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} style={{ stroke: t === 0 ? "var(--chart-axis)" : "var(--chart-grid)" }} strokeWidth={1} />
              <text x={m.l - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} style={{ fill: "var(--muted)" }} className="tabular-nums">
                {axisMoney(t)}
              </text>
            </g>
          ))}
          {groups.map((g, i) => {
            const cx = m.l + band * i + band / 2;
            const xa = cx - bw - 1;
            const xb = cx + 1;
            return (
              <g key={g.range}>
                {hover === i && <rect x={m.l + band * i} y={m.t} width={band} height={ph} style={{ fill: "var(--brand-soft)" }} opacity={0.6} rx={6} />}
                <path d={columnPath(xa, y(g.a), bw, y(0))} style={{ fill: "var(--series-1)" }} />
                <path d={columnPath(xb, y(g.b), bw, y(0))} style={{ fill: "var(--series-2)" }} />
                <text x={cx} y={H - 8} textAnchor="middle" fontSize={11} style={{ fill: "var(--muted)" }}>
                  {g.label}
                </text>
              </g>
            );
          })}
          {peak.v > 0 && (
            <text
              x={m.l + band * peak.g + band / 2 + (peak.side === "a" ? -bw / 2 - 1 : bw / 2 + 1)}
              y={y(peak.v) - 6}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              style={{ fill: "var(--foreground)" }}
            >
              {money(peak.v)}
            </text>
          )}
          {/* Zonas de interacción: más grandes que las barras */}
          {groups.map((g, i) => (
            <rect
              key={`hit-${g.range}`}
              x={m.l + band * i}
              y={m.t}
              width={band}
              height={ph + m.b}
              fill="transparent"
              role="group"
              tabIndex={0}
              aria-label={`${g.range}: ${aName} ${money(g.a)}, ${bName} ${money(g.b)}`}
              onPointerEnter={() => setHover(i)}
              onPointerMove={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              style={{ outline: "none" }}
            />
          ))}
        </svg>
      )}
      {hover !== null && w > 0 && (
        <Tooltip
          x={m.l + band * hover + band / 2}
          width={w}
          title={groups[hover].range}
          rows={[
            { color: "var(--series-1)", name: aName, value: money(groups[hover].a) },
            { color: "var(--series-2)", name: bName, value: money(groups[hover].b) },
          ]}
        />
      )}
    </div>
  );
}

/* ───────────── línea: saldo en el tiempo ───────────── */
export type BalancePoint = { label: string; date: string; value: number };
export type BalanceMark = { index: number; text: string; critical: boolean };

export function BalanceLineFigure({
  title,
  subtitle,
  points,
  name = "Saldo",
  mark,
}: {
  title: string;
  subtitle?: string;
  points: BalancePoint[];
  name?: string;
  mark?: BalanceMark;
}) {
  return (
    <ChartFigure
      title={title}
      subtitle={subtitle}
      chart={<BalanceLine points={points} name={name} mark={mark} />}
      table={<DataTable head={["Fecha", name]} rows={points.map((p) => [p.label, money(p.value)])} />}
    />
  );
}

function BalanceLine({ points, name, mark }: { points: BalancePoint[]; name: string; mark?: BalanceMark }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 210;
  const m = { l: 52, r: 64, t: 18, b: 26 };
  const n = points.length;

  if (n === 0) return <p className="py-10 text-center text-sm text-muted">Sin datos para mostrar.</p>;

  const values = points.map((p) => p.value);
  const { ticks, lo, hi } = niceTicks(Math.min(...values), Math.max(...values), 4);
  const pw = Math.max(w - m.l - m.r, 0);
  const ph = H - m.t - m.b;
  const x = (i: number) => m.l + (n === 1 ? pw / 2 : (i / (n - 1)) * pw);
  const y = (v: number) => m.t + ph - ((v - lo) / (hi - lo || 1)) * ph;
  const zeroY = y(Math.min(Math.max(0, lo), hi));

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const area = `${line}L${x(n - 1).toFixed(1)},${zeroY}L${x(0).toFixed(1)},${zeroY}Z`;

  const labelCount = w < 460 ? 3 : 5;
  const xLabels = Array.from(new Set(Array.from({ length: Math.min(labelCount, n) }, (_, j) => Math.round((j * (n - 1)) / Math.max(Math.min(labelCount, n) - 1, 1)))));

  const moveTo = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left;
    setHover(Math.min(n - 1, Math.max(0, Math.round(((px - m.l) / (pw || 1)) * (n - 1)))));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n - 1) - 1));
    if (e.key === "ArrowRight") setHover((h) => Math.min(n - 1, (h ?? n - 1) + 1));
    if (e.key === "Escape") setHover(null);
  };

  const last = points[n - 1];

  return (
    <div ref={ref} className="relative" style={{ height: H }}>
      {w > 0 && (
        <svg width={w} height={H} role="group" aria-label={`${name} a lo largo del período. Último valor ${money(last.value)}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} style={{ stroke: t === 0 ? "var(--chart-axis)" : "var(--chart-grid)" }} strokeWidth={1} />
              <text x={m.l - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} style={{ fill: "var(--muted)" }} className="tabular-nums">
                {axisMoney(t)}
              </text>
            </g>
          ))}
          {xLabels.map((i, k) => (
            <text key={i} x={x(i)} y={H - 8} textAnchor={k === 0 && xLabels.length > 1 ? "start" : k === xLabels.length - 1 && xLabels.length > 1 ? "end" : "middle"} fontSize={11} style={{ fill: "var(--muted)" }}>
              {points[i].label}
            </text>
          ))}

          <path d={area} style={{ fill: "var(--foreground)" }} opacity={0.07} />
          <path d={line} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" style={{ stroke: "var(--foreground)" }} />

          {/* Marca de interés (p. ej. saldo mínimo / negativo) */}
          {mark && points[mark.index] && (
            <g>
              <circle cx={x(mark.index)} cy={y(points[mark.index].value)} r={6} style={{ fill: "var(--surface)" }} />
              <circle cx={x(mark.index)} cy={y(points[mark.index].value)} r={4} style={{ fill: mark.critical ? "var(--danger)" : "var(--foreground)" }} />
              <text
                x={Math.min(Math.max(x(mark.index), m.l + 60), w - m.r - 60)}
                y={y(points[mark.index].value) + (y(points[mark.index].value) + 22 <= m.t + ph + 6 ? 19 : -12)}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                style={{ fill: mark.critical ? "var(--danger)" : "var(--foreground)", ...halo }}
              >
                {mark.critical ? "▲ " : ""}
                {mark.text}
              </text>
            </g>
          )}

          {/* Punto final con etiqueta directa */}
          <circle cx={x(n - 1)} cy={y(last.value)} r={6} style={{ fill: "var(--surface)" }} />
          <circle cx={x(n - 1)} cy={y(last.value)} r={4} style={{ fill: "var(--foreground)" }} />
          <text x={x(n - 1) + 11} y={y(last.value)} dominantBaseline="middle" fontSize={12} fontWeight={600} style={{ fill: "var(--foreground)", ...halo }} className="tabular-nums">
            {axisMoney(last.value)}
          </text>

          {/* Cursor */}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={m.t + ph} style={{ stroke: "var(--chart-axis)" }} strokeWidth={1} />
              <circle cx={x(hover)} cy={y(points[hover].value)} r={6} style={{ fill: "var(--surface)" }} />
              <circle cx={x(hover)} cy={y(points[hover].value)} r={4} style={{ fill: "var(--foreground)" }} />
            </g>
          )}

          <rect
            x={m.l}
            y={m.t}
            width={pw}
            height={ph}
            fill="transparent"
            role="group"
              tabIndex={0}
            aria-label={`${name}. Usa las flechas izquierda y derecha para recorrer los días.`}
            onPointerMove={(e) => moveTo(e.clientX, e.currentTarget.getBoundingClientRect())}
            onPointerDown={(e) => moveTo(e.clientX, e.currentTarget.getBoundingClientRect())}
            onPointerLeave={() => setHover(null)}
            onKeyDown={onKey}
            onFocus={() => setHover((h) => h ?? n - 1)}
            onBlur={() => setHover(null)}
            style={{ outline: "none", touchAction: "pan-y" }}
          />
        </svg>
      )}
      {hover !== null && w > 0 && <Tooltip x={x(hover)} width={w} title={points[hover].label} rows={[{ color: "var(--foreground)", name, value: money(points[hover].value) }]} />}
    </div>
  );
}

/* ───────────── barras horizontales simples (ranking de categorías) ───────────── */
export function CategoryBars({ title, items, empty, series, level = 3 }: { title: string; items: { name: string; total: number }[]; empty: string; series: 1 | 2; level?: 2 | 3 }) {
  const Heading = level === 2 ? "h2" : "h3";
  const max = Math.max(1, ...items.map((i) => i.total));
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-label={title}>
      <Heading className="font-semibold">{title}</Heading>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.name} className="space-y-1">
              <div className="flex justify-between gap-3 text-sm">
                <span className="truncate">{i.name}</span>
                <span className="tabular-nums font-medium">{money(i.total)}</span>
              </div>
              <div className="h-2 rounded-full bg-border/60" aria-hidden>
                <div className="h-full rounded-full" style={{ width: `${(i.total / max) * 100}%`, background: `var(--series-${series})` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
