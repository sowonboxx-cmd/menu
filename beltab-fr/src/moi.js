// Page « Mon passeport » : passeport des cuisines, journal des repas, classement.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var CHECK = '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var LOCK = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 11h12v10H6zM9 11V8a3 3 0 0 1 6 0v3"/></svg>';
  var FORK = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8a2 2 0 0 1-2 2M17 3c-1.7 0-3 2-3 5s1.3 4 3 4v9"/></svg>';

  var C = null, RESTOS = [];

  // ---------- prénom ----------
  var inp = $('moi-prenom');
  function avatar() { var p = Jeu.prenom(); $('moi-avatar').textContent = p ? p[0].toUpperCase() : '?'; }
  inp.value = Jeu.prenom();
  inp.addEventListener('input', function () { Jeu.prenom(inp.value.trim()); avatar(); });
  avatar();

  // ---------- onglets ----------
  var tabs = document.querySelectorAll('.moi-tabs [data-tab]');
  function show(name) {
    tabs.forEach(function (t) { t.setAttribute('aria-selected', t.getAttribute('data-tab') === name ? 'true' : 'false'); });
    ['passeport', 'journal', 'listes', 'classement'].forEach(function (n) { $('tab-' + n).hidden = n !== name; });
    if (history.replaceState) history.replaceState(null, '', '#' + name);
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { show(t.getAttribute('data-tab')); }); });

  function bar(pct) { return '<div class="bar"><span style="width:' + Math.max(pct, pct ? 3 : 0) + '%"></span></div>'; }

  // ---------- passeport ----------
  function passeport() {
    var st = Jeu.stats(C, RESTOS);
    var pct = st.totalCuisines ? Math.round(st.nbCuisines / st.totalCuisines * 100) : 0;
    var regions = C.regions.map(function (rg) {
      var tiles = C.cuisines.filter(function (c) { return c.region === rg.id; }).map(function (c) {
        var done = !!st.cuisines[c.id];
        var nbSp = c.specialites.filter(function (x) { return st.specialites[x.id]; }).length;
        var sub = c.specialites.length ? nbSp + ' / ' + c.specialites.length + ' spécialités' : (done ? 'goûtée' : 'à découvrir');
        return '<a class="pp-tile' + (done ? ' is-done' : '') + '" href="/cuisines/' + c.id + '/">' + (done ? CHECK : LOCK) +
          '<strong>' + esc(c.nom) + '</strong><small>' + sub + '</small></a>';
      }).join('');
      return '<h3 class="pp-region">' + esc(rg.nom) + '</h3><div class="pp-grid">' + tiles + '</div>';
    }).join('');
    $('tab-passeport').innerHTML =
      '<div class="pp-stats"><div><b>' + st.restaurants + '</b><span>restaurant' + (st.restaurants > 1 ? 's' : '') + '</span></div>' +
      '<div><b>' + st.nbCuisines + '</b><span>cuisine' + (st.nbCuisines > 1 ? 's' : '') + '</span></div>' +
      '<div><b>' + st.pctCarte + ' %</b><span>de la carte</span></div></div>' +
      '<button type="button" class="share-wide" id="share-pass">Partager mon passeport</button>' +
      '<div class="pp-world"><div class="pp-world-head"><h2>Tour du monde</h2><span>' + st.nbCuisines + ' / ' + st.totalCuisines + ' cuisines</span></div>' + bar(pct) +
      '<span class="muted small">' + (st.nbCuisines ? 'Encore ' + (st.totalCuisines - st.nbCuisines) + ' cuisines à découvrir.' : 'Votre premier repas ouvrira votre passeport : sur une fiche, touchez « J’ai mangé ici ».') + '</span></div>' +
      regions;
    $('share-pass').addEventListener('click', function () {
      Partage.card({ eyebrow: 'Mon tour du monde', title: st.nbCuisines + ' cuisine' + (st.nbCuisines > 1 ? 's' : '') + ' goûtée' + (st.nbCuisines > 1 ? 's' : ''),
        lines: [st.restaurants + ' restaurant' + (st.restaurants > 1 ? 's' : '') + ' indépendant' + (st.restaurants > 1 ? 's' : '') + ' · ' + st.pctCarte + ' % de la carte', 'Et vous, combien de cuisines du monde ?'],
        filename: 'beltab-passeport' });
    });
  }

  // ---------- journal ----------
  function journal() {
    var list = Jeu.entries();
    if (!list.length) {
      $('tab-journal').innerHTML = '<div class="empty"><strong>Votre journal est vide</strong><p class="muted">Sur la fiche d’un restaurant, touchez « J’ai mangé ici » : ce que vous avez pris, avec qui, quand, et une photo.</p><a class="btn" href="/">Ouvrir la carte</a></div>';
      return;
    }
    $('tab-journal').innerHTML = list.map(function (e) {
      var cu = C.cuisines.filter(function (c) { return c.id === e.cuisine; })[0];
      return '<article class="jr" data-id="' + e.id + '"><div class="jr-ph" data-photo="' + (e.photo ? e.id : '') + '">' + FORK + '</div>' +
        '<div class="jr-body"><div class="jr-top"><a href="' + esc(e.url) + '"><strong>' + esc(e.nom) + '</strong></a><span class="tag">Déclaré</span></div>' +
        (e.plats && e.plats.length ? '<span class="jr-plats">' + esc(e.plats.join(', ')) + '</span>' : '') +
        '<span class="jr-meta">' + esc(Jeu.fmtDate(e.date)) + (cu ? ' · ' + esc(cu.nom) : '') + (e.avec && e.avec.length ? ' · avec ' + esc(e.avec.join(', ')) : '') + '</span>' +
        '<span class="jr-btns"><button type="button" class="jr-share" data-share="' + e.id + '">Partager</button><button type="button" class="jr-del" data-del="' + e.id + '">Supprimer</button></span></div></article>';
    }).join('');
    $('tab-journal').querySelectorAll('[data-photo]').forEach(function (el) {
      var id = el.getAttribute('data-photo');
      if (!id) return;
      Jeu.photoUrl(id).then(function (u) { if (u) { el.style.backgroundImage = 'url(' + u + ')'; el.classList.add('has-photo'); } });
    });
    $('tab-journal').querySelectorAll('[data-share]').forEach(function (b) {
      b.addEventListener('click', function () {
        var e = list.filter(function (x) { return x.id === b.getAttribute('data-share'); })[0];
        var r = RESTOS.filter(function (x) { return x.slug === e.slug; })[0] || {};
        var cu = C.cuisines.filter(function (c) { return c.id === e.cuisine; })[0];
        (e.photo ? Jeu.photoUrl(e.id) : Promise.resolve('')).then(function (u) {
          Partage.card({ eyebrow: 'J’ai mangé chez un indépendant', rosette: true, title: e.nom, photo: u || r.photo,
            lines: [e.plats && e.plats.length ? e.plats.slice(0, 3).join(', ') : '', (cu ? cu.nom + ' · ' : '') + (r.arrondissement || '') + (e.avec && e.avec.length ? ' · avec ' + e.avec.join(', ') : '')],
            badge: e.preuve === 'verifie' ? 'Vérifié' : 'Déclaré', filename: 'beltab-' + e.slug });
        });
      });
    });
    $('tab-journal').querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!confirmDel(b)) return;
        Jeu.remove(b.getAttribute('data-del')).then(refresh);
      });
    });
  }
  // Pas de fenêtre du navigateur : on demande de toucher deux fois.
  function confirmDel(b) {
    if (b.dataset.armed) return true;
    b.dataset.armed = '1';
    b.textContent = 'Toucher encore pour supprimer';
    setTimeout(function () { delete b.dataset.armed; b.textContent = 'Supprimer'; }, 3000);
    return false;
  }

  // ---------- classement ----------
  var scope = 'potes';
  function classement() {
    var st = Jeu.stats(C, RESTOS);
    var me = Jeu.prenom() || 'Vous';
    $('tab-classement').innerHTML =
      '<div class="cl-switch"><button type="button" data-scope="potes" aria-pressed="' + (scope === 'potes') + '">Entre potes</button><button type="button" data-scope="france" aria-pressed="' + (scope === 'france') + '">France</button></div>' +
      '<div class="cl-row is-me"><span class="cl-rank">–</span><span class="cl-av">' + esc(me[0].toUpperCase()) + '</span><span class="cl-name">' + esc(me) + '<small>' + st.nbCuisines + ' cuisines · ' + st.restaurants + ' restaurants</small></span><b>' + st.nbCuisines + '</b></div>' +
      '<div class="empty"><strong>' + (scope === 'potes' ? 'Le classement entre potes arrive avec les comptes' : 'Le classement France arrive avec les comptes') + '</strong>' +
      '<p class="muted">On compte les cuisines goûtées. Seuls les repas vérifiés compteront : réservation Beltab honorée, QR de la vitrine scanné sur place, ou ticket de caisse.</p></div>';
    $('tab-classement').querySelectorAll('[data-scope]').forEach(function (b) {
      b.addEventListener('click', function () { scope = b.getAttribute('data-scope'); classement(); });
    });
  }

  // ---------- listes : À tester (avec priorité) et Favoris ----------
  var FLAG = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>';
  var HEART = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="#D23B3B" stroke="#D23B3B" stroke-width="2" stroke-linejoin="round"><path d="M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5c-2.2 4.6-9.2 9-9.2 9z"/></svg>';
  var PRIO = [['haute', 'Le plus vite possible'], ['moyenne', 'Bientôt'], ['basse', 'Un jour']];
  function listes() {
    var l; try { l = JSON.parse(localStorage.getItem('beltab.listes.v1')) || {}; } catch (e) { l = {}; }
    var todo = l.todo || {}, fav = l.fav || {};
    var by = function (s) { return RESTOS.filter(function (r) { return r.slug === s; })[0]; };
    var row = function (r, right) { return '<a class="li-row" href="' + esc(r.url) + '">' + (r.photo ? '<img src="' + esc(r.photo) + '" alt="">' : '<span class="li-ph"></span>') + '<span><strong>' + esc(r.nom) + '</strong><small>' + esc(r.arrondissement || '') + '</small></span>' + right + '</a>'; };
    var t = PRIO.map(function (p) {
      var rs = Object.keys(todo).filter(function (s) { return todo[s] === p[0]; }).map(by).filter(Boolean);
      return rs.length ? '<h4 class="li-prio"><i class="p-' + p[0] + '"></i>' + p[1] + '</h4>' + rs.map(function (r) { return row(r, FLAG); }).join('') : '';
    }).join('');
    var f = Object.keys(fav).sort(function (a, b) { return fav[b] - fav[a]; }).map(by).filter(Boolean).map(function (r) { return row(r, HEART); }).join('');
    $('tab-listes').innerHTML = '<section class="li-card"><h3>' + FLAG + 'À tester</h3>' + (t || '<p class="muted small">Le drapeau sur la fiche d’un restaurant le range ici, avec votre priorité.</p>') + '</section>' +
      '<section class="li-card"><h3>' + HEART + 'Mes favoris</h3>' + (f || '<p class="muted small">Le cœur sur la fiche d’un restaurant le range ici.</p>') + '</section>';
  }

  function refresh() { passeport(); journal(); listes(); classement(); }

  Promise.all([fetch('/cuisines.json').then(function (r) { return r.json(); }), fetch('/restaurants.json').then(function (r) { return r.json(); })]).then(function (res) {
    C = res[0]; RESTOS = res[1].restaurants;
    refresh();
    var h = location.hash.replace('#', '');
    if (['passeport', 'journal', 'listes', 'classement'].indexOf(h) >= 0) show(h);
  });
})();
