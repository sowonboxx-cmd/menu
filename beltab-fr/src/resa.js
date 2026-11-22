// Réservation Beltab dans la fiche : même base que le module du restaurant (Supabase),
// mêmes jours fermés, mêmes créneaux, même capacité, même notification au restaurant.
// Étapes : jour → personnes → créneau → espace (places restantes) → coordonnées → confirmation.
(function () {
  var SB_URL = 'https://fdbzzkzfipzabryfanun.supabase.co';
  var SB_KEY = 'sb_publishable_9PaqDuXnWV3aOCBPk9ImmQ_4YgYTU9n';
  var NOTIFY = 'https://resa.beltab.app/notify';
  var MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var DAY_S = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
  var DAY_F = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  var MAXC = 12;
  var sbP = null;
  function sb() {
    if (sbP) return sbP;
    sbP = new Promise(function (ok, ko) {
      if (window.supabase) return ok(window.supabase.createClient(SB_URL, SB_KEY));
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = function () { ok(window.supabase.createClient(SB_URL, SB_KEY)); };
      s.onerror = ko; document.head.appendChild(s);
    });
    return sbP;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function mins(t) { var p = String(t || '').slice(0, 5).split(':'); return +p[0] * 60 + (+p[1] || 0); }
  function slotsOf(svcs) {
    var out = {};
    svcs.forEach(function (s) {
      var a = mins(s.start_time), b = mins(s.end_time); if (isNaN(a) || isNaN(b)) return; if (b <= a) b += 1440;
      for (var x = a; x < b && x < 1440; x += 30) out[String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0')] = 1;
    });
    return Object.keys(out).sort();
  }
  function closedFrom(sc) {
    if (!Array.isArray(sc) || sc.length < 7) return null;
    var out = [];
    sc.slice(0, 7).forEach(function (day, i) {
      var open = day && day.active !== false && ((day.services || []).some(function (p) { return p && p.open != null && p.open !== ''; }) || day.open != null);
      if (!open) out.push((i + 1) % 7);
    });
    return out;
  }
  var IC = function (d, w) { return '<svg aria-hidden="true" width="' + (w || 16) + '" height="' + (w || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>'; };
  var CAL = 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', L = 'M15 6l-6 6 6 6', R = 'M9 6l6 6-6 6', DOWN = 'M6 9l6 6 6-6', CHECK = 'M5 12.5l4.5 4.5L19 7.5';

  function mount(el, cfg) {
    var test = /[?&]resatest=1/.test(location.search);
    var WRITE = test ? (cfg.test || cfg.slug.replace(/-[a-z]+$/, '') + '-test') : cfg.slug;
    var D = { closed: null, blocked: {}, services: [], slots: [], spaces: [], tables: [], ready: false };
    var S = { date: null, covers: 2, slot: null, space: undefined, step: 'pick', cal: false, calM: null, err: '' };
    var today = new Date(); today.setHours(0, 0, 0, 0);

    function isOpen(d) {
      if (d < today) return false;
      if (D.closed && D.closed.indexOf(d.getDay()) >= 0) return false;
      return !D.blocked[iso(d)];
    }
    function nextDays(n) { var out = [], d = new Date(today); for (var i = 0; out.length < n && i < 60; i++) { out.push(new Date(d)); d.setDate(d.getDate() + 1); } return out; }
    function label(d) { return DAY_F[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; }
    function svcOf(t) { return D.services.filter(function (s) { var a = mins(s.start_time), b = mins(s.end_time), x = mins(t); if (b <= a) b += 1440; return x >= a && x < b; })[0]; }
    function capOf(sp) { return D.tables.filter(function (t) { return t.space_id === sp.id; }).reduce(function (a, t) { return a + (t.seats || 0); }, 0); }
    var booked = {}; // date|service -> couverts déjà réservés
    function loadBooked() {
      if (!S.date) return Promise.resolve();
      return sb().then(function (c) {
        return Promise.all(D.services.map(function (s) {
          var k = iso(S.date) + '|' + s.id; if (k in booked) return null;
          return c.rpc('get_service_covers', { p_client_slug: cfg.slug, p_date_iso: iso(S.date), p_start_time: s.start_time, p_end_time: s.end_time })
            .then(function (r) { booked[k] = r.error ? null : (r.data || 0); });
        }));
      }).catch(function () {});
    }
    // un créneau est complet si plus aucun espace n'a la place (si la capacité n'est pas configurée, on laisse passer)
    function slotFull(t) {
      var s = svcOf(t); if (!s || !D.spaces.length || !D.tables.length) return false;
      var b = booked[iso(S.date) + '|' + s.id]; if (b == null) return false;
      var total = D.spaces.reduce(function (a, sp) { return a + capOf(sp); }, 0);
      return total > 0 && total - b < S.covers;
    }
    function remaining(sp) {
      var s = svcOf(S.slot), cap = capOf(sp); if (!cap) return null;
      var b = s ? booked[iso(S.date) + '|' + s.id] : null;
      return b == null ? cap : Math.max(0, cap - b);
    }

    function draw() {
      if (!D.ready) { el.innerHTML = '<p class="rz-wait">Chargement des disponibilités…</p>'; return; }
      var h = '';
      if (S.step === 'pick') {
        if (S.cal) {
          var m = S.calM, first = new Date(m.getFullYear(), m.getMonth(), 1), start = (first.getDay() + 6) % 7, n = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
          var g = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(function (x) { return '<span class="rz-dh">' + x + '</span>'; }).join('');
          for (var i = 0; i < start; i++) g += '<span></span>';
          for (var dd = 1; dd <= n; dd++) {
            var dt = new Date(m.getFullYear(), m.getMonth(), dd), ok = isOpen(dt), sel = S.date && iso(S.date) === iso(dt);
            g += '<button type="button" class="rz-cd' + (sel ? ' is-sel' : '') + '"' + (ok ? ' data-d="' + iso(dt) + '"' : ' disabled') + '>' + dd + '</button>';
          }
          h += '<div class="rz-calh"><button type="button" class="rz-nav" data-m="-1" aria-label="Mois précédent"' + (m <= new Date(today.getFullYear(), today.getMonth(), 1) ? ' disabled' : '') + '>' + IC(L) + '</button><strong>' + MONTHS[m.getMonth()] + ' ' + m.getFullYear() + '</strong><button type="button" class="rz-nav" data-m="1" aria-label="Mois suivant">' + IC(R) + '</button></div>' +
            '<div class="rz-cal">' + g + '</div><button type="button" class="rz-link" data-cal="0">Réduire</button>';
        } else {
          var days = nextDays(5);
          if (S.date && !days.some(function (x) { return iso(x) === iso(S.date); })) days[4] = S.date;
          h += '<div class="rz-days">' + days.map(function (d) {
            var ok = isOpen(d), sel = S.date && iso(S.date) === iso(d);
            return '<button type="button" class="rz-day' + (sel ? ' is-sel' : '') + '"' + (ok ? ' data-d="' + iso(d) + '"' : ' disabled') + '><small>' + DAY_S[d.getDay()] + '</small>' + d.getDate() + '</button>';
          }).join('') + '</div><button type="button" class="rz-link" data-cal="1">' + IC(CAL, 15) + 'Autres dates' + IC(DOWN, 14) + '</button>';
        }
        h += '<div class="rz-cov"><span>Personnes</span><div><button type="button" data-c="-1" aria-label="Une personne de moins"' + (S.covers <= 1 ? ' disabled' : '') + '>−</button><b>' + S.covers + '</b><button type="button" data-c="1" aria-label="Une personne de plus"' + (S.covers >= MAXC ? ' disabled' : '') + '>+</button></div></div>';
        if (S.covers >= MAXC) h += '<p class="rz-note">Plus de ' + MAXC + ' personnes ? Appelez le restaurant.</p>';
        if (!S.date) h += '<p class="rz-note">Choisissez un jour pour voir les horaires.</p>';
        else {
          var sl = D.slots.map(function (t) { var full = slotFull(t); return '<button type="button" class="rz-slot' + (S.slot === t ? ' is-sel' : '') + '"' + (full ? ' disabled' : ' data-t="' + t + '"') + '>' + t + '</button>'; }).join('');
          h += '<div class="rz-slots">' + (sl || '<p class="rz-note">Aucun horaire ce jour-là.</p>') + '</div>';
        }
        h += '<button type="button" class="rz-go" id="rz-next"' + (S.date && S.slot ? '' : ' disabled') + '>' + IC(CAL, 17) + (S.date && S.slot ? 'Continuer · ' + DAY_S[S.date.getDay()].toLowerCase() + ' ' + S.date.getDate() + ', ' + S.slot : 'Continuer') + '</button>';
      } else if (S.step === 'space') {
        h += recap() + '<h4 class="rz-h">Où préférez-vous être ?</h4><div class="rz-spaces">' + D.spaces.map(function (sp) {
          var r = remaining(sp), no = r != null && r < S.covers;
          return '<button type="button" class="rz-sp' + (S.space === sp.name ? ' is-sel' : '') + '"' + (no ? ' disabled' : ' data-s="' + esc(sp.name) + '"') + '><strong>' + esc(sp.name) + '</strong><small>' + (r == null ? '' : no ? 'Complet' : r + ' place' + (r > 1 ? 's' : '') + ' restante' + (r > 1 ? 's' : '')) + '</small></button>';
        }).join('') + '<button type="button" class="rz-sp' + (S.space === null ? ' is-sel' : '') + '" data-s=""><strong>Peu importe</strong><small>Le restaurant choisit</small></button></div>' +
          '<p class="rz-note">C’est une préférence : l’équipe fait au mieux selon les disponibilités.</p>' +
          '<button type="button" class="rz-go" id="rz-next"' + (S.space === undefined ? ' disabled' : '') + '>Continuer</button>';
      } else if (S.step === 'form') {
        h += recap() + '<div class="rz-form"><div class="rz-2"><input id="rz-pre" placeholder="Prénom" autocomplete="given-name"><input id="rz-nom" placeholder="Nom" autocomplete="family-name"></div>' +
          '<input id="rz-mail" type="email" placeholder="E-mail (pour la confirmation)" autocomplete="email"><input id="rz-tel" type="tel" placeholder="Téléphone" autocomplete="tel">' +
          '<textarea id="rz-note" rows="2" placeholder="Une précision ? (allergie, anniversaire…)"></textarea>' +
          '<label class="rz-opt"><input type="checkbox" id="rz-optin"> Recevoir les nouvelles du restaurant</label></div>' +
          (S.err ? '<p class="rz-err">' + esc(S.err) + '</p>' : '') +
          '<button type="button" class="rz-go" id="rz-send" disabled>Confirmer la réservation</button>';
      } else if (S.step === 'done') {
        h += '<div class="rz-done"><span>' + IC(CHECK, 26) + '</span><strong>C’est réservé !</strong><p>' + esc(label(S.date)) + ' à ' + S.slot + ', ' + S.covers + ' personne' + (S.covers > 1 ? 's' : '') + '.<br>Confirmation envoyée à ' + esc(S.mail) + '.</p><small>Référence ' + esc(S.ref) + '</small></div>';
      }
      el.innerHTML = h + (test ? '<p class="rz-note">Mode test : écrit sous « ' + esc(WRITE) + ' ».</p>' : '');
      wire();
    }
    function recap() {
      return '<button type="button" class="rz-recap" data-back="1"><span>' + esc(label(S.date)) + ' · ' + S.slot + ' · ' + S.covers + ' pers.' + (S.space ? ' · ' + esc(S.space) : '') + '</span><em>Modifier</em></button>';
    }
    function wire() {
      var q = function (s) { return el.querySelectorAll(s); };
      q('[data-d]').forEach(function (b) { b.addEventListener('click', function () { var p = b.getAttribute('data-d').split('-'); S.date = new Date(+p[0], +p[1] - 1, +p[2]); S.slot = null; draw(); loadBooked().then(draw); }); });
      q('[data-cal]').forEach(function (b) { b.addEventListener('click', function () { S.cal = b.getAttribute('data-cal') === '1'; if (!S.calM) S.calM = new Date((S.date || today).getFullYear(), (S.date || today).getMonth(), 1); draw(); }); });
      q('[data-m]').forEach(function (b) { b.addEventListener('click', function () { S.calM = new Date(S.calM.getFullYear(), S.calM.getMonth() + (+b.getAttribute('data-m')), 1); draw(); }); });
      q('[data-c]').forEach(function (b) { b.addEventListener('click', function () { S.covers = Math.min(MAXC, Math.max(1, S.covers + (+b.getAttribute('data-c')))); if (S.slot && slotFull(S.slot)) S.slot = null; draw(); }); });
      q('[data-t]').forEach(function (b) { b.addEventListener('click', function () { S.slot = b.getAttribute('data-t'); draw(); }); });
      q('[data-s]').forEach(function (b) { b.addEventListener('click', function () { S.space = b.getAttribute('data-s') || null; draw(); }); });
      q('[data-back]').forEach(function (b) { b.addEventListener('click', function () { S.step = 'pick'; draw(); }); });
      var nx = el.querySelector('#rz-next');
      if (nx) nx.addEventListener('click', function () {
        if (S.step === 'pick') { S.step = D.spaces.length ? 'space' : 'form'; if (!D.spaces.length) S.space = null; }
        else if (S.step === 'space') S.step = 'form';
        draw();
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
      var send = el.querySelector('#rz-send');
      if (send) {
        var chk = function () { send.disabled = !(el.querySelector('#rz-pre').value.trim() && el.querySelector('#rz-nom').value.trim() && /\S+@\S+\.\S+/.test(el.querySelector('#rz-mail').value)); };
        q('.rz-form input').forEach(function (i) { i.addEventListener('input', chk); });
        send.addEventListener('click', submit);
      }
    }
    function submit() {
      var v = function (id) { return (el.querySelector('#' + id) || {}).value || ''; };
      var btn = el.querySelector('#rz-send'); btn.disabled = true; btn.textContent = 'Envoi…';
      var ref = (cfg.prefix || 'BLT') + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      var d = S.date;
      var row = {
        ref: ref, client_slug: WRITE, from_name: (v('rz-pre').trim() + ' ' + v('rz-nom').trim()).trim(), from_email: v('rz-mail').trim(),
        phone: v('rz-tel').trim() || 'Non renseigné', date_label: label(d).replace(/^./, function (c) { return c.toUpperCase(); }) + ' ' + d.getFullYear(), date_iso: iso(d),
        slot: S.slot, covers: S.covers, espace: S.space || null, location: cfg.lieu || '', note: v('rz-note').trim() || 'Aucune',
        marketing_optin: !!(el.querySelector('#rz-optin') || {}).checked, offer_code: null, source_code: 'BELTAB'
      };
      sb().then(function (c) {
        return c.from('restaurant_reservations').insert(row).then(function (r) {
          if (r.error && /source_code/.test(r.error.message || '')) { delete row.source_code; return c.from('restaurant_reservations').insert(row); }
          return r;
        });
      }).then(function (r) {
        if (r.error) throw r.error;
        try { fetch(NOTIFY, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug: WRITE, ref: ref }) }).catch(function () {}); } catch (e) {}
        S.ref = ref; S.mail = row.from_email; S.step = 'done'; draw();
      }).catch(function () { S.err = 'La réservation n’est pas partie. Réessayez, ou appelez le restaurant.'; S.step = 'form'; draw(); });
    }

    draw();
    sb().then(function (c) {
      return Promise.all([
        c.from('restaurant_services').select('id,name,start_time,end_time').eq('client_slug', cfg.slug).order('sort_order', { ascending: true }),
        c.from('blocked_dates').select('date_iso').eq('client_slug', cfg.slug),
        c.from('restaurant_spaces').select('id,name').eq('client_slug', cfg.slug).order('sort_order', { ascending: true }),
        c.from('restaurant_tables').select('id,space_id,seats').eq('client_slug', cfg.slug),
        cfg.menu ? c.from('menu_data').select('data').eq('client_slug', cfg.menu).maybeSingle() : Promise.resolve({})
      ]);
    }).then(function (r) {
      D.services = (r[0].data || []);
      D.slots = slotsOf(D.services);
      if (!D.slots.length) D.slots = ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30'];
      (r[1].data || []).forEach(function (x) { D.blocked[x.date_iso] = 1; });
      D.spaces = r[2].data || []; D.tables = r[3].data || [];
      D.closed = closedFrom(r[4].data && r[4].data.data && r[4].data.data.schedule) || cfg.fermes || [];
      D.ready = true;
      var first = nextDays(30).filter(isOpen)[0]; if (first) S.date = first;
      draw(); loadBooked().then(draw);
    }).catch(function () { el.innerHTML = '<p class="rz-err">Les disponibilités ne se chargent pas. Réessayez dans un instant.</p>'; });
  }
  window.BeltabResa = { mount: mount };
})();
