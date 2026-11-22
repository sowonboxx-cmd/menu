// Partager sur les réseaux : lien de la page, ou image prête pour une story (1080 x 1920).
// Sur téléphone, ouvre le menu de partage (Instagram, WhatsApp, Messages…) ; sinon, télécharge l'image ou copie le lien.
(function () {
  var GREEN = '#1F6B45', INK = '#111111', CREAM = '#F3F2EC';

  function link(opts) {
    var url = opts.url || location.href;
    if (navigator.share) return navigator.share({ title: opts.title || document.title, text: opts.text || '', url: url }).catch(function () {});
    return (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { flash('Lien copié'); }).catch(function () { prompt('Copiez le lien :', url); });
  }

  function loadImg(src) {
    return new Promise(function (ok) {
      if (!src) return ok(null);
      var i = new Image(); i.crossOrigin = 'anonymous';
      i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = src;
    });
  }
  function wrap(ctx, text, x, y, max, lh, lines) {
    var words = String(text).split(' '), line = '', n = 0;
    for (var k = 0; k < words.length; k++) {
      var test = line ? line + ' ' + words[k] : words[k];
      if (ctx.measureText(test).width > max && line) {
        if (++n >= lines) { ctx.fillText(line + '…', x, y); return y + lh; }
        ctx.fillText(line, x, y); y += lh; line = words[k];
      } else line = test;
    }
    ctx.fillText(line, x, y); return y + lh;
  }
  function rosette(ctx, cx, cy, r) {
    ctx.save(); ctx.fillStyle = GREEN; ctx.beginPath();
    for (var k = 0; k < 24; k++) { var a = k * Math.PI / 12, rr = k % 2 ? r * 0.86 : r; ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(cx - r * 0.38, cy + r * 0.02); ctx.lineTo(cx - r * 0.1, cy + r * 0.3); ctx.lineTo(cx + r * 0.42, cy - r * 0.28); ctx.stroke();
    ctx.restore();
  }

  // opts : { eyebrow, title, lines[], photo, rosette (restaurant indépendant), badge: 'Vérifié' | 'Déclaré' | '', footer, filename }
  function card(opts) {
    return loadImg(opts.photo).then(function (img) {
      var W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H;
      var x = c.getContext('2d');
      x.fillStyle = CREAM; x.fillRect(0, 0, W, H);
      var top = 0;
      if (img) {
        var ph = 1080, s = Math.max(W / img.width, ph / img.height), w = img.width * s, h = img.height * s;
        x.drawImage(img, (W - w) / 2, (ph - h) / 2, w, h); top = ph;
      } else {
        x.fillStyle = GREEN; x.fillRect(0, 0, W, 700); top = 700;
        x.fillStyle = '#fff'; x.font = '800 120px Inter, system-ui, sans-serif'; x.fillText('Beltab', 80, 420);
      }
      var y = top + 110;
      x.fillStyle = GREEN; x.font = '800 38px Inter, system-ui, sans-serif';
      x.fillText(String(opts.eyebrow || '').toUpperCase(), 80, y); y += 92;
      x.fillStyle = INK; x.font = '800 84px Inter, system-ui, sans-serif';
      var titleEnd = wrap(x, opts.title || '', 80, y, W - 220, 96, 2);
      if (opts.rosette) rosette(x, Math.min(80 + x.measureText(opts.title || '').width + 50, W - 90), y - 28, 30);
      y = titleEnd + 20;
      x.fillStyle = '#5F5F5B'; x.font = '500 44px Inter, system-ui, sans-serif';
      (opts.lines || []).forEach(function (l) { if (l) y = wrap(x, l, 80, y, W - 160, 60, 2) + 6; });
      if (opts.badge) {
        var verified = opts.badge === 'Vérifié';
        x.font = '800 38px Inter, system-ui, sans-serif';
        var bw = x.measureText(opts.badge).width + 64, by = y + 30;
        x.fillStyle = verified ? '#E5F4E4' : '#ECEBE6';
        x.beginPath(); if (x.roundRect) x.roundRect(80, by, bw, 72, 36); else x.rect(80, by, bw, 72); x.fill();
        x.fillStyle = verified ? GREEN : '#5F5F5B'; x.fillText(opts.badge, 112, by + 50);
      }
      x.fillStyle = INK; x.font = '800 52px Inter, system-ui, sans-serif'; x.fillText('beltab.com', 80, H - 110);
      x.fillStyle = '#5F5F5B'; x.font = '500 34px Inter, system-ui, sans-serif'; x.fillText(opts.footer || 'Que des restaurants indépendants', 80, H - 60);
      return new Promise(function (ok) { c.toBlob(function (b) { ok(b); }, 'image/png'); });
    }).then(function (blob) {
      var name = (opts.filename || 'beltab') + '.png';
      var file = new File([blob], name, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: opts.title || 'Beltab' }).catch(function () {});
      }
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
      flash('Image téléchargée');
    });
  }

  function flash(t) {
    var el = document.createElement('div'); el.className = 'jeu-toast'; el.textContent = t; document.body.appendChild(el);
    setTimeout(function () { el.classList.add('out'); }, 1800); setTimeout(function () { el.remove(); }, 2400);
  }

  window.Partage = { link: link, card: card };
})();
