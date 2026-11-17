// Fiche restaurant : statut ouvert/fermé et effacement du plat du jour à minuit.
(function () {
  var chip = document.querySelector('[data-hours]');
  if (chip) {
    try {
      var s = Beltab.status(JSON.parse(chip.getAttribute('data-hours')));
      chip.textContent = s.label;
      chip.classList.toggle('chip-closed', !s.open);
    } catch (e) { chip.remove(); }
  }
  document.querySelectorAll('[data-date]').forEach(function (el) {
    if (!Beltab.isToday(el.getAttribute('data-date'))) el.remove();
  });
})();
