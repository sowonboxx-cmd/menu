// Page carte : MapLibre + tuiles OpenFreeMap (style flat), recherche, filtres, fiche résumée au clic.
(function () {
  var FILTERS = [
    { id: 'tous', label: 'Tous' },
    { id: 'ouvert', label: 'Ouvert maintenant' },
    { id: 'jamais', label: 'Jamais goûté' },
    { id: 'deja', label: 'Déjà fait' },
    { id: 'menu-du-jour', label: 'Plat du jour' },
    { id: 'bistronomie', label: 'Bistronomie' },
    { id: 'cuisine-familiale', label: 'Cuisine familiale' },
    { id: 'bar-a-huitres', label: 'Bar à huîtres' }
  ];
  var CAT_FILTERS = ['bistronomie', 'cuisine-familiale', 'bar-a-huitres'];
  var state = { filter: 'tous', q: '', selected: null, data: [], cats: {}, list: [] };
  var markers = [];
  var $ = function (id) { return document.getElementById(id); };

  var map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [2.3185, 48.8865],
    zoom: 14,
    maxZoom: 17.5,
    pitchWithRotate: false,
    dragRotate: false,
    attributionControl: false
  });
  map.touchZoomRotate.disableRotation();
  // Tablette et ordi (>= 640 px) : tout est dans une colonne à gauche, comme Plans/Google Maps sur iPad.
  var WIDE = window.innerWidth >= 640;
  var attrib = new maplibregl.AttributionControl({ compact: true });
  map.addControl(attrib, WIDE ? 'bottom-right' : 'bottom-left');
  if (window.innerWidth >= 900) map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
  var geo = new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, showAccuracyCircle: false });
  map.addControl(geo, 'top-right'); // bouton caché, déclenché par notre bouton rond

  // Carte « flat » : pas de bâtiments, pas de 3D, pas d'icônes de lieux, de transports ni de panneaux.
  map.on('style.load', function () {
    var paint = function (id, prop, val) { try { map.setPaintProperty(id, prop, val); } catch (e) {} };
    map.getStyle().layers.forEach(function (l) {
      var id = l.id;
      if (l.type === 'fill-extrusion' || /building|poi|transit|aerialway|airport|aeroway|ferry|shield|path|pedestrian|track|service|rail|cycle|steps|oneway|hatching|housenum/.test(id)) {
        map.setLayoutProperty(id, 'visibility', 'none');
        return;
      }
      if (l.type === 'background') paint(id, 'background-color', '#F3F2EC');
      if (/water/.test(id) && l.type === 'fill') paint(id, 'fill-color', '#7CC6F7');
      if (/waterway/.test(id) && l.type === 'line') paint(id, 'line-color', '#7CC6F7');
      if (/park|grass|wood|forest|landcover|cemetery|pitch/.test(id) && l.type === 'fill') { paint(id, 'fill-color', '#B5E3A0'); paint(id, 'fill-opacity', 1); paint(id, 'fill-outline-color', 'rgba(0,0,0,0)'); }
      if (/landuse/.test(id) && l.type === 'fill' && !/park|grass|wood|cemetery|pitch/.test(id)) map.setLayoutProperty(id, 'visibility', 'none');
    });
  });
  map.on('load', function () {
    var a = document.querySelector('.maplibregl-ctrl-attrib');
    if (a) a.classList.remove('maplibregl-compact-show');
  });

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function hasPdj(r) { return r.platDuJour && Beltab.isToday(r.platDuJour.date); }
  function catLabel(r) { return (r.categories || []).map(function (c) { return state.cats[c] || c; }).join(', '); }

  // Le jeu : restaurants déjà faits (journal gardé sur l'appareil).
  var jeu = window.Jeu ? Jeu.stats(null, null) : { slugs: {} };
  function done(r) { return !!jeu.slugs[r.slug]; }
  function matches(r) {
    var f = state.filter;
    if (f === 'jamais' && done(r)) return false;
    if (f === 'deja' && !done(r)) return false;
    if (f === 'ouvert' && !Beltab.status(r.horaires).open) return false;
    if (f === 'menu-du-jour' && !hasPdj(r)) return false;
    if (CAT_FILTERS.indexOf(f) >= 0 && (r.categories || []).indexOf(f) < 0) return false;
    return true;
  }
  function searchHits() {
    var q = state.q.toLowerCase();
    if (!q) return [];
    return state.list.filter(function (r) {
      return (r.nom + ' ' + r.accroche + ' ' + r.arrondissement + ' ' + catLabel(r)).toLowerCase().indexOf(q) >= 0;
    }).slice(0, 6);
  }

  // ---------- filtres ----------
  function renderFilters() {
    var box = $('filters');
    box.innerHTML = FILTERS.map(function (f) {
      return '<button type="button" class="filter' + (f.id === state.filter ? ' is-on' : '') + '" data-f="' + f.id + '" aria-pressed="' + (f.id === state.filter) + '">' + esc(f.label) + '</button>';
    }).join('');
    box.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        state.filter = b.getAttribute('data-f');
        state.selected = null;
        toggle('filters', false);
        render();
        fitAll();
      });
    });
    var badge = $('filter-badge');
    badge.hidden = state.filter === 'tous';
    $('filter-btn').classList.toggle('is-on', state.filter !== 'tous');
  }

  function toggle(which, force) {
    var panel = $(which), btn = $(which === 'menu' ? 'menu-btn' : 'filter-btn');
    var open = force == null ? panel.hidden : force;
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) { var other = which === 'menu' ? 'filters' : 'menu'; $(other).hidden = true; $(other === 'menu' ? 'menu-btn' : 'filter-btn').setAttribute('aria-expanded', 'false'); }
  }

  // ---------- recherche ----------
  function renderResults() {
    var ul = $('results');
    var hits = searchHits();
    if (!state.q) { ul.hidden = true; ul.innerHTML = ''; return; }
    ul.hidden = false;
    ul.innerHTML = hits.length ? hits.map(function (r) {
      return '<li><button type="button" data-s="' + esc(r.slug) + '"><strong>' + esc(r.nom) + '</strong><span class="muted">' + esc(catLabel(r)) + ' · ' + esc(r.arrondissement) + '</span></button></li>';
    }).join('') : '<li class="results-empty">Aucun restaurant trouvé</li>';
    ul.querySelectorAll('[data-s]').forEach(function (b) {
      b.addEventListener('click', function () {
        $('q').value = ''; state.q = ''; renderResults();
        $('q').blur();
        select(b.getAttribute('data-s'));
      });
    });
  }

  // ---------- fiche résumée ----------
  var ICON = {
    cal: '<svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/></svg>',
    menu: '<svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h4"/></svg>',
    route: '<svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-8-8 18-2-8-8-2z"/></svg>',
    ext: '<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg>',
    badge: '<svg role="img" aria-label="Indépendant vérifié" width="18" height="18" viewBox="0 0 24 24"><title>Indépendant vérifié</title><polygon points="12.00,1.00 14.48,2.73 17.50,2.47 18.79,5.21 21.53,6.50 21.27,9.52 23.00,12.00 21.27,14.48 21.53,17.50 18.79,18.79 17.50,21.53 14.48,21.27 12.00,23.00 9.52,21.27 6.50,21.53 5.21,18.79 2.47,17.50 2.73,14.48 1.00,12.00 2.73,9.52 2.47,6.50 5.21,5.21 6.50,2.47 9.52,2.73" fill="#1F6B45" stroke="#1F6B45" stroke-width="1.6" stroke-linejoin="round"/><path d="M7.6 12.3l3 3 5.8-6.4" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  // ---------- colonne de gauche (ordinateur, comme Google Maps) ----------
  var DESK = window.matchMedia('(min-width: 640px)'); // tablette et ordinateur : la fiche dans la colonne de gauche
  var JOURS_ORD = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  var IC = function (d, w) { return '<svg aria-hidden="true" width="' + (w || 19) + '" height="' + (w || 19) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>'; };
  var P = {
    cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', menu: 'M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h4', route: 'M3 11l18-8-8 18-2-8-8-2z',
    phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z',
    share: 'M12 3v12M7 8l5-5 5 5M5 13v8h14v-8', globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9',
    check: 'M5 12.5l4.5 4.5L19 7.5', plus: 'M12 5v14M5 12h14', close: 'M6 6l12 12M18 6L6 18'
  };
  function hh(t) { return t.replace(/^0(\d)/, '$1').replace(':00', 'h').replace(':', 'h'); }
  // Largeur de la colonne : un tiers de l'écran par défaut, réglable à la souris jusqu'à la moitié (comme Google Maps).
  var PW_KEY = 'beltab.colonne';
  function panelW() {
    var f = 1 / 3;
    try { var v = parseFloat(localStorage.getItem(PW_KEY)); if (v > 0.2 && v <= 0.5) f = v; } catch (e) {}
    return Math.round(Math.min(window.innerWidth * 0.5, Math.max(380, window.innerWidth * f)));
  }
  function applyW(w) {
    var sheet = $('sheet'), top = document.querySelector('.map-top');
    sheet.style.width = w + 'px';
    if (top) top.style.width = w + 'px';
    document.documentElement.style.setProperty('--pw', w + 'px');
  }

  function deskPanel(r) {
    var st = Beltab.status(r.horaires);
    var ph = r.photos && r.photos.length ? r.photos : (r.photo ? [r.photo] : []);
    var z = function (src, alt) { return '<img src="' + esc(src) + '" alt="' + esc(alt || r.nom) + '" data-zoom>'; };
    var gal = '';
    if (ph.length >= 3) gal = '<div class="dp-gal" data-zoom-group>' + z(ph[0]) + z(ph[1]) + '<span class="dp-more">' + z(ph[2]) + (ph.length > 3 ? '<b>+ ' + (ph.length - 3) + ' photos</b>' : '') + '</span>' +
      ph.slice(3).map(function (x) { return '<img src="' + esc(x) + '" alt="' + esc(r.nom) + '" data-zoom hidden>'; }).join('') + '</div>';
    else if (ph.length) gal = '<div class="dp-hero" data-zoom-group>' + ph.map(function (x, i) { return '<img src="' + esc(x) + '" alt="' + esc(r.nom) + '" data-zoom' + (i ? ' hidden' : '') + '>'; }).join('') + '</div>';
    var beltabResa = r.reservation && r.reservation.type === 'beltab';
    var btn = function (icon, label, attrs, dark) { return '<a class="dp-act' + (dark ? ' is-dark' : '') + '" ' + attrs + '>' + IC(P[icon], 17) + label + '</a>'; };
    var acts = (beltabResa ? btn('cal', 'Réserver', 'href="#dp-resa" data-jump', true) : (r.site ? btn('globe', 'Site web', 'href="' + esc(r.site) + '" target="_blank" rel="noopener nofollow"') : '')) +
      btn('route', 'Itinéraire', 'href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(r.nom + ' ' + (r.adresse || '')) + '" target="_blank" rel="noopener nofollow"') +
      btn('share', 'Partager', 'href="#" id="dp-share"') +
      btn('plus', 'J’ai mangé ici', 'href="' + esc(r.url) + '#mange"');

    // sommaire, comme sur une page de site
    var toc = [];
    var n = jeu.slugs[r.slug] || 0;
    var band = n ? '<div class="dp-jeu"><b class="dp-done">' + IC(P.check, 15) + 'Déjà fait ' + (n > 1 ? n + ' fois' : '') + '</b><a href="/moi/#journal">Mon journal ›</a></div>' : '';
    var phares = '';
    if ((r.phares || []).length) {
      toc.push(['dp-phares', 'Plats phares']);
      phares = '<section class="dp-sec" id="dp-phares"><h3>Les plats phares</h3><div class="dp-phares" data-zoom-group>' + r.phares.map(function (p) {
        return '<div>' + (p.photo ? z(p.photo, p.nom) : '<span></span>') + '<strong>' + esc(p.nom) + '</strong><small>' + esc(p.prix) + '</small></div>';
      }).join('') + '</div></section>';
    }
    var maj = r.miseAJour ? new Date(r.miseAJour).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '';
    var secs = r.paid && r.carte && r.carte.length ? r.carte : (r.apercu || []);
    toc.push(['dp-carte', 'La carte']);
    var seen = {};
    var chips = secs.length > 2 ? '<div class="dp-chips">' + secs.map(function (x, i) { var l = x.section.split(' · ')[0]; if (seen[l]) return ''; seen[l] = 1; return '<a href="#dp-s' + i + '" data-jump>' + esc(l) + '</a>'; }).join('') + '</div>' : '';
    var carte = '<section class="dp-sec dp-menu" id="dp-carte"><div class="dp-menu-head"><h3>' + (r.paid ? 'La carte' : 'Aperçu de la carte') + '</h3>' + (maj ? '<small>Mise à jour le ' + esc(maj) + '</small>' : '') + '</div>' + chips +
      secs.map(function (x, i) {
        return '<div class="dp-cat" id="dp-s' + i + '"><span>' + esc(x.section) + '</span>' + (x.prix ? '<b>' + esc(x.prix) + '</b>' : '') + '</div>' + x.plats.map(function (p) {
          return '<div class="dp-row"><div><strong>' + esc(p.nom) + '</strong>' + (p.desc ? '<small>' + esc(p.desc) + '</small>' : '') + '</div><b>' + esc(p.prix) + '</b></div>';
        }).join('');
      }).join('') +
      (!r.paid ? '<p class="dp-note">La carte complète, les prix à jour et les formules sont chez le restaurant.</p>' : '') +
      (r.paid && r.site ? '<a class="dp-link" href="' + esc(r.site) + '" target="_blank" rel="noopener">Le site du restaurant ›</a>' : '') + '</section>';
    var resa = '';
    if (beltabResa) {
      toc.push(['dp-resa', 'Réserver']);
      var url = r.reservation.url + (r.reservation.url.indexOf('?') >= 0 ? '&' : '?') + 'beltab=1';
      resa = '<section class="dp-sec dp-resa" id="dp-resa"><h3>Réserver une table <small>sans quitter la carte</small></h3><iframe class="dp-frame" src="' + esc(url) + '" title="Réserver chez ' + esc(r.nom) + '" loading="lazy"></iframe></section>';
    }
    toc.push(['dp-horaires', 'Horaires']);
    var today = JOURS_ORD[(new Date().getDay() + 6) % 7];
    var hor = '<section class="dp-sec" id="dp-horaires"><h3>Horaires et adresse</h3>' + JOURS_ORD.map(function (j) {
      var sl = (r.horaires && r.horaires[j]) || [];
      return '<div class="dp-h' + (j === today ? ' is-today' : '') + '"><span>' + j[0].toUpperCase() + j.slice(1) + '</span><span>' + (sl.length ? sl.map(function (x) { return hh(x[0]) + ' – ' + hh(x[1]); }).join(' · ') : 'Fermé') + '</span></div>';
    }).join('') + (r.adresse ? '<p class="dp-addr">' + esc(r.adresse) + '</p>' : '') + '</section>';
    var near = '';
    if (!r.paid) {
      var d = function (a) { return Math.hypot(a.lat - r.lat, (a.lng - r.lng) * Math.cos(r.lat * Math.PI / 180)); };
      var ns = state.data.filter(function (o) { return o.slug !== r.slug; }).sort(function (a, b) { return d(a) - d(b); }).slice(0, 2);
      if (ns.length) near = '<section class="dp-sec"><h3>Autres indépendants à côté</h3><div class="dp-near">' + ns.map(function (o) { return '<button type="button" data-go="' + o.slug + '"><strong>' + esc(o.nom) + '</strong><small>' + esc(catLabel(o)) + ' · ' + Math.max(1, Math.round(d(o) * 111000 / 80)) + ' min à pied</small></button>'; }).join('') + '</div></section>';
    }
    if (ph.length) toc.push(['photos', 'Photos']);
    var tocHtml = '<nav class="dp-toc" aria-label="Sommaire">' + toc.map(function (t) { return t[0] === 'photos' ? '<a href="#" id="dp-photos">' + t[1] + '</a>' : '<a href="#' + t[0] + '" data-jump>' + t[1] + '</a>'; }).join('') + '</nav>';

    return '<div class="dp-tools"><button type="button" class="dp-tool" id="sheet-close" aria-label="Fermer">' + IC(P.close, 16) + '</button></div>' + gal +
      '<div class="dp-head"><div class="dp-id">' + (r.logo ? '<img class="rs-logo" src="' + esc(r.logo) + '" alt="">' : '') + '<div><span class="rs-name"><span class="rs-name-txt">' + esc(r.nom) + '</span>' + ICON.badge + '</span>' +
      '<span class="rs-meta">' + esc(catLabel(r)) + ' · ' + esc(r.prix) + ' · ' + esc(r.arrondissement) + '</span></div></div>' +
      '<span class="st ' + (st.open ? 'st-open' : 'st-closed') + '"><strong>' + esc(st.label.split(' · ')[0]) + '</strong>' + (st.label.split(' · ')[1] ? ' · ' + esc(st.label.split(' · ')[1]) : '') + '</span>' +
      (r.accroche ? '<p class="dp-acc">' + esc(r.accroche) + '</p>' : '') + '<div class="dp-acts">' + acts + '</div>' + band + '</div>' + tocHtml +
      phares + carte + resa + hor + near + '<div class="dp-resize" id="dp-resize" title="Glisser pour élargir" aria-hidden="true"></div>';
  }
  function wireDesk(r) {
    var sheet = $('sheet');
    $('sheet-close').addEventListener('click', function () { state.selected = null; render(); });
    $('dp-share').addEventListener('click', function (e) { e.preventDefault(); if (window.Partage) Partage.link({ url: location.origin + r.url, title: r.nom + ' · Beltab' }); });
    var pb = $('dp-photos'); if (pb) pb.addEventListener('click', function (e) { e.preventDefault(); var i = sheet.querySelector('.dp-gal img, .dp-hero img'); if (i && window.Lightbox) Lightbox.open(i); });
    sheet.querySelectorAll('[data-jump]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var el = sheet.querySelector(a.getAttribute('href'));
        var toc = sheet.querySelector('.dp-toc');
        if (el) sheet.scrollTo({ top: el.offsetTop - (toc ? toc.offsetHeight : 0) - 6, behavior: 'smooth' });
      });
    });
    sheet.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function () { select(b.getAttribute('data-go')); }); });
    // poignée sur le bord droit : on tire pour élargir (jusqu'à la moitié de l'écran)
    var h = $('dp-resize');
    h.addEventListener('pointerdown', function (e) {
      e.preventDefault(); h.setPointerCapture(e.pointerId); document.body.classList.add('is-resizing');
      var move = function (ev) { applyW(Math.min(window.innerWidth * 0.5, Math.max(380, ev.clientX))); };
      var up = function () {
        h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); document.body.classList.remove('is-resizing');
        try { localStorage.setItem(PW_KEY, String(sheet.offsetWidth / window.innerWidth)); } catch (x) {}
        map.resize();
      };
      h.addEventListener('pointermove', move); h.addEventListener('pointerup', up);
    });
  }

  function renderSheet() {
    var sheet = $('sheet');
    var r = state.selected && state.data.filter(function (x) { return x.slug === state.selected; })[0];
    document.body.classList.toggle('side-open', !!(r && DESK.matches));
    if (!r) { sheet.hidden = true; sheet.innerHTML = ''; sheet.classList.remove('is-side'); sheet.style.width = ''; var mt0 = document.querySelector('.map-top'); if (mt0) mt0.style.width = ''; return; }
    if (DESK.matches) {
      sheet.classList.add('is-side');
      sheet.style.top = (document.querySelector('.map-top').offsetHeight) + 'px';
      applyW(panelW());
      sheet.innerHTML = deskPanel(r);
      sheet.hidden = false;
      sheet.scrollTop = 0;
      wireDesk(r);
      return;
    }
    sheet.classList.remove('is-side');
    sheet.style.top = ''; sheet.style.width = ''; var mt = document.querySelector('.map-top'); if (mt) mt.style.width = '';
    var st = Beltab.status(r.horaires);
    var parts = st.label.split(' \u00b7 ');
    var status = '<span class="st ' + (st.open ? 'st-open' : 'st-closed') + '"><strong>' + esc(parts[0]) + '</strong>' + (parts[1] ? ' \u00b7 ' + esc(parts[1]) : '') + '</span>';
    var pdj = hasPdj(r) ? '<div class="sheet-pdj"><span class="eyebrow">Plat du jour</span><span>' + esc(r.platDuJour.nom) + (r.platDuJour.prix ? ' \u00b7 ' + esc(r.platDuJour.prix) + ' \u20ac' : '') + '</span></div>' : '';
    var resa = '';
    if (r.reservation && r.reservation.type === 'beltab') resa = '<button type="button" class="act act-dark" id="act-book">' + ICON.cal + 'Réserver</button>';
    else if (r.site) resa = '<a class="act" href="' + esc(r.site) + '" target="_blank" rel="noopener nofollow">Site web' + ICON.ext + '</a>';
    var acts = [resa,
      '<a class="act" href="' + esc(r.url) + '#carte">' + ICON.menu + 'Menu</a>',
      '<a class="act" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(r.lat + ',' + r.lng) + '" target="_blank" rel="noopener nofollow">' + ICON.route + 'Itinéraire</a>'].filter(Boolean);
    sheet.innerHTML =
      '<div class="rs-top">' +
      (r.logo ? '<img class="rs-logo" src="' + esc(r.logo) + '" alt="" onerror="this.remove()">' : '') +
      '<a class="rs-info" href="' + esc(r.url) + '">' +
      '<span class="rs-name"><span class="rs-name-txt">' + esc(r.nom) + '</span>' + ICON.badge + '</span>' +
      '<span class="rs-meta">' + esc(catLabel(r)) + ' \u00b7 <span class="nowrap">' + esc(r.prix) + '</span> \u00b7 ' + esc(r.arrondissement) + '</span>' +
      status + (done(r) ? '<span class="rs-done"><svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>Déjà fait · ' + jeu.slugs[r.slug] + ' fois</span>' : '') + '</a>' +
      '<button type="button" class="sheet-close" id="sheet-close" aria-label="Fermer"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '</div>' + pdj +
      '<div class="rs-acts" style="grid-template-columns:repeat(' + acts.length + ',minmax(0,1fr))">' + acts.join('') + '</div>';
    sheet.hidden = false;
    $('sheet-close').addEventListener('click', function () { state.selected = null; render(); });
    var bk = $('act-book');
    if (bk) bk.addEventListener('click', function () { openBooking(r); });
  }

  // ---------- réservation Beltab en widget, sans quitter la carte ----------
  function openBooking(r) {
    $('booking-title').textContent = 'Réserver chez ' + r.nom;
    $('booking-frame').src = r.reservation.url;
    $('booking').hidden = false;
    document.body.classList.add('no-scroll');
  }
  function closeBooking() {
    $('booking').hidden = true;
    $('booking-frame').src = 'about:blank';
    document.body.classList.remove('no-scroll');
  }

  function select(slug) {
    state.selected = slug;
    var r = state.data.filter(function (x) { return x.slug === slug; })[0];
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
    if (r) map.easeTo({ center: [r.lng, r.lat], zoom: Math.max(map.getZoom(), 15), offset: DESK.matches ? [Math.round(panelW() / 2), 0] : [0, -90] });
    render();
  }

  // ---------- marqueurs ----------
  var PIN = '<svg aria-hidden="true" width="34" height="44" viewBox="0 0 34 44"><path d="M17 1C8.2 1 1 8 1 16.7 1 28.4 17 43 17 43s16-14.6 16-26.3C33 8 25.8 1 17 1z" fill="#1F6B45" stroke="#fff" stroke-width="2.5"/><circle cx="17" cy="16.5" r="6" fill="#fff"/></svg>';
  function render() {
    renderFilters();
    markers.forEach(function (m) { m.remove(); });
    markers = [];
    state.list = state.data.filter(matches);
    state.list.forEach(function (r) {
      var on = r.slug === state.selected;
      // MapLibre place le conteneur avec transform : l'animation se fait sur l'élément intérieur.
      var wrap = document.createElement('div');
      var el = document.createElement('button');
      el.type = 'button';
      el.setAttribute('aria-label', r.nom);
      el.title = r.nom;
      if (on) {
        el.className = 'pin-on';
        el.innerHTML = PIN;
      } else {
        el.className = 'dot' + (r.paid ? ' is-paid' : '') + (done(r) ? ' is-done' : '');
        if (done(r)) el.innerHTML = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
      }
      el.addEventListener('click', function (e) { e.stopPropagation(); select(r.slug); });
      wrap.appendChild(el);
      markers.push(new maplibregl.Marker({ element: wrap, anchor: on ? 'bottom' : 'center' }).setLngLat([r.lng, r.lat]).addTo(map));
    });
    renderSheet();
    renderResults();
    updateOutside();
  }

  function updateOutside() {
    var pill = $('outside');
    var list = state.list;
    if (!list.length || state.selected) { pill.hidden = true; return; }
    var b = map.getBounds();
    var out = list.filter(function (r) { return !b.contains([r.lng, r.lat]); }).length;
    pill.hidden = out === 0;
    pill.textContent = out + ' hors du cadre · Tout voir';
  }

  function fitAll() {
    if (!state.list.length) return;
    var bounds = new maplibregl.LngLatBounds();
    state.list.forEach(function (r) { bounds.extend([r.lng, r.lat]); });
    map.fitBounds(bounds, { padding: WIDE ? { top: 60, bottom: 60, left: (DESK.matches && state.selected ? panelW() : 440) + 40, right: 60 } : { top: 190, bottom: 60, left: 50, right: 50 }, maxZoom: 14 });
  }

  // ---------- événements ----------
  map.on('moveend', updateOutside);
  map.on('click', function () {
    toggle('menu', false); toggle('filters', false);
    if (state.selected) { state.selected = null; render(); }
  });
  $('outside').addEventListener('click', fitAll);
  $('booking-close').addEventListener('click', closeBooking);
  $('booking').addEventListener('click', function (e) { if (e.target === $('booking')) closeBooking(); });
  $('menu-btn').addEventListener('click', function () { toggle('menu'); });
  $('filter-btn').addEventListener('click', function () { toggle('filters'); });
  $('locate-btn').addEventListener('click', function () { geo.trigger(); });
  $('q').addEventListener('input', function (e) { state.q = e.target.value.trim(); renderResults(); });
  $('q').addEventListener('focus', function () { toggle('menu', false); toggle('filters', false); });

  fetch('/restaurants.json').then(function (r) { return r.json(); }).then(function (d) {
    state.data = d.restaurants;
    var chip = $('progress-chip');
    var n = d.restaurants.filter(done).length;
    chip.innerHTML = '<span class="pc-bar"><span style="width:' + Math.round(n / Math.max(1, d.restaurants.length) * 100) + '%"></span></span>' +
      (n ? 'Vous avez découvert ' + Math.round(n / d.restaurants.length * 100) + ' % de la carte' : 'Votre tour du monde commence ici') + ' ›';
    chip.hidden = false;
    state.cats = d.categories || {};
    render();
    fitAll();
  });
})();
