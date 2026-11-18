// Page carte : MapLibre + tuiles OpenFreeMap (style flat), recherche, filtres, fiche résumée au clic.
(function () {
  var FILTERS = [
    { id: 'tous', label: 'Tous' },
    { id: 'ouvert', label: 'Ouvert maintenant' },
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
  var attrib = new maplibregl.AttributionControl({ compact: true });
  map.addControl(attrib, 'bottom-left');
  if (window.innerWidth >= 900) map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left');
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

  function matches(r) {
    var f = state.filter;
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
  function renderSheet() {
    var sheet = $('sheet');
    var r = state.selected && state.data.filter(function (x) { return x.slug === state.selected; })[0];
    if (!r) { sheet.hidden = true; sheet.innerHTML = ''; return; }
    var st = Beltab.status(r.horaires);
    var pdj = hasPdj(r) ? '<div class="sheet-pdj"><span class="eyebrow">Plat du jour</span><span>' + esc(r.platDuJour.nom) + (r.platDuJour.prix ? ' · ' + esc(r.platDuJour.prix) + ' €' : '') + '</span></div>' : '';
    sheet.innerHTML =
      '<button type="button" class="sheet-close" id="sheet-close" aria-label="Fermer"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<div class="sheet-card">' +
      (r.photo ? '<img class="sheet-photo" src="' + esc(r.photo) + '" alt="" onerror="this.remove()">' : '') +
      '<div class="sheet-info">' +
      '<span class="verified small">Indépendant vérifié</span>' +
      '<strong class="sheet-name">' + esc(r.nom) + '</strong>' +
      '<span class="muted">' + esc(catLabel(r)) + ' · ' + esc(r.arrondissement) + ' · <span class="nowrap">' + esc(r.prix) + '</span></span>' +
      '<span class="chip ' + (st.open ? 'chip-open' : 'chip-closed') + '">' + esc(st.label) + '</span>' +
      '</div></div>' + pdj +
      '<div class="sheet-actions"><a class="btn" href="' + esc(r.url) + '">Voir la fiche</a>' +
      '<a class="btn btn-light" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(r.lat + ',' + r.lng) + '" rel="nofollow">Itinéraire</a></div>';
    sheet.hidden = false;
    $('sheet-close').addEventListener('click', function () { state.selected = null; render(); });
  }

  function select(slug) {
    state.selected = slug;
    var r = state.data.filter(function (x) { return x.slug === slug; })[0];
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
    if (r) map.easeTo({ center: [r.lng, r.lat], zoom: Math.max(map.getZoom(), 15), offset: [0, window.innerWidth < 900 ? -90 : 0] });
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
        el.className = 'dot' + (r.paid ? ' is-paid' : '');
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
    map.fitBounds(bounds, { padding: { top: 190, bottom: 60, left: 50, right: 50 }, maxZoom: 14 });
  }

  // ---------- événements ----------
  map.on('moveend', updateOutside);
  map.on('click', function () {
    toggle('menu', false); toggle('filters', false);
    if (state.selected) { state.selected = null; render(); }
  });
  $('outside').addEventListener('click', fitAll);
  $('menu-btn').addEventListener('click', function () { toggle('menu'); });
  $('filter-btn').addEventListener('click', function () { toggle('filters'); });
  $('locate-btn').addEventListener('click', function () { geo.trigger(); });
  $('q').addEventListener('input', function (e) { state.q = e.target.value.trim(); renderResults(); });
  $('q').addEventListener('focus', function () { toggle('menu', false); toggle('filters', false); });

  fetch('/restaurants.json').then(function (r) { return r.json(); }).then(function (d) {
    state.data = d.restaurants;
    state.cats = d.categories || {};
    render();
    fitAll();
  });
})();
