import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Los cálculos de fechas usan America/Guayaquil de forma explícita; fijamos TZ para que no dependan de la máquina.
    env: { TZ: "UTC" },
  },
});
