// Service worker mínimo y seguro de FinMentor.
// NO guarda en caché datos ni páginas de la cuenta del usuario. Solo, cuando no hay conexión,
// responde con una pantalla autónoma (sin scripts de la app) para que nunca se vea un error del navegador.
const OFFLINE_HTML = `<!doctype html>
<html lang="es-EC"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#0f6f6c"><title>Sin conexión · FinMentor</title>
<style>
  :root{color-scheme:light dark;--bg:#f6f8f6;--fg:#10201c;--muted:#566661;--brand:#0f6f6c;--soft:#e1f1ee}
  @media (prefers-color-scheme:dark){:root{--bg:#0b1512;--fg:#e8f0ed;--muted:#93a59f;--brand:#2dd4bf;--soft:#123530}}
  *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center}
  main{max-width:26rem}.logo{font-weight:700;font-size:1.15rem;margin-bottom:1.5rem}
  .icon{width:56px;height:56px;border-radius:50%;background:var(--soft);color:var(--brand);display:grid;place-items:center;margin:0 auto 1rem;font-size:1.6rem}
  h1{font-size:1.5rem;margin:.25rem 0 .5rem}p{color:var(--muted);margin:0 0 1.5rem}
  button{height:44px;padding:0 22px;border:0;border-radius:12px;background:var(--brand);color:#fff;font:600 .95rem system-ui,sans-serif;cursor:pointer}
  @media (prefers-color-scheme:dark){button{color:#06201b}}
</style></head>
<body><main>
  <div class="logo">FinMentor</div>
  <div class="icon" aria-hidden="true">&#9889;</div>
  <h1>Sin conexión</h1>
  <p>No pudimos conectarnos a internet. Tus datos están a salvo; vuelve a intentarlo cuando recuperes la señal.</p>
  <button type="button" onclick="location.reload()">Reintentar</button>
</main></body></html>`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  // Limpia cachés de versiones anteriores de este service worker
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  // Solo navegaciones: si no hay red se muestra la pantalla sin conexión. Todo lo demás va directo a la red.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(
        () => new Response(OFFLINE_HTML, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }),
      ),
    );
  }
});
