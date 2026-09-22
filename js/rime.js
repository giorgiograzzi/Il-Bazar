// Il Bazar — rimario offline. Carica data/parole.json (generato da scripts/build-rime.js,
// wordlist MIT napolux/paroleitaliane) e cerca rime perfette / assonanze.

import { chiaveRima, chiaveAssonanza } from "./italian.js";

let statoCaricamento = null; // Promise che risolve quando i dati sono pronti
let indiceRime = null; // { [chiaveRima]: string[] }
let indiceAssonanze = null; // { [chiaveAssonanza]: Set<chiaveRima> }

function costruisciIndiceAssonanze() {
  const mappa = new Map();
  for (const rk of Object.keys(indiceRime)) {
    const vk = chiaveAssonanza(rk);
    if (!vk) continue;
    if (!mappa.has(vk)) mappa.set(vk, new Set());
    mappa.get(vk).add(rk);
  }
  return mappa;
}

export function caricaRimario(url = "data/parole.json") {
  if (statoCaricamento) return statoCaricamento;
  statoCaricamento = fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error("Impossibile caricare il rimario");
      return res.json();
    })
    .then((dati) => {
      indiceRime = dati.rime || {};
      indiceAssonanze = costruisciIndiceAssonanze();
      return true;
    })
    .catch((err) => {
      console.error("Rimario non disponibile:", err);
      indiceRime = {};
      indiceAssonanze = new Map();
      return false;
    });
  return statoCaricamento;
}

export function rimarioPronto() {
  return indiceRime !== null;
}

const LIMITE_RISULTATI = 200;

/**
 * Cerca rime per una parola (o l'ultima parola di un'espressione).
 * @param {string} testo
 * @returns {{parola: string, chiave: string, perfette: string[], assonanti: string[]}}
 */
export function cercaRime(testo) {
  const parola = estraiUltimaParola(testo);
  if (!parola || !indiceRime) {
    return { parola: "", chiave: "", perfette: [], assonanti: [] };
  }
  const chiave = chiaveRima(parola);
  const parolaMinuscola = parola.toLowerCase();

  const perfette = (indiceRime[chiave] || []).filter((p) => p !== parolaMinuscola).slice(0, LIMITE_RISULTATI);

  const vk = chiaveAssonanza(chiave);
  const assonanti = [];
  if (vk && indiceAssonanze.has(vk)) {
    for (const rk of indiceAssonanze.get(vk)) {
      if (rk === chiave) continue;
      for (const p of indiceRime[rk] || []) {
        assonanti.push(p);
        if (assonanti.length >= LIMITE_RISULTATI) break;
      }
      if (assonanti.length >= LIMITE_RISULTATI) break;
    }
  }

  return { parola: parolaMinuscola, chiave, perfette, assonanti };
}

/** Estrae l'ultima parola "vera" (solo lettere italiane) da una stringa libera. */
export function estraiUltimaParola(testo) {
  const pulito = (testo || "").toLowerCase().match(/[a-zàèéìíòóùú]+/g);
  return pulito && pulito.length ? pulito[pulito.length - 1] : "";
}

/** Estrae la parola toccata da un testo dato un indice di carattere (per il tocco sull'editor). */
export function estraiParolaAllaPosizione(testo, posizione) {
  if (!testo) return "";
  let inizio = posizione;
  let fine = posizione;
  const isLettera = (ch) => ch && /[a-zàèéìíòóùú]/i.test(ch);
  while (inizio > 0 && isLettera(testo[inizio - 1])) inizio--;
  while (fine < testo.length && isLettera(testo[fine])) fine++;
  return testo.slice(inizio, fine);
}
