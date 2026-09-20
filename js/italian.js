// Il Bazar — motore linguistico italiano condiviso.
// Sillabazione, individuazione euristica dell'accento tonico e chiave di rima.
// Usato sia dall'app (browser, <script type="module">) sia dallo script di build (Node, stesso file).

const VOCALI = "aeiouàèéìíòóùú";
const VOCALI_FORTI = "aeoàèéòó";
const VOCALI_DEBOLI = "iuìíùú";
const VOCALI_ACCENTATE = "àèéìíòóù";

function isVocale(ch) {
  return VOCALI.includes(ch);
}
function isVocaleForte(ch) {
  return VOCALI_FORTI.includes(ch);
}
function isVocaleAccentata(ch) {
  return VOCALI_ACCENTATE.includes(ch);
}

// Divide una parola (minuscola, senza spazi) nei suoi gruppi di lettere:
// alterna gruppi di consonanti e gruppi di vocali.
function gruppiLettere(parola) {
  const gruppi = [];
  let corrente = "";
  let tipoCorrente = null; // 'v' | 'c'
  for (const ch of parola) {
    const tipo = isVocale(ch) ? "v" : "c";
    if (tipo !== tipoCorrente) {
      if (corrente) gruppi.push({ tipo: tipoCorrente, testo: corrente });
      corrente = ch;
      tipoCorrente = tipo;
    } else {
      corrente += ch;
    }
  }
  if (corrente) gruppi.push({ tipo: tipoCorrente, testo: corrente });
  return gruppi;
}

// All'interno di un gruppo di sole vocali, decide dove cadono i confini di sillaba
// (dittonghi/trittonghi = 1 sillaba, iati = sillabe separate).
// Regola semplificata standard: vocale debole (i/u) non accentata accanto a un'altra
// vocale forma dittongo/trittongo con essa; due vocali forti sono sempre in iato;
// una vocale debole ACCENTATA (ì, ù) è sempre in iato rispetto alla vicina.
function segmentaGruppoVocalico(testo) {
  const sillabe = [""];
  for (let i = 0; i < testo.length; i++) {
    const ch = testo[i];
    if (i === 0) {
      sillabe[sillabe.length - 1] += ch;
      continue;
    }
    const prev = testo[i - 1];
    const entrambeForti = isVocaleForte(prev) && isVocaleForte(ch);
    const debolaAccentataCoinvolta =
      (VOCALI_DEBOLI.includes(prev) && isVocaleAccentata(prev)) ||
      (VOCALI_DEBOLI.includes(ch) && isVocaleAccentata(ch));
    // Iato se: entrambe forti, oppure una vocale debole coinvolta porta l'accento grafico.
    if (entrambeForti || debolaAccentataCoinvolta) {
      sillabe.push(ch);
    } else {
      sillabe[sillabe.length - 1] += ch;
    }
  }
  return sillabe;
}

const MUTA = new Set(["b", "c", "d", "f", "g", "p", "t", "v"]);
const LIQUIDA = new Set(["l", "r"]);

// Divide un gruppo di consonanti tra la sillaba precedente e quella successiva.
// Ritorna { coda, attacco }: "coda" resta con la sillaba prima, "attacco" apre la successiva.
function dividiConsonanti(cons) {
  if (cons.length === 0) return { coda: "", attacco: "" };
  if (cons.length === 1) return { coda: "", attacco: cons };

  // "s" impura + una o più consonanti: il gruppo intero passa alla sillaba successiva
  // (es. pe-sca, fi-ne-stra).
  if (cons[0] === "s") {
    return { coda: "", attacco: cons };
  }
  // "ch", "gh", "gn": digrammi inseparabili, restano uniti e vanno alla sillaba successiva;
  // eventuali consonanti precedenti restano con la sillaba precedente (es. mon-ta-gna, per-ché).
  const ultimeDue = cons.slice(-2);
  if (ultimeDue === "ch" || ultimeDue === "gh" || ultimeDue === "gn") {
    return { coda: cons.slice(0, -2), attacco: ultimeDue };
  }
  if (cons.length === 2) {
    const [prima, seconda] = cons;
    // Doppie (geminate): si dividono sempre.
    if (prima === seconda) return { coda: prima, attacco: seconda };
    // Muta + liquida: gruppo inseparabile, va alla sillaba successiva.
    if (MUTA.has(prima) && LIQUIDA.has(seconda)) return { coda: "", attacco: cons };
    // Altrimenti si divide una consonante per parte.
    return { coda: prima, attacco: seconda };
  }
  // 3+ consonanti (rare in parole native): la prima resta,
  // le restanti seguono se formano un attacco valido (muta+liquida), altrimenti si dividono a metà.
  const prima = cons[0];
  const resto = cons.slice(1);
  if (MUTA.has(resto[0]) && LIQUIDA.has(resto[1])) {
    return { coda: prima, attacco: resto };
  }
  const meta = Math.ceil(cons.length / 2);
  return { coda: cons.slice(0, meta), attacco: cons.slice(meta) };
}

