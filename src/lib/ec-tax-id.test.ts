import { describe, expect, it } from "vitest";
import { isValidCedula, isValidEcuadorId, isValidRuc } from "./ec-tax-id";

describe("cédula", () => {
  it("acepta cédulas válidas", () => {
    for (const c of ["1710034065", "1713175071", "0926687856"]) expect(isValidCedula(c)).toBe(true);
  });
  it("rechaza dígito verificador incorrecto", () => {
    expect(isValidCedula("1710034066")).toBe(false);
    expect(isValidCedula("1713175070")).toBe(false);
  });
  it("rechaza formato, provincia y tercer dígito inválidos", () => {
    expect(isValidCedula("171003406")).toBe(false); // 9 dígitos
    expect(isValidCedula("17100340650")).toBe(false); // 11 dígitos
    expect(isValidCedula("abcdefghij")).toBe(false);
    expect(isValidCedula("9910034065")).toBe(false); // provincia 99
    expect(isValidCedula("1760034065")).toBe(false); // tercer dígito 6 no es persona natural
  });
});

describe("RUC", () => {
  it("acepta RUC reales de sociedades privadas (tercer dígito 9)", () => {
    for (const r of ["1790010937001", "1790016919001", "1791251237001", "0990004196001"]) expect(isValidRuc(r)).toBe(true);
  });
  it("acepta RUC del sector público (tercer dígito 6)", () => {
    expect(isValidRuc("1760013210001")).toBe(true);
  });
  it("acepta el RUC de una persona natural (cédula + 001)", () => {
    expect(isValidRuc("1710034065001")).toBe(true);
  });
  it("rechaza establecimiento 000, dígito verificador y largo incorrectos", () => {
    expect(isValidRuc("1790010937000")).toBe(false);
    expect(isValidRuc("1790010938001")).toBe(false);
    expect(isValidRuc("179001093700")).toBe(false);
  });
});

describe("isValidEcuadorId", () => {
  it("acepta cédula o RUC y rechaza lo demás", () => {
    expect(isValidEcuadorId("1710034065")).toBe(true);
    expect(isValidEcuadorId("1790010937001")).toBe(true);
    expect(isValidEcuadorId("12345")).toBe(false);
    expect(isValidEcuadorId("")).toBe(false);
  });
});
