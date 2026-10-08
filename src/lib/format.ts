const usd = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" });

/** Dinero en USD; los negativos llevan el signo delante: −$565,00 */
export function money(n: number) {
  const r = Math.round(n * 100) / 100;
  return r < 0 ? `−${usd.format(-r)}` : usd.format(r === 0 ? 0 : r);
}

/** "2026-10-07" → "07/10/2026" (sin pasar por Date para evitar desfases de zona horaria). */
export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Fecha de hoy en Guayaquil como YYYY-MM-DD. */
export function todayEC() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil" }).format(new Date());
}

/** Mes "YYYY-MM" válido o el actual. */
export function parseMonth(value: string | undefined) {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : todayEC().slice(0, 7);
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es-EC", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function monthRange(month: string) {
  return { from: `${month}-01`, to: `${shiftMonth(month, 1)}-01` };
}

export type Frequency = "semanal" | "quincenal" | "mensual" | "anual";
export const FREQUENCY_LABEL: Record<Frequency, string> = { semanal: "Cada semana", quincenal: "Cada 15 días", mensual: "Cada mes", anual: "Cada año" };

/** Fecha ISO + un período de la frecuencia (mismas reglas que run_recurring en la base de datos). */
export function addPeriod(iso: string, frequency: Frequency) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (frequency === "semanal") dt.setUTCDate(dt.getUTCDate() + 7);
  else if (frequency === "quincenal") dt.setUTCDate(dt.getUTCDate() + 15);
  else if (frequency === "mensual") {
    const day = dt.getUTCDate();
    dt.setUTCDate(1);
    dt.setUTCMonth(dt.getUTCMonth() + 1);
    dt.setUTCDate(Math.min(day, new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate()));
  } else {
    const day = dt.getUTCDate();
    dt.setUTCDate(1);
    dt.setUTCFullYear(dt.getUTCFullYear() + 1);
    dt.setUTCDate(Math.min(day, new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate()));
  }
  return dt.toISOString().slice(0, 10);
}
