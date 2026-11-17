// Outils partagés : heure de Paris, ouvert maintenant, plat du jour du jour.
(function () {
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

  function parisParts() {
    var f = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', weekday: 'long', hour12: false
    });
    var p = {};
    f.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return p;
  }

  function todayParis() {
    var p = parisParts();
    return p.year + '-' + p.month + '-' + p.day;
  }

  function toMin(hhmm) { var s = hhmm.split(':'); return (+s[0]) * 60 + (+s[1]); }
  function fmt(hhmm) { return hhmm.replace(':00', 'h').replace(':', 'h'); }

  // Renvoie { open: bool, label: 'Ouvert · ferme à 14h30' | 'Fermé · ouvre à 19h' | 'Fermé aujourd'hui' }
  function status(horaires) {
    var p = parisParts();
    var jour = p.weekday.toLowerCase();
    var now = (+p.hour % 24) * 60 + (+p.minute);
    var slots = (horaires && horaires[jour]) || [];
    for (var i = 0; i < slots.length; i++) {
      var a = toMin(slots[i][0]), b = toMin(slots[i][1]);
      if (b <= a) b += 24 * 60;
      if (now >= a && now < b) return { open: true, label: 'Ouvert · ferme à ' + fmt(slots[i][1]) };
    }
    for (var j = 0; j < slots.length; j++) {
      if (toMin(slots[j][0]) > now) return { open: false, label: 'Fermé · ouvre à ' + fmt(slots[j][0]) };
    }
    return { open: false, label: slots.length ? 'Fermé pour aujourd’hui' : 'Fermé aujourd’hui' };
  }

  // Un plat du jour n'est valable que le jour de sa publication ("auto" = démo, toujours valable).
  function isToday(date) { return date === 'auto' || date === todayParis(); }

  window.Beltab = { todayParis: todayParis, status: status, isToday: isToday, JOURS: JOURS };
})();
