# FinMentor

Finanzas en tu bolsillo: ingresos, gastos, flujo de caja, presupuestos, recurrentes e impuestos de Ecuador (USD) para personas y empresas.

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, desplegado en **Vercel**.
- **Backend:** **Supabase** (PostgreSQL con RLS, Auth, Storage y pg_cron). No hay servidor aparte: la lógica de datos vive en la base de datos.

## Requisitos
- Node.js **20.9+** (probado con 24) y npm
- Cuentas de Supabase, GitHub y Vercel

## 1. Base de datos (Supabase)
1. Crear un proyecto en Supabase (región cercana a la de Vercel).
2. En **SQL Editor**, ejecutar **en este orden**:
   1. `supabase/migrations/0001_core.sql`
   2. `supabase/migrations/0002_finance.sql`
   3. `supabase/migrations/0003_harden_functions.sql`
   4. `supabase/migrations/0004_fix_audit_row.sql`
   5. `supabase/migrations/0005_summaries.sql`
   6. `supabase/seed.sql` (planes, IVA y calendario base; debe ir antes de la 0007)
   7. `supabase/migrations/0006_admin_access_control.sql`
   8. `supabase/migrations/0007_tax_module.sql` (tablas de renta, retenciones 2026 y rebaja de gastos personales)
   9. `supabase/migrations/0008_recurring.sql` (recurrentes; programa un trabajo diario con pg_cron si está disponible)
   10. `supabase/migrations/0009_team_attachments.sql` (invitaciones al equipo y adjuntos)
   11. `supabase/migrations/0010_performance.sql` (opcional: índices y políticas RLS más eficientes)
3. Registrarse en la app y volverse Administrador (una sola vez, desde el SQL Editor):
   ```sql
   update public.profiles set platform_role = 'admin' where email = 'tu-correo@dominio.com';
   ```

## 2. Variables de entorno
Copiar `.env.example` a `.env.local` (desarrollo). En Vercel se cargan en **Settings → Environment Variables**:

| Variable | Valor | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<proyecto>.supabase.co` | Pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clave `anon` / publishable | Pública; la seguridad la da RLS |
| `NEXT_PUBLIC_SITE_URL` | URL final (ej. `https://finmentor.vercel.app`) | Para enlaces de correo |
| `SUPABASE_SERVICE_ROLE_KEY` | — | **No se necesita hoy.** Nunca con prefijo `NEXT_PUBLIC_` |

## 3. Configuración de Supabase Auth
En **Authentication**:
1. **URL Configuration → Site URL:** la URL de producción de Vercel.
2. **Redirect URLs:** agregar la URL de producción, `https://*.vercel.app` (previews) y `http://localhost:3000`. Sin esto fallan los enlaces de correo, la recuperación de contraseña, Google y las invitaciones.
3. **Providers → Google** (opcional): activar con las credenciales de Google Cloud.
4. **Sign In / Providers → Email:** dejar activada la confirmación de correo en producción.
5. **Passwords:** activar *Leaked password protection*.
6. **SMTP propio** (Authentication → SMTP Settings): el correo por defecto de Supabase tiene un límite muy bajo y no sirve para producción.

## 4. Despliegue en Vercel
1. Crear un repositorio en GitHub y subir el código (`git add`, `git commit`, `git push`). `.env.local` y `Informacion_Accesos*` ya están en `.gitignore`.
2. En Vercel: **Add New → Project →** importar el repositorio. El framework (Next.js) se detecta solo; no hace falta configurar comandos.
3. Cargar las variables de la sección 2 y pulsar **Deploy**.
4. Con la URL ya publicada, completar la sección 3 (Site URL y Redirect URLs).
5. Entrar a `/registro`, crear la cuenta del Administrador y ejecutar el `update` del paso 1.3.

### Lista de verificación después de publicar
- [ ] Registro y confirmación de correo llegan y vuelven a la app
- [ ] `/admin` abre con la cuenta de Administrador
- [ ] Administración → IVA e impuestos: tarifas, retenciones y tabla de renta del año vigente verificadas contra el SRI
- [ ] Administración → Planes: límites del plan gratuito (100 transacciones al mes) y días de acceso
- [ ] Un movimiento con comprobante sube y se descarga
- [ ] El trabajo diario de recurrentes existe: `select * from cron.job;`

