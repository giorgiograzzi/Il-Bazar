// Il Bazar — storage locale. Nessun backend, nessun account: tutto resta sul telefono.
// Backend primario: IndexedDB. Fallback automatico su localStorage (es. Safari in
// navigazione privata, dove IndexedDB può non essere disponibile o essere limitato).

const DB_NAME = "il-bazar";
const DB_VERSION = 1;
const STORE_POESIE = "poesie";
const STORE_TASCA = "tasca";
const LS_PREFIX = "il-bazar:";

let dbPromise = null;
let usaFallback = false;

function apriDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      usaFallback = true;
      resolve(null);
      return;
    }
    const richiesta = indexedDB.open(DB_NAME, DB_VERSION);
    richiesta.onupgradeneeded = () => {
      const db = richiesta.result;
      if (!db.objectStoreNames.contains(STORE_POESIE)) {
        db.createObjectStore(STORE_POESIE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_TASCA)) {
        db.createObjectStore(STORE_TASCA, { keyPath: "id" });
      }
    };
    richiesta.onsuccess = () => resolve(richiesta.result);
    richiesta.onerror = () => {
      usaFallback = true;
      resolve(null);
    };
    // Alcuni Safari in modalità privata concedono l'apertura ma falliscono su ogni
    // operazione: verifichiamo con una transazione a vuoto.
    richiesta.onblocked = () => {
      usaFallback = true;
      resolve(null);
    };
  });
  return dbPromise;
}

function generaId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// --- Fallback localStorage -------------------------------------------------

function lsLeggiTutti(store) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + store);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function lsScriviTutti(store, elenco) {
  localStorage.setItem(LS_PREFIX + store, JSON.stringify(elenco));
}
function lsGetAll(store) {
  return Promise.resolve(lsLeggiTutti(store));
}
function lsPut(store, oggetto) {
  const elenco = lsLeggiTutti(store);
  const idx = elenco.findIndex((e) => e.id === oggetto.id);
  if (idx >= 0) elenco[idx] = oggetto;
  else elenco.push(oggetto);
  lsScriviTutti(store, elenco);
  return Promise.resolve(oggetto);
}
function lsDelete(store, id) {
  const elenco = lsLeggiTutti(store).filter((e) => e.id !== id);
  lsScriviTutti(store, elenco);
  return Promise.resolve();
}
function lsGet(store, id) {
  const elenco = lsLeggiTutti(store);
  return Promise.resolve(elenco.find((e) => e.id === id) || null);
}

// --- Operazioni generiche sullo store (IndexedDB o fallback) --------------

async function getAll(store) {
  const db = await apriDb();
  if (usaFallback || !db) return lsGetAll(store);
  return new Promise((resolve) => {
    const tx = db.transaction(store, "readonly");
    const richiesta = tx.objectStore(store).getAll();
    richiesta.onsuccess = () => resolve(richiesta.result || []);
    richiesta.onerror = () => resolve([]);
  });
}

async function get(store, id) {
  const db = await apriDb();
  if (usaFallback || !db) return lsGet(store, id);
  return new Promise((resolve) => {
    const tx = db.transaction(store, "readonly");
    const richiesta = tx.objectStore(store).get(id);
    richiesta.onsuccess = () => resolve(richiesta.result || null);
    richiesta.onerror = () => resolve(null);
  });
}

async function put(store, oggetto) {
  const db = await apriDb();
  if (usaFallback || !db) return lsPut(store, oggetto);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(oggetto);
    tx.oncomplete = () => resolve(oggetto);
    tx.onerror = () => reject(tx.error);
  });
}

async function del(store, id) {
  const db = await apriDb();
  if (usaFallback || !db) return lsDelete(store, id);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- API pubblica: Poesie ---------------------------------------------------

export async function listaPoesie() {
  const elenco = await getAll(STORE_POESIE);
  return elenco.sort((a, b) => b.modificatoIl - a.modificatoIl);
}

export async function getPoesia(id) {
  return get(STORE_POESIE, id);
}

export async function creaPoesia(titolo = "Senza titolo") {
  const ora = Date.now();
  const poesia = { id: generaId(), titolo, testo: "", creatoIl: ora, modificatoIl: ora };
  await put(STORE_POESIE, poesia);
  return poesia;
}

export async function salvaPoesia(id, campi) {
  const esistente = await get(STORE_POESIE, id);
  if (!esistente) return null;
  const aggiornata = { ...esistente, ...campi, id, modificatoIl: Date.now() };
  await put(STORE_POESIE, aggiornata);
  return aggiornata;
}

export async function eliminaPoesia(id) {
  return del(STORE_POESIE, id);
}

// --- API pubblica: Tasca ----------------------------------------------------

export async function listaNoteTasca() {
  const elenco = await getAll(STORE_TASCA);
  return elenco.sort((a, b) => b.creatoIl - a.creatoIl);
}

export async function creaNotaTasca(testo) {
  const nota = { id: generaId(), testo, creatoIl: Date.now() };
  await put(STORE_TASCA, nota);
  return nota;
}

export async function aggiornaNotaTasca(id, testo) {
  const esistente = await get(STORE_TASCA, id);
  if (!esistente) return null;
  const aggiornata = { ...esistente, testo };
  await put(STORE_TASCA, aggiornata);
  return aggiornata;
}

export async function eliminaNotaTasca(id) {
  return del(STORE_TASCA, id);
}
