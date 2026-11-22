// Le jeu « tour du monde » : journal des repas, passeport, statistiques.
// Version 1 : tout est gardé sur l'appareil (localStorage + IndexedDB pour la photo).
// Quand les comptes Beltab arriveront, ces données partiront dans Supabase.
(function () {
  var KEY = 'beltab.journal.v1';
  var NAME = 'beltab.prenom';

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  }

  // ---------- photos (une par repas) ----------
  var dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise(function (ok, ko) {
      if (!window.indexedDB) return ko(new Error('no idb'));
      var req = indexedDB.open('beltab', 1);
      req.onupgradeneeded = function () { req.result.createObjectStore('photos'); };
      req.onsuccess = function () { ok(req.result); };
      req.onerror = function () { ko(req.error); };
    });
    return dbp;
  }
  function idb(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (ok, ko) {
        var tx = d.transaction('photos', mode);
        var r = fn(tx.objectStore('photos'));
        tx.oncomplete = function () { ok(r && r.result); };
        tx.onerror = function () { ko(tx.error); };
      });
    });
  }
  // Réduit la photo (1080 px de côté au plus, JPEG) avant de la garder.
  function shrink(file) {
    return new Promise(function (ok, ko) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, 1080 / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? ok(b) : ko(new Error('toBlob')); }, 'image/jpeg', 0.8);
      };
      img.onerror = function () { URL.revokeObjectURL(url); ko(new Error('image')); };
      img.src = url;
    });
  }
  function putPhoto(id, file) {
    return shrink(file).then(function (blob) { return idb('readwrite', function (s) { return s.put(blob, id); }); });
  }
  function photoUrl(id) {
    return idb('readonly', function (s) { return s.get(id); }).then(function (b) { return b ? URL.createObjectURL(b) : ''; }).catch(function () { return ''; });
  }
  function delPhoto(id) { return idb('readwrite', function (s) { return s.delete(id); }).catch(function () {}); }

  // ---------- journal ----------
  function entries() { return read().sort(function (a, b) { return (b.date || '').localeCompare(a.date || '') || b.t - a.t; }); }

  // entry : { slug, nom, url, cuisine, specialites[], plats[], avec[], date, photo:bool }
  function add(entry, file) {
    var list = read();
    entry.id = 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    entry.t = Date.now();
    entry.preuve = 'declare'; // « vérifié » viendra avec le QR de la vitrine, la réservation Beltab ou le ticket
    entry.photo = false;
    list.push(entry);
    save(list);
    if (!file) return Promise.resolve(entry);
    return putPhoto(entry.id, file).then(function () {
      var l = read();
      l.forEach(function (e) { if (e.id === entry.id) e.photo = true; });
      save(l);
      entry.photo = true;
      return entry;
    }).catch(function () { return entry; });
  }
  function remove(id) {
    save(read().filter(function (e) { return e.id !== id; }));
    return delPhoto(id);
  }
  function visits(slug) { return entries().filter(function (e) { return e.slug === slug; }); }

  // ---------- statistiques ----------
  // cuisines : contenu de /cuisines.json ; restaurants : liste publique de /restaurants.json
  function stats(cuisines, restaurants) {
    var list = entries();
    var slugs = {}, cuis = {}, specs = {};
    list.forEach(function (e) {
      slugs[e.slug] = (slugs[e.slug] || 0) + 1;
      if (e.cuisine) cuis[e.cuisine] = true;
      (e.specialites || []).forEach(function (s) { specs[s] = true; });
    });
    var nbResto = Object.keys(slugs).length;
    var total = restaurants ? restaurants.length : 0;
    var totalCuis = cuisines ? cuisines.cuisines.length : 0;
    var totalSpecs = 0;
    if (cuisines) cuisines.cuisines.forEach(function (c) { totalSpecs += Math.max(1, c.specialites.length); });
    return {
      repas: list.length, restaurants: nbResto, slugs: slugs, cuisines: cuis, specialites: specs,
      nbCuisines: Object.keys(cuis).length, totalCuisines: totalCuis,
      nbSpecialites: Object.keys(specs).length, totalSpecialites: totalSpecs,
      pctCarte: total ? Math.round(nbResto / total * 100) : 0, totalRestaurants: total
    };
  }

  function prenom(v) {
    if (v === undefined) { try { return localStorage.getItem(NAME) || ''; } catch (e) { return ''; } }
    try { localStorage.setItem(NAME, v); } catch (e) {}
    return v;
  }

  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  window.Jeu = { entries: entries, add: add, remove: remove, visits: visits, stats: stats, photoUrl: photoUrl, prenom: prenom, fmtDate: fmtDate };
})();
