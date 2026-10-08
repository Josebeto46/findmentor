import { describe, expect, it } from "vitest";
import { addPeriod, formatDate, money, monthLabel, monthRange, parseMonth, shiftMonth } from "./format";
import { addDays, shortDate } from "./cashflow";

describe("money", () => {
  it("formatea dólares con coma decimal y punto de miles", () => {
    expect(money(1234.5)).toBe("$1.234,50");
    expect(money(0)).toBe("$0,00");
    expect(money(2335)).toBe("$2.335,00");
  });
  it("pone el signo de los negativos delante del símbolo", () => {
    expect(money(-565)).toBe("−$565,00");
    expect(money(-10)).toBe("−$10,00");
  });
  it("no muestra «−$0,00» ni «−0» por redondeo", () => {
    expect(money(-0.001)).toBe("$0,00");
    expect(money(-0)).toBe("$0,00");
  });
});

describe("fechas", () => {
  it("formatDate no desfasa por zona horaria", () => {
    expect(formatDate("2026-10-07")).toBe("07/10/2026");
    expect(formatDate("2026-01-01")).toBe("01/01/2026");
  });
  it("parseMonth acepta YYYY-MM y descarta lo inválido", () => {
    expect(parseMonth("2026-03")).toBe("2026-03");
    expect(parseMonth("2026-13")).toMatch(/^\d{4}-\d{2}$/);
    expect(parseMonth("hola")).toMatch(/^\d{4}-\d{2}$/);
    expect(parseMonth(undefined)).toMatch(/^\d{4}-\d{2}$/);
  });
  it("shiftMonth y monthRange cruzan el año", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(monthRange("2026-12")).toEqual({ from: "2026-12-01", to: "2027-01-01" });
  });
  it("monthLabel en español con mayúscula inicial", () => {
    expect(monthLabel("2026-10")).toBe("Octubre de 2026");
    expect(monthLabel("2026-03")).toBe("Marzo de 2026");
  });
  it("addDays y shortDate", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(shortDate("2026-10-07")).toBe("7 oct");
  });
});

describe("addPeriod (debe coincidir con run_recurring de la base de datos)", () => {
  it("semanal y quincenal", () => {
    expect(addPeriod("2026-09-20", "semanal")).toBe("2026-09-27");
    expect(addPeriod("2026-09-20", "quincenal")).toBe("2026-10-05");
  });
  it("mensual conserva el día o usa el último del mes", () => {
    expect(addPeriod("2026-09-15", "mensual")).toBe("2026-10-15");
    expect(addPeriod("2026-01-31", "mensual")).toBe("2026-02-28");
    expect(addPeriod("2024-01-31", "mensual")).toBe("2024-02-29"); // año bisiesto
    expect(addPeriod("2026-12-10", "mensual")).toBe("2027-01-10");
  });
  it("anual maneja el 29 de febrero", () => {
    expect(addPeriod("2026-10-07", "anual")).toBe("2027-10-07");
    expect(addPeriod("2024-02-29", "anual")).toBe("2025-02-28");
  });
});
