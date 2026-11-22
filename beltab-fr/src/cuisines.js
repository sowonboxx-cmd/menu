// Pages cuisines : coche ce qui est déjà goûté (données du journal sur l'appareil).
(function () {
  if (!window.Jeu) return;
  var CHECK = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var st = Jeu.stats(null, null);
  document.querySelectorAll('[data-cuisine].cu-tile').forEach(function (t) {
    if (st.cuisines[t.getAttribute('data-cuisine')]) { t.classList.add('is-done'); t.querySelector('.cu-state').innerHTML = CHECK; }
  });
  document.querySelectorAll('[data-spec]').forEach(function (s) {
    if (st.specialites[s.getAttribute('data-spec')]) { s.classList.add('is-done'); s.querySelector('.cu-state').innerHTML = CHECK; }
  });
  document.querySelectorAll('[data-slug]').forEach(function (a) {
    if (st.slugs[a.getAttribute('data-slug')]) a.querySelector('.cu-done').hidden = false;
  });
  var p = document.getElementById('cu-progress');
  if (!p) return;
  var main = document.querySelector('main[data-cuisine]');
  if (main) {
    var specs = document.querySelectorAll('[data-spec]');
    var done = document.querySelectorAll('[data-spec].is-done').length;
    if (specs.length) p.innerHTML = '<strong>' + done + ' / ' + specs.length + ' spécialités goûtées</strong><div class="bar"><span style="width:' + Math.round(done / specs.length * 100) + '%"></span></div>';
    else p.innerHTML = st.cuisines[main.getAttribute('data-cuisine')] ? '<strong>Cuisine goûtée</strong>' : '<strong>Pas encore goûtée</strong>';
  } else {
    var all = document.querySelectorAll('.cu-tile').length;
    var n = document.querySelectorAll('.cu-tile.is-done').length;
    p.innerHTML = '<strong>Votre tour du monde : ' + n + ' / ' + all + ' cuisines</strong><div class="bar"><span style="width:' + Math.round(n / all * 100) + '%"></span></div>';
  }
})();
