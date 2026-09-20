
/*
 * Semáforo da Saúde - São Luís
 * Service Worker com estratégia NETWORK FIRST:
 * - sempre tenta buscar dados atualizados na rede (inclusive Supabase);
 * - em caso de falha de rede, serve o cache e, como último recurso,
 *   o index.html (para navegações).
 */
const CACHE_NAME = 'semaforo-saude-v3';

// Conjunto mínimo do "casca" da aplicação, pré-cacheado na instalação.
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg'
];

// Instalação: pré-cacheia o shell e ativa imediatamente o novo SW.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Ativação: remove caches antigos de versões anteriores.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) return caches.delete(key);
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Clique na notificação: leva o usuário de volta ao app (foca/cliente existente
// ou abre o index.html).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) return client.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow('/index.html');
      })
  );
});

// Network First: rede primeiro; fallback para o cache em caso de falha.
self.addEventListener('fetch', (event) => {
  // Intercepta apenas requisições GET.
  if (event.request.method !== 'GET') return;

  // Ignora esquemas não suportados (ex.: chrome-extension://, data:, blob:)
  // que causariam erros em cache.put() ou em new URL().
  if (!event.request.url.startsWith('http')) return;

  const requestUrl = new URL(event.request.url);
  const isNavigation = event.request.mode === 'navigate';

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cacheia respostas bem-sucedidas de mesma origem (assets/página).
        // cache.put() só é executado para URLs HTTP(S) (evita erros com
        // esquemas não suportados, como chrome-extension://).
        if (
          response &&
          response.status === 200 &&
          response.type === 'basic' &&
          event.request.url.startsWith('http')
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(async () => {
        // Offline: tenta o cache; para navegações, cai para o index.html.
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (isNavigation) return caches.match('/index.html');
        return Response.error();
      })
  );
});