// Alcune parole italiane in "-ia/-io/-ii" non sono dittonghi ma iati, perché l'accento
// tonico cade proprio sulla "i" (es. po-e-si-a, non po-e-sia). Non è deducibile dalla sola
// grafia senza un dizionario di pronuncia: usiamo suffissi produttivi affidabili + un elenco
// delle parole più comuni in poesia e testi (sentimenti, stati d'animo, astratti).
const IATO_SUFFISSI = ["logia", "logie", "grafia", "grafie", "sofia", "sofie",
  "fobia", "fobie", "patia", "patie", "crazia", "crazie"];
const IATO_PAROLE = new Set([
  "poesia","poesie","allegria","allegrie","malinconia","malinconie","gelosia","gelosie",
  "nostalgia","nostalgie","energia","energie","sinergia","sinergie","allergia","allergie",
  "chirurgia","euforia","disforia","follia","follie","pazzia","pazzie","bugia","bugie",
  "magia","magie","farmacia","farmacie","fantasia","fantasie","cortesia","cortesie",
  "ipocrisia","ipocrisie","armonia","armonie","malattia","malattie","compagnia","compagnie",
  "periferia","periferie","batteria","batterie","categoria","categorie","agonia","agonie",
  "anatomia","autonomia","economia","economie","astronomia","gastronomia","monotonia",
  "cerimonia","cerimonie","apatia","empatia","simpatia","simpatie","antipatia","antipatie",
  "telepatia","utopia","utopie","miopia","polizia","carestia","carestie",
  "signoria","signorie",
]);

function applicaEccezioniIato(sillabe, parola) {
  if (sillabe.length === 0) return sillabe;
  const ultima = sillabe[sillabe.length - 1];
  // Serve una sillaba finale del tipo "...[cons]i[a/e/o]" da poter scindere in due.
  if (ultima.length < 2) return sillabe;
  const penultimaLettera = ultima[ultima.length - 2];
  if (penultimaLettera !== "i") return sillabe;

  const matchSuffisso = IATO_SUFFISSI.some((suf) => parola.endsWith(suf));
  const matchParola = IATO_PAROLE.has(parola);
  if (!matchSuffisso && !matchParola) return sillabe;

  const nuove = sillabe.slice(0, -1);
  nuove.push(ultima.slice(0, -1), ultima.slice(-1));
  return nuove;
}

/**
 * Sillabifica una parola italiana (minuscola).
 * @param {string} parolaOriginale
 * @returns {string[]} array di sillabe
 */
export function sillabifica(parolaOriginale) {
  const parola = (parolaOriginale || "").toLowerCase().trim();
  if (!parola) return [];

  const gruppi = gruppiLettere(parola);
  // Costruiamo una lista di "blocchi vocalici" (già suddivisi in sillabe) e i gruppi
  // di consonanti che li separano, poi li ricomponiamo assegnando ogni consonante.
  const bloccheVocali = []; // array di array di sillabe-vocaliche
  const consonantiTra = []; // consonantiTra[i] = consonanti tra bloccheVocali[i] e bloccheVocali[i+1]
  let consonantiIniziali = "";
  let consonantiFinali = "";

  let i = 0;
  if (gruppi.length && gruppi[0].tipo === "c") {
    consonantiIniziali = gruppi[0].testo;
    i = 1;
  }
  for (; i < gruppi.length; i++) {
    const g = gruppi[i];
    if (g.tipo === "v") {
      bloccheVocali.push(segmentaGruppoVocalico(g.testo));
    } else if (i === gruppi.length - 1) {
      consonantiFinali = g.testo;
    } else {
      consonantiTra.push(g.testo);
    }
  }

  if (bloccheVocali.length === 0) {
    // Parola senza vocali (es. sigle): la trattiamo come sillaba unica.
    return [parola];
  }

  // Appiattiamo in sillabe vocaliche pure, tenendo traccia di quali confini sono "tra blocchi"
  // (dove va inserito un gruppo consonantico) e quali sono interni a un blocco (dittonghi/iati,
  // senza consonanti in mezzo).
  const sillabe = [];
  const confineTraBlocchi = []; // true se il confine sillabe[k]|sillabe[k+1] è tra due blocchi vocalici diversi
  bloccheVocali.forEach((blocco, idxBlocco) => {
    blocco.forEach((s, idxS) => {
      if (sillabe.length > 0) {
        confineTraBlocchi.push(idxS === 0);
      }
      sillabe.push(s);
    });
  });

  // Assegna le consonanti iniziali alla prima sillaba.
  sillabe[0] = consonantiIniziali + sillabe[0];

  // Assegna le consonanti tra i blocchi vocalici, spezzandole tra fine-blocco-precedente e inizio-blocco-successivo.
  let idxConsonantiTra = 0;
  for (let k = 0; k < confineTraBlocchi.length; k++) {
    if (confineTraBlocchi[k]) {
      const cons = consonantiTra[idxConsonantiTra++] || "";
      const { coda, attacco } = dividiConsonanti(cons);
      sillabe[k] += coda;
      sillabe[k + 1] = attacco + sillabe[k + 1];
    }
    // se il confine è interno a un blocco (dittongo/iato) non ci sono consonanti da assegnare.
  }

  // Consonanti finali di parola vanno tutte all'ultima sillaba.
  sillabe[sillabe.length - 1] += consonantiFinali;

  return applicaEccezioniIato(sillabe, parola);
}

