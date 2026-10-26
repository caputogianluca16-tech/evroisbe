/* EVROISBE — costruisce le pagine leggendo i file in contenuti/
   (profilo.json, lavori.json, curriculum.json), che si modificano dal pannello in /admin.
   Non serve modificare questo file per aggiornare il sito.
   Il sito è in italiano e in inglese. I testi inglesi dei contenuti stanno nei campi «en»
   (oppure con «_en» in fondo al nome): se mancano, anche in inglese si vede il testo italiano. */
(function () {
  "use strict";

  function $(sel, radice) { return (radice || document).querySelector(sel); }
  function $$(sel, radice) { return Array.prototype.slice.call((radice || document).querySelectorAll(sel)); }

  function el(tag, attr, figli) {
    var n = document.createElement(tag);
    if (attr) {
      Object.keys(attr).forEach(function (k) {
        var v = attr[k];
        if (v === null || v === undefined || v === false) return;
        if (k === "class") n.className = v;
        else if (k === "text") n.textContent = v;
        else if (k.indexOf("on") === 0) n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v === true ? "" : v);
      });
    }
    (figli || []).forEach(function (f) {
      if (f === null || f === undefined || f === "") return;
      n.appendChild(typeof f === "string" ? document.createTextNode(f) : f);
    });
    return n;
  }

  function testo(v) { return v === null || v === undefined ? "" : String(v).trim(); }
  /* Un testo può essere un elenco oppure un blocco unico,
     con una riga vuota fra un paragrafo e l'altro. */
  function lista(v) {
    if (Array.isArray(v)) return v.map(testo).filter(Boolean);
    return testo(v).split(/\n\s*\n/).map(testo).filter(Boolean);
  }
  /* Il pannello scrive i percorsi con la barra iniziale ("/immagini/..."):
     li rendo relativi, così il sito funziona anche dentro una sottocartella. */
  function relativo(v) {
    var p = testo(v);
    return /^\/(?!\/)/.test(p) ? p.slice(1) : p;
  }

  var radice = document.documentElement;
  var calma = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ---------- italiano e inglese ----------
     La prima volta vale la lingua del browser (italiano se è italiano, altrimenti inglese);
     poi resta quella scelta col bottone. Con ?lang=en nell'indirizzo si apre in inglese. */
  var TESTI = {
    it: {
      salta: "vai ai lavori", bozza: "Contenuti di esempio",
      sezioni: "Sezioni", indice: "Indice del sito",
      portfolio: "portfolio", about: "about", curriculum: "curriculum", contatti: "contatti",
      filtra: "Filtra i lavori per categoria", tutti: "tutti",
      apriPortfolio: "Mostra le categorie", apriCurriculum: "Mostra le sezioni del curriculum",
      scaricaCv: "scarica il cv (pdf)", scaricaCvBreve: "scarica il cv (pdf)",
      copia: "copia", copiato: "copiato", tornaSu: "torna su",
      immaginiLavoro: "Immagini del lavoro", chiudi: "chiudi", immPrec: "Immagine precedente", immSucc: "Immagine successiva",
      scuro: "scuro", chiaro: "chiaro", aScuro: "Passa alla modalità scura", aChiaro: "Passa alla modalità chiara",
      linguaAria: "Read in English",
      senzaTitolo: "Senza titolo", nonTrovata: "immagine non trovata",
      vuoto: "Ancora nessun lavoro. Aggiungine uno dal pannello, nella sezione Lavori.",
      anno: "anno", categoria: "categoria", tecnica: "tecnica", luogo: "luogo", crediti: "crediti",
      tornaPortfolio: "torna al portfolio", lavoroNdiM: "lavoro {n} di {m}", altri: "Altri lavori",
      precedente: "precedente", successivo: "successivo",
      riproduci: "Riproduci il video", video: "Video",
      videoNonTrovato: "Video non trovato: {src}. Controlla il lavoro nel pannello.",
      nonRiproduce: "Questo browser non riesce a riprodurre il video. ", apriFile: "Apri il file", apriSu: "apri su {fonte}",
      linkVideo: "Questo link video non è riconosciuto: «{src}». Usa il link di condivisione di Google Drive, un file .mp4, oppure un link YouTube o Vimeo.",
      immagine: "immagine", apriImmagine: "Apri l'immagine {n} di {m}", scarica: "scarica (pdf)",
      copertina: "copertina", pagina: "pagina", pagPrec: "Pagina precedente", pagSucc: "Pagina successiva",
      vaiPagina: "Vai alla pagina", libro: "Libro da sfogliare", apriLibro: "apri il libro", di: "di",
      vediProgetto: "vedi il progetto →",
      descrizione: "Gianluca Caputo (EVROISBE), digital & media artist. Installazioni interattive, creative coding, video, grafica e fotografia."
    },
    en: {
      salta: "skip to works", bozza: "Sample content",
      sezioni: "Sections", indice: "Site index",
      portfolio: "portfolio", about: "about", curriculum: "cv", contatti: "contact",
      filtra: "Filter works by category", tutti: "all",
      apriPortfolio: "Show categories", apriCurriculum: "Show cv sections",
      scaricaCv: "download cv (pdf)", scaricaCvBreve: "download cv (pdf)",
      copia: "copy", copiato: "copied", tornaSu: "back to top",
      immaginiLavoro: "Work images", chiudi: "close", immPrec: "Previous image", immSucc: "Next image",
      scuro: "dark", chiaro: "light", aScuro: "Switch to dark mode", aChiaro: "Switch to light mode",
      linguaAria: "Leggi in italiano",
      senzaTitolo: "Untitled", nonTrovata: "image not found",
      vuoto: "No works yet.",
      anno: "year", categoria: "category", tecnica: "medium", luogo: "location", crediti: "credits",
      tornaPortfolio: "back to portfolio", lavoroNdiM: "work {n} of {m}", altri: "Other works",
      precedente: "previous", successivo: "next",
      riproduci: "Play the video", video: "Video",
      videoNonTrovato: "Video not found: {src}.",
      nonRiproduce: "This browser can't play the video. ", apriFile: "Open the file", apriSu: "open on {fonte}",
      linkVideo: "This video link isn't recognised: “{src}”.",
      immagine: "image", apriImmagine: "Open image {n} of {m}", scarica: "download (pdf)",
      copertina: "cover", pagina: "page", pagPrec: "Previous page", pagSucc: "Next page",
      vaiPagina: "Go to page", libro: "Book to leaf through", apriLibro: "open the book", di: "of",
      vediProgetto: "see the project →",
      descrizione: "Gianluca Caputo (EVROISBE), digital & media artist. Interactive installations, creative coding, video, graphic design and photography."
    }
  };
  var LINGUA_CHIAVE = "evroisbe-lingua";
  function linguaIniziale() {
    var q = (location.search.match(/[?&](?:lang|lingua)=(it|en)\b/i) || [])[1];
    if (q) {
      q = q.toLowerCase();
      try { localStorage.setItem(LINGUA_CHIAVE, q); } catch (e) { /* va bene lo stesso */ }
      return q;
    }
    try { var s = localStorage.getItem(LINGUA_CHIAVE); if (s === "it" || s === "en") return s; } catch (e) { /* niente */ }
    var l = (navigator.languages && navigator.languages[0]) || navigator.language || "it";
    return /^it\b/i.test(l) ? "it" : "en";
  }
  var LINGUA = linguaIniziale();

  function t(chiave, valori) {
    var s = TESTI[LINGUA][chiave];
    if (s === undefined) s = TESTI.it[chiave];
    if (s === undefined) s = chiave;
    if (valori) s = s.replace(/\{(\w+)\}/g, function (m, k) { return valori[k] !== undefined ? String(valori[k]) : m; });
    return s;
  }
  /* il testo inglese di un campo, se c'è; altrimenti quello italiano */
  function pieno(v) {
    if (Array.isArray(v)) return v.some(function (x) { return !!testo(x); });
    return !!testo(v);
  }
  function trad(o, campo) {
    if (!o || typeof o !== "object") return undefined;
    if (LINGUA === "en") {
      var v = o.en && typeof o.en === "object" ? o.en[campo] : undefined;
      if (!pieno(v)) v = o[campo + "_en"];
      if (pieno(v)) return v;
    }
    return o[campo];
  }

  /* i testi fissi della pagina: data-t per il testo, data-t-aria per l'etichetta */
  function testiStatici() {
    radice.lang = LINGUA;
    $$("[data-t]").forEach(function (n) { n.textContent = t(n.getAttribute("data-t")); });
    $$("[data-t-aria]").forEach(function (n) { n.setAttribute("aria-label", t(n.getAttribute("data-t-aria"))); });
    var m = $('meta[name="description"]');
    if (m) m.setAttribute("content", t("descrizione"));
  }
  function mostraLingua() {
    $$("[data-lingua-bottone]").forEach(function (b) {
      $$("[data-l]", b).forEach(function (s) {
        s.classList.toggle("lingua__voce--attiva", s.getAttribute("data-l") === LINGUA);
      });
      b.setAttribute("aria-label", t("linguaAria"));
    });
  }
  var alCambioLingua = function () {};
  function cambiaLingua(nuova) {
    if (nuova === LINGUA || !TESTI[nuova]) return;
    LINGUA = nuova;
    try { localStorage.setItem(LINGUA_CHIAVE, nuova); } catch (e) { /* va bene lo stesso */ }
    testiStatici();
    mostraLingua();
    mostraTema();
    alCambioLingua();
  }

  /* ---------- modalità chiara e scura ----------
     Chi guarda può scegliere; la scelta resta in questo browser.
     Senza una scelta vale quella del telefono o del computer. */
  var TEMA_CHIAVE = "evroisbe-tema";
  var sistemaScuro = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function temaAttuale() {
    var v = radice.getAttribute("data-tema");
    if (v === "scuro" || v === "chiaro") return v;
    return sistemaScuro && sistemaScuro.matches ? "scuro" : "chiaro";
  }
  function mostraTema() {
    var scuro = temaAttuale() === "scuro";
    $$("[data-tema-bottone]").forEach(function (b) {
      var s = $(".tema__testo", b);
      if (s) s.textContent = t(scuro ? "chiaro" : "scuro");
      b.setAttribute("aria-label", t(scuro ? "aChiaro" : "aScuro"));
    });
    /* il colore della barra del browser sul telefono segue la modalità */
    $$('meta[name="theme-color"]').forEach(function (m) { m.setAttribute("content", scuro ? "#0B0B0A" : "#EBEBE9"); });
  }
  function preparaComandi() {
    $$("[data-tema-bottone]").forEach(function (b) {
      b.addEventListener("click", function () {
        var nuovo = temaAttuale() === "scuro" ? "chiaro" : "scuro";
        radice.setAttribute("data-tema", nuovo);
        try { localStorage.setItem(TEMA_CHIAVE, nuovo); } catch (e) { /* va bene lo stesso */ }
        mostraTema();
      });
    });
    if (sistemaScuro) {
      var cambia = function () { mostraTema(); };
      if (sistemaScuro.addEventListener) sistemaScuro.addEventListener("change", cambia);
      else if (sistemaScuro.addListener) sistemaScuro.addListener(cambia);
    }
    $$("[data-lingua-bottone]").forEach(function (b) {
      b.addEventListener("click", function () { cambiaLingua(LINGUA === "it" ? "en" : "it"); });
    });
  }

  /* i testi fissi e i bottoni funzionano subito, prima che arrivino i contenuti */
  testiStatici();
  mostraLingua();
  mostraTema();
  preparaComandi();

  /* ---------- avviso se i contenuti non si leggono ---------- */
  function avviso(titolo, righe) {
    var box = el("div", { class: "errore pagina", role: "alert" }, [
      el("div", { class: "errore__box" }, [el("strong", { text: titolo })].concat(
        righe.map(function (r) { return el("p", { text: r }); })
      ))
    ]);
    radice.classList.remove("inizio");
    document.body.insertBefore(box, document.body.firstChild);
  }

  /* ---------- caricamento dei contenuti ---------- */
  var FILE_CONTENUTI = ["contenuti/profilo.json", "contenuti/lavori.json", "contenuti/curriculum.json"];

  function carica() {
    if (window.SITO && typeof window.SITO === "object") { avvia(window.SITO); return; }
    if (location.protocol === "file:" || !window.fetch || !window.Promise) {
      avviso("Il sito si vede solo online", [
        "Aperto dal Mac con un doppio clic, il browser non lascia leggere i file dei contenuti.",
        "Guardalo al suo indirizzo internet; per modificarlo usa il pannello, all'indirizzo del sito seguito da /admin."
      ]);
      return;
    }
    Promise.all(FILE_CONTENUTI.map(function (f) {
      return fetch(f, { cache: "no-cache" }).then(function (r) {
        if (!r.ok) throw new Error("Non trovo il file " + f + " (errore " + r.status + ").");
        return r.json().catch(function () { throw new Error("Il file " + f + " contiene un errore di scrittura."); });
      });
    })).then(function (parti) {
      var D = {};
      parti.forEach(function (x) {
        if (x && typeof x === "object") Object.keys(x).forEach(function (k) { D[k] = x[k]; });
      });
      avvia(D);
    }, function (err) {
      avviso("Il sito non riesce a leggere i contenuti", [
        String(err && err.message ? err.message : err),
        "Se hai appena salvato dal pannello, il sito si sta ancora aggiornando: riprova fra un paio di minuti."
      ]);
    });
  }

  function avvia(D) {
    /* ---------- dati ---------- */
    var FIRMA = testo(D.firma) || "EVROISBE";
    var NOME = testo(D.nome);
    var TITOLO_BASE = NOME ? FIRMA + " | " + NOME : FIRMA;

    var idUsati = {};
    $$("[id]").forEach(function (n) { idUsati[n.id] = true; });

    function slug(s) {
      var b = testo(s).toLowerCase();
      if (b.normalize) b = b.normalize("NFD").replace(/[̀-ͯ]/g, "");
      b = b.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      return b || "lavoro";
    }

    /* Un video si può scrivere come semplice link oppure come
       { file: "...", titolo: "...", titolo_en: "...", anteprima: "...", formato: "16:9" }. */
    function videoLista(v) {
      var arr = Array.isArray(v) ? v : (v ? [v] : []);
      return arr.map(function (x) {
        if (!x) return null;
        if (typeof x === "string") return testo(x) ? { file: relativo(x), raw: {}, anteprima: "", formato: "" } : null;
        if (typeof x === "object") {
          var f = relativo(testo(x.file) || testo(x.link) || testo(x.src));
          return f ? { file: f, raw: x, anteprima: relativo(x.anteprima), formato: testo(x.formato) } : null;
        }
        return null;
      }).filter(Boolean);
    }
    function titoloVideo(v) { return testo(trad(v.raw, "titolo")); }

    /* Un file da scaricare: { file: "/scarica/...pdf", testo: "scarica ...", testo_en: "download ..." } */
    function scaricaDati(s) {
      if (!s) return null;
      if (typeof s === "string") return testo(s) ? { file: relativo(s), raw: {} } : null;
      var f = typeof s === "object" ? relativo(s.file) : "";
      return f ? { file: f, raw: s } : null;
    }

    function tre(n) { return ("00" + n).slice(-3); }

    /* Un libro da sfogliare:
       { titolo, nota, copertina, pagine: [...], prima_pagina: 93 }
       oppure, per i libri lunghi, una cartella di pagine numerate:
       { ..., cartella: "/libri/genealogie/", prima_pagina: 2, quante: 327 } -> 002.jpg ... 328.jpg
       Il lato della prima pagina lo decide il numero (dispari a destra, pari a sinistra),
       a meno che «lato_prima_pagina» dica «destra» o «sinistra». */
    function libroDati(b) {
      if (!b || typeof b !== "object") return null;
      var prima = parseInt(b.prima_pagina, 10);
      if (isNaN(prima) || prima < 1) prima = 0;
      var pagine = lista(b.pagine).map(relativo);
      var cartella = relativo(b.cartella), quante = parseInt(b.quante, 10);
      if (!pagine.length && cartella && quante > 0) {
        if (!prima) prima = 1;
        cartella = cartella.replace(/\/?$/, "/");
        for (var k = 0; k < quante; k++) pagine.push(cartella + tre(prima + k) + ".jpg");
      }
      if (!pagine.length) return null;
      return {
        raw: b,
        copertina: relativo(b.copertina),
        pagine: pagine,
        prima: prima,
        lato: /^(destra|sinistra)$/.test(b.lato_prima_pagina) ? b.lato_prima_pagina : "",
        lungo: pagine.length > 8
      };
    }
    function libriDati(p) {
      var arr = Array.isArray(p.libri) ? p.libri.slice() : [];
      if (p.libro) arr.push(p.libro);
      return arr.map(libroDati).filter(Boolean);
    }

    /* Il punto da tenere quando la copertina viene tagliata */
    var FUOCHI = {
      "centro": "50% 50%", "in alto": "50% 8%", "un po' in alto": "50% 30%",
      "un po' in basso": "50% 70%", "in basso": "50% 92%", "a sinistra": "12% 50%", "a destra": "88% 50%"
    };
    function fuocoCss(v) {
      var x = testo(v).toLowerCase().replace(/’/g, "'");
      if (FUOCHI[x]) return FUOCHI[x];
      return /^\d{1,3}% \d{1,3}%$/.test(x) ? x : "";
    }

    var progetti = (Array.isArray(D.progetti) ? D.progetti : []).filter(Boolean).filter(function (p) {
      return p.nascosto !== true && p.nascosto !== "true";
    }).map(function (p) {
      var categoria = testo(p.categoria);
      var immagini = lista(p.immagini).map(relativo);
      var libri = libriDati(p);
      return {
        raw: p,
        nome: testo(p.titolo) || "Senza titolo",   /* il titolo italiano: dà l'indirizzo del lavoro */
        anno: testo(p.anno),
        categoria: categoria,
        chiave: categoria.toLowerCase(),
        copertina: relativo(p.copertina) || immagini[0] || (libri[0] && (libri[0].copertina || libri[0].pagine[0])) || "",
        fuoco: fuocoCss(p.fuoco),
        anteprimaVideo: relativo(p.anteprima_video),
        anteprime: lista(p.anteprime).map(relativo),
        video: videoLista(p.video),
        immagini: immagini,
        scarica: scaricaDati(p.scarica),
        libri: libri
      };
    });
    /* i testi di un lavoro nella lingua scelta */
    function titoloDi(p) { return testo(trad(p.raw, "titolo")) || t("senzaTitolo"); }
    function datoDi(p, campo) { return testo(trad(p.raw, campo)); }
    function testoDi(p) { return lista(trad(p.raw, "testo")); }

    /* l'indirizzo di un lavoro viene dal titolo italiano e non cambia con la lingua */
    progetti.forEach(function (p) {
      var s = slug(p.nome);
      if (idUsati[s] || s === "top") s = "lavoro-" + s;
      var base = s, n = 2;
      while (idUsati[s]) s = base + "-" + n++;
      idUsati[s] = true;
      p.slug = s;
    });

    /* ---------- immagini mancanti: un riquadro che dice quale file manca ---------- */
    function seManca(img) {
      img.addEventListener("error", function () {
        var box = el("div", { class: "mancante" }, [
          el("span", { text: t("nonTrovata") }),
          el("span", { text: img.getAttribute("src") })
        ]);
        if (img.parentNode) img.parentNode.replaceChild(box, img);
      });
      return img;
    }

    /* ---------- testi fissi ---------- */
    function testiFissi() {
      $$("[data-firma]").forEach(function (n) { n.textContent = FIRMA; });
      $$("[data-nome]").forEach(function (n) { n.textContent = NOME; });
      $$("[data-ruolo]").forEach(function (n) { n.textContent = testo(trad(D, "ruolo")); });
      document.title = TITOLO_BASE;
      $("#bozza").hidden = !D.bozza;

      var anni = [];
      progetti.forEach(function (p) {
        (p.anno.match(/\d{4}/g) || []).forEach(function (a) { anni.push(parseInt(a, 10)); });
      });
      if (anni.length) {
        var min = Math.min.apply(null, anni), max = Math.max.apply(null, anni);
        $("#anni-lavori").textContent = "selected works " + (min === max ? min : min + "–" + max);
      }
    }

    /* ---------- la colonna a sinistra ----------
       Le voci si aprono e si chiudono (una alla volta): portfolio mostra le categorie,
       curriculum le sue sezioni. Si apre da sola la voce della sezione che si sta guardando. */
    function apriVoce(nome, apri) {
      $$(".voce").forEach(function (v) {
        var b = $(".voce__apri", v);
        if (!b) return;
        var questa = v.getAttribute("data-voce") === nome;
        var aperta = questa ? !!apri && !b.hidden : (apri ? false : v.classList.contains("voce--aperta"));
        v.classList.toggle("voce--aperta", aperta);
        b.setAttribute("aria-expanded", String(aperta));
      });
    }
    function preparaVoci() {
      $$(".voce__apri").forEach(function (b) {
        b.addEventListener("click", function () {
          var v = b.closest(".voce");
          apriVoce(v.getAttribute("data-voce"), b.getAttribute("aria-expanded") !== "true");
        });
      });
    }

    /* l'indice a sinistra segna la sezione che si sta guardando */
    var segnaIndice = function () {};
    function preparaIndice() {
      var voci = $$(".lato__nav a[data-sezione]");
      if (!voci.length) return;
      segnaIndice = function (nome, senzaAprire) {
        voci.forEach(function (a) {
          if (a.getAttribute("data-sezione") === nome) a.setAttribute("aria-current", "true");
          else a.removeAttribute("aria-current");
        });
        if (!senzaAprire) apriVoce(nome, true);
      };
      if (!("IntersectionObserver" in window)) return;
      var oss = new IntersectionObserver(function (voce) {
        if (vista !== "home" || radice.classList.contains("inizio")) return;
        voce.forEach(function (x) { if (x.isIntersecting) segnaIndice(x.target.id); });
      }, { rootMargin: "-40% 0px -55% 0px" });
      ["portfolio", "about", "curriculum", "contatti"].forEach(function (id) {
        var s = document.getElementById(id);
        if (s) oss.observe(s);
      });
    }

    /* La barretta sotto il logo, nella colonna a sinistra, dice quanto della pagina hai già visto:
       si riempie di rosso mentre scorri. */
    var aggiornaBarra = function () {};
    function preparaBarra() {
      var barre = $$(".lato__barra");
      if (!barre.length) return;
      var attesa = false;
      aggiornaBarra = function () {
        attesa = false;
        var max = document.documentElement.scrollHeight - window.innerHeight;
        var v = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        barre.forEach(function (b) { b.style.setProperty("--avanzamento", v.toFixed(4)); });
      };
      window.addEventListener("scroll", function () {
        if (attesa) return;
        attesa = true;
        requestAnimationFrame(aggiornaBarra);
      }, { passive: true });
      window.addEventListener("resize", function () { aggiornaBarra(); });
      aggiornaBarra();
    }

    /* L'indirizzo email grande dei contatti sta sempre su una riga:
       se è lungo, si rimpicciolisce quanto basta. */
    function adattaEmail() {
      var a = $("#email");
      if (!a || !a.offsetParent || !a.firstChild) return;
      a.style.fontSize = "";
      var r = document.createRange();
      r.selectNodeContents(a);
      var w = r.getBoundingClientRect().width;
      var cw = a.parentNode.clientWidth;
      if (w > 0 && cw > 0 && w > cw) a.style.fontSize = (parseFloat(getComputedStyle(a).fontSize) * cw / w * 0.98) + "px";
    }

    /* Il titolo di un lavoro va a capo solo fra una parola e l'altra:
       se una parola da sola non ci sta, il titolo si rimpicciolisce. */
    function adattaTitolo() {
      var h = $(".lavoro__titolo");
      if (!h || !h.offsetParent) return;
      h.style.fontSize = "";
      h.style.overflowWrap = "normal";
      for (var k = 0; k < 3; k++) {
        var cw = h.clientWidth, sw = h.scrollWidth;
        if (!cw || sw <= cw + 1) break;
        h.style.fontSize = (parseFloat(getComputedStyle(h).fontSize) * cw / sw * 0.98) + "px";
      }
    }

    /* ---------- portfolio: diviso per categorie ----------
       Le categorie e il loro ordine vengono da «Profilo e contatti» > «Categorie del portfolio»;
       dentro ogni categoria i lavori seguono l'ordine del pannello. */
    function due(n) { return (n < 10 ? "0" : "") + n; }

    var CATEGORIE = (function () {
      var arr = Array.isArray(D.categorie) ? D.categorie : lista(D.categorie);
      var out = [], visto = {};
      function aggiungi(nome, raw) {
        nome = testo(nome);
        var k = nome.toLowerCase();
        if (visto[k]) return;
        visto[k] = true;
        out.push({ nome: nome, chiave: k, raw: raw || {} });
      }
      arr.forEach(function (c) {
        if (typeof c === "string") aggiungi(c, {});
        else if (c && typeof c === "object" && testo(c.nome)) aggiungi(c.nome, c);
      });
      progetti.forEach(function (p) { aggiungi(p.categoria, {}); });
      return out.filter(function (c) {
        c.lavori = progetti.filter(function (p) { return p.chiave === c.chiave; });
        return c.lavori.length > 0;
      });
    })();
    /* i lavori in fila categoria dopo categoria (vale anche per «precedente» e «successivo») */
    progetti = CATEGORIE.reduce(function (tutti, c) { return tutti.concat(c.lavori); }, []);
    CATEGORIE.forEach(function (c) {
      var s = "categoria-" + (c.nome ? slug(c.nome) : "altro");
      while (idUsati[s]) s += "-";
      idUsati[s] = true;
      c.id = s;
    });
    function nomeCategoria(c) { return testo(trad(c.raw, "nome")) || c.nome; }

    /* l'indice delle categorie: sopra il portfolio sul telefono e, sul computer, nella colonna a sinistra */
    var categoriaAttiva = "";
    function segnaCategoria(id) {
      categoriaAttiva = id;
      $$(".filtro[data-categoria]").forEach(function (a) {
        if (a.getAttribute("data-categoria") === id) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    }
    function disegnaIndiceCategorie() {
      ["#filtri", "#filtri-lato"].forEach(function (sel) {
        var box = $(sel);
        if (!box) return;
        box.textContent = "";
        box.hidden = CATEGORIE.length < 2;
        CATEGORIE.forEach(function (c) {
          box.appendChild(el("a", {
            class: "filtro", href: "#" + c.id, "data-categoria": c.id,
            onclick: function (e) { e.preventDefault(); vaiACategoria(c.id); }
          }, [nomeCategoria(c), el("span", { class: "filtro__n", text: String(c.lavori.length) })]));
        });
      });
      var apri = $('.voce[data-voce="portfolio"] .voce__apri'), lato = $("#filtri-lato");
      if (apri && lato) apri.hidden = lato.hidden;
      segnaCategoria(categoriaAttiva);
    }
    function vaiACategoria(id) {
      function fai() {
        var sez = document.getElementById(id);
        if (sez) sez.scrollIntoView({ behavior: calma ? "auto" : "smooth", block: "start" });
        segnaCategoria(id);
      }
      if (vista !== "home") { dopoPercorso = fai; posizioneHome = 0; location.hash = "portfolio"; return; }
      if (location.hash !== "#portfolio" && history.replaceState) history.replaceState(null, "", "#portfolio");
      fai();
    }
    function preparaCategorie() {
      if (!("IntersectionObserver" in window)) return;
      var oss = new IntersectionObserver(function (voci) {
        if (vista !== "home" || radice.classList.contains("inizio")) return;
        voci.forEach(function (x) { if (x.isIntersecting) segnaCategoria(x.target.id); });
      }, { rootMargin: "-35% 0px -60% 0px" });
      CATEGORIE.forEach(function (c) { var sez = document.getElementById(c.id); if (sez) oss.observe(sez); });
    }

    /* le copertine si vedono intere, mai tagliate: ogni riquadro prende la proporzione
       della sua immagine, e i lavori affiancati hanno la stessa altezza */
    function proporzioneCopertina(a, r) {
      if (r > 0) a.style.setProperty("--r", Math.max(0.5, Math.min(2.6, r)).toFixed(4));
      sommaFile();
    }
    /* la somma delle proporzioni di una fila: serve a non farla diventare troppo alta */
    var attesaFile = false;
    function sommaFile() {
      if (attesaFile) return;
      attesaFile = true;
      requestAnimationFrame(function () {
        attesaFile = false;
        $$(".fila").forEach(function (f) {
          var somma = 0;
          Array.prototype.forEach.call(f.children, function (x) {
            somma += parseFloat(x.style.getPropertyValue("--r")) || 4 / 3;
          });
          f.style.setProperty("--somma", somma.toFixed(4));
        });
      });
    }

    /* ---------- anteprime che si muovono ----------
       Al passaggio del mouse (o, sul telefono, quando l'anteprima è in vista):
       i lavori con un'anteprima video la fanno partire, gli altri fanno
       scorrere le loro immagini come un pieghevole. */
    var conMouse = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var risparmio = !!(navigator.connection && navigator.connection.saveData);

    function fotogrammi(p) {
      var f = [p.copertina];
      var fonte = (p.anteprime.length ? p.anteprime : p.immagini).slice();
      if (!fonte.length && p.libri.length) {
        var L = p.libri[0], n = L.pagine.length;
        [0.04, 0.2, 0.42, 0.66, 0.9].forEach(function (x) { fonte.push(L.pagine[Math.min(n - 1, Math.floor(n * x))]); });
      }
      fonte.forEach(function (s) { if (s && f.indexOf(s) < 0) f.push(s); });
      return f.slice(0, 9);
    }

    /* proporzioni (larghezza / altezza) delle immagini già misurate */
    var proporzioni = {};
    function misuraTutte(lista, fatto) {
      var mancano = lista.filter(function (u) { return !proporzioni[u]; });
      var n = mancano.length, finito = false;
      if (!n) { fatto(); return; }
      var attesa = setTimeout(chiudi, 2500);
      function chiudi() { if (finito) return; finito = true; clearTimeout(attesa); fatto(); }
      mancano.forEach(function (u) {
        var im = new Image();
        im.onload = function () {
          if (im.naturalWidth && im.naturalHeight) proporzioni[u] = im.naturalWidth / im.naturalHeight;
          if (--n === 0) chiudi();
        };
        im.onerror = function () { if (--n === 0) chiudi(); };
        im.src = u;
      });
    }

    /* Le immagini che scorrono vanno in «pagine» e si vedono sempre intere, mai tagliate:
       in un riquadro largo stanno affiancate (due o tre insieme, se sono verticali),
       in un riquadro alto le immagini orizzontali stanno una sopra l'altra.
       Ogni pagina prende le immagini che, insieme, riempiono meglio il riquadro.
       La prima pagina è la copertina, come si vede da ferma. */
    function pagineDi(f, rBox) {
      function r(u) { return proporzioni[u] || 1; }
      /* un panorama lunghissimo in un riquadro stretto diventerebbe una striscia minuscola: si salta */
      var resto = f.slice(1).filter(function (u) { return Math.abs(Math.log(r(u) / rBox)) <= Math.log(3); });
      if (!resto.length) resto = f.slice(1);
      var ordinate = resto.map(r).sort(function (x, y) { return x - y; });
      var med = ordinate.length ? ordinate[Math.floor(ordinate.length / 2)] : rBox;
      var colonna = med > rBox * 1.15;
      /* proporzione di un gruppo di immagini affiancate o impilate */
      function insieme(g) {
        if (!colonna) return g.reduce(function (t, x) { return t + x.r; }, 0);
        return 1 / g.reduce(function (t, x) { return t + 1 / x.r; }, 0);
      }
      function pieno(g) { var q = insieme(g); return Math.min(q, rBox) / Math.max(q, rBox); }
      var pagine = [[{ src: f[0], copertina: true }]], pagina = [];
      resto.forEach(function (u) {
        var x = { src: u, r: r(u) };
        if (pagina.length && (pagina.length >= 3 || pieno(pagina.concat([x])) <= pieno(pagina))) {
          pagine.push(pagina);
          pagina = [];
        }
        pagina.push(x);
      });
      if (pagina.length) pagine.push(pagina);
      return { pagine: pagine, colonna: colonna };
    }
    /* mette le immagini di una pagina nella lastra, intere e centrate */
    function riempi(lastra, pagina, fuoco, box, colonna) {
      lastra.textContent = "";
      if (pagina[0].copertina) {
        var c = el("img", { alt: "", decoding: "async", src: pagina[0].src });
        if (fuoco) c.style.objectPosition = fuoco;
        lastra.appendChild(c);
        return " opera__lastra--copertina";
      }
      var W = box.clientWidth, H = box.clientHeight;
      var bordo = Math.round(Math.max(8, Math.min(26, Math.min(W, H) * 0.05)));
      var fra = Math.round(Math.max(6, bordo * 0.6));
      var k = pagina.length, lato;
      if (!colonna) {
        var somma = pagina.reduce(function (t, x) { return t + x.r; }, 0);
        lato = Math.min(H - 2 * bordo, (W - 2 * bordo - (k - 1) * fra) / somma);
      } else {
        var inv = pagina.reduce(function (t, x) { return t + 1 / x.r; }, 0);
        lato = Math.min(W - 2 * bordo, (H - 2 * bordo - (k - 1) * fra) / inv);
      }
      lastra.style.gap = fra + "px";
      pagina.forEach(function (x) {
        var im = el("img", { alt: "", decoding: "async", src: x.src });
        im.style.width = Math.floor(colonna ? lato : lato * x.r) + "px";
        im.style.height = Math.floor(colonna ? lato / x.r : lato) + "px";
        lastra.appendChild(im);
      });
      return colonna ? " opera__lastra--colonna" : "";
    }
    function pronta(pagina) {
      return Promise.all(pagina.map(function (x) {
        var im = new Image();
        im.src = x.src;
        return (im.decode ? im.decode() : Promise.resolve()).catch(function () {});
      }));
    }
    function muovi(a) {
      var p = a._p;
      if (!p || a.hidden || a._attiva) return;
      a._attiva = true;
      var box = $(".opera__img", a);
      if (p.anteprimaVideo) {
        var v = a._clip;
        if (!v) {
          v = document.createElement("video");
          v.className = "opera__clip";
          v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true;
          v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("aria-hidden", "true");
          v.preload = "auto";
          if (p.fuoco) v.style.objectPosition = p.fuoco;
          v.addEventListener("playing", function () { if (a._attiva) a.classList.add("opera--in-moto"); });
          v.addEventListener("loadedmetadata", function () {
            var rb = box.clientWidth / Math.max(1, box.clientHeight), rv = v.videoWidth / Math.max(1, v.videoHeight);
            v.classList.toggle("opera__clip--intera", Math.abs(Math.log(rv / rb)) > 0.08);
          });
          v.src = p.anteprimaVideo;
          box.appendChild(v);
          a._clip = v;
        }
        var pr = v.play();
        if (pr && pr.catch) pr.catch(function () {});
        return;
      }
      pieghevole(a, box, p);
    }
    function ferma(a) {
      if (!a._attiva) return;
      a._attiva = false;
      a.classList.remove("opera--in-moto");
      if (a._clip) a._clip.pause();
      clearTimeout(a._timer);
    }
    function pieghevole(a, box, p) {
      var s = a._scorre;
      if (!s) {
        var strato = el("div", { class: "opera__scorre", "aria-hidden": "true" });
        var lastre = [el("div", { class: "opera__lastra" }), el("div", { class: "opera__lastra" })];
        lastre.forEach(function (l) { strato.appendChild(l); });
        var conta = el("span", { class: "opera__conta" });
        strato.appendChild(conta);
        box.appendChild(strato);
        s = a._scorre = { f: fotogrammi(p), i: 0, sopra: 0, lastre: lastre, conta: conta, giro: 0 };
      }
      if (s.f.length < 2) return;
      clearTimeout(a._timer);
      var mio = ++s.giro;                     /* un solo scorrimento alla volta */
      function vivo() { return a._attiva && mio === s.giro; }
      misuraTutte(s.f, function () {
        if (!vivo()) return;
        /* le pagine dipendono dalla forma del riquadro, che cambia con lo schermo */
        var esito = pagineDi(s.f, box.clientWidth / Math.max(1, box.clientHeight));
        s.pagine = esito.pagine;
        if (s.pagine.length < 2) return;
        function metti(lastra, j, stato) {
          var tipo = riempi(lastra, s.pagine[j], p.fuoco, box, esito.colonna);
          lastra.className = "opera__lastra" + tipo + (stato ? " " + stato : "");
          return tipo;
        }
        /* si riparte sempre dalla copertina */
        s.i = 0; s.sopra = 0;
        metti(s.lastre[0], 0, "fermo");
        s.lastre[1].className = "opera__lastra";
        s.conta.textContent = due(1) + " / " + due(s.pagine.length);
        function prossimo() {
          if (!vivo()) return;
          var j = (s.i + 1) % s.pagine.length;
          var nuova = s.lastre[1 - s.sopra], vecchia = s.lastre[s.sopra];
          pronta(s.pagine[j]).then(function () {
            if (!vivo()) return;
            var tipo = metti(nuova, j, "");
            void nuova.offsetWidth;
            nuova.className = "opera__lastra" + tipo + " entra";
            vecchia.className = vecchia.className.replace(/ (fermo|entra|esce)\b/g, "") + " esce";
            a.classList.add("opera--in-moto");
            s.i = j; s.sopra = 1 - s.sopra;
            s.conta.textContent = due(j + 1) + " / " + due(s.pagine.length);
            a._timer = setTimeout(prossimo, 1600);
          });
        }
        a._timer = setTimeout(prossimo, 380);
      });
    }
    /* Senza nessuno sopra le anteprime non restano ferme:
       - sul computer si anima da sola un'anteprima alla volta, a turno fra quelle in vista;
         appena il mouse va su un lavoro, si muove solo quello;
       - sul telefono si anima l'anteprima più vicina al centro dello schermo. */
    function preparaAnimazioni() {
      if (calma) return;
      var carte = $$(".opera").filter(function (a) {
        var p = a._p;
        return p && (p.anteprimaVideo || fotogrammi(p).length > 1);
      });
      if (!carte.length) return;
      var sotto = null;                       /* il lavoro sotto il mouse */
      var giro = { timer: 0, attuale: null, ultimo: -1 };
      var inVista = [];

      function fermaGiro() {
        clearTimeout(giro.timer);
        giro.timer = 0;
        if (giro.attuale && giro.attuale !== sotto) ferma(giro.attuale);
        giro.attuale = null;
      }
      function riprendiGiro(attesa) {
        clearTimeout(giro.timer);
        giro.timer = setTimeout(passoGiro, attesa);
      }
      function passoGiro() {
        fermaGiro();
        if (sotto || document.hidden) return;
        var lista = carte.filter(function (a) { return !a.hidden && inVista.indexOf(a) >= 0; });
        if (!lista.length) return;            /* riparte quando un lavoro torna in vista */
        var dopo = lista.filter(function (a) { return carte.indexOf(a) > giro.ultimo; });
        var a = dopo.length ? dopo[0] : lista[0];
        giro.ultimo = carte.indexOf(a);
        giro.attuale = a;
        muovi(a);
        giro.timer = setTimeout(function () {
          if (giro.attuale && giro.attuale !== sotto) ferma(giro.attuale);
          giro.attuale = null;
          giro.timer = setTimeout(passoGiro, 700);
        }, a._p.anteprimaVideo ? 5200 : 3700);
      }
      function alCentro() {
        var meta = window.innerHeight / 2, scelta = null, d = Infinity;
        inVista.forEach(function (a) {
          if (a.hidden) return;
          var r = a.getBoundingClientRect();
          var x = Math.abs(r.top + r.height / 2 - meta);
          if (x < d) { d = x; scelta = a; }
        });
        inVista.forEach(function (a) { if (a !== scelta) ferma(a); });
        if (scelta) muovi(scelta);
      }

      carte.forEach(function (a) {
        a.addEventListener("mouseenter", function () { sotto = a; fermaGiro(); muovi(a); });
        a.addEventListener("mouseleave", function () {
          if (sotto === a) sotto = null;
          ferma(a);
          if (conMouse) riprendiGiro(1600);
        });
        a.addEventListener("focus", function () { muovi(a); });
        a.addEventListener("blur", function () { ferma(a); });
      });

      if (risparmio || !("IntersectionObserver" in window)) return;
      var soglia = conMouse ? 0.6 : 0.7;
      var oss = new IntersectionObserver(function (voci) {
        voci.forEach(function (v) {
          var i = inVista.indexOf(v.target);
          var dentro = v.isIntersecting && v.intersectionRatio >= soglia;
          if (dentro && i < 0) inVista.push(v.target);
          if (!dentro && i >= 0) {
            inVista.splice(i, 1);
            if (v.target !== sotto) ferma(v.target);
          }
        });
        if (!conMouse) alCentro();
        else if (!giro.timer && !giro.attuale && !sotto) riprendiGiro(1200);
      }, { threshold: [0, 0.6, 0.7, 1] });
      carte.forEach(function (a) { oss.observe(a); });

      if (conMouse) {
        document.addEventListener("visibilitychange", function () {
          if (document.hidden) fermaGiro(); else riprendiGiro(1200);
        });
      } else {
        var attesa = false;
        window.addEventListener("scroll", function () {
          if (attesa) return;
          attesa = true;
          requestAnimationFrame(function () { attesa = false; alCentro(); });
        }, { passive: true });
      }
    }

    function carta(p, numero, prima) {
      var img = p.copertina ? seManca(el("img", { src: p.copertina, alt: "", decoding: "async" })) : null;
      var breve = testo(trad(p.raw, "breve"));
      var tecnica = prima ? datoDi(p, "tecnica") : "";
      var a = el("a", { class: "opera" + (prima ? " opera--prima" : ""), href: "#" + p.slug, "data-chiave": p.chiave }, [
        el("div", { class: "opera__img" }, [img]),
        el("div", { class: "opera__testo" }, [
          el("span", { class: "opera__num", text: due(numero) }),
          el("h4", { class: "opera__titolo", text: titoloDi(p) }),
          el("span", { class: "opera__anno", text: p.anno }),
          breve ? el("p", { class: "opera__breve", text: breve }) : null,
          tecnica ? el("p", { class: "opera__tecnica", text: tecnica }) : null,
          prima ? el("span", { class: "opera__vai", text: t("vediProgetto") }) : null
        ])
      ]);
      if (img) {
        var misura = function () {
          if (img.naturalWidth && img.naturalHeight) proporzioneCopertina(a, img.naturalWidth / img.naturalHeight);
        };
        if (img.complete && img.naturalWidth) misura(); else img.addEventListener("load", misura);
      }
      a._p = p;
      return a;
    }

    function disegnaPortfolio() {
      var g = $("#griglia");
      g.textContent = "";
      if (!progetti.length) {
        g.appendChild(el("p", { class: "vuoto", text: t("vuoto") }));
        return;
      }
      var n = 0;
      CATEGORIE.forEach(function (c) {
        var descr = testo(trad(c.raw, "descrizione"));
        var box = el("div", { class: "categoria__lavori" });
        /* con un numero dispari di lavori il primo esce grande, con il testo accanto; gli altri vanno a coppie */
        var primo = c.lavori.length % 2 === 1;
        var fila = null;
        c.lavori.forEach(function (p, i) {
          var grande = primo && i === 0;
          var a = carta(p, ++n, grande);
          if (grande) { box.appendChild(a); return; }
          if (!fila || fila.children.length >= 2) { fila = el("div", { class: "fila" }); box.appendChild(fila); }
          fila.appendChild(a);
        });
        g.appendChild(el("section", { class: "categoria", id: c.id, "aria-labelledby": c.id + "-t" }, [
          el("header", { class: "categoria__testa" }, [
            el("h3", { class: "categoria__nome", id: c.id + "-t", text: nomeCategoria(c) }),
            el("span", { class: "categoria__conta", text: due(c.lavori.length) }),
            descr ? el("p", { class: "categoria__testo", text: descr }) : null
          ]),
          box
        ]));
      });
      sommaFile();
      preparaAnimazioni();
    }
    /* cambiando lingua si riscrivono i testi delle schede, senza ridisegnarle */
    function testiPortfolio() {
      $$(".opera").forEach(function (a) {
        var p = a._p;
        if (!p) return;
        function metti(sel, v) { var x = $(sel, a); if (x) x.textContent = v; }
        metti(".opera__titolo", titoloDi(p));
        metti(".opera__breve", testo(trad(p.raw, "breve")));
        metti(".opera__tecnica", datoDi(p, "tecnica"));
        metti(".opera__vai", t("vediProgetto"));
      });
      CATEGORIE.forEach(function (c) {
        var sez = document.getElementById(c.id);
        if (!sez) return;
        var x = $(".categoria__nome", sez);
        if (x) x.textContent = nomeCategoria(c);
        x = $(".categoria__testo", sez);
        if (x) x.textContent = testo(trad(c.raw, "descrizione"));
      });
      disegnaIndiceCategorie();
    }

    /* ---------- about ---------- */
    function disegnaAbout() {
      var c = testo(trad(D, "citazione")).replace(/^["“«]+|["”»]+$/g, "");
      var q = $("#citazione");
      /* una tua foto, se c'è, prende il posto della frase */
      var foto = relativo(D.foto), fig = $("#about-foto");
      if (fig) {
        fig.hidden = !foto;
        if (foto) { var im = $("img", fig); im.src = foto; im.alt = NOME || FIRMA; c = ""; }
      }
      q.textContent = c ? "“" + c + "”" : "";
      q.hidden = !c;
      var box = $("#about-testo");
      box.textContent = "";
      var righe = lista(trad(D, "about"));
      righe.forEach(function (x) { box.appendChild(el("p", { text: x })); });
      $("#about").hidden = !c && !foto && !righe.length;
    }

    /* ---------- curriculum ---------- */
    function anniDi(v) {
      var a = testo(v.anni);
      if (LINGUA === "en") {
        if (testo(v.anni_en)) return testo(v.anni_en);
        a = a.replace(/\boggi\b/gi, "present").replace(/\bin corso\b/gi, "present");
      }
      return a;
    }
    function disegnaCv() {
      var box = $("#cv");
      /* cambiando lingua restano aperte le stesse sezioni */
      var aperte = $$(".cv__sezione", box).map(function (d) { return d.open; });
      box.textContent = "";
      var k = 0;
      (Array.isArray(D.curriculum) ? D.curriculum : []).forEach(function (s) {
        if (!s) return;
        var voci = (Array.isArray(s.voci) ? s.voci : []).filter(function (v) { return v && testo(v.testo); });
        if (!voci.length) return;
        var conAnni = voci.some(function (v) { return testo(v.anni); });
        box.appendChild(el("details", { class: "cv__sezione", open: aperte[k++] ? true : null }, [
          el("summary", null, [el("span", { text: testo(trad(s, "sezione")) }), el("span", { class: "cv__segno", "aria-hidden": "true" })]),
          el("ul", { class: "cv__voci" + (conAnni ? "" : " cv__voci--semplice") }, voci.map(function (v) {
            var righe = String(trad(v, "testo")).split("\n").map(testo).filter(Boolean);
            return el("li", { class: "cv__voce" }, [
              el("span", { class: "cv__anni", text: anniDi(v) }),
              el("span", { class: "cv__testo" }, righe.map(function (r, j) {
                return el("span", { class: j === 0 ? "cv__riga cv__riga--prima" : "cv__riga", text: r });
              }))
            ]);
          }))
        ]));
      });
      var link = $("#link-cv"), cv = relativo(trad(D, "cv"));
      if (cv) { link.setAttribute("href", cv); link.hidden = false; }
      else link.hidden = true;
      disegnaIndiceCv();
    }
    /* nella colonna a sinistra, sotto «curriculum»: le sue sezioni e il pdf */
    function disegnaIndiceCv() {
      var ul = $("#indice-cv");
      if (!ul) return;
      ul.textContent = "";
      $$(".cv__sezione").forEach(function (d, i) {
        var nome = $("summary > span", d);
        ul.appendChild(el("li", null, [el("a", {
          href: "#curriculum", text: nome ? nome.textContent : "",
          onclick: function (e) { e.preventDefault(); apriCv(i); }
        })]));
      });
      var link = $("#link-cv");
      if (link && !link.hidden) {
        ul.appendChild(el("li", null, [el("a", { class: "sotto__cv", href: link.getAttribute("href"), target: "_blank", rel: "noopener", text: t("scaricaCvBreve") })]));
      }
      var apri = $('.voce[data-voce="curriculum"] .voce__apri');
      if (apri) apri.hidden = !ul.children.length;
    }
    /* apre una sezione del curriculum e ci porta */
    function apriCv(i) {
      function fai() {
        var d = $$(".cv__sezione")[i];
        if (!d) return;
        d.open = true;
        d.scrollIntoView({ behavior: calma ? "auto" : "smooth", block: "start" });
      }
      if (vista !== "home") { dopoPercorso = fai; location.hash = "curriculum"; return; }
      if (location.hash !== "#curriculum" && history.replaceState) history.replaceState(null, "", "#curriculum");
      fai();
    }

    /* ---------- contatti ---------- */
    function disegnaContatti() {
      var email = testo(D.email);
      var a = $("#email");
      if (email) {
        a.textContent = email;
        a.setAttribute("href", "mailto:" + email);
      } else {
        $(".contatti__email").hidden = true;
      }

      ["#social", "#lato-social"].forEach(function (sel) {
        var social = $(sel);
        if (!social) return;
        social.textContent = "";
        [["instagram", "Instagram"], ["linkedin", "LinkedIn"]].forEach(function (s) {
          var url = testo(D[s[0]]);
          if (url) social.appendChild(el("li", null, [el("a", { href: url, target: "_blank", rel: "noopener", text: s[1] })]));
        });
        social.hidden = !social.children.length;
      });
      /* l'email anche nella colonna a sinistra */
      var latoEmail = $("#lato-email");
      if (latoEmail) {
        latoEmail.hidden = !email;
        if (email) { latoEmail.textContent = email; latoEmail.setAttribute("href", "mailto:" + email); }
      }

      $("#copyright").textContent = "© " + new Date().getFullYear() + " " + (NOME || FIRMA);
    }
    function preparaContatti() {
      var a = $("#email"), copia = $("#copia-email");
      copia.addEventListener("click", function () {
        var email = testo(D.email);
        function fatto() {
          copia.textContent = t("copiato");
          setTimeout(function () { copia.textContent = t("copia"); }, 1600);
        }
        function seleziona() {
          var r = document.createRange();
          r.selectNodeContents(a);
          var s = window.getSelection();
          s.removeAllRanges();
          s.addRange(r);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(email).then(fatto, seleziona);
        } else {
          seleziona();
        }
      });
      var su = $("#torna-su");
      if (su) su.addEventListener("click", function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: calma ? "auto" : "smooth" });
      });
    }

    /* ---------- lettore video ---------- */
    function riconosciVideo(url) {
      var u = testo(url), m;
      m = u.match(/drive\.google\.com\/file\/d\/([\w-]{10,})/) || u.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([\w-]{10,})/);
      if (m) return { tipo: "incorporato", src: "https://drive.google.com/file/d/" + m[1] + "/preview", fonte: "Google Drive" };
      m = u.match(/(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
      if (m) return { tipo: "incorporato", src: "https://www.youtube-nocookie.com/embed/" + m[1] + "?rel=0", fonte: "YouTube" };
      m = u.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([\da-f]+))?/);
      if (m) return { tipo: "incorporato", src: "https://player.vimeo.com/video/" + m[1] + "?dnt=1" + (m[2] ? "&h=" + m[2] : ""), fonte: "Vimeo" };
      if (/\.(mp4|m4v|webm|mov|ogv)(\?.*)?$/i.test(u) || /^https?:\/\//i.test(u)) return { tipo: "file", src: u };
      return { tipo: "sconosciuto", src: u };
    }

    function tipoMime(src) {
      var e = (src.split("?")[0].split(".").pop() || "").toLowerCase();
      return { mp4: "video/mp4", m4v: "video/mp4", webm: "video/webm", ogv: "video/ogg" }[e] || null;
    }

    function rapporto(formato) {
      var m = testo(formato).match(/^(\d+(?:\.\d+)?)\s*[:/x]\s*(\d+(?:\.\d+)?)$/);
      return m ? parseFloat(m[1]) / parseFloat(m[2]) : 0;
    }

    function lettore(voce, p) {
      var v = riconosciVideo(voce.file);
      var titolo = titoloVideo(voce);
      var cornice = el("div", { class: "video__cornice" });
      var figura = el("figure", { class: "video" }, [cornice]);
      /* nessun video supera l'85% dell'altezza dello schermo */
      function proporzione(x) {
        cornice.style.aspectRatio = String(x);
        figura.style.maxWidth = "calc(85vh * " + x.toFixed(4) + ")";
        if (x < 1) figura.classList.add("video--verticale");
      }
      var r = rapporto(voce.formato);
      if (r) proporzione(r);
      var didascalia = [];
      if (titolo) didascalia.push(el("span", { class: "video__titolo", text: titolo }));

      if (v.tipo === "file") {
        var video = el("video", { controls: true, playsinline: true, preload: "metadata", poster: voce.anteprima || p.copertina || null });
        var fonte = el("source", { src: v.src, type: tipoMime(v.src) });
        video.appendChild(fonte);
        var play = el("button", { class: "video__play", type: "button", "aria-label": t("riproduci") + (titolo ? ": " + titolo : "") }, [el("span", { "aria-hidden": "true" })]);
        play.addEventListener("click", function () { var pr = video.play(); if (pr && pr.catch) pr.catch(function () {}); });
        video.addEventListener("play", function () { play.hidden = true; });
        video.addEventListener("loadedmetadata", function () {
          if (r || !video.videoWidth || !video.videoHeight) return;
          proporzione(video.videoWidth / video.videoHeight);
        });
        /* se il video non parte: il file manca, oppure c'è ma questo browser non lo legge */
        fonte.addEventListener("error", function () {
          function mostra(c) {
            cornice.textContent = "";
            cornice.className = "video__cornice video__cornice--vuota";
            cornice.appendChild(el("p", { class: "video__avviso" }, c));
          }
          var manca = [t("videoNonTrovato", { src: v.src })];
          if (!window.fetch) { mostra(manca); return; }
          fetch(v.src, { method: "HEAD" }).then(function (risp) {
            mostra(risp.ok ? [t("nonRiproduce"), el("a", { href: v.src, target: "_blank", rel: "noopener", text: t("apriFile") })] : manca);
          }, function () { mostra(manca); });
        });
        cornice.appendChild(video);
        cornice.appendChild(play);
      } else if (v.tipo === "incorporato") {
        cornice.appendChild(el("iframe", {
          src: v.src, title: t("video") + ": " + (titolo || titoloDi(p)), loading: "lazy",
          allow: "autoplay; fullscreen; picture-in-picture; encrypted-media", allowfullscreen: true,
          referrerpolicy: "strict-origin-when-cross-origin"
        }));
        didascalia.push(el("a", { class: "video__link", href: voce.file, target: "_blank", rel: "noopener", text: t("apriSu", { fonte: v.fonte }) }));
      } else {
        cornice.className = "video__cornice video__cornice--vuota";
        cornice.appendChild(el("p", { class: "video__avviso", text: t("linkVideo", { src: v.src }) }));
      }
      if (didascalia.length) figura.appendChild(el("figcaption", { class: "video__nota" }, didascalia));
      return figura;
    }

    /* ---------- galleria e lightbox ---------- */
    var lb = { lista: [], i: 0, origine: null, titolo: "" };

    function galleria(p) {
      var box = el("div", { class: "lavoro__galleria" + (p.immagini.length === 1 ? " lavoro__galleria--una" : "") });
      var titolo = titoloDi(p);
      p.immagini.forEach(function (src, i) {
        var img = seManca(el("img", { src: src, alt: titolo + ", " + t("immagine") + " " + (i + 1), loading: i < 3 ? "eager" : "lazy", decoding: "async" }));
        var b = el("button", { class: "foto", type: "button", "aria-label": t("apriImmagine", { n: i + 1, m: p.immagini.length }) }, [img]);
        b.addEventListener("click", function () { apriLightbox(p, i, b); });
        /* la prima immagine, se è orizzontale, occupa tutta la larghezza;
           se dopo ne resta una sola, le due immagini stanno una sotto l'altra, centrate */
        if (i === 0 && p.immagini.length > 1) {
          var larga = function () {
            if (img.naturalWidth <= img.naturalHeight * 1.2) return;
            b.classList.add("foto--larga");
            if (p.immagini.length === 2) box.classList.add("lavoro__galleria--una");
          };
          if (img.complete && img.naturalWidth) larga(); else img.addEventListener("load", larga);
        }
        box.appendChild(b);
      });
      return box;
    }

    function mostraImmagine() {
      var img = $("#lightbox-img");
      img.src = lb.lista[lb.i];
      img.alt = lb.titolo + ", " + t("immagine") + " " + (lb.i + 1);
      $("#lightbox-conta").textContent = (lb.i + 1) + " / " + lb.lista.length;
      var piu = lb.lista.length > 1;
      $("#lightbox-prec").hidden = !piu;
      $("#lightbox-succ").hidden = !piu;
    }
    function apriLightbox(p, i, origine) {
      lb.lista = p.immagini; lb.i = i; lb.origine = origine; lb.titolo = titoloDi(p);
      mostraImmagine();
      $("#lightbox").hidden = false;
      radice.classList.add("blocca");
      $("#lightbox-chiudi").focus();
    }
    function chiudiLightbox() {
      if ($("#lightbox").hidden) return;
      $("#lightbox").hidden = true;
      radice.classList.remove("blocca");
      if (lb.origine && document.body.contains(lb.origine)) lb.origine.focus();
    }
    function scorri(d) {
      if (lb.lista.length < 2) return;
      lb.i = (lb.i + d + lb.lista.length) % lb.lista.length;
      mostraImmagine();
    }

    function preparaLightbox() {
      var box = $("#lightbox");
      $("#lightbox-chiudi").addEventListener("click", chiudiLightbox);
      $("#lightbox-prec").addEventListener("click", function () { scorri(-1); });
      $("#lightbox-succ").addEventListener("click", function () { scorri(1); });
      box.addEventListener("click", function (e) { if (e.target === box) chiudiLightbox(); });
      var x0 = null;
      box.addEventListener("pointerdown", function (e) { x0 = e.clientX; });
      box.addEventListener("pointerup", function (e) {
        if (x0 === null) return;
        var dx = e.clientX - x0;
        x0 = null;
        if (Math.abs(dx) > 50) scorri(dx < 0 ? 1 : -1);
      });
      document.addEventListener("keydown", function (e) {
        if (box.hidden) return;
        if (e.key === "Escape") { e.preventDefault(); chiudiLightbox(); }
        else if (e.key === "ArrowRight") scorri(1);
        else if (e.key === "ArrowLeft") scorri(-1);
        else if (e.key === "Tab") {
          var f = $$("button", box).filter(function (b) { return !b.hidden; });
          var i = f.indexOf(document.activeElement);
          e.preventDefault();
          f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
        }
      });
    }

    /* ---------- pulsante per scaricare un file (per esempio un PDF) ---------- */
    function pulsanteScarica(p) {
      if (!p.scarica) return null;
      return el("div", { class: "lavoro__scarica" }, [
        el("a", { class: "bottone", href: p.scarica.file, target: "_blank", rel: "noopener", text: testo(trad(p.scarica.raw, "testo")) || t("scarica") })
      ]);
    }

    /* ---------- libri da sfogliare ----------
       Ogni foglio gira attorno al dorso: davanti ha la pagina di destra,
       dietro quella di sinistra. Le pagine sono sfondi, non immagini da aprire
       o scaricare, e si caricano solo quando ci si avvicina.
       Quando le due pagine affiancate verrebbero troppo piccole (sul telefono, o con le pagine
       orizzontali dei manuali) si vede una pagina alla volta, grande, con un filo della pagina
       accanto: il libro scorre per mostrare l'altra pagina e, dopo quella di destra, si gira il foglio. */
    var PAGINA_MINIMA = 125000;   /* area minima di una pagina (in pixel) per vedere il libro aperto intero */

    function libro(L) {
      var conCopertina = !!L.copertina;
      var titoloL = testo(trad(L.raw, "titolo")), notaL = testo(trad(L.raw, "nota"));
      /* numero pari = pagina di sinistra, se non è indicato il lato */
      var aSinistra = L.lato ? L.lato === "sinistra" : L.prima > 0 && L.prima % 2 === 0;

      /* le facce dei fogli in fila: fronte, retro, fronte, retro... (null = carta bianca) */
      var facce = [];
      if (conCopertina) {
        facce.push({ src: L.copertina, nome: t("copertina"), copertina: true });
        if (!aSinistra) facce.push(null);   /* l'interno della copertina */
      } else if (aSinistra) {
        facce.push(null);
      }
      L.pagine.forEach(function (src, j) {
        var num = L.prima ? L.prima + j : j + 1;
        facce.push({ src: src, nome: t("pagina") + " " + num, numero: num });
      });
      var ultima = L.prima ? L.prima + L.pagine.length - 1 : L.pagine.length;

      var nFogli = Math.ceil(facce.length / 2);
      var min = !conCopertina && aSinistra ? 1 : 0;
      var max = min;
      for (var k = min; k <= nFogli; k++) if (facce[2 * k - 1] || facce[2 * k]) max = k;
      /* pos = fogli già girati; lato = la pagina in vista quando se ne vede una sola */
      var pos = min, lato = "dx", singola = false, rapporto = 0.7;
      function sinistra(p) { return facce[2 * p - 1]; }
      function destra(p) { return facce[2 * p]; }
      /* arrivando a un'apertura: in avanti si comincia da sinistra, all'indietro da destra */
      function latoPer(p, avanzando) {
        if (avanzando) return sinistra(p) ? "sx" : "dx";
        return destra(p) ? "dx" : "sx";
      }

      var volume = el("div", { class: "libro__volume" }, [
        el("div", { class: "libro__base libro__base--sx" }),
        el("div", { class: "libro__base libro__base--dx" })
      ]);
      function faccia(f, lato) {
        var d = el("div", { class: "libro__faccia libro__faccia--" + lato + (f && f.copertina ? " libro__faccia--copertina" : "") });
        if (f) {
          d._src = new URL(f.src, document.baseURI).href;
          d.setAttribute("role", "img");
          d.setAttribute("aria-label", (titoloL ? titoloL + ", " : "") + f.nome);
        }
        return d;
      }
      function caricaFoglio(foglio) {
        if (!foglio || foglio._caricato) return;
        foglio._caricato = true;
        $$(".libro__faccia", foglio).forEach(function (d) {
          if (d._src) d.style.backgroundImage = "url(\"" + d._src.replace(/"/g, "%22") + "\")";
        });
      }
      var fogli = [];
      for (var i = 0; i < nFogli; i++) {
        var foglio = el("div", { class: "libro__foglio" }, [faccia(facce[2 * i], "fronte"), faccia(facce[2 * i + 1], "retro")]);
        fogli.push(foglio);
        volume.appendChild(foglio);
      }

      var box = el("figure", { class: "libro" + (L.lungo ? " libro--lungo" : "") });
      var stato = el("span", { class: "libro__stato", "aria-live": "polite" });
      var prec = el("button", { class: "libro__freccia", type: "button", "aria-label": t("pagPrec"), text: "‹" });
      var succ = el("button", { class: "libro__freccia", type: "button", "aria-label": t("pagSucc"), text: "›" });
      var cursore = L.lungo && max > min ? el("input", { class: "libro__cursore", type: "range", min: String(min), max: String(max), step: "1", value: String(pos), "aria-label": t("vaiPagina") }) : null;
      var scena = el("div", { class: "libro__scena", tabindex: "0", "aria-label": t("libro") + (titoloL ? ": " + titoloL : "") }, [volume]);

      /* si tengono nella pagina solo i fogli vicini a quelli aperti */
      var VICINI = 3;
      function atterra(f, i) {
        f.classList.remove("libro__foglio--in-volo");
        f.style.zIndex = String(i < pos ? i + 1 : nFogli - i);
      }
      function disponi(animato) {
        fogli.forEach(function (f, i) {
          var vicino = i >= pos - VICINI && i < pos + VICINI;
          f.hidden = !vicino;
          if (vicino) caricaFoglio(f);
          var girato = i < pos;
          f.classList.toggle("libro__foglio--girato", girato);
          f.style.zIndex = String(girato ? i + 1 : nFogli - i);
          if (animato === i) {
            f.style.zIndex = String(nFogli + 2);
            f.classList.add("libro__foglio--in-volo");
            clearTimeout(f._atterra);
            f._atterra = setTimeout(function () { atterra(f, i); }, 1000);
          }
        });
        box.classList.toggle("libro--chiuso", conCopertina && pos === 0);
        box.classList.toggle("libro--a-destra", lato === "dx");
        var sx = sinistra(pos), dx = destra(pos);
        var visti = singola ? [lato === "sx" ? sx : dx] : [sx, dx];
        var numeri = visti.filter(function (f) { return f && f.numero; }).map(function (f) { return f.numero; });
        var su = L.lungo ? " " + t("di") + " " + ultima : "";
        stato.textContent = conCopertina && pos === 0 ? t("apriLibro")
          : numeri.length === 2 ? "pp. " + numeri[0] + "–" + numeri[1] + su
          : numeri.length === 1 ? "p. " + numeri[0] + su : "";
        prec.disabled = !puoIndietro();
        succ.disabled = !puoAvanti();
        if (cursore) cursore.value = String(pos);
      }
      function puoAvanti() { return pos < max || (singola && lato === "sx" && !!destra(pos)); }
      function puoIndietro() { return pos > min || (singola && lato === "dx" && !!sinistra(pos)); }
      function gira(d) {
        var nuovo = pos + d;
        if (nuovo < min || nuovo > max) return;
        var mosso = d > 0 ? pos : pos - 1;
        pos = nuovo;
        lato = latoPer(pos, d > 0);
        disponi(mosso);
      }
      /* con una pagina alla volta, prima si passa all'altra pagina dell'apertura, poi si gira */
      function avanti() {
        if (singola && lato === "sx" && destra(pos)) { lato = "dx"; disponi(); return; }
        gira(1);
      }
      function indietro() {
        if (singola && lato === "dx" && sinistra(pos)) { lato = "sx"; disponi(); return; }
        gira(-1);
      }
      function senzaAnimazione(fai) {
        box.classList.add("libro--salto");
        fai();
        void volume.offsetWidth;
        requestAnimationFrame(function () { box.classList.remove("libro--salto"); });
      }
      /* salto di molte pagine (cursore): senza animazione */
      function salta(nuovo, avanzando) {
        nuovo = Math.max(min, Math.min(max, nuovo));
        if (nuovo === pos) return;
        if (Math.abs(nuovo - pos) === 1) { gira(nuovo - pos); return; }
        senzaAnimazione(function () {
          pos = nuovo;
          lato = latoPer(pos, avanzando !== false);
          disponi();
        });
      }
      /* libro aperto intero o una pagina alla volta: dipende da quanto verrebbero grandi le pagine */
      function scegliVista() {
        var w = scena.clientWidth;
        if (!w) return;
        var aperto = Math.min(w, window.innerHeight * 0.74 * 2 * rapporto, 1120);
        var nuova = (aperto / 2) * (aperto / 2 / rapporto) < PAGINA_MINIMA;
        if (nuova === singola) return;
        singola = nuova;
        if (singola) lato = sinistra(pos) ? "sx" : "dx";
        box.classList.toggle("libro--singola", singola);
        senzaAnimazione(function () { disponi(); });
      }
      fogli.forEach(function (f, i) {
        f.addEventListener("transitionend", function (e) {
          if (e.target !== f || e.propertyName !== "transform") return;
          clearTimeout(f._atterra);
          atterra(f, i);
        });
      });
      prec.addEventListener("click", indietro);
      succ.addEventListener("click", avanti);
      if (cursore) cursore.addEventListener("input", function () { salta(parseInt(cursore.value, 10)); });
      var strisciato = 0;
      volume.addEventListener("click", function (e) {
        if (Date.now() - strisciato < 600) return;
        if (conCopertina && pos === 0) { avanti(); return; }
        /* clic sulla metà destra: avanti; sulla sinistra: indietro */
        var r = (singola ? scena : volume).getBoundingClientRect();
        if (e.clientX > r.left + r.width / 2) avanti(); else indietro();
      });
      /* sul telefono si sfoglia anche strisciando il dito */
      var tocco = null;
      scena.addEventListener("touchstart", function (e) {
        tocco = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
      }, { passive: true });
      scena.addEventListener("touchend", function (e) {
        if (!tocco || !e.changedTouches.length) return;
        var dx = e.changedTouches[0].clientX - tocco.x, dy = e.changedTouches[0].clientY - tocco.y;
        tocco = null;
        if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        strisciato = Date.now();
        if (dx < 0) avanti(); else indietro();
      }, { passive: true });
      scena.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight") { e.preventDefault(); avanti(); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); indietro(); }
        else if (e.key === "Home") { e.preventDefault(); salta(min); }
        else if (e.key === "End") { e.preventDefault(); salta(max, false); }
      });

      /* le proporzioni della pagina le prendo dalla prima pagina */
      var misura = new Image();
      misura.onload = function () {
        if (!misura.naturalWidth || !misura.naturalHeight) return;
        rapporto = misura.naturalWidth / misura.naturalHeight;
        volume.style.setProperty("--pagina", String(rapporto));
        volume.style.aspectRatio = String(2 * rapporto);
        scegliVista();
      };
      misura.src = L.pagine[0];
      if (window.ResizeObserver) new ResizeObserver(scegliVista).observe(scena);
      else window.addEventListener("resize", scegliVista);

      disponi();
      var nota = [titoloL, notaL].filter(Boolean);
      box.appendChild(scena);
      box.appendChild(el("figcaption", { class: "libro__nota" }, [
        el("span", { class: "libro__titolo", text: nota.join(" · ") }),
        max > min ? el("span", { class: "libro__comandi" }, [prec, stato, succ]) : stato,
        cursore
      ]));
      return el("section", { class: "lavoro__libro", "aria-label": t("libro") + (titoloL ? ": " + titoloL : "") }, [box]);
    }

    /* ---------- pagina del singolo lavoro ---------- */
    var ripristina = false;

    function tornaAlPortfolio(e) {
      e.preventDefault();
      ripristina = true;
      location.hash = "portfolio";
    }

    /* La colonna del testo resta ferma mentre scorrono le immagini,
       ma solo se ci sta tutta nello schermo. */
    function controllaColonna() {
      var c = $(".lavoro__colonna");
      if (!c) return;
      c.classList.toggle("lavoro__colonna--lunga", c.offsetHeight > window.innerHeight - 56);
    }

    function disegnaLavoro(p) {
      var box = $("#lavoro");
      box.textContent = "";
      var n = progetti.length, i = progetti.indexOf(p);
      var prec = progetti[(i - 1 + n) % n], succ = progetti[(i + 1) % n];
      var testi = testoDi(p), breveL = testo(trad(p.raw, "breve"));
      var dati = [["anno", p.anno], ["categoria", p.categoria], ["tecnica", datoDi(p, "tecnica")], ["luogo", datoDi(p, "luogo")], ["crediti", datoDi(p, "crediti")]]
        .filter(function (d) { return d[1]; });

      var colonna = [
        dati.length ? el("dl", { class: "lavoro__dati" }, dati.map(function (d) {
          return el("div", null, [el("dt", { text: t(d[0]) }), el("dd", { text: d[1] })]);
        })) : null,
        testi.length ? el("div", { class: "lavoro__testo" }, testi.reduce(function (out, x) {
          /* un paragrafo che comincia con ## è un titoletto */
          var m = x.match(/^##\s+([^\n]+)(?:\n([\s\S]*))?$/);
          if (!m) { out.push(el("p", { text: x })); return out; }
          out.push(el("h2", { class: "lavoro__sottotitolo", text: m[1] }));
          if (testo(m[2])) out.push(el("p", { text: testo(m[2]) }));
          return out;
        }, [])) : null,
        pulsanteScarica(p)
      ].filter(Boolean);
      var materiali = [p.video.length ? el("div", { class: "lavoro__video" }, p.video.map(function (v) { return lettore(v, p); })) : null]
        .concat(p.libri.map(libro))
        .concat([p.immagini.length ? galleria(p) : null])
        .filter(Boolean);

      box.appendChild(el("article", { class: "lavoro pagina" }, [
        el("a", { class: "lavoro__indietro", href: "#portfolio", onclick: tornaAlPortfolio, text: t("tornaPortfolio") }),
        el("header", { class: "lavoro__testa" }, [
          el("p", { class: "lavoro__indice" }, [
            el("span", { text: t("lavoroNdiM", { n: due(i + 1), m: due(n) }) }),
            p.categoria ? el("span", { text: p.categoria }) : null
          ]),
          el("h1", { class: "lavoro__titolo", text: titoloDi(p) }),
          breveL ? el("p", { class: "lavoro__breve", text: breveL }) : null
        ]),
        el("div", { class: "lavoro__corpo" + (materiali.length ? "" : " lavoro__corpo--testo") }, [
          colonna.length ? el("div", { class: "lavoro__colonna" }, colonna) : null,
          materiali.length ? el("div", { class: "lavoro__materiali" }, materiali) : null
        ]),
        n > 1 ? el("nav", { class: "lavoro__altri", "aria-label": t("altri") }, [
          el("a", { href: "#" + prec.slug, rel: "prev" }, [el("small", { text: t("precedente") }), el("strong", { text: titoloDi(prec) })]),
          el("a", { href: "#" + succ.slug, rel: "next" }, [el("small", { text: t("successivo") }), el("strong", { text: titoloDi(succ) })])
        ]) : null
      ]));
      document.title = titoloDi(p) + " | " + FIRMA;
      requestAnimationFrame(controllaColonna);
    }

    /* ---------- navigazione: pagina d'ingresso, sezioni e lavori ----------
       Senza nulla dopo # nell'indirizzo si vede la pagina d'ingresso: logo, voci, contatti.
       Scegliendo una voce il blocco si sposta nella colonna a sinistra (sul telefono in alto)
       e compare la sezione scelta; il logo riporta all'ingresso. */
    var vista = "home", posizioneHome = 0, dopoPercorso = null;

    /* scorrimento immediato, anche se la pagina di solito scorre morbida */
    function senzaMorbido(fai) {
      var prima = radice.style.scrollBehavior;
      radice.style.scrollBehavior = "auto";
      fai();
      radice.style.scrollBehavior = prima;
    }
    function vai(y) { senzaMorbido(function () { window.scrollTo(0, y); }); }

    function inIngresso() { return radice.classList.contains("inizio"); }

    /* il passaggio animato fra l'ingresso e il sito, dove il browser lo sa fare */
    var dopoPassaggio = null;
    function finePassaggio() {
      radice.classList.remove("passaggio");
      if (dopoPassaggio) {
        var f = dopoPassaggio;
        dopoPassaggio = null;
        f();
      }
    }
    function passaggio(fai, entrando) {
      if (calma) { fai(); finePassaggio(); return; }
      if (!document.startViewTransition) {
        fai();
        finePassaggio();
        if (entrando) {
          radice.classList.add("entrata");
          setTimeout(function () { radice.classList.remove("entrata"); }, 700);
        }
        return;
      }
      radice.classList.add("passaggio");
      try {
        var vt = document.startViewTransition(fai);
        vt.finished.then(finePassaggio, finePassaggio);
      } catch (e) {
        fai();
        finePassaggio();
      }
    }

    /* indirizzi di lavori che hanno cambiato titolo: i vecchi link portano ancora al lavoro */
    var VECCHI_INDIRIZZI = {
      "manifesti-per-l-accademia-albertina": "grafiche-per-l-accademia-albertina",
      "fotomontaggi": "laszlo-moholy-nagy-dare-forma-alla-luce"
    };
    function lavoroDa(h) {
      for (var k = 0; k < 2; k++) {
        for (var i = 0; i < progetti.length; i++) if (progetti[i].slug === h) return progetti[i];
        h = VECCHI_INDIRIZZI[h];
        if (!h) break;
      }
      return null;
    }
    function hashAttuale() {
      var h = location.hash.replace(/^#/, "");
      try { h = decodeURIComponent(h); } catch (e) { /* lascia com'è */ }
      return h;
    }

    function chiudiLavoro() {
      $("#lavoro").hidden = true;
      $("#lavoro").textContent = "";
      $("#home").hidden = false;
      $("#curriculum").hidden = false;
      vista = "home";
    }

    function mostraIngresso() {
      chiudiLightbox();
      $$(".opera").forEach(ferma);
      if (vista === "lavoro") chiudiLavoro();
      apriVoce("", true);
      radice.classList.add("inizio");
      document.title = TITOLO_BASE;
      posizioneHome = 0;
      vai(0);
    }

    function percorso() {
      var h = hashAttuale();
      if (!h) {
        if (!inIngresso()) passaggio(mostraIngresso, false);
        return;
      }
      if (inIngresso()) {
        passaggio(function () {
          radice.classList.remove("inizio");
          instrada(h, true);
        }, true);
        return;
      }
      instrada(h, false);
    }

    function instrada(h, daIngresso) {
      var p = lavoroDa(h);
      if (p) {
        if (vista === "home" && !daIngresso) posizioneHome = window.scrollY;
        chiudiLightbox();
        $$(".opera").forEach(ferma);
        disegnaLavoro(p);
        $("#home").hidden = true;
        $("#curriculum").hidden = true;
        $("#lavoro").hidden = false;
        vista = "lavoro";
        /* nella colonna a sinistra si vede la categoria del lavoro aperto */
        CATEGORIE.forEach(function (c) { if (c.chiave === p.chiave) segnaCategoria(c.id); });
        if (daIngresso) {
          apriVoce("", true);
          segnaIndice("portfolio", true);
          dopoPassaggio = function () { segnaIndice("portfolio"); };
        } else {
          segnaIndice("portfolio");
        }
        adattaTitolo();
        adattaEmail();
        vai(0);
        requestAnimationFrame(function () { aggiornaBarra(); });
        return;
      }

      var daLavoro = vista === "lavoro";
      if (daLavoro) chiudiLavoro();
      document.title = TITOLO_BASE;
      vista = "home";
      adattaEmail();

      var bersaglio = document.getElementById(h);
      if (daIngresso) {
        /* dall'ingresso si arriva già alla sezione scelta */
        if (h === "portfolio" || !bersaglio) vai(0);
        else senzaMorbido(function () { bersaglio.scrollIntoView(); });
        var sezione = ["portfolio", "about", "curriculum", "contatti"].indexOf(h) >= 0 ? h : (p ? "portfolio" : "");
        apriVoce("", true);
        if (sezione) {
          segnaIndice(sezione, true);
          dopoPassaggio = function () { segnaIndice(sezione); };
        }
      } else if (daLavoro) {
        if (ripristina && posizioneHome > 0) vai(posizioneHome);
        else if (bersaglio) bersaglio.scrollIntoView();
        else vai(posizioneHome);
      }
      ripristina = false;
      requestAnimationFrame(function () { aggiornaBarra(); });
      if (dopoPercorso) {
        var f = dopoPercorso;
        dopoPercorso = null;
        f();
      }
    }

    /* ---------- cambio di lingua: si riscrivono i testi, senza ricaricare la pagina ---------- */
    alCambioLingua = function () {
      testiFissi();
      testiPortfolio();
      disegnaAbout();
      disegnaCv();
      disegnaContatti();
      if (vista === "lavoro") {
        var p = lavoroDa(hashAttuale());
        if (p) { disegnaLavoro(p); adattaTitolo(); }
      } else {
        document.title = TITOLO_BASE;
      }
      adattaEmail();
    };

    /* ---------- avvio ---------- */
    try {
      testiFissi();
      disegnaIndiceCategorie();
      disegnaPortfolio();
      disegnaAbout();
      disegnaCv();
      disegnaContatti();
      preparaContatti();
      preparaLightbox();
      preparaVoci();
      preparaIndice();
      preparaCategorie();
      preparaBarra();
      adattaEmail();
      window.addEventListener("hashchange", percorso);
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
      percorso();
      var h = hashAttuale();
      if (vista === "home" && h && document.getElementById(h)) {
        document.getElementById(h).scrollIntoView();
        if (["portfolio", "about", "curriculum", "contatti"].indexOf(h) >= 0) segnaIndice(h);
      }

      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { adattaTitolo(); adattaEmail(); controllaColonna(); });
      window.addEventListener("resize", function () {
        adattaTitolo();
        adattaEmail();
        controllaColonna();
      });

      $$(".testata__firma, .lato__firma").forEach(function (a) { a.addEventListener("click", function () { posizioneHome = 0; }); });
    } catch (err) {
      avviso("Qualcosa nei contenuti non torna", [
        String(err && err.message ? err.message : err),
        "Controlla l'ultima modifica fatta nel pannello e ricarica la pagina."
      ]);
      if (window.console) console.error(err);
    }
  }

  carica();
})();
