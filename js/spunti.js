// Il Bazar — spunti del giorno: piccoli inneschi per iniziare a scrivere quando manca
// l'ispirazione. Uno al giorno, sempre lo stesso finché non cambia la data.

export const SPUNTI = [
  "Scrivi partendo da un rumore che senti proprio ora.",
  "Racconta la tua strada come se non ci fossi mai passato prima.",
  "Un verso che inizia con \"Non ti ho mai detto che...\"",
  "Descrivi la tua città alle 4 del mattino.",
  "Scrivi come se stessi rispondendo a qualcuno che non ti crede.",
  "Parti da un ricordo di quando avevi dieci anni.",
  "Il primo verso deve contenere un colore.",
  "Scrivi una strofa senza usare mai la parola \"amore\".",
  "Racconta una sconfitta che poi è diventata forza.",
  "Un testo che parla a te stesso tra dieci anni.",
  "Descrivi le mani di qualcuno che conosci bene.",
  "Scrivi partendo dall'ultima bugia che hai detto.",
  "Un verso che comincia con \"Da dove vengo io...\"",
  "Racconta la fine di qualcosa senza dire mai \"fine\".",
  "Scrivi come se il microfono fosse l'unica persona che ti ascolta davvero.",
  "Parti da un oggetto che porti sempre con te.",
  "Descrivi la tua famiglia usando solo immagini, mai nomi.",
  "Un testo scritto di getto sulla rabbia di oggi.",
  "Racconta un sogno fatto la notte scorsa, vero o inventato.",
  "Scrivi due strofe: una di chi eri, una di chi sei ora.",
  "Il ritornello deve poter essere gridato allo specchio.",
  "Descrivi il silenzio dopo una lite.",
  "Scrivi partendo dal nome della tua via.",
  "Un verso che parla di soldi senza dire mai \"soldi\".",
  "Racconta la prima volta che hai avuto paura di non farcela.",
  "Scrivi come una lettera a chi non c'è più.",
  "Descrivi il tuo quartiere di notte, con i suoni prima delle immagini.",
  "Un testo che nasce da una singola frase sentita per strada.",
  "Racconta cosa ti fa sentire invincibile.",
  "Scrivi partendo dall'ultima cosa che hai mangiato con qualcuno che ami.",
  "Un verso che comincia con \"Se potessi tornare indietro...\"",
  "Descrivi la sensazione di essere frainteso.",
  "Scrivi su una promessa che non hai mantenuto.",
  "Racconta il rumore della tua città quando piove.",
  "Un testo scritto come se dovessi convincere qualcuno a crederci ancora.",
  "Descrivi il momento esatto in cui hai capito chi sei.",
  "Scrivi partendo da un odore che ti riporta all'infanzia.",
  "Un verso che nasconde un segreto tra le righe.",
  "Racconta una vittoria piccola che nessuno ha notato.",
  "Scrivi come se stessi litigando con la tua parte più debole.",
  "Descrivi le luci della città viste da un finestrino.",
  "Un testo che parte da un numero che conta qualcosa nella tua vita.",
  "Racconta il momento prima di salire sul palco, vero o immaginato.",
  "Scrivi partendo da una frase che tua madre o tuo padre ripeteva sempre.",
  "Un verso che comincia con \"Nessuno sa che...\"",
  "Descrivi cosa significa per te la parola \"casa\".",
  "Scrivi su chi eri prima che tutto cambiasse.",
  "Racconta un errore che rifaresti comunque.",
  "Un testo dedicato a chi ti ha visto crescere.",
  "Scrivi partendo dall'ultimo messaggio che hai scritto e non hai inviato.",
  "Descrivi il tuo futuro come se lo stessi già vivendo.",
];

/**
 * Restituisce lo spunto del giorno: deterministico per data (stesso spunto per
 * tutto il giorno), calcolato in locale senza bisogno di rete.
 */
export function spuntoDelGiorno(data = new Date()) {
  const chiaveGiorno = `${data.getFullYear()}-${data.getMonth()}-${data.getDate()}`;
  let hash = 0;
  for (let i = 0; i < chiaveGiorno.length; i++) {
    hash = (hash * 31 + chiaveGiorno.charCodeAt(i)) >>> 0;
  }
  return SPUNTI[hash % SPUNTI.length];
}
