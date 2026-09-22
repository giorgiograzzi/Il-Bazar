// Il Bazar — app shell: navigazione tra schermate, pannelli e collegamento dei moduli.
import * as db from "./db.js";
import { creaEditor, leggiPreferenzaSinalefe } from "./editor.js";
import { caricaRimario, rimarioPronto, cercaRime } from "./rime.js";
import * as tasca from "./tasca.js";
import { copiaTesto, generaImmaginePoesia, condividiOScaricaImmagine } from "./export.js";

// --- riferimenti DOM -------------------------------------------------------
const el = (id) => document.getElementById(id);

const schermataLista = el("schermata-lista");
const schermataEditor = el("schermata-editor");
const listaPoesieEl = el("lista-poesie");
const listaVuotaEl = el("lista-vuota");
const btnNuovaPoesia = el("btn-nuova-poesia");
const btnInfo = el("btn-info");

const btnIndietro = el("btn-indietro");
const inputTitolo = el("input-titolo");
const btnEsporta = el("btn-esporta");
const editorContainer = el("editor-container");
const btnRimario = el("btn-rimario");
const btnTasca = el("btn-tasca");
const chkSinalefe = el("chk-sinalefe");

const overlayPannelli = el("overlay-pannelli");
const pannelloRimario = el("pannello-rimario");
const ricercaRima = el("ricerca-rima");
const rimaParolaCorrente = el("rima-parola-corrente");
const listaRimePerfette = el("lista-rime-perfette");
const listaRimeAssonanti = el("lista-rime-assonanti");
const rimeVuote = el("rime-vuote");
const rimeCaricamento = el("rime-caricamento");

const pannelloTasca = el("pannello-tasca");
const testoSpunto = el("testo-spunto");
const formNuovaNota = el("form-nuova-nota");
const inputNuovaNota = el("input-nuova-nota");
const listaNoteTasca = el("lista-note-tasca");
const tascaVuota = el("tasca-vuota");

const pannelloInfo = el("pannello-info");

const menuAzioni = el("menu-azioni");
const corpoMenuAzioni = el("corpo-menu-azioni");
const overlayConferma = el("overlay-conferma");
const testoConferma = el("testo-conferma");
const btnConfermaAnnulla = el("btn-conferma-annulla");
const btnConfermaOk = el("btn-conferma-ok");
const overlayPrompt = el("overlay-prompt");
const titoloPrompt = el("titolo-prompt");
const inputPrompt = el("input-prompt");
const btnPromptAnnulla = el("btn-prompt-annulla");
const btnPromptOk = el("btn-prompt-ok");

const toastEl = el("toast");

// --- stato -------------------------------------------------------------
let editor = null;
let poesiaAperta = null;
let modalitaInserimentoRima = "sostituisci"; // "sostituisci" (tap su parola nel testo) | "inserisci" (ricerca manuale)
let ultimaRicercaRimaTimer = null;
let tabRimaAttiva = "perfette";

// --- utilità: toast --------------------------------------------------------
let toastTimer = null;
export function mostraToast(messaggio) {
  toastEl.textContent = messaggio;
  toastEl.hidden = false;
  toastEl.classList.add("toast-visibile");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("toast-visibile");
    setTimeout(() => (toastEl.hidden = true), 250);
  }, 2200);
}

// --- dialoghi generici -------------------------------------------------

function mostraConferma(messaggio, testoOk = "Elimina") {
  return new Promise((resolve) => {
    testoConferma.textContent = messaggio;
    btnConfermaOk.textContent = testoOk;
    overlayConferma.hidden = false;
    const pulisci = (esito) => {
      overlayConferma.hidden = true;
      btnConfermaOk.removeEventListener("click", suOk);
      btnConfermaAnnulla.removeEventListener("click", suAnnulla);
      resolve(esito);
    };
    const suOk = () => pulisci(true);
    const suAnnulla = () => pulisci(false);
    btnConfermaOk.addEventListener("click", suOk);
    btnConfermaAnnulla.addEventListener("click", suAnnulla);
  });
}

function mostraPrompt(titolo, valoreIniziale = "") {
  return new Promise((resolve) => {
    titoloPrompt.textContent = titolo;
    inputPrompt.value = valoreIniziale;
    overlayPrompt.hidden = false;
    setTimeout(() => {
      inputPrompt.focus();
      inputPrompt.select();
    }, 50);
    const pulisci = (esito) => {
      overlayPrompt.hidden = true;
      btnPromptOk.removeEventListener("click", suOk);
      btnPromptAnnulla.removeEventListener("click", suAnnulla);
      inputPrompt.removeEventListener("keydown", suInvio);
      resolve(esito);
    };
    const suOk = () => pulisci(inputPrompt.value.trim() || null);
    const suAnnulla = () => pulisci(null);
    const suInvio = (e) => {
      if (e.key === "Enter") suOk();
      if (e.key === "Escape") suAnnulla();
    };
    btnPromptOk.addEventListener("click", suOk);
    btnPromptAnnulla.addEventListener("click", suAnnulla);
    inputPrompt.addEventListener("keydown", suInvio);
  });
}

