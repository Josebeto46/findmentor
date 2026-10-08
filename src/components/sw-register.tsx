"use client";

import { useEffect } from "react";

/** Registra el service worker (solo en producción) para que la app sea instalable y muestre una pantalla clara sin conexión. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* sin service worker la app funciona igual */
    });
  }, []);
  return null;
}
