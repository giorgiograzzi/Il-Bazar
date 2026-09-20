// Il Bazar — editor a tutto schermo: textarea nativa (per un comportamento tastiera/iOS
// affidabile, senza le insidie di contenteditable), con un "gutter" a fianco di ogni verso
// che mostra il conteggio delle sillabe, calcolato allineando una copia invisibile (mirror)
// che replica esattamente l'a-capo della textarea.

import { contaSillabeVerso } from "./italian.js";
import { estraiParolaAllaPosizione } from "./rime.js";
import * as db from "./db.js";

const CHIAVE_SINALEFE = "il-bazar:sinalefe";

export function leggiPreferenzaSinalefe() {
  return localStorage.getItem(CHIAVE_SINALEFE) === "1";
}
function scriviPreferenzaSinalefe(attiva) {
  localStorage.setItem(CHIAVE_SINALEFE, attiva ? "1" : "0");
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Crea l'editor dentro `container`. Ritorna un controller con cui l'app può
 * caricare una poesia, inserire testo (da rimario/tasca) e reagire ai tocchi sulle parole.
 */
export function creaEditor({ container, onParolaToccata, onSalvato }) {
  container.innerHTML = `
    <div class="editor-wrap">
      <div class="editor-testo-area">
        <div class="editor-mirror" aria-hidden="true"></div>
        <div class="editor-gutter" aria-hidden="true"></div>
        <textarea
          class="editor-textarea"
          placeholder="Scrivi qui la tua rima..."
          autocapitalize="sentences"
          autocorrect="off"
          autocomplete="off"
          spellcheck="false"
          inputmode="text"
        ></textarea>
      </div>
    </div>
  `;

  const textarea = container.querySelector(".editor-textarea");
  const mirror = container.querySelector(".editor-mirror");
  const gutter = container.querySelector(".editor-gutter");

  let poesiaCorrente = null;
  let sinalefeAttiva = leggiPreferenzaSinalefe();
  let timerSalvataggio = null;
  let timerGutter = null;

  function righeCorrenti() {
    return textarea.value.split("\n");
  }

  function ricalcolaGutter() {
    const righe = righeCorrenti();

    // Il mirror deve avere ESATTAMENTE la stessa larghezza/font/padding della textarea
    // perché l'a-capo automatico coincida riga per riga.
    mirror.style.width = `${textarea.clientWidth}px`;

    mirror.innerHTML = righe
      .map((riga, i) => `<div class="mirror-riga" data-i="${i}">${escapeHtml(riga) || "&nbsp;"}</div>`)
      .join("");

    const elementiRiga = mirror.querySelectorAll(".mirror-riga");
    const frammenti = [];
    elementiRiga.forEach((el, i) => {
      const sillabe = contaSillabeVerso(righe[i], { sinalefe: sinalefeAttiva });
      const top = el.offsetTop;
      const testoBadge = sillabe > 0 ? sillabe : "";
      frammenti.push(
        `<div class="gutter-item" style="top:${top}px; height:${el.offsetHeight}px">${testoBadge}</div>`
      );
    });
    gutter.innerHTML = frammenti.join("");
    sincronizzaScroll();
  }

  function pianificaRicalcoloGutter() {
    if (timerGutter) cancelAnimationFrame(timerGutter);
    timerGutter = requestAnimationFrame(ricalcolaGutter);
  }

  function sincronizzaScroll() {
    gutter.style.transform = `translateY(${-textarea.scrollTop}px)`;
  }

  function pianificaSalvataggio() {
    if (!poesiaCorrente) return;
    clearTimeout(timerSalvataggio);
    timerSalvataggio = setTimeout(async () => {
      const testo = textarea.value;
      poesiaCorrente = await db.salvaPoesia(poesiaCorrente.id, { testo });
      if (onSalvato) onSalvato(poesiaCorrente);
    }, 400);
  }

  textarea.addEventListener("input", () => {
    pianificaRicalcoloGutter();
    pianificaSalvataggio();
  });
  textarea.addEventListener("scroll", sincronizzaScroll, { passive: true });
  window.addEventListener("resize", pianificaRicalcoloGutter);

  // Tocco su una parola -> apre il rimario per quella parola (solo tap, non selezione).
  textarea.addEventListener("click", () => {
    if (textarea.selectionStart !== textarea.selectionEnd) return;
    const parola = estraiParolaAllaPosizione(textarea.value, textarea.selectionStart);
    if (parola && onParolaToccata) onParolaToccata(parola);
  });

  // --- Chiusura tastiera scorrendo verso il basso, come nell'app Note di iOS ---------
  // Funziona anche quando il testo è già scrollato in fondo: si basa sul gesto del
  // dito (delta verticale) e non sulla posizione di scroll effettiva.
  let startY = null;
  let gestoGestito = false;
  const SOGLIA_SWIPE = 40;
  textarea.addEventListener(
    "touchstart",
    (e) => {
      startY = e.touches[0].clientY;
      gestoGestito = false;
    },
    { passive: true }
  );
  textarea.addEventListener(
    "touchmove",
    (e) => {
      if (startY === null || gestoGestito) return;
      const delta = e.touches[0].clientY - startY;
      if (delta > SOGLIA_SWIPE) {
        gestoGestito = true;
        textarea.blur();
      }
    },
    { passive: true }
  );
  textarea.addEventListener(
    "touchend",
    () => {
      startY = null;
    },
    { passive: true }
  );

  // --- visualViewport: evita che la tastiera copra il testo -------------------------
  function adattaAllaTastiera() {
    const vv = window.visualViewport;
    const wrap = container.querySelector(".editor-wrap");
    if (!vv || !wrap) return;
    const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    wrap.style.paddingBottom = `${inset}px`;
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", adattaAllaTastiera);
    window.visualViewport.addEventListener("scroll", adattaAllaTastiera);
  }

  function carica(poesia) {
    poesiaCorrente = poesia;
    textarea.value = poesia.testo || "";
    pianificaRicalcoloGutter();
  }

  function inserisciTesto(frammento) {
    const inizio = textarea.selectionStart;
    const fine = textarea.selectionEnd;
    const valore = textarea.value;
    const nuovoValore = valore.slice(0, inizio) + frammento + valore.slice(fine);
    textarea.value = nuovoValore;
    const nuovaPosizione = inizio + frammento.length;
    textarea.setSelectionRange(nuovaPosizione, nuovaPosizione);
    textarea.focus();
    pianificaRicalcoloGutter();
    pianificaSalvataggio();
  }

  function sostituisciParolaCorrente(nuovaParola) {
    // Sostituisce la parola sotto/prima del cursore (usata quando si tocca una rima
    // dopo aver toccato una parola nel testo).
    const pos = textarea.selectionStart;
    const valore = textarea.value;
    let inizio = pos;
    let fine = pos;
    const isLettera = (ch) => ch && /[a-zàèéìíòóùú]/i.test(ch);
    while (inizio > 0 && isLettera(valore[inizio - 1])) inizio--;
    while (fine < valore.length && isLettera(valore[fine])) fine++;
    const nuovoValore = valore.slice(0, inizio) + nuovaParola + valore.slice(fine);
    textarea.value = nuovoValore;
    const nuovaPosizione = inizio + nuovaParola.length;
    textarea.setSelectionRange(nuovaPosizione, nuovaPosizione);
    textarea.focus();
    pianificaRicalcoloGutter();
    pianificaSalvataggio();
  }

  function impostaSinalefe(attiva) {
    sinalefeAttiva = attiva;
    scriviPreferenzaSinalefe(attiva);
    ricalcolaGutter();
  }

  function ottieniTesto() {
    return textarea.value;
  }

  function focalizza() {
    textarea.focus();
  }

  function distruggi() {
    clearTimeout(timerSalvataggio);
    if (timerGutter) cancelAnimationFrame(timerGutter);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener("resize", adattaAllaTastiera);
      window.visualViewport.removeEventListener("scroll", adattaAllaTastiera);
    }
    window.removeEventListener("resize", pianificaRicalcoloGutter);
  }

  return {
    carica,
    inserisciTesto,
    sostituisciParolaCorrente,
    impostaSinalefe,
    ottieniTesto,
    focalizza,
    distruggi,
  };
}