function mostraMenu(voci) {
  return new Promise((resolve) => {
    corpoMenuAzioni.innerHTML = "";
    voci.forEach(({ etichetta, valore, pericolosa }) => {
      const btn = document.createElement("button");
      btn.className = "voce-menu" + (pericolosa ? " voce-menu-pericolosa" : "");
      btn.textContent = etichetta;
      btn.addEventListener("click", () => {
        menuAzioni.hidden = true;
        resolve(valore);
      });
      corpoMenuAzioni.appendChild(btn);
    });
    const btnAnnulla = document.createElement("button");
    btnAnnulla.className = "voce-menu voce-menu-annulla";
    btnAnnulla.textContent = "Annulla";
    btnAnnulla.addEventListener("click", () => {
      menuAzioni.hidden = true;
      resolve(null);
    });
    corpoMenuAzioni.appendChild(btnAnnulla);
    menuAzioni.hidden = false;
  });
}
menuAzioni.addEventListener("click", (e) => {
  if (e.target === menuAzioni) menuAzioni.hidden = true;
});

// --- navigazione tra schermate ------------------------------------------

function mostraSchermataLista() {
  schermataEditor.classList.remove("schermata-attiva");
  schermataLista.classList.add("schermata-attiva");
  poesiaAperta = null;
  renderListaPoesie();
}

function mostraSchermataEditor() {
  schermataLista.classList.remove("schermata-attiva");
  schermataEditor.classList.add("schermata-attiva");
}

// --- schermata: lista poesie ----------------------------------------------

function anteprimaTesto(testo) {
  const pulito = (testo || "").replace(/\s+/g, " ").trim();
  return pulito ? pulito.slice(0, 70) : "Nessun testo ancora.";
}

