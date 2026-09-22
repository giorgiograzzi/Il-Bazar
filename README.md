# Il Bazar

Un quaderno per scrivere poesie e testi rap, pensato per l'uso da iPhone (Safari). Tutta l'interfaccia è in italiano.

Nessun account, nessun server, nessun tracciamento: tutto quello che scrivi resta salvato solo su questo telefono (IndexedDB, con fallback su localStorage).

## Funzioni

- **Editor a tutto schermo** con salvataggio automatico. Più poesie: crea, rinomina, elimina (con conferma).
- **Tastiera pulita**: nessun tasto spazio personalizzato, nessuna correzione automatica degli spazi. Scorrendo verso il basso la tastiera si chiude, come nell'app Note di iOS, anche a fine testo.
- **Rimario italiano offline**: tocca una parola nel testo per aprire rime e assonanze dal basso, oppure cerca a mano nella barra di ricerca. 60.378 parole (vedi [Licenza del rimario](#licenza-del-rimario)).
- **Conta sillabe** accanto a ogni verso, con sinalefe attivabile.
- **Tasca**: appunti e frasi al volo, più uno spunto del giorno (51 spunti creativi).
- **Esporta**: copia il testo negli appunti o genera un'immagine PNG in stile urban, condivisibile o scaricabile.
- **PWA installabile**, funziona offline una volta aperta la prima volta.

## Come metterla online

L'app è **solo file statici** (HTML/CSS/JS, nessun framework, nessun passaggio di build): basta caricarla su qualsiasi hosting statico.

### Opzione 1 — Cloudflare Pages (consigliata, gratuita)

1. Crea un repository Git (GitHub/GitLab) con questi file, oppure preparati a caricare la cartella direttamente.
2. Vai su [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create application** → **Pages**.
3. **Con Git**: collega il repository. Lascia vuoto il comando di build ("Build command") e imposta come cartella di output `/` (root del progetto) — non c'è nulla da compilare.
   **Senza Git**: usa "Upload assets" e trascina la cartella del progetto.
4. Fatto il deploy, Cloudflare assegna un dominio tipo `il-bazar.pages.dev` con HTTPS automatico (necessario per il Service Worker e per l'installazione come app).
5. Apri il link da Safari su iPhone → **Condividi** → **Aggiungi alla schermata Home** per installarla come app.

Ogni nuovo push (o nuovo upload) aggiorna il sito. Se cambi file dell'app, aumenta `CACHE_VERSION` in `sw.js` per invalidare la cache dei visitatori che l'hanno già installata.

### Opzione 2 — Server casalingo (Raspberry Pi, NAS, PC sempre acceso)

Serve solo un server HTTP che sappia servire file statici **con HTTPS** (il Service Worker e l'installazione come PWA su iPhone richiedono HTTPS, tranne su `localhost`).

Esempio veloce con [Caddy](https://caddyserver.com/) (gestisce da solo i certificati HTTPS se hai un dominio che punta al tuo IP):

```
# Caddyfile
tuodominio.it {
  root * /percorso/a/Il-Bazar
  file_server
  encode gzip
}
```

```
caddy run
```

In alternativa, per una prova rapida in rete locale (senza HTTPS, va bene solo per test da `localhost` o per lo sviluppo):

```
npx http-server . -p 8080
```

Per l'uso reale da iPhone fuori casa serve comunque un dominio con HTTPS (Caddy con Let's Encrypt, oppure un reverse proxy come Nginx Proxy Manager, oppure esporre il server dietro un tunnel come Cloudflare Tunnel).

### Aggiornare il rimario (facoltativo)

Il file `data/parole.json` è già pronto e incluso nel repository: non serve Node per usare l'app. Se in futuro vuoi rigenerarlo (es. aggiornando la wordlist sorgente in `scripts/source/`):

```
node scripts/build-rime.js
```

## Struttura del progetto

```
index.html          punto d'ingresso, tutte le schermate/pannelli
css/style.css        stile urban/street
js/app.js            navigazione e collegamento dei moduli
js/editor.js          editor, gutter sillabe, gestione tastiera/visualViewport
js/italian.js          sillabazione italiana, accento tonico, chiave di rima
js/rime.js            rimario runtime (carica data/parole.json)
js/db.js              storage locale (IndexedDB + fallback localStorage)
js/tasca.js, js/spunti.js   note al volo e spunti del giorno
js/export.js          copia testo, immagine PNG, Web Share API
manifest.webmanifest / sw.js   PWA
data/parole.json      rimario precompilato (generato da scripts/build-rime.js)
scripts/               script di build e generazione icone (non servono a runtime)
```

## Licenza del rimario

Il rimario include la lista `60000_parole_italiane.txt` dal progetto [napolux/paroleitaliane](https://github.com/napolux/paroleitaliane) di Francesco Napoletano, distribuita con **licenza MIT** (copia inclusa in `scripts/source/LICENSE-paroleitaliane.txt`). Le parole sono state elaborate con il motore linguistico di questo progetto (`js/italian.js`) per calcolare le chiavi di rima; il risultato è in `data/parole.json`.

## Limiti noti

Sillabazione e individuazione dell'accento tonico si basano su un'euristica linguistica (regole di sillabazione italiana + eccezioni note per i casi più comuni, come le parole in *-ia/-io* con iato: *poesia, farmacia, energia...*). Funzionano bene nella maggior parte dei casi, ma l'italiano ha eccezioni che nessuna regola semplice coglie del tutto — in caso di dubbio, fidati dell'orecchio più del numero sul gutter.
