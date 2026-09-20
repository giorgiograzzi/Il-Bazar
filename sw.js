// Il Bazar — service worker: precache dell'app shell per il funzionamento offline.
// Incrementa CACHE_VERSION a ogni deploy con file cambiati, per invalidare la cache vecchia.
const CACHE_VERSION = "il-bazar-v1";

const RISORSE_APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./js/app.js",
  "./js/db.js",
  "./js/editor.js",
  "./js/export.js",
  "./js/italian.js",
  "./js/rime.js",
  "./js/spunti.js",
  "./js/tasca.js",
  "./data/parole.json",
  "./icons/apple-touch-icon.png",
  "./icons/favicon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(RISORSE_APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomi) => Promise.all(nomi.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  const { request } = evento;
  if (request.method !== "GET") return;

  evento.respondWith(
    caches.match(request).then((rispostaCache) => {
      if (rispostaCache) return rispostaCache;
      return fetch(request)
        .then((rispostaRete) => {
          if (rispostaRete && rispostaRete.ok && request.url.startsWith(self.location.origin)) {
            const copia = rispostaRete.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copia));
          }
          return rispostaRete;
        })
        .catch(() => {
          if (request.mode === "navigate") return caches.match("./index.html");
          return undefined;
        });
    })
  );
});
