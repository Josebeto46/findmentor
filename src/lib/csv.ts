import { NextResponse } from "next/server";

/** Texto entre comillas, con comillas internas duplicadas. Neutraliza fórmulas (=, +, -, @) para evitar inyección en Excel. */
export function csvText(v: string | number | null | undefined) {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** Número con coma decimal (Excel en español). */
export const csvNum = (n: number) => n.toFixed(2).replace(".", ",");

/** CSV con separador ";" y BOM UTF-8 para que Excel respete los acentos. */
export function csvResponse(filename: string, head: string[], lines: string[]) {
  return new NextResponse("﻿" + [head.join(";"), ...lines].join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
