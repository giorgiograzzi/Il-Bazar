// Il Bazar — "Tasca": appunti e frasi al volo da riusare mentre si scrive.
import * as db from "./db.js";
import { spuntoDelGiorno } from "./spunti.js";

export async function elencoNote() {
  return db.listaNoteTasca();
}

export async function aggiungiNota(testo) {
  const pulito = (testo || "").trim();
  if (!pulito) return null;
  return db.creaNotaTasca(pulito);
}

export async function modificaNota(id, testo) {
  const pulito = (testo || "").trim();
  if (!pulito) return null;
  return db.aggiornaNotaTasca(id, pulito);
}

export async function rimuoviNota(id) {
  return db.eliminaNotaTasca(id);
}

export function getSpuntoDelGiorno() {
  return spuntoDelGiorno();
}
