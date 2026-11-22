// Fiche restaurant : « J'ai mangé ici », ses visites et la fenêtre pour ajouter un repas au journal.
(function () {
  var dataEl = document.getElementById('r-data');
  var band = document.getElementById('jeu-band');
  if (!dataEl || !band || !window.Jeu) return;
  var R = JSON.parse(dataEl.textContent);
  var ICON_CHECK = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var ICON_PLUS = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  var ICON_CAM = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function renderBand() {
    var v = Jeu.visits(R.slug);
    var btn = '<button type="button" class="jeu-btn" id="mange-open">' + ICON_PLUS + 'J’ai mangé ici</button>';
    if (!v.length) {
      band.innerHTML = '<div class="jeu-band-txt"><strong>Vous y êtes allé ?</strong><span>Ajoutez-le à votre passeport et à votre journal.</span></div>' + btn;
    } else {
      var last = v[0];
      var plats = last.plats && last.plats.length ? '<span>Vous aviez pris : <b>' + esc(last.plats.slice(0, 3).join(', ')) + '</b></span>' : '';
      band.innerHTML = '<div class="jeu-band-txt"><strong class="jeu-done">' + ICON_CHECK + (v.length === 1 ? 'Déjà fait' : 'Déjà fait ' + v.length + ' fois') +
        ' · le ' + esc(Jeu.fmtDate(last.date)) + '</strong>' + plats + '</div>' + btn;
    }
    document.getElementById('mange-open').addEventListener('click', open);
  }

  // ---------- fenêtre ----------
  var modal;
  function open() {
    var today = Beltab.todayParis();
    var plats = (R.carte || []).map(function (sec) {
      return '<span class="m-sec">' + esc(sec.section) + '</span>' + sec.plats.map(function (p) {
        return '<label class="m-dish"><input type="checkbox" name="plat" value="' + esc(p) + '"><span class="m-box">' + ICON_CHECK + '</span><span>' + esc(p) + '</span></label>';
      }).join('');
    }).join('');
    modal = document.createElement('div');
    modal.className = 'mange';
    modal.innerHTML = '<form class="mange-panel" role="dialog" aria-modal="true" aria-label="J’ai mangé ici">' +
      '<div class="mange-head"><button type="button" class="m-cancel">Annuler</button><strong>J’ai mangé ici</strong><span></span></div>' +
      '<div class="mange-body">' +
      '<div class="m-resto">' + (R.logo ? '<img src="' + esc(R.logo) + '" alt="">' : '') + '<div><strong>' + esc(R.nom) + '</strong><span>' + esc(R.cuisineNom || '') + '</span></div></div>' +
      '<h3>Qu’avez-vous pris ?</h3><div class="m-dishes">' + plats + '</div>' +
      '<input type="text" class="m-input" name="autre" placeholder="Autre chose (facultatif)" maxlength="80">' +
      '<h3>Avec qui ?</h3><input type="text" class="m-input" name="avec" placeholder="Des prénoms, séparés par des virgules" maxlength="120">' +
      '<h3>Quand ?</h3><input type="date" class="m-input" name="date" value="' + today + '" max="' + today + '">' +
      '<h3>Une photo</h3><label class="m-photo"><input type="file" name="photo" accept="image/*" hidden>' + ICON_CAM + '<span class="m-photo-txt">Ajouter la photo de votre repas</span></label>' +
      '<p class="m-note">Une photo par repas. Ce repas sera « Déclaré ». Bientôt, le QR de la vitrine et la réservation Beltab le rendront « Vérifié ».</p>' +
      '</div><div class="mange-foot"><button type="submit" class="m-save">Ajouter au journal</button></div></form>';
    document.body.appendChild(modal);
    document.body.classList.add('no-scroll');
    var form = modal.querySelector('form');
    var file = form.querySelector('input[name=photo]');
    file.addEventListener('change', function () {
      var f = file.files[0];
      var box = form.querySelector('.m-photo');
      if (!f) return;
      var u = URL.createObjectURL(f);
      box.classList.add('has-photo');
      box.style.backgroundImage = 'url(' + u + ')';
      form.querySelector('.m-photo-txt').textContent = 'Changer la photo';
    });
    modal.querySelector('.m-cancel').addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var chosen = [].slice.call(form.querySelectorAll('input[name=plat]:checked')).map(function (i) { return i.value; });
      var autre = form.autre.value.trim();
      if (autre) chosen.push(autre);
      var avec = form.avec.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      var btn = form.querySelector('.m-save');
      btn.disabled = true; btn.textContent = 'Ajout…';
      Jeu.add({ slug: R.slug, nom: R.nom, url: R.url, cuisine: R.cuisine, specialites: R.specialites, plats: chosen, avec: avec, date: form.date.value || today },
        file.files[0]).then(function (entry) {
        close();
        renderBand();
        done(entry);
      });
    });
  }
  function close() {
    if (modal) modal.remove();
    modal = null;
    document.body.classList.remove('no-scroll');
  }
  // Après l'ajout : partager en story, ou voir le passeport.
  function done(entry) {
    var st = Jeu.stats(null, null);
    var box = document.createElement('div');
    box.className = 'mange';
    box.innerHTML = '<div class="mange-panel done-panel" role="dialog" aria-modal="true" aria-label="Ajouté">' +
      '<div class="done-check">' + ICON_CHECK + '</div><strong>Ajouté à votre journal</strong>' +
      '<span class="muted">' + st.restaurants + ' restaurant' + (st.restaurants > 1 ? 's' : '') + ' · ' + st.nbCuisines + ' cuisine' + (st.nbCuisines > 1 ? 's' : '') + ' dans votre passeport</span>' +
      '<button type="button" class="m-save" id="done-share">Partager en story</button>' +
      '<a class="done-link" href="/moi/">Voir mon passeport</a><button type="button" class="m-cancel done-close">Fermer</button></div>';
    document.body.appendChild(box);
    var shut = function () { box.remove(); };
    box.querySelector('.done-close').addEventListener('click', shut);
    box.addEventListener('click', function (e) { if (e.target === box) shut(); });
    box.querySelector('#done-share').addEventListener('click', function () { shareEntry(entry); });
  }
  function shareEntry(entry) {
    (entry.photo ? Jeu.photoUrl(entry.id) : Promise.resolve('')).then(function (u) {
      return Partage.card({
        eyebrow: 'J’ai mangé chez un indépendant', rosette: true, title: R.nom, photo: u || R.photo,
        lines: [entry.plats && entry.plats.length ? entry.plats.slice(0, 3).join(', ') : '', (R.cuisineNom ? R.cuisineNom + ' · ' : '') + R.quartier + (entry.avec && entry.avec.length ? ' · avec ' + entry.avec.join(', ') : '')],
        badge: entry.preuve === 'verifie' ? 'Vérifié' : 'Déclaré', filename: 'beltab-' + R.slug
      });
    });
  }
  var sh = document.getElementById('share-fiche');
  if (sh) sh.addEventListener('click', function () { Partage.link({ title: R.nom + ' · Beltab', text: R.nom + ', restaurant indépendant à découvrir sur Beltab' }); });

  function toast(t) {
    var el = document.createElement('a');
    el.className = 'jeu-toast';
    el.href = '/moi/';
    el.innerHTML = ICON_CHECK + esc(t) + ' · Voir mon passeport';
    document.body.appendChild(el);
    setTimeout(function () { el.classList.add('out'); }, 3200);
    setTimeout(function () { el.remove(); }, 3800);
  }

  renderBand();
})();