## Modelo de seguridad
- **RLS en todas las tablas:** el acceso se decide por `workspace_members` y `profiles.platform_role`.
- **Los límites del plan** (`plan_limits`) se imponen en la base de datos con triggers, no solo en la interfaz. `-1` = ilimitado.
- **Espacios solo vía RPC:** `create_workspace` asigna el plan gratuito según el tipo.
- **Usuarios desactivados** pierden acceso a todos sus datos; **espacios vencidos o suspendidos** quedan en solo lectura.
- **Funciones `SECURITY DEFINER`:** solo se exponen las que la app necesita; las internas están revocadas para `anon` y `authenticated`.
- **Adjuntos:** bucket privado `attachments`, imágenes y PDF de hasta 5 MB, accesibles solo para miembros del espacio.
- **Cabeceras de seguridad** (`X-Frame-Options`, `nosniff`, HSTS, etc.) en `next.config.ts`.

## Valores tributarios (verificar cada año)
Todo es dato editable en **Administración → IVA e impuestos**: tarifas de IVA con vigencia, retenciones, vencimientos por noveno dígito y la tabla de **renta personal** (tramos, canasta básica, rebaja y canastas por cargas familiares). Cada diciembre el SRI publica la tabla del año siguiente; la pestaña "Renta personal" permite crear el año copiando el anterior.
Fuentes usadas: Resolución NAC-DGERCGC25-00000043 (tabla de renta 2025 y 2026), Boletín NAC-COM-26-006 (rebaja de gastos personales 2026) y Resolución NAC-DGERCGC26-00000009 (retenciones desde el 01/03/2026).
El módulo es de **apoyo y estimación**: no sustituye la declaración oficial en el SRI.

## Estructura
```
src/app/            páginas (App Router): (auth), (app), admin, invitacion, onboarding…
src/components/     UI compartida, gráficos, menús
src/lib/            contexto, cálculos (flujo de caja, impuestos, presupuestos), clientes Supabase
src/proxy.ts        refresco de sesión y redirecciones (en Next 16, "proxy" reemplaza a "middleware")
supabase/migrations esquema, RLS, triggers, funciones y datos oficiales
supabase/seed.sql   planes gratuitos, IVA y calendario tributario base
```

## Desarrollo
```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm run build    # lo que ejecuta Vercel
```

## Calidad
```bash
npm test         # Vitest: 38 pruebas de los cálculos críticos (validación de cédula/RUC, impuesto a la renta,
                 # períodos y vencimientos de IVA, formato de dinero y fechas, recurrentes)
npm run lint
npm run build
```
- **Accesibilidad:** auditada con `axe-core` (WCAG 2.0/2.1 A y AA y buenas prácticas) en 64 pantallas, en modo claro y oscuro, sin violaciones. Conviene repetirla al agregar pantallas.
- **Aplicación instalable (PWA):** `manifest.webmanifest`, iconos y un service worker mínimo que **no guarda datos de la cuenta**: solo muestra una pantalla "Sin conexión" cuando no hay red. Se registra únicamente en producción. En el móvil: menú del navegador → "Instalar aplicación" / "Añadir a pantalla de inicio".
- **Tema claro/oscuro/automático:** Ajustes → Apariencia (se guarda en el navegador).
- **SEO:** `robots.txt` (las pantallas con sesión no se indexan) y `sitemap.xml` usan `NEXT_PUBLIC_SITE_URL`.

## Antes de publicar
- Completar y hacer revisar por un abogado `/terminos` y `/privacidad` (tienen campos entre corchetes).
- Verificar contra el SRI las canastas por cargas familiares (Administración → IVA e impuestos → Renta personal).

## Notas de operación
- **Recurrentes:** los genera pg_cron cada día a las 00:05 (hora de Ecuador); la app también los genera al abrirse, como respaldo.
- **Invitaciones al equipo:** se comparte un enlace (válido 7 días); no se envía correo automáticamente.
- **Espacio de adjuntos por plan** (`max_adjuntos_mb`): se verifica antes de subir, desde la aplicación.