function formattaData(timestamp) {
  const d = new Date(timestamp);
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

async function renderListaPoesie() {
  const poesie = await db.listaPoesie();
  listaPoesieEl.innerHTML = "";
  listaVuotaEl.hidden = poesie.length > 0;

  for (const poesia of poesie) {
    const li = document.createElement("li");
    li.className = "voce-poesia";

    const bottone = document.createElement("button");
    bottone.className = "voce-poesia-corpo";
    bottone.innerHTML = `
      <span class="voce-poesia-titolo">${escapeHtml(poesia.titolo || "Senza titolo")}</span>
      <span class="voce-poesia-anteprima">${escapeHtml(anteprimaTesto(poesia.testo))}</span>
      <span class="voce-poesia-data">${formattaData(poesia.modificatoIl)}</span>
    `;
    bottone.addEventListener("click", () => apriPoesia(poesia));

    const btnMenu = document.createElement("button");
    btnMenu.className = "btn-icona voce-poesia-menu";
    btnMenu.setAttribute("aria-label", "Azioni poesia");
    btnMenu.textContent = "⋮";
    btnMenu.addEventListener("click", async (e) => {
      e.stopPropagation();
      const scelta = await mostraMenu([
        { etichetta: "Rinomina", valore: "rinomina" },
        { etichetta: "Elimina", valore: "elimina", pericolosa: true },
      ]);
      if (scelta === "rinomina") await rinominaPoesia(poesia);
      if (scelta === "elimina") await eliminaPoesiaConConferma(poesia);
    });

    li.appendChild(bottone);
    li.appendChild(btnMenu);
    listaPoesieEl.appendChild(li);
  }
}

function escapeHtml(s) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function rinominaPoesia(poesia) {
  const nuovoTitolo = await mostraPrompt("Rinomina poesia", poesia.titolo);
  if (!nuovoTitolo) return;
  await db.salvaPoesia(poesia.id, { titolo: nuovoTitolo });
  if (poesiaAperta && poesiaAperta.id === poesia.id) {
    poesiaAperta.titolo = nuovoTitolo;
    inputTitolo.value = nuovoTitolo;
  }
  renderListaPoesie();
}

async function eliminaPoesiaConConferma(poesia) {
  const ok = await mostraConferma(`Eliminare "${poesia.titolo || "Senza titolo"}"? Non si può annullare.`);
  if (!ok) return;
  await db.eliminaPoesia(poesia.id);
  renderListaPoesie();
  mostraToast("Poesia eliminata");
}

btnNuovaPoesia.addEventListener("click", async () => {
  const poesia = await db.creaPoesia("Senza titolo");
  apriPoesia(poesia);
});

btnInfo.addEventListener("click", () => apriPannello(pannelloInfo));

// --- schermata: editor ------------------------------------------------

function apriPoesia(poesia) {
  poesiaAperta = poesia;
  mostraSchermataEditor();
  inputTitolo.value = poesia.titolo || "";
  chkSinalefe.checked = leggiPreferenzaSinalefe();

  if (editor) editor.distruggi();
  editor = creaEditor({
    container: editorContainer,
    onParolaToccata: (parola) => apriPannelloRimario(parola, "sostituisci"),
    onSalvato: () => {
      /* la lista si aggiorna al ritorno */
    },
  });
  editor.carica(poesia);
  editor.impostaSinalefe(chkSinalefe.checked);
}

btnIndietro.addEventListener("click", () => {
  mostraSchermataLista();
});

inputTitolo.addEventListener("change", async () => {
  if (!poesiaAperta) return;
  const titolo = inputTitolo.value.trim() || "Senza titolo";
  poesiaAperta = await db.salvaPoesia(poesiaAperta.id, { titolo });
});

chkSinalefe.addEventListener("change", () => {
  if (editor) editor.impostaSinalefe(chkSinalefe.checked);
});

// --- pannelli: apertura/chiusura generiche -------------------------------

function apriPannello(pannello) {
  document.querySelectorAll(".pannello").forEach((p) => (p.hidden = true));
  pannello.hidden = false;
  overlayPannelli.hidden = false;
  requestAnimationFrame(() => {
    pannello.classList.add("pannello-aperto");
    overlayPannelli.classList.add("overlay-visibile");
  });
}
function chiudiPannelli() {
  document.querySelectorAll(".pannello").forEach((p) => {
    p.classList.remove("pannello-aperto");
  });
  overlayPannelli.classList.remove("overlay-visibile");
  setTimeout(() => {
    document.querySelectorAll(".pannello").forEach((p) => (p.hidden = true));
    overlayPannelli.hidden = true;
  }, 220);
}
overlayPannelli.addEventListener("click", chiudiPannelli);
document.querySelectorAll("[data-chiudi]").forEach((btn) => {
  btn.addEventListener("click", chiudiPannelli);
});

// --- pannello: rimario ---------------------------------------------------

async function apriPannelloRimario(parolaIniziale, modalita) {
  modalitaInserimentoRima = modalita;
  apriPannello(pannelloRimario);
  if (parolaIniziale) {
    rimaParolaCorrente.hidden = false;
    rimaParolaCorrente.textContent = `Rime per "${parolaIniziale}"`;
    ricercaRima.value = parolaIniziale;
  } else {
    rimaParolaCorrente.hidden = true;
    ricercaRima.value = "";
    ricercaRima.focus();
  }
  await eseguiRicercaRima(parolaIniziale || "");
}

async function eseguiRicercaRima(testo) {
  if (!rimarioPronto()) {
    rimeCaricamento.hidden = false;
    rimeVuote.hidden = true;
    await caricaRimario();
  }
  rimeCaricamento.hidden = true;

  const risultato = cercaRime(testo);
  renderChip(listaRimePerfette, risultato.perfette);
  renderChip(listaRimeAssonanti, risultato.assonanti);

  const listaAttiva = tabRimaAttiva === "perfette" ? risultato.perfette : risultato.assonanti;
  rimeVuote.hidden = !testo || listaAttiva.length > 0;
}

function renderChip(ul, parole) {
  ul.innerHTML = "";
  for (const parola of parole) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.textContent = parola;
    btn.addEventListener("click", () => {
      if (!editor) return;
      if (modalitaInserimentoRima === "sostituisci") {
        editor.sostituisciParolaCorrente(parola);
      } else {
        editor.inserisciTesto(parola);
      }
      chiudiPannelli();
    });
    li.appendChild(btn);
    ul.appendChild(li);
  }
}

