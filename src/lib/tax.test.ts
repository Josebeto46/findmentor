import { describe, expect, it } from "vitest";
import { annualRentDueDate, incomeTax, ivaDueDate, ninthDigit, nextBusinessDay, resolvePeriod, shiftPeriod, type Bracket } from "./tax";

// Tabla oficial del SRI para 2026 (Resolución NAC-DGERCGC25-00000043)
const T2026: Bracket[] = [
  { lower: 0, upper: 12208, base_tax: 0, rate: 0 },
  { lower: 12208, upper: 15549, base_tax: 0, rate: 5 },
  { lower: 15549, upper: 20188, base_tax: 167, rate: 10 },
  { lower: 20188, upper: 26700, base_tax: 631, rate: 12 },
  { lower: 26700, upper: 35136, base_tax: 1412, rate: 15 },
  { lower: 35136, upper: 46575, base_tax: 2678, rate: 20 },
  { lower: 46575, upper: 62005, base_tax: 4965, rate: 25 },
  { lower: 62005, upper: 82679, base_tax: 8823, rate: 30 },
  { lower: 82679, upper: 109956, base_tax: 15025, rate: 35 },
  { lower: 109956, upper: null, base_tax: 24572, rate: 37 },
];

describe("incomeTax (tabla 2026)", () => {
  it("no cobra impuesto dentro de la fracción básica", () => {
    expect(incomeTax(0, T2026)).toBe(0);
    expect(incomeTax(12000, T2026)).toBe(0);
    expect(incomeTax(12208, T2026)).toBe(0);
  });
  it("aplica el porcentaje solo sobre el excedente del tramo", () => {
    expect(incomeTax(13208, T2026)).toBe(50); // (13.208 − 12.208) × 5 %
    expect(incomeTax(23610, T2026)).toBe(1041.64); // 631 + (23.610 − 20.188) × 12 %
  });
  it("es continua en los límites de tramo (usa el impuesto a la fracción básica oficial)", () => {
    expect(incomeTax(15549, T2026)).toBe(167);
    expect(incomeTax(20188, T2026)).toBe(631);
    expect(incomeTax(109956, T2026)).toBe(24572);
  });
  it("usa el último tramo (37 %) para ingresos altos", () => {
    expect(incomeTax(200000, T2026)).toBe(57888.28); // 24.572 + (200.000 − 109.956) × 37 %
  });
  it("sin tabla no calcula impuesto", () => {
    expect(incomeTax(50000, [])).toBe(0);
  });
});

describe("noveno dígito", () => {
  it("lo toma de cédula y RUC", () => {
    expect(ninthDigit("1790123450001")).toBe(5);
    expect(ninthDigit("1710034065")).toBe(6);
  });
  it("devuelve null si no es una identificación completa", () => {
    expect(ninthDigit("12345")).toBeNull();
    expect(ninthDigit(null)).toBeNull();
    expect(ninthDigit("17900123ab001")).toBeNull();
  });
});

describe("fines de semana", () => {
  it("pasa sábado y domingo al lunes", () => {
    expect(nextBusinessDay("2026-10-17")).toBe("2026-10-19"); // sábado
    expect(nextBusinessDay("2026-10-18")).toBe("2026-10-19"); // domingo
    expect(nextBusinessDay("2026-10-19")).toBe("2026-10-19"); // lunes
  });
});

describe("período de IVA por declarar", () => {
  it("mensual: el último mes cerrado", () => {
    const p = resolvePeriod(undefined, "mensual", "2026-10-07");
    expect(p).toMatchObject({ key: "2026-09", from: "2026-09-01", to: "2026-10-01", dueMonth: "2026-10", inProgress: false });
    expect(p.label).toBe("Septiembre de 2026");
  });
  it("mensual: enero declara diciembre del año anterior", () => {
    const p = resolvePeriod(undefined, "mensual", "2026-01-15");
    expect(p).toMatchObject({ key: "2025-12", from: "2025-12-01", to: "2026-01-01", dueMonth: "2026-01" });
  });
  it("mensual: respeta la clave pedida y marca el mes en curso", () => {
    const p = resolvePeriod("2026-10", "mensual", "2026-10-07");
    expect(p.inProgress).toBe(true);
    expect(p.dueMonth).toBe("2026-11");
  });
  it("semestral: primer y segundo semestre", () => {
    expect(resolvePeriod(undefined, "semestral", "2026-10-07")).toMatchObject({ key: "2026-S1", from: "2026-01-01", to: "2026-07-01", dueMonth: "2026-07" });
    expect(resolvePeriod(undefined, "semestral", "2026-03-10")).toMatchObject({ key: "2025-S2", from: "2025-07-01", to: "2026-01-01", dueMonth: "2026-01" });
  });
  it("ignora claves mal formadas", () => {
    expect(resolvePeriod("basura", "mensual", "2026-10-07").key).toBe("2026-09");
    expect(resolvePeriod("2026-13", "mensual", "2026-10-07").key).toBe("2026-09");
  });
});

describe("navegar entre períodos", () => {
  it("mensual cruza de año", () => {
    expect(shiftPeriod(resolvePeriod("2026-12", "mensual"), 1)).toBe("2027-01");
    expect(shiftPeriod(resolvePeriod("2026-01", "mensual"), -1)).toBe("2025-12");
    expect(shiftPeriod(resolvePeriod("2026-05", "mensual"), 3)).toBe("2026-08");
  });
  it("semestral alterna S1/S2", () => {
    expect(shiftPeriod(resolvePeriod("2026-S2", "semestral"), 1)).toBe("2027-S1");
    expect(shiftPeriod(resolvePeriod("2026-S1", "semestral"), -1)).toBe("2025-S2");
    expect(shiftPeriod(resolvePeriod("2026-S1", "semestral"), 1)).toBe("2026-S2");
  });
});

describe("fechas de vencimiento", () => {
  it("IVA mensual: el día del noveno dígito del mes siguiente", () => {
    const sep = resolvePeriod("2026-09", "mensual");
    expect(ivaDueDate(sep, 18)).toBe("2026-10-19"); // el 18 cae domingo
    expect(ivaDueDate(sep, 10)).toBe("2026-10-12"); // el 10 cae sábado
    expect(ivaDueDate(sep, 14)).toBe("2026-10-14"); // miércoles
  });
  it("IVA mensual de diciembre vence en enero del año siguiente", () => {
    expect(ivaDueDate(resolvePeriod("2026-12", "mensual"), 14)).toBe("2027-01-14");
  });
  it("IVA semestral vence en julio y enero", () => {
    expect(ivaDueDate(resolvePeriod("2026-S1", "semestral"), 14)).toBe("2026-07-14");
    expect(ivaDueDate(resolvePeriod("2026-S2", "semestral"), 14)).toBe("2027-01-14");
  });
  it("renta anual: marzo del año siguiente, ajustado a día hábil", () => {
    expect(annualRentDueDate(2026, 28)).toBe("2027-03-29"); // el 28 cae domingo
    expect(annualRentDueDate(2026, 14)).toBe("2027-03-15"); // el 14 cae domingo
  });
});
