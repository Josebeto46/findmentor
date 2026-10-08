/** Validación de cédula y RUC ecuatorianos (algoritmos módulo 10 y módulo 11 del SRI/Registro Civil). */

const digits = (v: string) => v.split("").map(Number);

function validProvince(d: number[]) {
  const p = d[0] * 10 + d[1];
  return (p >= 1 && p <= 24) || p === 30;
}

function mod10(d: number[]) {
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let n = d[i] * (i % 2 === 0 ? 2 : 1);
    if (n > 9) n -= 9;
    sum += n;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === d[9];
}

function mod11(d: number[], coefs: number[], checkIndex: number) {
  const sum = coefs.reduce((acc, c, i) => acc + c * d[i], 0);
  const rest = sum % 11;
  const check = rest === 0 ? 0 : 11 - rest;
  return check === d[checkIndex];
}

export function isValidCedula(value: string) {
  if (!/^\d{10}$/.test(value)) return false;
  const d = digits(value);
  return validProvince(d) && d[2] < 6 && mod10(d);
}

export function isValidRuc(value: string) {
  if (!/^\d{13}$/.test(value)) return false;
  const d = digits(value);
  if (!validProvince(d)) return false;
  const establishment = Number(value.slice(10));
  if (establishment < 1) return false;

  const third = d[2];
  if (third < 6) return mod10(d); // persona natural
  if (third === 6) return mod11(d, [3, 2, 7, 6, 5, 4, 3, 2], 8); // sector público
  if (third === 9) return mod11(d, [4, 3, 2, 7, 6, 5, 4, 3, 2], 9); // sociedad privada
  return false;
}

/** Cédula (10) o RUC (13) válidos. */
export const isValidEcuadorId = (v: string) => isValidCedula(v) || isValidRuc(v);
