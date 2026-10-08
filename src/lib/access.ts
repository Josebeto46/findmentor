export type AccessInfo =
  | { state: "none" }
  | { state: "active" | "expiring" | "expired"; days: number; date: Date };

const DAY = 86_400_000;

/** Estado del acceso de un espacio a partir de su fecha de vencimiento (null = sin vencimiento). */
export function accessInfo(expiresAt: string | null | undefined, now = new Date()): AccessInfo {
  if (!expiresAt) return { state: "none" };
  const date = new Date(expiresAt);
  const diff = date.getTime() - now.getTime();
  if (diff <= 0) return { state: "expired", days: 0, date };
  const days = Math.ceil(diff / DAY);
  return { state: days <= 7 ? "expiring" : "active", days, date };
}

export const formatExpiry = (d: Date) =>
  new Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Guayaquil" }).format(d);

export function accessLabel(info: AccessInfo) {
  if (info.state === "none") return "Sin fecha de vencimiento";
  if (info.state === "expired") return `Venció el ${formatExpiry(info.date)}`;
  return `${info.days} ${info.days === 1 ? "día" : "días"} restantes (vence el ${formatExpiry(info.date)})`;
}