/** Conta le sillabe di una singola parola. */
export function contaSillabeParola(parola) {
  return sillabifica(parola).length;
}

// Eccezioni sdrucciole/bisdrucciole più comuni nel parlato e nella scrittura italiana,
// dove l'euristica generica (piana di default) sbaglierebbe. Elenco non esaustivo:
// una sillabazione perfetta richiederebbe un dizionario di pronuncia completo.
const PAROLE_SDRUCCIOLE = new Set([
  "tavolo","tavoli","popolo","popoli","secolo","secoli","angolo","angoli","titolo","titoli",
  "articolo","articoli","ostacolo","ostacoli","spettacolo","spettacoli","veicolo","veicoli",
  "ridicolo","ridicoli","simbolo","simboli","diavolo","diavoli","favola","favole","tavola","tavole",
  "macchina","macchine","musica","musiche","politica","politiche","matematica","matematiche",
  "fisica","fisiche","chimica","chimiche","fabbrica","fabbriche","epoca","epoche","anima","anime",
  "lacrima","lacrime","numero","numeri","genere","generi","tenero","tenera","teneri","tenere",
  "libero","libera","liberi","libere","cattedra","cattedre","sabato","sabati","pratica","pratiche",
  "ultimo","ultima","ultimi","ultime","ottimo","ottima","ottimi","ottime","intimo","intima","intimi","intime",
  "massimo","massima","massimi","massime","minimo","minima","minimi","minime",
  "prossimo","prossima","prossimi","prossime","decimo","decima","decimi","decime",
  "automobile","automobili","incredibile","incredibili","possibile","possibili",
  "impossibile","impossibili","terribile","terribili","orribile","orribili",
  "difficile","difficili","semplice","semplici","facile","facili","utile","utili","inutile","inutili",
  "capitolo","capitoli","cronaca","cronache","apostrofo","apostrofi","fantastico","fantastica","fantastici","fantastiche",
  "logico","logica","logici","logiche","magico","magica","magici","magiche","tragico","tragica","tragici","tragiche",
  "comico","comica","comici","comiche","medico","medici","pratico","pratici","tecnico","tecnica","tecnici","tecniche",
  "pubblico","pubblica","pubblici","pubbliche","simpatico","simpatica","simpatici","simpatiche",
  "cattolico","cattolica","cattolici","cattoliche","unico","unica","unici","uniche",
  "epico","epica","epici","epiche","classico","classica","classici","classiche",
]);
// Eccezioni piane per parole che finiscono in -ico/-ica/-ici/-iche ma NON sono sdrucciole.
const PIANE_ECCEZIONI_ICO = new Set([
  "amico","amica","amici","amiche","nemico","nemica","nemici","nemiche",
  "antico","antica","antichi","antiche","pudico","mendico","aprico","fico","fichi",
  "dico","dici","ortica","ortiche",
]);

const SUFFISSI_SDRUCCIOLI = ["bile","bili","cida","cidi","fero","fera","feri","fere",
  "grafo","grafi","logo","loghi","metro","metri","nomo","nomi","sofo","sofi","plice","plici",
  "issimo","issima","issimi","issime"];

/**
 * Stima l'indice (0-based) della sillaba tonica di una parola, dato l'array di sillabe.
 * Euristica: tronca se la parola finisce con vocale accentata; altrimenti si controllano
 * eccezioni sdrucciole note; il default è piana (penultima sillaba).
 */
