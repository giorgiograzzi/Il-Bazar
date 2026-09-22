#!/usr/bin/env node
// Genera data/parole.json a partire dalla wordlist MIT di napolux/paroleitaliane
// (scripts/source/60000_parole_italiane.txt), indicizzando le parole per chiave di rima.
//
// Uso: node scripts/build-rime.js
//
// Il file generato è già incluso nel repository: questo script serve solo per
// rigenerarlo (es. se si aggiorna la wordlist sorgente). L'app in produzione non
// richiede Node né alcun passaggio di build: usa direttamente data/parole.json.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chiaveRima } from "../js/italian.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "source", "60000_parole_italiane.txt");
const OUT = join(__dirname, "..", "data", "parole.json");

const testo = readFileSync(SRC, "utf-8");
const righe = testo.split("\n").map((r) => r.trim()).filter(Boolean);

// Filtra voci non utili al rimario: parole con apostrofi malformati (encoding legacy,
// es. "andra'" invece di "andrà"), numeri, lettere straniere non italiane.
const RIGA_VALIDA = /^[a-zàèéìíîòóùú]+$/;

const indice = new Map(); // chiaveRima -> Set di parole
let totaliValide = 0;

for (const parola of righe) {
  if (!RIGA_VALIDA.test(parola)) continue;
  if (parola.length < 2) continue; // scarta lettere singole tipo "a", "e", "o"
  const rk = chiaveRima(parola);
  if (!rk) continue;
  if (!indice.has(rk)) indice.set(rk, new Set());
  indice.get(rk).add(parola);
  totaliValide++;
}

// Ordiniamo le chiavi e le parole per output deterministico e diff puliti.
const out = {};
for (const chiave of Array.from(indice.keys()).sort()) {
  out[chiave] = Array.from(indice.get(chiave)).sort();
}

const payload = {
  fonte: "napolux/paroleitaliane — 60000_parole_italiane.txt (licenza MIT)",
  generato: new Date().toISOString().slice(0, 10),
  numeroParole: totaliValide,
  numeroChiavi: Object.keys(out).length,
  rime: out,
};

writeFileSync(OUT, JSON.stringify(payload));
console.log(`Scritte ${totaliValide} parole in ${Object.keys(out).length} chiavi di rima -> ${OUT}`);