ricercaRima.addEventListener("input", () => {
  modalitaInserimentoRima = "inserisci";
  rimaParolaCorrente.hidden = true;
  clearTimeout(ultimaRicercaRimaTimer);
  ultimaRicercaRimaTimer = setTimeout(() => eseguiRicercaRima(ricercaRima.value), 150);
});

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("tab-attiva"));
    btn.classList.add("tab-attiva");
    tabRimaAttiva = btn.dataset.tab;
    listaRimePerfette.hidden = tabRimaAttiva !== "perfette";
    listaRimeAssonanti.hidden = tabRimaAttiva !== "assonanti";
    const listaAttiva = tabRimaAttiva === "perfette" ? listaRimePerfette : listaRimeAssonanti;
    rimeVuote.hidden = !ricercaRima.value || listaAttiva.children.length > 0;
  });
});

btnRimario.addEventListener("click", () => apriPannelloRimario("", "inserisci"));

// --- pannello: tasca -------------------------------------------------------

async function apriPannelloTasca() {
  apriPannello(pannelloTasca);
  testoSpunto.textContent = tasca.getSpuntoDelGiorno();
  await renderNoteTasca();
  inputNuovaNota.value = "";
}

async function renderNoteTasca() {
  const note = await tasca.elencoNote();
  listaNoteTasca.innerHTML = "";
  tascaVuota.hidden = note.length > 0;
  for (const nota of note) {
    const li = document.createElement("li");
    li.className = "voce-nota";
    const bottone = document.createElement("button");
    bottone.className = "voce-nota-corpo";
    bottone.textContent = nota.testo;
    bottone.addEventListener("click", () => {
      if (editor) {
        editor.inserisciTesto(nota.testo);
        chiudiPannelli();
        mostraSchermataEditor();
      } else {
        mostraToast("Apri o crea una poesia per inserirla");
      }
    });
    const btnMenu = document.createElement("button");
    btnMenu.className = "btn-icona voce-nota-menu";
    btnMenu.setAttribute("aria-label", "Azioni nota");
    btnMenu.textContent = "⋮";
    btnMenu.addEventListener("click", async (e) => {
      e.stopPropagation();
      const scelta = await mostraMenu([
        { etichetta: "Modifica", valore: "modifica" },
        { etichetta: "Elimina", valore: "elimina", pericolosa: true },
      ]);
      if (scelta === "modifica") {
        const nuovoTesto = await mostraPrompt("Modifica appunto", nota.testo);
        if (nuovoTesto) {
          await tasca.modificaNota(nota.id, nuovoTesto);
          renderNoteTasca();
        }
      }
      if (scelta === "elimina") {
        const ok = await mostraConferma("Eliminare questo appunto?");
        if (ok) {
          await tasca.rimuoviNota(nota.id);
          renderNoteTasca();
        }
      }
    });
    li.appendChild(bottone);
    li.appendChild(btnMenu);
    listaNoteTasca.appendChild(li);
  }
}

formNuovaNota.addEventListener("submit", async (e) => {
  e.preventDefault();
  const testo = inputNuovaNota.value.trim();
  if (!testo) return;
  await tasca.aggiungiNota(testo);
  inputNuovaNota.value = "";
  renderNoteTasca();
});

btnTasca.addEventListener("click", apriPannelloTasca);

// --- esportazione ------------------------------------------------------

btnEsporta.addEventListener("click", async () => {
  if (!editor || !poesiaAperta) return;
  const scelta = await mostraMenu([
    { etichetta: "Copia testo", valore: "copia" },
    { etichetta: "Genera immagine PNG", valore: "immagine" },
  ]);
  if (scelta === "copia") await gestisciCopiaTesto();
  if (scelta === "immagine") await gestisciEsportaImmagine();
});

async function gestisciCopiaTesto() {
  const testo = editor.ottieniTesto();
  const ok = await copiaTesto(testo);
  mostraToast(ok ? "Testo copiato negli appunti" : "Non sono riuscito a copiare il testo");
}

async function gestisciEsportaImmagine() {
  mostraToast("Genero l'immagine...");
  try {
    const titolo = inputTitolo.value.trim() || "Senza titolo";
    const testo = editor.ottieniTesto();
    const blob = await generaImmaginePoesia({ titolo, testo });
    const nomeFile = `${titolo.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "poesia"}.png`;
    const esito = await condividiOScaricaImmagine(blob, nomeFile, titolo);
    if (esito === "scaricato") mostraToast("Immagine scaricata");
    if (esito === "condiviso") mostraToast("Immagine condivisa");
  } catch (err) {
    console.error(err);
    mostraToast("Errore nella generazione dell'immagine");
  }
}

// --- service worker / pwa -------------------------------------------------

function registraServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch((err) => {
        console.error("Registrazione service worker fallita:", err);
      });
    });
  }
}

// --- avvio -------------------------------------------------------------

registraServiceWorker();
caricaRimario();
renderListaPoesie();