export function trovaSillabaTonica(sillabe, parolaOriginale) {
  const n = sillabe.length;
  if (n <= 1) return 0;
  const parola = (parolaOriginale || sillabe.join("")).toLowerCase();
  const ultimaLettera = parola[parola.length - 1];

  if (isVocaleAccentata(ultimaLettera)) {
    return n - 1; // tronca
  }
  if (n >= 3) {
    if (PAROLE_SDRUCCIOLE.has(parola)) return n - 3;
    if (/(ico|ica|ici|iche)$/.test(parola) && !PIANE_ECCEZIONI_ICO.has(parola)) {
      return n - 3;
    }
    for (const suf of SUFFISSI_SDRUCCIOLI) {
      if (parola.endsWith(suf)) return n - 3;
    }
    if (/(avano|evano|ivano|ebbero|erebbero)$/.test(parola)) return n - 3;
  }
  return n - 2; // piana (default)
}

// Trova l'indice del "nucleo" vocalico dentro una sillaba (per il calcolo della rima):
// la vocale forte se presente, altrimenti l'ultima vocale del gruppo (dittonghi deboli-deboli).
function indiceNucleo(sillaba) {
  let ultimoIndiceVocale = -1;
  for (let i = 0; i < sillaba.length; i++) {
    const ch = sillaba[i];
    if (isVocaleForte(ch)) return i;
    if (isVocale(ch)) ultimoIndiceVocale = i;
  }
  return ultimoIndiceVocale >= 0 ? ultimoIndiceVocale : 0;
}

function normalizzaAccento(ch) {
  const mappa = { à: "a", è: "e", é: "e", ì: "i", í: "i", ò: "o", ó: "o", ù: "u", ú: "u" };
  return mappa[ch] || ch;
}

/**
 * Calcola la chiave di rima di una parola: dalla vocale tonica alla fine della parola
 * (accenti normalizzati). Due parole con la stessa chiave fanno rima perfetta.
 */
export function chiaveRima(parola) {
  const p = (parola || "").toLowerCase().trim();
  if (!p) return "";
  const sillabe = sillabifica(p);
  if (sillabe.length === 0) return "";
  const idxTonica = trovaSillabaTonica(sillabe, p);
  const sillabaTonica = sillabe[idxTonica];
  const idxNucleo = indiceNucleo(sillabaTonica);
  const codaSillabaTonica = sillabaTonica.slice(idxNucleo);
  const resto = sillabe.slice(idxTonica + 1).join("");
  return (codaSillabaTonica + resto).split("").map(normalizzaAccento).join("");
}

/** Chiave di assonanza: solo le vocali della chiave di rima (le consonanti non contano). */
export function chiaveAssonanza(chiaveRimaCalcolata) {
  return chiaveRimaCalcolata
    .split("")
    .filter((ch) => "aeiou".includes(ch))
    .join("");
}

/**
 * Conta le sillabe di un intero verso, con sinalefe opzionale: quando una parola finisce
 * per vocale e la successiva inizia per vocale, le due sillabe si fondono in una sola
 * (come nel computo tradizionale del verso italiano).
 */
export function contaSillabeVerso(verso, { sinalefe = false } = {}) {
  const parole = (verso || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p.replace(/[^a-zàèéìíòóùúA-ZÀÈÉÌÍÒÓÙÚ']/g, ""))
    .filter(Boolean);

  if (parole.length === 0) return 0;

  let totale = 0;
  let sillabePrecedenti = null;
  for (let i = 0; i < parole.length; i++) {
    const sillabe = sillabifica(parole[i]);
    if (sillabe.length === 0) continue;
    if (sinalefe && sillabePrecedenti) {
      const ultimaPrec = sillabePrecedenti[sillabePrecedenti.length - 1];
      const primaAttuale = sillabe[0];
      const finisceVocale = isVocale(ultimaPrec[ultimaPrec.length - 1]);
      const iniziaVocale = isVocale(primaAttuale[0]);
      if (finisceVocale && iniziaVocale) {
        totale -= 1; // le due sillabe di confine si fondono in una
      }
    }
    totale += sillabe.length;
    sillabePrecedenti = sillabe;
  }
  return Math.max(totale, 0);
}

// Esporta anche per l'uso in Node (script di build) quando non disponibile `import` ESM puro.
export default {
  sillabifica,
  contaSillabeParola,
  trovaSillabaTonica,
  chiaveRima,
  chiaveAssonanza,
  contaSillabeVerso,
};
