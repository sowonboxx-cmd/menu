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

  // ---------- la fiche complète (colonne sur ordinateur, plein écran sur téléphone) : tout en cartes ----------
  var LKEY = 'beltab.listes.v1', AKEY = 'beltab.avis.v1';
  function lread(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function lsave(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var PRIO = { haute: 'Le plus vite possible', moyenne: 'Bientôt', basse: 'Un jour' };
  P.back = 'M15 6l-6 6 6 6'; P.heart = 'M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5c-2.2 4.6-9.2 9-9.2 9z';
  P.flag = 'M5 21V4M5 4h11l-2 4 2 4H5'; P.down = 'M6 9l6 6 6-6'; P.chev = 'M9 6l6 6-6 6'; P.edit = 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4';
  P.copy = 'M8 8h12v12H8zM4 16V4h12'; P.ext = 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6'; P.lock = 'M6 11h12v10H6zM9 11V8a3 3 0 0 1 6 0v3';
  P.star = 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z';
  function stars(n, s) {
    var o = ''; for (var i = 1; i <= 5; i++) o += '<svg aria-hidden="true" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="' + (i <= n ? '#E8A317' : 'none') + '" stroke="' + (i <= n ? '#E8A317' : '#CFCDC5') + '" stroke-width="1.8" stroke-linejoin="round"><path d="' + P.star + '"/></svg>';
    return '<span class="fx-stars" role="img" aria-label="' + n + ' sur 5">' + o + '</span>';
  }
  function hoursOf(r, j) { var sl = (r.horaires && r.horaires[j]) || []; return sl.length ? sl.map(function (x) { return hh(x[0]) + ' – ' + hh(x[1]); }).join(' · ') : 'Fermé'; }

  function deskPanel(r) {
    var st = Beltab.status(r.horaires), parts = st.label.split(' · ');
    var ph = r.photos && r.photos.length ? r.photos : (r.photo ? [r.photo] : []);
    var img = function (src, cls) { return '<img class="' + cls + '" src="' + esc(src) + '" alt="' + esc(r.nom) + '" data-zoom loading="lazy">'; };
    // photos façon Google : une grande, deux petites l'une sur l'autre, une grande…
    var gal = '';
    if (ph.length === 1) gal = '<div class="fx-gal is-one" data-zoom-group>' + img(ph[0], 'fx-big') + '</div>';
    else if (ph.length) {
      var t = '', i = 0, big = true;
      while (i < ph.length) {
        if (big || i === ph.length - 1) { t += img(ph[i], 'fx-big'); i++; }
        else { t += '<span class="fx-pair">' + img(ph[i], 'fx-sm') + img(ph[i + 1], 'fx-sm') + '</span>'; i += 2; }
        big = !big;
      }
      gal = '<div class="fx-gal" data-zoom-group>' + t + '</div>';
    }
    var beltabResa = r.reservation && r.reservation.type === 'beltab';
    var lists = lread(LKEY, { fav: {}, todo: {} });
    var fav = !!lists.fav[r.slug], todo = lists.todo[r.slug];
    var route = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(r.nom + ' ' + (r.adresse || ''));
    var top = '<div class="fx-top"><button type="button" class="fx-back" id="sheet-close" aria-label="Retour à la carte">' + IC(P.back, 20) + '<span>Beltab</span></button>' +
      '<div><button type="button" class="fx-ib" id="fx-share" aria-label="Partager">' + IC(P.share, 17) + '</button>' +
      '<button type="button" class="fx-ib" id="fx-close" aria-label="Fermer">' + IC(P.close, 17) + '</button></div></div>';
    var desc = r.description || r.accroche || '';
    var tags = (r.tags || []).slice(0, 3);
    var ident = '<section class="fx-card fx-ident">' +
      '<div class="fx-idrow">' + (r.logo ? '<img class="rs-logo" src="' + esc(r.logo) + '" alt="">' : '') + '<div><span class="rs-name"><span class="rs-name-txt">' + esc(r.nom) + '</span>' + ICON.badge + '</span>' +
      '<span class="rs-meta">' + esc([catLabel(r), r.arrondissement].filter(Boolean).join(' · ')) + '</span></div></div>' +
      '<div class="fx-strow"><a class="fx-st ' + (st.open ? 'is-open' : 'is-closed') + '" href="#fx-horaires" data-jump><i></i><strong>' + esc(parts[0]) + '</strong>' + (parts[1] ? '<span>· ' + esc(parts[1]) + '</span>' : '') + IC(P.down, 13) + '</a>' +
      '<a class="fx-ib" href="' + route + '" target="_blank" rel="noopener nofollow" aria-label="Itinéraire">' + IC(P.route, 17) + '</a>' +
      '<button type="button" class="fx-ib fx-fav' + (fav ? ' is-on' : '') + '" id="fx-fav" aria-pressed="' + fav + '" aria-label="Favori">' + IC(P.heart, 17) + '</button></div>' +
      (tags.length ? '<div class="fx-tags">' + tags.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>' : '') +
      (desc ? '<button type="button" class="fx-desc" id="fx-desc"><p>' + esc(desc) + '</p>' + (desc.length > 90 ? '<span>Lire la suite' + IC(P.chev, 14) + '</span>' : '') + '</button>' : '') +
      '<div class="fx-acts">' + (beltabResa ? '<a class="fx-btn is-dark" href="#fx-resa" data-jump>' + IC(P.cal, 16) + 'Réserver</a>' : (r.site ? '<a class="fx-btn is-dark" href="' + esc(r.site) + '" target="_blank" rel="noopener nofollow">' + IC(P.globe, 16) + 'Site web</a>' : '')) +
      '<a class="fx-btn" href="#fx-carte" data-jump>' + IC(P.menu, 16) + 'La carte</a>' +
      '<button type="button" class="fx-sq' + (todo ? ' is-on' : '') + '" id="fx-todo" aria-label="À tester">' + IC(P.flag, 17) + '<span>' + (todo ? 'Prévu' : 'À tester') + '</span></button></div></section>';

    // ma visite : note et mot privés
    var n = jeu.slugs[r.slug] || 0, av = lread(AKEY, {})[r.slug];
    var visite = '';
    if (av && av.note) visite = '<button type="button" class="fx-card fx-visite" id="fx-avis"><i class="fx-ok">' + IC(P.check, 14) + '</i>' + stars(av.note, 15) + '<span>' + esc(av.mot || (n ? 'Mangé ici ' + n + ' fois' : 'Ma note')) + '</span>' + IC(P.edit, 16) + '</button>';
    else if (n) visite = '<button type="button" class="fx-card fx-visite" id="fx-avis"><i class="fx-ok">' + IC(P.check, 14) + '</i><span><b>Vous y avez mangé' + (n > 1 ? ' ' + n + ' fois' : '') + '</b> · notez-le</span>' + stars(0, 15) + '</button>';
    else visite = '<div class="fx-card fx-visite is-new"><span><b>Déjà venu ?</b><small>Pour votre passeport. Note et mot privés.</small></span><a class="fx-mange" href="' + esc(r.url) + '#mange">' + IC(P.check, 15) + 'J’ai mangé ici</a></div>';

    var phares = (r.phares || []).length ? '<section class="fx-card"><h3>Les plats phares</h3><div class="dp-phares" data-zoom-group>' + r.phares.map(function (p) {
      return '<div>' + (p.photo ? '<img src="' + esc(p.photo) + '" alt="' + esc(p.nom) + '" data-zoom loading="lazy">' : '<span></span>') + '<strong>' + esc(p.nom) + '</strong><small>' + esc(p.prix) + '</small></div>';
    }).join('') + '</div></section>' : '';

    // la carte : Pro et Master = toute la carte dépliable + pop-up des plats ; sinon l'aperçu
    var full = !!r.full && (r.carte || []).length;
    var secs = full ? r.carte : (r.apercu || []);
    var maj = r.miseAJour ? new Date(r.miseAJour).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '';
    var seen = {}, chips = full && secs.length > 2 ? '<div class="fx-chips">' + secs.map(function (x, i) { var l = x.section.split(' · ')[0]; if (seen[l]) return ''; seen[l] = 1; return '<a href="#fx-s' + i + '" data-sec="' + i + '">' + esc(l) + '</a>'; }).join('') + '</div>' : '';
    var count = 0;
    var rows = secs.map(function (x, si) {
      return '<div class="fx-cat" id="fx-s' + si + '"><span>' + esc(x.section) + '</span>' + (x.prix ? '<b>' + esc(x.prix) + '</b>' : '') + '</div>' + x.plats.map(function (p, pi) {
        count++;
        var tag = full ? 'button type="button" data-dish="' + si + '.' + pi + '"' : 'div';
        var long = (p.prix || '').length > 9;
        return '<' + tag + ' class="fx-row' + (full && count > 5 ? ' is-more' : '') + '"><span><strong>' + esc(p.nom) + '</strong>' + (p.desc ? '<small>' + esc(p.desc) + '</small>' : '') + (long ? '<em>' + esc(p.prix) + '</em>' : '') + '</span><b>' + (long ? '' : esc(p.prix)) + (full ? IC(P.chev, 14) : '') + '</b></' + tag.split(' ')[0] + '>';
      }).join('');
    }).join('');
    var carte = '<section class="fx-card fx-carte' + (full ? ' is-folded' : '') + '" id="fx-carte"><h3>' + (full ? 'La carte' : 'Aperçu de la carte') + (maj ? '<small><i></i>Mise à jour le ' + esc(maj) + '</small>' : '') + '</h3>' + chips + '<div class="fx-rows">' + rows + '</div>' +
      (full && count > 5 ? '<button type="button" class="fx-more" id="fx-more">Toute la carte' + IC(P.down, 16) + '</button>' : '') +
      (!full ? '<p class="fx-note">La carte complète, les prix à jour et les formules sont chez le restaurant.</p>' + (r.site ? '<a class="fx-link" href="' + esc(r.site) + '" target="_blank" rel="noopener">Le site du restaurant' + IC(P.ext, 13) + '</a>' : '') : '') + '</section>';

    var resa = '';
    if (beltabResa) {
      var url = r.reservation.url + (r.reservation.url.indexOf('?') >= 0 ? '&' : '?') + 'beltab=1';
      resa = '<section class="fx-card fx-resa" id="fx-resa"><h3>Réserver une table<small>Directement ici</small></h3><iframe class="fx-frame" id="fx-frame" src="' + esc(url) + '" title="Réserver chez ' + esc(r.nom) + '"></iframe></section>';
    }
    var today = JOURS_ORD[(new Date().getDay() + 6) % 7];
    var hor = '<section class="fx-card" id="fx-horaires"><h3>Horaires<span class="fx-st ' + (st.open ? 'is-open' : 'is-closed') + '"><i></i><strong>' + esc(parts[0]) + '</strong></span></h3><div class="fx-hours">' + JOURS_ORD.map(function (j) {
      var v = hoursOf(r, j);
      return '<div class="' + (j === today ? 'is-today' : '') + '"><span>' + j[0].toUpperCase() + j.slice(1) + (j === today ? ' · aujourd’hui' : '') + '</span><span' + (v === 'Fermé' ? ' class="is-off"' : '') + '>' + v + '</span></div>';
    }).join('') + '</div></section>';
    var adr = r.adresse ? '<section class="fx-card"><h3>Adresse</h3><p class="fx-addr">' + esc(r.adresse) + '</p><div class="fx-row3">' +
      '<a class="fx-btn is-dark" href="' + route + '" target="_blank" rel="noopener nofollow">' + IC(P.route, 16) + 'Itinéraire</a>' +
      (r.telephone ? '<a class="fx-btn" href="tel:' + esc(r.telephone.replace(/\s/g, '')) + '">' + IC(P.phone, 16) + 'Appeler</a>' : '') +
      '<button type="button" class="fx-btn" id="fx-copy">' + IC(P.copy, 16) + 'Copier</button></div></section>' : '';
    var equipe = (r.equipe || []).length || r.histoire ? '<section class="fx-card"><h3>Qui est derrière</h3>' + (r.equipe || []).map(function (p) {
      return '<div class="fx-person">' + (p.photo ? '<img src="' + esc(p.photo) + '" alt="">' : '<span>' + esc((p.nom || '?')[0]) + '</span>') + '<div><strong>' + esc(p.nom) + '</strong>' + (p.role ? '<small>' + esc(p.role) + '</small>' : '') + '</div></div>';
    }).join('') + (r.histoire ? '<p class="fx-note">' + esc(r.histoire) + '</p>' : '') + (r.site ? '<a class="fx-btn" href="' + esc(r.site) + '" target="_blank" rel="noopener">' + IC(P.globe, 15) + 'Leur histoire sur leur site' + IC(P.ext, 13) + '</a>' : '') + '</section>' : '';
    var near = '';
    if (!r.paid) {
      var d = function (a) { return Math.hypot(a.lat - r.lat, (a.lng - r.lng) * Math.cos(r.lat * Math.PI / 180)); };
      var ns = state.data.filter(function (o) { return o.slug !== r.slug; }).sort(function (a, b) { return d(a) - d(b); }).slice(0, 2);
      if (ns.length) near = '<section class="fx-card"><h3>Autres indépendants à côté</h3><div class="dp-near">' + ns.map(function (o) { return '<button type="button" data-go="' + o.slug + '"><strong>' + esc(o.nom) + '</strong><small>' + esc(catLabel(o)) + ' · ' + Math.max(1, Math.round(d(o) * 111000 / 80)) + ' min à pied</small></button>'; }).join('') + '</div></section>';
    }
    return '<div class="fx">' + top + gal + '<div class="fx-stack">' + ident + visite + phares + carte + resa + hor + adr + equipe + near + '</div></div><div class="dp-resize" id="dp-resize" title="Glisser pour élargir" aria-hidden="true"></div>';
  }

  // ---------- pop-ups qui montent du bas ----------
  function bottomSheet(html, cls) {
    var old = $('fx-pop'); if (old) old.remove();
    var w = document.createElement('div');
    w.id = 'fx-pop'; w.className = 'fx-pop ' + (cls || '');
    w.innerHTML = '<div class="fx-pop-bg"></div><div class="fx-pop-card" role="dialog" aria-modal="true"><span class="fx-grip"></span>' + html + '</div>';
    document.body.appendChild(w);
    var close = function () { w.classList.remove('is-in'); setTimeout(function () { w.remove(); }, 220); document.removeEventListener('keydown', esc1); };
    var esc1 = function (e) { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', esc1);
    w.querySelector('.fx-pop-bg').addEventListener('click', close);
    w.querySelectorAll('[data-x]').forEach(function (b) { b.addEventListener('click', close); });
    requestAnimationFrame(function () { w.classList.add('is-in'); });
    return { el: w, close: close };
  }
  var XB = function () { return '<button type="button" class="fx-ib fx-px" data-x aria-label="Fermer">' + IC(P.close, 17) + '</button>'; };

  function dishPop(r, si, pi) {
    var secs = r.carte;
    var s = bottomSheet('<div class="fx-dish" id="fx-dish"></div>', 'is-tall');
    function draw(a, b) {
      var sec = secs[a], p = sec.plats[b];
      var box = s.el.querySelector('#fx-dish');
      box.innerHTML = XB() + '<div class="fx-dish-ph">' + (p.photo ? '<img src="' + esc(p.photo) + '" alt="' + esc(p.nom) + '">' : '<span>' + IC(P.menu, 40) + '</span>') + '</div>' +
        '<div class="fx-dish-tx"><div><h4>' + esc(p.nom) + '</h4>' + (p.desc ? '<p>' + esc(p.desc) + '</p>' : '') + '</div><b>' + esc(p.prix) + '</b></div>' +
        '<div class="fx-dish-tabs">' + secs.map(function (x, i) { return '<button type="button" data-t="' + i + '"' + (i === a ? ' aria-selected="true"' : '') + '>' + esc(x.section) + '</button>'; }).join('') + '</div>' +
        '<div class="fx-dish-th">' + sec.plats.map(function (x, i) { return '<button type="button" data-p="' + i + '"' + (i === b ? ' aria-current="true"' : '') + '>' + (x.photo ? '<img src="' + esc(x.photo) + '" alt="">' : '<span></span>') + '<small>' + esc(x.nom) + '</small></button>'; }).join('') + '</div>';
      box.querySelector('[data-x]').addEventListener('click', s.close);
      box.querySelectorAll('[data-t]').forEach(function (t) { t.addEventListener('click', function () { draw(+t.getAttribute('data-t'), 0); }); });
      box.querySelectorAll('[data-p]').forEach(function (t) { t.addEventListener('click', function () { draw(a, +t.getAttribute('data-p')); }); });
      var cur = box.querySelector('[aria-current]'); if (cur) cur.scrollIntoView({ inline: 'center', block: 'nearest' });
      var ct = box.querySelector('[aria-selected]'); if (ct) ct.scrollIntoView({ inline: 'center', block: 'nearest' });
      // glisser sur la photo : plat suivant / précédent
      var x0 = null, phe = box.querySelector('.fx-dish-ph');
      phe.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      phe.addEventListener('touchend', function (e) {
        if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
        if (Math.abs(dx) < 40) return;
        var na = a, nb = b + (dx < 0 ? 1 : -1);
        if (nb >= sec.plats.length) { na = (a + 1) % secs.length; nb = 0; }
        if (nb < 0) { na = (a - 1 + secs.length) % secs.length; nb = secs[na].plats.length - 1; }
        draw(na, nb);
      });
    }
    draw(si, pi);
  }

  function todoPop(r, btn) {
    var lists = lread(LKEY, { fav: {}, todo: {} }), cur = lists.todo[r.slug];
    var s = bottomSheet(XB() + '<h4 class="fx-pop-h">' + IC(P.flag, 18) + 'À tester</h4><p class="fx-pop-p">Quand voulez-vous y aller ? Le restaurant rejoint votre liste « À tester » sur la page Moi.</p>' +
      '<div class="fx-prio">' + Object.keys(PRIO).map(function (k) { return '<button type="button" data-k="' + k + '"' + (cur === k ? ' aria-pressed="true"' : '') + '><i class="p-' + k + '"></i>' + PRIO[k] + '</button>'; }).join('') + '</div>' +
      (cur ? '<button type="button" class="fx-link fx-rm" data-k="">Retirer de la liste</button>' : ''));
    s.el.querySelectorAll('[data-k]').forEach(function (b) {
      b.addEventListener('click', function () {
        var l = lread(LKEY, { fav: {}, todo: {} }), k = b.getAttribute('data-k');
        if (k) l.todo[r.slug] = k; else delete l.todo[r.slug];
        lsave(LKEY, l);
        btn.classList.toggle('is-on', !!k); btn.querySelector('span').textContent = k ? 'Prévu' : 'À tester';
        s.close();
      });
    });
  }

  function avisPop(r) {
    var all = lread(AKEY, {}), av = all[r.slug] || { note: 0, mot: '' }, note = av.note;
    var s = bottomSheet(XB() + '<h4 class="fx-pop-h">Ma note sur ' + esc(r.nom) + '</h4>' +
      '<div class="fx-rate" id="fx-rate">' + [1, 2, 3, 4, 5].map(function (i) { return '<button type="button" data-n="' + i + '" aria-label="' + i + ' sur 5"></button>'; }).join('') + '</div>' +
      '<textarea id="fx-mot" rows="4" placeholder="Ce que vous avez pris, ce qu’il faudra reprendre…">' + esc(av.mot) + '</textarea>' +
      '<p class="fx-pop-p fx-priv">' + IC(P.lock, 13) + 'Visible par vous seul. Rien n’est publié.</p>' +
      '<button type="button" class="fx-btn is-dark" id="fx-save">Enregistrer</button>');
    function paint() { s.el.querySelectorAll('[data-n]').forEach(function (b) { var on = +b.getAttribute('data-n') <= note; b.innerHTML = '<svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="' + (on ? '#E8A317' : 'none') + '" stroke="' + (on ? '#E8A317' : '#CFCDC5') + '" stroke-width="1.6" stroke-linejoin="round"><path d="' + P.star + '"/></svg>'; }); }
    paint();
    s.el.querySelectorAll('[data-n]').forEach(function (b) { b.addEventListener('click', function () { note = +b.getAttribute('data-n'); paint(); }); });
    $('fx-save').addEventListener('click', function () {
      var a = lread(AKEY, {}); a[r.slug] = { note: note, mot: $('fx-mot').value.trim(), t: Date.now() }; lsave(AKEY, a);
      s.close(); refresh(r);
    });
  }
  function refresh(r) { var sh = $('sheet'), y = sh.scrollTop; sh.innerHTML = deskPanel(r); wireDesk(r); sh.scrollTop = y; }

  function wireDesk(r) {
    var sheet = $('sheet');
    var close = function () { if (!DESK.matches) { closeFull(); return; } state.selected = null; render(); };
    $('sheet-close').addEventListener('click', close);
    $('fx-close').addEventListener('click', close);
    $('fx-share').addEventListener('click', function () { if (window.Partage) Partage.link({ url: location.origin + r.url, title: r.nom + ' · Beltab' }); });
    var fv = $('fx-fav');
    fv.addEventListener('click', function () {
      var l = lread(LKEY, { fav: {}, todo: {} }); if (l.fav[r.slug]) delete l.fav[r.slug]; else l.fav[r.slug] = Date.now(); lsave(LKEY, l);
      fv.classList.toggle('is-on', !!l.fav[r.slug]); fv.setAttribute('aria-pressed', String(!!l.fav[r.slug]));
      if (navigator.vibrate) { try { navigator.vibrate(10); } catch (e) {} }
    });
    var td = $('fx-todo'); td.addEventListener('click', function () { todoPop(r, td); });
    var av = $('fx-avis'); if (av) av.addEventListener('click', function () { avisPop(r); });
    var ds = $('fx-desc'); if (ds) ds.addEventListener('click', function () {
      bottomSheet(XB() + '<div class="fx-pop-id">' + (r.logo ? '<img class="rs-logo" src="' + esc(r.logo) + '" alt="">' : '') + '<h4>' + esc(r.nom) + '</h4></div>' +
        '<p class="fx-pop-txt">' + esc(r.description || r.accroche) + '</p>' + ((r.tags || []).length ? '<div class="fx-tags">' + r.tags.slice(0, 3).map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>' : '') +
        '<p class="fx-pop-p">Texte écrit par le restaurant</p>');
    });
    var cp = $('fx-copy'); if (cp) cp.addEventListener('click', function () {
      try { navigator.clipboard.writeText(r.adresse); cp.lastChild.textContent = 'Copiée'; setTimeout(function () { cp.lastChild.textContent = 'Copier'; }, 1600); } catch (e) {}
    });
    var more = $('fx-more'), cc = sheet.querySelector('.fx-carte');
    if (more) more.addEventListener('click', function () {
      var folded = cc.classList.toggle('is-folded');
      more.firstChild.textContent = folded ? 'Toute la carte' : 'Réduire';
      if (folded) sheet.scrollTo({ top: cc.offsetTop - 8, behavior: 'smooth' });
    });
    sheet.querySelectorAll('[data-sec]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault(); cc.classList.remove('is-folded'); if (more) more.firstChild.textContent = 'Réduire';
        var el = $('fx-s' + a.getAttribute('data-sec')); if (el) sheet.scrollTo({ top: el.offsetTop - 60, behavior: 'smooth' });
      });
    });
    sheet.querySelectorAll('[data-dish]').forEach(function (b) {
      b.addEventListener('click', function () { var k = b.getAttribute('data-dish').split('.'); dishPop(r, +k[0], +k[1]); });
    });
    sheet.querySelectorAll('[data-jump]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var el = sheet.querySelector(a.getAttribute('href'));
        if (el) sheet.scrollTo({ top: el.offsetTop - 10, behavior: 'smooth' });
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
  // le module de réservation peut donner sa hauteur : plus de double défilement
  window.addEventListener('message', function (e) {
    var f = $('fx-frame');
    if (f && e.data && e.data.beltabHeight && e.source === f.contentWindow) f.style.height = Math.max(420, Math.min(1400, +e.data.beltabHeight)) + 'px';
  });

  // ---------- téléphone : la fiche complète s'ouvre par-dessus la carte, avec une croix ----------
  function openFull(r, jump) {
    var sheet = $('sheet');
    sheet.classList.add('is-full');
    document.body.classList.add('full-open');
    sheet.innerHTML = deskPanel(r);
    sheet.scrollTop = 0;
    wireDesk(r);
    if (jump) { var el = sheet.querySelector(jump); if (el) setTimeout(function () { sheet.scrollTo({ top: el.offsetTop - 10, behavior: 'smooth' }); }, 250); }
    if (history.pushState) history.pushState({ beltabFull: r.slug }, '', r.url);
  }
  function closeFull(fromPop) {
    var sheet = $('sheet');
    if (!sheet.classList.contains('is-full')) return;
    sheet.classList.remove('is-full');
    document.body.classList.remove('full-open');
    if (!fromPop && history.state && history.state.beltabFull) history.back();
    render();
  }
  window.addEventListener('popstate', function () { closeFull(true); });

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
      '<a class="act" id="act-menu" href="' + esc(r.url) + '#carte">' + ICON.menu + 'Menu</a>',
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
    sheet.querySelector('.rs-info').addEventListener('click', function (e) { e.preventDefault(); openFull(r); });
    var mn = $('act-menu'); if (mn) mn.addEventListener('click', function (e) { e.preventDefault(); openFull(r, '#fx-carte'); });
    var bk = $('act-book');
    if (bk) bk.addEventListener('click', function () { openFull(r, '#fx-resa'); });
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
