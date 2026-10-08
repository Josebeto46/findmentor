import Image from "next/image";
import { clsx } from "clsx";

/** Logo completo (con eslogan). Tiene fondo blanco propio, por eso se muestra sobre un contenedor blanco. */
export function LogoFull({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/logo.jpg"
      alt="FinMentor – Finanzas en tu bolsillo"
      width={1024}
      height={478}
      priority={priority}
      sizes="(min-width: 1024px) 480px, 90vw"
      className={clsx("h-auto w-full rounded-2xl bg-white", className)}
    />
  );
}

const GOLD = "#e0ac3f";

/** Marca compacta: flecha dorada sobre verde azulado, igual que el logo. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={clsx("size-8", className)}>
      <rect width="32" height="32" rx="8" fill="#0f6f6c" />
      <path d="M6 22l7-7 4 4 8-9" fill="none" stroke={GOLD} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 10h6v6" fill="none" stroke={GOLD} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
