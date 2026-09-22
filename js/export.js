// Il Bazar — esportazione: copia negli appunti e immagine PNG condivisibile.

const FONT_TITOLO = '900 64px "Bebas Neue", "Oswald", "HelveticaNeue-CondensedBold", "Arial Narrow", sans-serif';
const FONT_TESTO = '400 40px -apple-system, "Helvetica Neue", Arial, sans-serif';
const FONT_FOOTER = '700 26px "Bebas Neue", "Oswald", "HelveticaNeue-CondensedBold", sans-serif';

const COLORE_SFONDO = "#111113";
const COLORE_ACCENTO = "#e8ff2e";
const COLORE_TESTO = "#f2f2f0";
const COLORE_TESTO_ATTENUATO = "rgba(242, 242, 240, 0.55)";

/** Copia un testo negli appunti, con fallback per browser senza Clipboard API asincrona. */
export async function copiaTesto(testo) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(testo);
      return true;
    } catch {
      // continua con il fallback
    }
  }
  try {
    const area = document.createElement("textarea");
    area.value = testo;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    document.body.removeChild(area);
    return true;
  } catch {
    return false;
  }
}

function disegnaSfondoConTexture(ctx, larghezza, altezza) {
  ctx.fillStyle = COLORE_SFONDO;
  ctx.fillRect(0, 0, larghezza, altezza);

  // Texture "muro" sobria: linee diagonali molto tenui + grana leggera, senza appesantire.
  ctx.save();
  ctx.globalAlpha = 0.035;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  const passo = 46;
  for (let x = -altezza; x < larghezza; x += passo) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + altezza, altezza);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.05;
  const numeroGrani = Math.floor((larghezza * altezza) / 1800);
  for (let i = 0; i < numeroGrani; i++) {
    const x = Math.random() * larghezza;
    const y = Math.random() * altezza;
    const r = Math.random() * 1.4;
    ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#000000";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Vignettatura leggera per dare profondità senza appesantire il testo.
  const vign = ctx.createRadialGradient(
    larghezza / 2, altezza / 2, altezza * 0.3,
    larghezza / 2, altezza / 2, altezza * 0.75
  );
  vign.addColorStop(0, "rgba(0,0,0,0)");
  vign.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = vign;
  ctx.fillRect(0, 0, larghezza, altezza);
}

/** Spezza un testo lungo su più righe per adattarlo alla larghezza massima del canvas. */
function spezzaRiga(ctx, testo, maxLarghezza) {
  if (!testo) return [""];
  const parole = testo.split(" ");
  const righe = [];
  let corrente = "";
  for (const parola of parole) {
    const prova = corrente ? `${corrente} ${parola}` : parola;
    if (ctx.measureText(prova).width > maxLarghezza && corrente) {
      righe.push(corrente);
      corrente = parola;
    } else {
      corrente = prova;
    }
  }
  if (corrente) righe.push(corrente);
  return righe;
}

/**
 * Genera un'immagine PNG (Blob) della poesia in stile urban: titolo, testo, marchio app.
 */
export async function generaImmaginePoesia({ titolo, testo }) {
  const larghezza = 1080;
  const paddingOrizzontale = 88;
  const maxTestoLarghezza = larghezza - paddingOrizzontale * 2;

  // Canvas di misurazione per calcolare l'altezza necessaria prima di disegnare.
  const misura = document.createElement("canvas").getContext("2d");
  misura.font = FONT_TESTO;
  const righeTesto = (testo || "").split("\n");
  const righeSpezzate = [];
  for (const riga of righeTesto) {
    if (riga.trim() === "") {
      righeSpezzate.push("");
    } else {
      righeSpezzate.push(...spezzaRiga(misura, riga, maxTestoLarghezza));
    }
  }

  const altezzaRigaTesto = 58;
  const areaTitoloAltezza = 190;
  const areaFooterAltezza = 130;
  const paddingVerticale = 70;
  const altezzaContenuto = righeSpezzate.length * altezzaRigaTesto;
  const altezza = Math.max(
    1080,
    areaTitoloAltezza + altezzaContenuto + areaFooterAltezza + paddingVerticale * 2
  );

  const canvas = document.createElement("canvas");
  canvas.width = larghezza;
  canvas.height = altezza;
  const ctx = canvas.getContext("2d");

  disegnaSfondoConTexture(ctx, larghezza, altezza);

  // Barretta accento sopra il titolo.
  ctx.fillStyle = COLORE_ACCENTO;
  ctx.fillRect(paddingOrizzontale, paddingVerticale, 72, 8);

  // Titolo (reso "condensed" con una leggera compressione orizzontale del contesto).
  ctx.fillStyle = COLORE_ACCENTO;
  ctx.font = FONT_TITOLO;
  ctx.textBaseline = "alphabetic";
  const titoloY = paddingVerticale + 92;
  ctx.save();
  ctx.translate(paddingOrizzontale, titoloY);
  ctx.scale(0.86, 1);
  const titoloTesto = (titolo || "Senza titolo").toUpperCase();
  let titoloDaDisegnare = titoloTesto;
  const maxTitoloLarghezza = maxTestoLarghezza / 0.86;
  while (ctx.measureText(titoloDaDisegnare).width > maxTitoloLarghezza && titoloDaDisegnare.length > 3) {
    titoloDaDisegnare = titoloDaDisegnare.slice(0, -2) + "…";
  }
  ctx.fillText(titoloDaDisegnare, 0, 0);
  ctx.restore();

  // Corpo del testo.
  ctx.font = FONT_TESTO;
  ctx.fillStyle = COLORE_TESTO;
  let y = areaTitoloAltezza + paddingVerticale;
  for (const riga of righeSpezzate) {
    ctx.fillText(riga, paddingOrizzontale, y);
    y += altezzaRigaTesto;
  }

  // Footer: marchio app.
  const footerY = altezza - paddingVerticale - 20;
  ctx.fillStyle = COLORE_ACCENTO;
  ctx.fillRect(paddingOrizzontale, footerY - 34, 20, 20);
  ctx.font = FONT_FOOTER;
  ctx.fillStyle = COLORE_TESTO_ATTENUATO;
  ctx.fillText("IL BAZAR", paddingOrizzontale + 34, footerY - 15);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

/**
 * Condivide o scarica un'immagine (Blob). Usa Web Share API se disponibile e supporta
 * i file, altrimenti scarica il PNG con un link temporaneo.
 */
export async function condividiOScaricaImmagine(blob, nomeFile, titoloCondivisione) {
  const file = new File([blob], nomeFile, { type: "image/png" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: titoloCondivisione || "Il Bazar" });
      return "condiviso";
    } catch (err) {
      if (err && err.name === "AbortError") return "annullato";
      // se la condivisione fallisce per altri motivi, si passa al download
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeFile;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "scaricato";
}
