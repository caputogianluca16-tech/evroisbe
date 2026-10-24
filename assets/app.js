/* EVROISBE — costruisce le pagine leggendo i file in contenuti/
   (profilo.json, lavori.json, curriculum.json), che si modificano dal pannello in /admin.
   Non serve modificare questo file per aggiornare il sito. */
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

  /* ---------- avviso se i contenuti non si leggono ---------- */
  function avviso(titolo, righe) {
    var box = el("div", { class: "errore pagina", role: "alert" }, [
      el("div", { class: "errore__box" }, [el("strong", { text: titolo })].concat(
        righe.map(function (r) { return el("p", { text: r }); })
      ))
    ]);
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
       { file: "...", titolo: "...", anteprima: "...", formato: "16:9" }. */
    function videoLista(v) {
      var arr = Array.isArray(v) ? v : (v ? [v] : []);
      return arr.map(function (x) {
        if (!x) return null;
        if (typeof x === "string") return testo(x) ? { file: relativo(x), titolo: "", anteprima: "", formato: "" } : null;
        if (typeof x === "object") {
          var f = relativo(testo(x.file) || testo(x.link) || testo(x.src));
          return f ? { file: f, titolo: testo(x.titolo), anteprima: relativo(x.anteprima), formato: testo(x.formato) } : null;
        }
        return null;
      }).filter(Boolean);
    }

    /* Un file da scaricare: { file: "/scarica/...pdf", testo: "scarica ..." } */
    function scaricaDati(s) {
      if (!s) return null;
      if (typeof s === "string") return testo(s) ? { file: relativo(s), testo: "" } : null;
      var f = typeof s === "object" ? relativo(s.file) : "";
      return f ? { file: f, testo: testo(s.testo) } : null;
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
        titolo: testo(b.titolo),
        nota: testo(b.nota),
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
      var t = testo(v).toLowerCase().replace(/’/g, "'");
      if (FUOCHI[t]) return FUOCHI[t];
      return /^\d{1,3}% \d{1,3}%$/.test(t) ? t : "";
    }

    var progetti = (Array.isArray(D.progetti) ? D.progetti : []).filter(Boolean).filter(function (p) {
      return p.nascosto !== true && p.nascosto !== "true";
    }).map(function (p) {
      var categoria = testo(p.categoria);
      var immagini = lista(p.immagini).map(relativo);
      var libri = libriDati(p);
      return {
        titolo: testo(p.titolo) || "Senza titolo",
        anno: testo(p.anno),
        categoria: categoria,
        chiave: categoria.toLowerCase(),
        copertina: relativo(p.copertina) || immagini[0] || (libri[0] && (libri[0].copertina || libri[0].pagine[0])) || "",
        fuoco: fuocoCss(p.fuoco),
        anteprimaVideo: relativo(p.anteprima_video),
        anteprime: lista(p.anteprime).map(relativo),
        video: videoLista(p.video),
        immagini: immagini,
        testo: lista(p.testo),
        tecnica: testo(p.tecnica),
        luogo: testo(p.luogo),
        crediti: testo(p.crediti),
        scarica: scaricaDati(p.scarica),
        libri: libri
      };
    });

    progetti.forEach(function (p) {
      var s = slug(p.titolo);
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
          el("span", { text: "immagine non trovata" }),
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
      $$("[data-ruolo]").forEach(function (n) { n.textContent = testo(D.ruolo); });
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

    /* La firma grande riempie esattamente la larghezza della pagina. */
    function adattaFirma() {
      var h = $("#firma-grande");
      if (!h || !h.offsetParent) return;
      var span = h.firstElementChild;
      if (!span) {
        span = el("span", { text: h.textContent });
        h.textContent = "";
        h.appendChild(span);
      }
      h.style.fontSize = "100px";
      var w = span.getBoundingClientRect().width;
      var cw = h.clientWidth;
      if (w > 0 && cw > 0) h.style.fontSize = (100 * cw / w) * 0.997 + "px";
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

    /* ---------- portfolio ---------- */
    var filtro = "tutti";

    function disegnaFiltri() {
      var box = $("#filtri");
      box.textContent = "";
      var etichette = {}, ordine = [];
      lista(D.categorie).forEach(function (c) {
        var k = c.toLowerCase();
        if (!etichette[k]) { etichette[k] = c; ordine.push(k); }
      });
      var conta = {};
      progetti.forEach(function (p) {
        if (!p.chiave) return;
        conta[p.chiave] = (conta[p.chiave] || 0) + 1;
        if (!etichette[p.chiave]) { etichette[p.chiave] = p.categoria; ordine.push(p.chiave); }
      });
      var usate = ordine.filter(function (k) { return conta[k]; });
      if (usate.length < 2) { box.hidden = true; return; }
      box.hidden = false;
      [["tutti", "tutti", progetti.length]].concat(usate.map(function (k) { return [k, etichette[k], conta[k]]; }))
        .forEach(function (v) {
          var b = el("button", {
            class: "filtro", type: "button", "data-chiave": v[0],
            "aria-pressed": String(v[0] === filtro),
            onclick: function () { filtro = v[0]; applicaFiltro(); }
          }, [v[1], el("span", { class: "filtro__n", text: String(v[2]) })]);
          box.appendChild(b);
        });
    }

    function applicaFiltro() {
      $$(".filtro").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-chiave") === filtro)); });
      $$(".opera").forEach(function (a) {
        a.hidden = !(filtro === "tutti" || a.getAttribute("data-chiave") === filtro);
        if (a.hidden) ferma(a);
      });
      impagina();
    }

    function due(n) { return (n < 10 ? "0" : "") + n; }

    /* ---------- impaginazione della griglia ----------
       Sul computer: tre colonne; un lavoro largo (due colonne) con uno accanto,
       alternato a sinistra e a destra, poi una riga di tre lavori piccoli.
       Sul tablet: due colonne, un lavoro largo ogni tre. Sul telefono: una colonna. */
    var colonne = 0;
    function quanteColonne() {
      var w = $("#griglia").clientWidth || window.innerWidth;
      return w >= 980 ? 3 : w >= 600 ? 2 : 1;
    }
    function impagina() {
      var g = $("#griglia");
      var carte = $$(".opera", g).filter(function (a) { return !a.hidden; });
      var c = colonne = quanteColonne();
      g.classList.remove("griglia--1", "griglia--2", "griglia--3");
      g.classList.add("griglia--" + c);
      carte.forEach(function (a) {
        a.style.gridColumn = ""; a.style.gridRow = "";
        a.classList.remove("opera--f", "opera--f2", "opera--accanto", "opera--banda");
      });
      if (c === 1) return;
      function metti(a, col, span, riga, righe, classe) {
        a.style.gridColumn = col + " / span " + span;
        a.style.gridRow = riga + " / span " + righe;
        if (classe) a.classList.add(classe);
      }
      var i = 0, riga = 1, resto;
      if (c === 2) {
        while (i < carte.length) {
          resto = carte.length - i;
          if (i % 3 === 0 || resto === 1) { metti(carte[i], 1, 2, riga, 1, "opera--banda"); i += 1; }
          else { metti(carte[i], 1, 1, riga, 1); metti(carte[i + 1], 2, 1, riga, 1); i += 2; }
          riga++;
        }
        return;
      }
      /* righe alternate: un lavoro largo (16:9) con uno accanto, poi tre lavori piccoli */
      var grandi = 0, turnoGrande = true;
      while (i < carte.length) {
        resto = carte.length - i;
        var specchio = grandi % 2 === 1;
        if (resto === 1) { metti(carte[i], 1, 3, riga, 1, "opera--banda"); break; }
        if (turnoGrande || resto === 2) {
          metti(carte[i], specchio ? 2 : 1, 2, riga, 1, "opera--f2");
          metti(carte[i + 1], specchio ? 1 : 3, 1, riga, 1, "opera--accanto");
          i += 2; grandi++;
        } else {
          metti(carte[i], 1, 1, riga, 1); metti(carte[i + 1], 2, 1, riga, 1); metti(carte[i + 2], 3, 1, riga, 1);
          i += 3;
        }
        riga++;
        turnoGrande = !turnoGrande;
      }
    }

    /* ---------- anteprime che si muovono ----------
       Al passaggio del mouse (o, sul telefono, quando l'anteprima è in vista):
       i lavori con un'anteprima video la fanno partire, gli altri fanno
       scorrere le loro immagini come un pieghevole. */
    var conMouse = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var calma = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var risparmio = !!(navigator.connection && navigator.connection.saveData);

    function fotogrammi(p) {
      var f = [p.copertina];
      var fonte = (p.anteprime.length ? p.anteprime : p.immagini).slice();
      if (!fonte.length && p.libri.length) {
        var L = p.libri[0], n = L.pagine.length;
        [0.04, 0.2, 0.42, 0.66, 0.9].forEach(function (x) { fonte.push(L.pagine[Math.min(n - 1, Math.floor(n * x))]); });
      }
      fonte.forEach(function (s) { if (s && f.indexOf(s) < 0) f.push(s); });
      return f.slice(0, 7);
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
        var lastre = [el("img", { alt: "", decoding: "async" }), el("img", { alt: "", decoding: "async" })];
        lastre.forEach(function (im) { if (p.fuoco) im.style.objectPosition = p.fuoco; strato.appendChild(im); });
        var conta = el("span", { class: "opera__conta" });
        strato.appendChild(conta);
        box.appendChild(strato);
        s = a._scorre = { f: fotogrammi(p), i: 0, sopra: 0, lastre: lastre, conta: conta };
      }
      if (s.f.length < 2) return;
      /* si riparte sempre dalla copertina */
      s.i = 0;
      s.lastre[0].className = "fermo"; s.lastre[1].className = "";
      s.lastre[0].src = s.f[0]; s.sopra = 0;
      s.conta.textContent = due(1) + " / " + due(s.f.length);
      function prossimo() {
        if (!a._attiva) return;
        var j = (s.i + 1) % s.f.length;
        var nuova = s.lastre[1 - s.sopra], vecchia = s.lastre[s.sopra];
        var pronta = new Image();
        pronta.src = s.f[j];
        (pronta.decode ? pronta.decode() : Promise.resolve()).catch(function () {}).then(function () {
          if (!a._attiva) return;
          nuova.className = "";
          nuova.src = s.f[j];
          void nuova.offsetWidth;
          nuova.className = "entra";
          vecchia.className = "esce";
          a.classList.add("opera--in-moto");
          s.i = j; s.sopra = 1 - s.sopra;
          s.conta.textContent = due(j + 1) + " / " + due(s.f.length);
          a._timer = setTimeout(prossimo, 1350);
        });
      }
      clearTimeout(a._timer);
      a._timer = setTimeout(prossimo, 380);
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

    function disegnaGriglia() {
      var g = $("#griglia");
      g.textContent = "";
      if (!progetti.length) {
        g.appendChild(el("p", { class: "vuoto", text: "Ancora nessun lavoro. Aggiungine uno dal pannello, nella sezione Lavori." }));
        return;
      }
      progetti.forEach(function (p, i) {
        var img = p.copertina ? seManca(el("img", { src: p.copertina, alt: "", loading: i < 3 ? "eager" : "lazy", decoding: "async" })) : null;
        if (img && p.fuoco) img.style.objectPosition = p.fuoco;
        var a = el("a", { class: "opera", href: "#" + p.slug, "data-chiave": p.chiave }, [
          el("div", { class: "opera__img" }, [img]),
          el("div", { class: "opera__testo" }, [
            el("span", { class: "opera__num", text: due(i + 1) }),
            el("h3", { class: "opera__titolo", text: p.titolo }),
            el("span", { class: "opera__anno", text: p.anno }),
            p.categoria ? el("p", { class: "opera__cat", text: p.categoria }) : null
          ])
        ]);
        a._p = p;
        g.appendChild(a);
      });
      preparaAnimazioni();
      applicaFiltro();
    }

    /* ---------- about ---------- */
    function disegnaAbout() {
      var c = testo(D.citazione).replace(/^["“«]+|["”»]+$/g, "");
      var q = $("#citazione");
      q.textContent = c ? "“" + c + "”" : "";
      q.hidden = !c;
      var box = $("#about-testo");
      box.textContent = "";
      lista(D.about).forEach(function (t) { box.appendChild(el("p", { text: t })); });
      $("#about").hidden = !c && !lista(D.about).length;
    }

    /* ---------- curriculum ---------- */
    function disegnaCv() {
      var box = $("#cv");
      box.textContent = "";
      (Array.isArray(D.curriculum) ? D.curriculum : []).forEach(function (s) {
        if (!s) return;
        var voci = (Array.isArray(s.voci) ? s.voci : []).filter(function (v) { return v && testo(v.testo); });
        if (!voci.length) return;
        var conAnni = voci.some(function (v) { return testo(v.anni); });
        box.appendChild(el("details", { class: "cv__sezione" }, [
          el("summary", null, [el("span", { text: testo(s.sezione) }), el("span", { class: "cv__segno", "aria-hidden": "true" })]),
          el("ul", { class: "cv__voci" + (conAnni ? "" : " cv__voci--semplice") }, voci.map(function (v) {
            var righe = String(v.testo).split("\n").map(testo).filter(Boolean);
            return el("li", { class: "cv__voce" }, [
              el("span", { class: "cv__anni", text: testo(v.anni) }),
              el("span", { class: "cv__testo" }, righe.map(function (r, k) {
                return el("span", { class: k === 0 ? "cv__riga cv__riga--prima" : "cv__riga", text: r });
              }))
            ]);
          }))
        ]));
      });
      var link = $("#link-cv");
      if (testo(D.cv)) link.setAttribute("href", relativo(D.cv));
      else link.hidden = true;
    }

    /* ---------- contatti ---------- */
    function disegnaContatti() {
      var email = testo(D.email);
      var a = $("#email"), copia = $("#copia-email");
      if (email) {
        a.textContent = email;
        a.setAttribute("href", "mailto:" + email);
        copia.addEventListener("click", function () {
          function fatto() {
            copia.textContent = "copiato";
            setTimeout(function () { copia.textContent = "copia"; }, 1600);
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
      } else {
        $(".contatti__email").hidden = true;
      }

      var social = $("#social");
      social.textContent = "";
      [["instagram", "Instagram"], ["linkedin", "LinkedIn"]].forEach(function (s) {
        var url = testo(D[s[0]]);
        if (url) social.appendChild(el("li", null, [el("a", { href: url, target: "_blank", rel: "noopener", text: s[1] })]));
      });
      social.hidden = !social.children.length;

      $("#copyright").textContent = "© " + new Date().getFullYear() + " " + (NOME || FIRMA);
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
      if (voce.titolo) didascalia.push(el("span", { class: "video__titolo", text: voce.titolo }));

      if (v.tipo === "file") {
        var video = el("video", { controls: true, playsinline: true, preload: "metadata", poster: voce.anteprima || p.copertina || null });
        var fonte = el("source", { src: v.src, type: tipoMime(v.src) });
        video.appendChild(fonte);
        var play = el("button", { class: "video__play", type: "button", "aria-label": "Riproduci il video" + (voce.titolo ? ": " + voce.titolo : "") }, [el("span", { "aria-hidden": "true" })]);
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
          var manca = ["Video non trovato: " + v.src + ". Controlla il lavoro nel pannello."];
          if (!window.fetch) { mostra(manca); return; }
          fetch(v.src, { method: "HEAD" }).then(function (risp) {
            mostra(risp.ok ? ["Questo browser non riesce a riprodurre il video. ", el("a", { href: v.src, target: "_blank", rel: "noopener", text: "Apri il file" })] : manca);
          }, function () { mostra(manca); });
        });
        cornice.appendChild(video);
        cornice.appendChild(play);
      } else if (v.tipo === "incorporato") {
        cornice.appendChild(el("iframe", {
          src: v.src, title: "Video: " + (voce.titolo || p.titolo), loading: "lazy",
          allow: "autoplay; fullscreen; picture-in-picture; encrypted-media", allowfullscreen: true,
          referrerpolicy: "strict-origin-when-cross-origin"
        }));
        didascalia.push(el("a", { class: "video__link", href: voce.file, target: "_blank", rel: "noopener", text: "apri su " + v.fonte }));
      } else {
        cornice.className = "video__cornice video__cornice--vuota";
        cornice.appendChild(el("p", { class: "video__avviso", text: "Questo link video non è riconosciuto: «" + v.src + "». Usa il link di condivisione di Google Drive, un file .mp4, oppure un link YouTube o Vimeo." }));
      }
      if (didascalia.length) figura.appendChild(el("figcaption", { class: "video__nota" }, didascalia));
      return figura;
    }

    /* ---------- galleria e lightbox ---------- */
    var lb = { lista: [], i: 0, origine: null, titolo: "" };

    function galleria(p) {
      var box = el("div", { class: "lavoro__galleria" + (p.immagini.length === 1 ? " lavoro__galleria--una" : "") });
      p.immagini.forEach(function (src, i) {
        var img = seManca(el("img", { src: src, alt: p.titolo + ", immagine " + (i + 1), loading: i < 3 ? "eager" : "lazy", decoding: "async" }));
        var b = el("button", { class: "foto", type: "button", "aria-label": "Apri l'immagine " + (i + 1) + " di " + p.immagini.length }, [img]);
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
      img.alt = lb.titolo + ", immagine " + (lb.i + 1);
      $("#lightbox-conta").textContent = (lb.i + 1) + " / " + lb.lista.length;
      var piu = lb.lista.length > 1;
      $("#lightbox-prec").hidden = !piu;
      $("#lightbox-succ").hidden = !piu;
    }
    function apriLightbox(p, i, origine) {
      lb.lista = p.immagini; lb.i = i; lb.origine = origine; lb.titolo = p.titolo;
      mostraImmagine();
      $("#lightbox").hidden = false;
      document.documentElement.classList.add("blocca");
      $("#lightbox-chiudi").focus();
    }
    function chiudiLightbox() {
      if ($("#lightbox").hidden) return;
      $("#lightbox").hidden = true;
      document.documentElement.classList.remove("blocca");
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
        el("a", { class: "bottone", href: p.scarica.file, target: "_blank", rel: "noopener", text: p.scarica.testo || "scarica (pdf)" })
      ]);
    }

    /* ---------- libri da sfogliare ----------
       Ogni foglio gira attorno al dorso: davanti ha la pagina di destra,
       dietro quella di sinistra. Le pagine sono sfondi, non immagini da aprire
       o scaricare, e si caricano solo quando ci si avvicina. */
    function libro(L) {
      var conCopertina = !!L.copertina;
      /* numero pari = pagina di sinistra, se non è indicato il lato */
      var aSinistra = L.lato ? L.lato === "sinistra" : L.prima > 0 && L.prima % 2 === 0;

      /* le facce dei fogli in fila: fronte, retro, fronte, retro... (null = carta bianca) */
      var facce = [];
      if (conCopertina) {
        facce.push({ src: L.copertina, nome: "copertina", copertina: true });
        if (!aSinistra) facce.push(null);   /* l'interno della copertina */
      } else if (aSinistra) {
        facce.push(null);
      }
      L.pagine.forEach(function (src, j) {
        var num = L.prima ? L.prima + j : j + 1;
        facce.push({ src: src, nome: "pagina " + num, numero: num });
      });
      var ultima = L.prima ? L.prima + L.pagine.length - 1 : L.pagine.length;

      var nFogli = Math.ceil(facce.length / 2);
      var min = !conCopertina && aSinistra ? 1 : 0;
      var max = min;
      for (var k = min; k <= nFogli; k++) if (facce[2 * k - 1] || facce[2 * k]) max = k;
      var pos = min;

      var volume = el("div", { class: "libro__volume" }, [
        el("div", { class: "libro__base libro__base--sx" }),
        el("div", { class: "libro__base libro__base--dx" })
      ]);
      function faccia(f, lato) {
        var d = el("div", { class: "libro__faccia libro__faccia--" + lato + (f && f.copertina ? " libro__faccia--copertina" : "") });
        if (f) {
          d._src = new URL(f.src, document.baseURI).href;
          d.setAttribute("role", "img");
          d.setAttribute("aria-label", (L.titolo ? L.titolo + ", " : "") + f.nome);
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
      var prec = el("button", { class: "libro__freccia", type: "button", "aria-label": "Pagina precedente", text: "‹" });
      var succ = el("button", { class: "libro__freccia", type: "button", "aria-label": "Pagina successiva", text: "›" });
      var cursore = L.lungo && max > min ? el("input", { class: "libro__cursore", type: "range", min: String(min), max: String(max), step: "1", value: String(pos), "aria-label": "Vai alla pagina" }) : null;
      var scena = el("div", { class: "libro__scena", tabindex: "0", "aria-label": "Libro da sfogliare" + (L.titolo ? ": " + L.titolo : "") }, [volume]);

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
        var sx = facce[2 * pos - 1], dx = facce[2 * pos];
        /* sul telefono, se a sinistra non c'è niente, si vede solo la pagina di destra, più grande */
        box.classList.toggle("libro--sinistra-vuota", !sx);
        var numeri = [sx, dx].filter(function (f) { return f && f.numero; }).map(function (f) { return f.numero; });
        var su = L.lungo ? " di " + ultima : "";
        stato.textContent = conCopertina && pos === 0 ? "apri il libro"
          : numeri.length === 2 ? "pp. " + numeri[0] + "–" + numeri[1] + su
          : numeri.length === 1 ? "p. " + numeri[0] + su : "";
        prec.disabled = pos <= min;
        succ.disabled = pos >= max;
        if (cursore) cursore.value = String(pos);
      }
      function gira(d) {
        var nuovo = pos + d;
        if (nuovo < min || nuovo > max) return;
        var mosso = d > 0 ? pos : pos - 1;
        pos = nuovo;
        disponi(mosso);
      }
      /* salto di molte pagine (cursore): senza animazione */
      function salta(nuovo) {
        nuovo = Math.max(min, Math.min(max, nuovo));
        if (nuovo === pos) return;
        if (Math.abs(nuovo - pos) === 1) { gira(nuovo - pos); return; }
        box.classList.add("libro--salto");
        pos = nuovo;
        disponi();
        void volume.offsetWidth;
        requestAnimationFrame(function () { box.classList.remove("libro--salto"); });
      }
      fogli.forEach(function (f, i) {
        f.addEventListener("transitionend", function (e) {
          if (e.target !== f || e.propertyName !== "transform") return;
          clearTimeout(f._atterra);
          atterra(f, i);
        });
      });
      prec.addEventListener("click", function () { gira(-1); });
      succ.addEventListener("click", function () { gira(1); });
      if (cursore) cursore.addEventListener("input", function () { salta(parseInt(cursore.value, 10)); });
      volume.addEventListener("click", function (e) {
        var r = volume.getBoundingClientRect();
        var aDestra = e.clientX > r.left + r.width / 2;
        if (conCopertina && pos === 0) gira(1); else gira(aDestra ? 1 : -1);
      });
      scena.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight") { e.preventDefault(); gira(1); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); gira(-1); }
        else if (e.key === "Home") { e.preventDefault(); salta(min); }
        else if (e.key === "End") { e.preventDefault(); salta(max); }
      });

      /* le proporzioni della pagina le prendo dalla prima pagina */
      var misura = new Image();
      misura.onload = function () {
        if (!misura.naturalWidth || !misura.naturalHeight) return;
        var r = misura.naturalWidth / misura.naturalHeight;
        volume.style.setProperty("--pagina", String(r));
        volume.style.aspectRatio = String(2 * r);
      };
      misura.src = L.pagine[0];

      disponi();
      var nota = [L.titolo, L.nota].filter(Boolean);
      box.appendChild(scena);
      box.appendChild(el("figcaption", { class: "libro__nota" }, [
        el("span", { class: "libro__titolo", text: nota.join(" · ") }),
        max > min ? el("span", { class: "libro__comandi" }, [prec, stato, succ]) : stato,
        cursore
      ]));
      return el("section", { class: "lavoro__libro", "aria-label": "Libro da sfogliare" + (L.titolo ? ": " + L.titolo : "") }, [box]);
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
      var dati = [["anno", p.anno], ["categoria", p.categoria], ["tecnica", p.tecnica], ["luogo", p.luogo], ["crediti", p.crediti]]
        .filter(function (d) { return d[1]; });

      var colonna = [
        dati.length ? el("dl", { class: "lavoro__dati" }, dati.map(function (d) {
          return el("div", null, [el("dt", { text: d[0] }), el("dd", { text: d[1] })]);
        })) : null,
        p.testo.length ? el("div", { class: "lavoro__testo" }, p.testo.map(function (t) { return el("p", { text: t }); })) : null,
        pulsanteScarica(p)
      ].filter(Boolean);
      var materiali = [p.video.length ? el("div", { class: "lavoro__video" }, p.video.map(function (v) { return lettore(v, p); })) : null]
        .concat(p.libri.map(libro))
        .concat([p.immagini.length ? galleria(p) : null])
        .filter(Boolean);

      box.appendChild(el("article", { class: "lavoro pagina" }, [
        el("a", { class: "lavoro__indietro", href: "#portfolio", onclick: tornaAlPortfolio, text: "torna al portfolio" }),
        el("header", { class: "lavoro__testa" }, [
          el("p", { class: "lavoro__indice" }, [
            el("span", { text: "lavoro " + due(i + 1) + " di " + due(n) }),
            p.categoria ? el("span", { text: p.categoria }) : null
          ]),
          el("h1", { class: "lavoro__titolo", text: p.titolo })
        ]),
        el("div", { class: "lavoro__corpo" + (materiali.length ? "" : " lavoro__corpo--testo") }, [
          colonna.length ? el("div", { class: "lavoro__colonna" }, colonna) : null,
          materiali.length ? el("div", { class: "lavoro__materiali" }, materiali) : null
        ]),
        n > 1 ? el("nav", { class: "lavoro__altri", "aria-label": "Altri lavori" }, [
          el("a", { href: "#" + prec.slug, rel: "prev" }, [el("small", { text: "precedente" }), el("strong", { text: prec.titolo })]),
          el("a", { href: "#" + succ.slug, rel: "next" }, [el("small", { text: "successivo" }), el("strong", { text: succ.titolo })])
        ]) : null
      ]));
      document.title = p.titolo + " | " + FIRMA;
      requestAnimationFrame(controllaColonna);
    }

    /* ---------- navigazione tra home e lavori ---------- */
    var vista = "home", posizioneHome = 0;

    function vai(y) {
      try { window.scrollTo({ top: y, left: 0, behavior: "instant" }); }
      catch (e) { window.scrollTo(0, y); }
    }

    function percorso() {
      var h = location.hash.replace(/^#/, "");
      try { h = decodeURIComponent(h); } catch (e) { /* lascia com'è */ }
      var p = null;
      for (var i = 0; i < progetti.length; i++) if (progetti[i].slug === h) { p = progetti[i]; break; }

      if (p) {
        if (vista === "home") posizioneHome = window.scrollY;
        chiudiLightbox();
        $$(".opera").forEach(ferma);
        disegnaLavoro(p);
        $("#home").hidden = true;
        $("#curriculum").hidden = true;
        $("#lavoro").hidden = false;
        vista = "lavoro";
        adattaTitolo();
        vai(0);
        return;
      }

      var daLavoro = vista === "lavoro";
      $("#lavoro").hidden = true;
      $("#lavoro").textContent = "";
      $("#home").hidden = false;
      $("#curriculum").hidden = false;
      document.title = TITOLO_BASE;
      vista = "home";
      adattaFirma();
      if (quanteColonne() !== colonne) impagina();

      if (!daLavoro) return;
      var bersaglio = h && document.getElementById(h);
      if (ripristina && posizioneHome > 0) vai(posizioneHome);
      else if (bersaglio) bersaglio.scrollIntoView();
      else vai(posizioneHome);
      ripristina = false;
    }

    /* ---------- avvio ---------- */
    try {
      testiFissi();
      disegnaFiltri();
      disegnaGriglia();
      disegnaAbout();
      disegnaCv();
      disegnaContatti();
      preparaLightbox();
      adattaFirma();
      adattaEmail();
      window.addEventListener("hashchange", percorso);
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
      percorso();
      var h = location.hash.replace(/^#/, "");
      if (vista === "home" && h && document.getElementById(h)) document.getElementById(h).scrollIntoView();

      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { adattaFirma(); adattaTitolo(); adattaEmail(); controllaColonna(); });
      if ("ResizeObserver" in window) new ResizeObserver(adattaFirma).observe($(".apertura"));
      else window.addEventListener("resize", adattaFirma);
      window.addEventListener("resize", function () {
        adattaTitolo();
        adattaEmail();
        controllaColonna();
        if (quanteColonne() !== colonne) impagina();
      });

      $(".testata__firma").addEventListener("click", function () { posizioneHome = 0; });
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
