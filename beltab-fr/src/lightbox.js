// Visionneuse : on touche une photo, elle s'ouvre en grand ; on passe de l'une à l'autre (flèches, glisser, clavier).
// Marche pour toute image portant data-zoom ; les photos d'un même bloc [data-zoom-group] défilent ensemble.
(function () {
  var box, img, cap, list = [], idx = 0, startX = null;
  var ARROW = function (d) { return '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>'; };

  function build() {
    box = document.createElement('div');
    box.className = 'lb';
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Photos');
    box.innerHTML = '<button type="button" class="lb-close" aria-label="Fermer">' + ARROW('M6 6l12 12M18 6L6 18') + '</button>' +
      '<button type="button" class="lb-nav lb-prev" aria-label="Photo précédente">' + ARROW('M15 6l-6 6 6 6') + '</button>' +
      '<figure class="lb-fig"><img alt=""><figcaption></figcaption></figure>' +
      '<button type="button" class="lb-nav lb-next" aria-label="Photo suivante">' + ARROW('M9 6l6 6-6 6') + '</button>';
    document.body.appendChild(box);
    img = box.querySelector('img'); cap = box.querySelector('figcaption');
    box.querySelector('.lb-close').addEventListener('click', close);
    box.querySelector('.lb-prev').addEventListener('click', function (e) { e.stopPropagation(); go(-1); });
    box.querySelector('.lb-next').addEventListener('click', function (e) { e.stopPropagation(); go(1); });
    box.addEventListener('click', function (e) { if (e.target === box || e.target.classList.contains('lb-fig')) close(); });
    box.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX; startX = null;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    });
    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1);
    });
  }
  function show() {
    var it = list[idx];
    img.src = it.src; img.alt = it.alt || '';
    cap.textContent = (it.alt ? it.alt + ' · ' : '') + (idx + 1) + ' / ' + list.length;
    box.querySelector('.lb-prev').hidden = box.querySelector('.lb-next').hidden = list.length < 2;
  }
  function go(d) { idx = (idx + d + list.length) % list.length; show(); }
  function open(target) {
    if (!box) build();
    var scope = target.closest('[data-zoom-group]') || document;
    var seen = {};
    list = [].slice.call(scope.querySelectorAll('img[data-zoom]')).map(function (i) { return { src: i.currentSrc || i.src, alt: i.alt }; })
      .filter(function (x) { if (!x.src || seen[x.src]) return false; seen[x.src] = 1; return true; });
    idx = Math.max(0, list.map(function (x) { return x.src; }).indexOf(target.currentSrc || target.src));
    show();
    box.classList.add('is-open');
    document.body.classList.add('no-scroll');
  }
  function close() { box.classList.remove('is-open'); document.body.classList.remove('no-scroll'); }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('img[data-zoom]');
    if (!t) return;
    e.preventDefault();
    open(t);
  });
  window.Lightbox = { open: open };
})();
