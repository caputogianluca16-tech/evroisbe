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

    var progetti = (Array.isArray(D.progetti) ? D.progetti : []).filter(Boolean).map(function (p) {
      var categoria = testo(p.categoria);
      var immagini = lista(p.immagini).map(relativo);
      return {
        titolo: testo(p.titolo) || "Senza titolo",
        anno: testo(p.anno),
        categoria: categoria,
        chiave: categoria.toLowerCase(),
        copertina: relativo(p.copertina) || immagini[0] || "",
        video: videoLista(p.video),
        immagini: immagini,
        testo: lista(p.testo),
        tecnica: testo(p.tecnica),
        luogo: testo(p.luogo),
        crediti: testo(p.crediti)
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

    /* Se i lavori visibili sono dispari, il primo occupa tutta la riga. */
    function applicaFiltro() {
      $$(".filtro").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-chiave") === filtro)); });
      var visibili = [];
      $$(".opera").forEach(function (a) {
        var mostra = filtro === "tutti" || a.getAttribute("data-chiave") === filtro;
        a.hidden = !mostra;
        a.classList.remove("opera--grande");
        if (mostra) visibili.push(a);
      });
      if (visibili.length > 1 && visibili.length % 2 === 1) visibili[0].classList.add("opera--grande");
    }

    function disegnaGriglia() {
      var g = $("#griglia");
      g.textContent = "";
      if (!progetti.length) {
        g.appendChild(el("p", { class: "vuoto", text: "Ancora nessun lavoro. Aggiungine uno dal pannello, nella sezione Lavori." }));
        return;
      }
      progetti.forEach(function (p, i) {
        var img = p.copertina ? seManca(el("img", { src: p.copertina, alt: "", loading: i < 2 ? "eager" : "lazy", decoding: "async" })) : null;
        g.appendChild(el("a", { class: "opera", href: "#" + p.slug, "data-chiave": p.chiave }, [
          el("div", { class: "opera__img" }, [img]),
          el("div", { class: "opera__testo" }, [
            el("h3", { class: "opera__titolo", text: p.titolo }),
            el("span", { class: "opera__anno", text: p.anno }),
            p.categoria ? el("p", { class: "opera__cat", text: p.categoria }) : null
          ])
        ]));
      });
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

    /* ---------- pagina del singolo lavoro ---------- */
    var ripristina = false;

    function tornaAlPortfolio(e) {
      e.preventDefault();
      ripristina = true;
      location.hash = "portfolio";
    }

    function disegnaLavoro(p) {
      var box = $("#lavoro");
      box.textContent = "";
      var n = progetti.length, i = progetti.indexOf(p);
      var prec = progetti[(i - 1 + n) % n], succ = progetti[(i + 1) % n];
      var dati = [["anno", p.anno], ["categoria", p.categoria], ["tecnica", p.tecnica], ["luogo", p.luogo], ["crediti", p.crediti]]
        .filter(function (d) { return d[1]; });

      box.appendChild(el("article", { class: "lavoro pagina" }, [
        el("a", { class: "lavoro__indietro", href: "#portfolio", onclick: tornaAlPortfolio, text: "torna al portfolio" }),
        el("header", { class: "lavoro__testa" }, [
          el("h1", { class: "lavoro__titolo", text: p.titolo }),
          dati.length ? el("dl", { class: "lavoro__dati" }, dati.map(function (d) {
            return el("div", null, [el("dt", { text: d[0] }), el("dd", { text: d[1] })]);
          })) : null
        ]),
        p.video.length ? el("div", { class: "lavoro__video" }, p.video.map(function (v) { return lettore(v, p); })) : null,
        p.testo.length ? el("div", { class: "lavoro__testo" }, [el("div", null, p.testo.map(function (t) { return el("p", { text: t }); }))]) : null,
        p.immagini.length ? galleria(p) : null,
        n > 1 ? el("nav", { class: "lavoro__altri", "aria-label": "Altri lavori" }, [
          el("a", { href: "#" + prec.slug, rel: "prev" }, [el("small", { text: "precedente" }), el("strong", { text: prec.titolo })]),
          el("a", { href: "#" + succ.slug, rel: "next" }, [el("small", { text: "successivo" }), el("strong", { text: succ.titolo })])
        ]) : null
      ]));
      document.title = p.titolo + " | " + FIRMA;
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
      window.addEventListener("hashchange", percorso);
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
      percorso();
      var h = location.hash.replace(/^#/, "");
      if (vista === "home" && h && document.getElementById(h)) document.getElementById(h).scrollIntoView();

      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { adattaFirma(); adattaTitolo(); });
      if ("ResizeObserver" in window) new ResizeObserver(adattaFirma).observe($(".apertura"));
      else window.addEventListener("resize", adattaFirma);
      window.addEventListener("resize", adattaTitolo);

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
