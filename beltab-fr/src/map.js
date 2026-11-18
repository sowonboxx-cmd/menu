// Page carte : MapLibre + tuiles OpenFreeMap, filtres, fiche résumée en bas.
(function () {
  var FILTERS = [
    { id: 'tous', label: 'Tous' },
    { id: 'ouvert', label: 'Ouvert maintenant' },
    { id: 'bistronomie', label: 'Bistronomie' },
    { id: 'cuisine-familiale', label: 'Cuisine familiale' },
    { id: 'bar-a-huitres', label: 'Bar à huîtres' },
    { id: 'menu-du-jour', label: 'Plat du jour' }
  ];
  var state = { filter: 'tous', q: '', selected: null, data: [], cats: {} };
  var markers = [];

  var map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [2.3185, 48.8865],
    zoom: 14.2,
    maxZoom: 17.5,
    pitchWithRotate: false,
    dragRotate: false,
    attributionControl: { compact: true }
  });
  map.touchZoomRotate.disableRotation();

  // Carte « flat » : pas de bâtiments, pas de 3D, pas d'icônes de lieux ni de transports.
  map.on('style.load', function () {
    map.getStyle().layers.forEach(function (l) {
      var id = l.id;
      if (l.type === 'fill-extrusion' || /building|poi|transit|aerialway|airport|ferry|shield/.test(id)) {
        map.setLayoutProperty(id, 'visibility', 'none');
      }
    });
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
  map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), 'bottom-right');

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function hasPdj(r) { return r.platDuJour && Beltab.isToday(r.platDuJour.date); }
  function catLabel(r) { return (r.categories || []).map(function (c) { return state.cats[c] || c; }).join(', '); }

  function matches(r) {
    var f = state.filter;
    if (f === 'ouvert' && !Beltab.status(r.horaires).open) return false;
    if (f === 'menu-du-jour' && !hasPdj(r)) return false;
    if (['bistronomie', 'cuisine-familiale', 'bar-a-huitres'].indexOf(f) >= 0 && (r.categories || []).indexOf(f) < 0) return false;
    if (state.q) {
      var hay = (r.nom + ' ' + r.accroche + ' ' + r.arrondissement + ' ' + catLabel(r)).toLowerCase();
      if (hay.indexOf(state.q.toLowerCase()) < 0) return false;
    }
    return true;
  }

  function renderFilters() {
    var box = document.getElementById('filters');
    box.innerHTML = FILTERS.map(function (f) {
      return '<button type="button" class="filter' + (f.id === state.filter ? ' is-on' : '') + '" data-f="' + f.id + '" aria-pressed="' + (f.id === state.filter) + '">' + esc(f.label) + '</button>';
    }).join('');
    box.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { state.filter = b.getAttribute('data-f'); state.selected = null; render(); });
    });
  }

  function cardHtml(r) {
    var st = Beltab.status(r.horaires);
    var pdj = hasPdj(r) ? '<div class="sheet-pdj"><span class="eyebrow">Plat du jour</span><span>' + esc(r.platDuJour.nom) + (r.platDuJour.prix ? ' · ' + esc(r.platDuJour.prix) + ' €' : '') + '</span></div>' : '';
    return '<div class="sheet-card">' +
      (r.photo ? '<img class="sheet-photo" src="' + esc(r.photo) + '" alt="">' : '') +
      '<div class="sheet-info">' +
      '<span class="verified small">Indépendant vérifié</span>' +
      '<strong class="sheet-name">' + esc(r.nom) + '</strong>' +
      '<span class="muted">' + esc(catLabel(r)) + ' · ' + esc(r.arrondissement) + ' · ' + esc(r.prix) + '</span>' +
      '<span class="chip ' + (st.open ? '' : 'chip-closed') + '">' + esc(st.label) + '</span>' +
      '</div></div>' + pdj +
      '<div class="sheet-actions"><a class="btn" href="' + esc(r.url) + '">Voir la fiche</a>' +
      '<a class="btn btn-light" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(r.lat + ',' + r.lng) + '" rel="nofollow">Itinéraire</a></div>';
  }

  function renderSheet(list) {
    var sheet = document.getElementById('sheet');
    var sel = state.selected && list.filter(function (r) { return r.slug === state.selected; })[0];
    if (sel) { sheet.innerHTML = '<div class="grip"></div>' + cardHtml(sel); return; }
    sheet.innerHTML = '<div class="grip"></div><p class="sheet-count"><strong>' + list.length + '</strong> restaurant' + (list.length > 1 ? 's' : '') + ' indépendant' + (list.length > 1 ? 's' : '') + '</p>' +
      '<ul class="sheet-list">' + list.map(function (r) {
        return '<li><button type="button" data-s="' + esc(r.slug) + '"><strong>' + esc(r.nom) + '</strong><span class="muted">' + esc(catLabel(r)) + ' · ' + esc(Beltab.status(r.horaires).label) + '</span></button></li>';
      }).join('') + '</ul>';
    sheet.querySelectorAll('[data-s]').forEach(function (b) {
      b.addEventListener('click', function () { select(b.getAttribute('data-s')); });
    });
  }

  function select(slug) {
    state.selected = slug;
    var r = state.data.filter(function (x) { return x.slug === slug; })[0];
    if (r) map.easeTo({ center: [r.lng, r.lat], zoom: Math.max(map.getZoom(), 15) });
    render();
  }

  function render() {
    renderFilters();
    markers.forEach(function (m) { m.remove(); });
    markers = [];
    var list = state.data.filter(matches);
    list.forEach(function (r) {
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'dot' + (r.paid ? ' is-paid' : '') + (r.slug === state.selected ? ' is-on' : '');
      el.setAttribute('aria-label', r.nom);
      el.title = r.nom;
      el.innerHTML = r.slug === state.selected ? '<span class="dot-label">' + esc(r.nom) + '</span>' : '';
      el.addEventListener('click', function (e) { e.stopPropagation(); select(r.slug); });
      markers.push(new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([r.lng, r.lat]).addTo(map));
    });
    renderSheet(list);
    state.list = list;
    updateOutside();
  }

  function updateOutside() {
    var pill = document.getElementById('outside');
    var list = state.list || [];
    if (!pill || !list.length) { if (pill) pill.hidden = true; return; }
    var b = map.getBounds();
    var out = list.filter(function (r) { return !b.contains([r.lng, r.lat]); }).length;
    pill.hidden = out === 0;
    pill.textContent = out + ' hors du cadre \u00b7 Tout voir';
  }

  function fitAll() {
    var list = state.list || [];
    if (!list.length) return;
    var bounds = new maplibregl.LngLatBounds();
    list.forEach(function (r) { bounds.extend([r.lng, r.lat]); });
    map.fitBounds(bounds, { padding: 80, maxZoom: 14 });
  }

  map.on('moveend', updateOutside);
  document.getElementById('outside').addEventListener('click', fitAll);
  map.on('click', function () { if (state.selected) { state.selected = null; render(); } });
  document.getElementById('q').addEventListener('input', function (e) { state.q = e.target.value.trim(); state.selected = null; render(); });

  fetch('/restaurants.json').then(function (r) { return r.json(); }).then(function (d) {
    state.data = d.restaurants;
    state.cats = d.categories || {};
    render();
    fitAll();
  });
})();
