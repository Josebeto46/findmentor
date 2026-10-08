"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Monitor, Moon, Sun } from "lucide-react";

type Theme = "auto" | "light" | "dark";
const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "auto", label: "Automático", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
];

function read(): Theme {
  try {
    const t = localStorage.getItem("fm-theme");
    return t === "light" || t === "dark" ? t : "auto";
  } catch {
    return "auto";
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => (typeof window === "undefined" ? "auto" : read()));

  function choose(next: Theme) {
    setTheme(next);
    try {
      if (next === "auto") localStorage.removeItem("fm-theme");
      else localStorage.setItem("fm-theme", next);
    } catch {
      /* sin almacenamiento: el cambio vale solo para esta visita */
    }
    if (next === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", next);
  }

  return (
    <div>
      <div role="radiogroup" aria-label="Tema de la aplicación" className="grid grid-cols-3 gap-2 rounded-2xl bg-border/50 p-1">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={theme === value}
            onClick={() => choose(value)}
            className={clsx("flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium transition", theme === value ? "bg-surface text-brand shadow-sm" : "text-muted hover:text-foreground")}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">“Automático” sigue la configuración de tu dispositivo.</p>
    </div>
  );
}
