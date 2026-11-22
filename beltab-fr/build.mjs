// Beltab — génère le site statique de beltab.fr dans dist/
// Usage : node build.mjs   (aucune dépendance)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const V = Date.now().toString(36); // version des fichiers /src, change à chaque build
const DIST = path.join(ROOT, 'dist');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/restaurants.json'), 'utf8'));
const { site, restaurants, demo } = data;
const CUISINES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/cuisines.json'), 'utf8'));
const CUISINE = Object.fromEntries(CUISINES.cuisines.map((c) => [c.id, c]));
const REGION = Object.fromEntries(CUISINES.regions.map((x) => [x.id, x]));
const specNom = (c, id) => (CUISINE[c]?.specialites.find((x) => x.id === id) || {}).nom || id;

// ---------- outils ----------
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const write = (rel, content) => {
  const file = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};
const copyDir = (src, dst) => {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f), d = path.join(dst, f);
    fs.statSync(s).isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
};
const urlOf = (r) => `/${r.zone}/${r.slug}/`;

// Niveaux : 0 = gratuit, 1 = Chef (et Local, Starter), 2 = Pro (et Master)
const TIER = { gratuit: 0, chef: 1, local: 1, starter: 1, pro: 2, master: 2 };
const tierOf = (n) => TIER[n] ?? 0;
const PHOTO_LIMIT = [1, 4, Infinity]; // gratuit : la photo de présentation ; Chef, Local, Starter : + 3 plats phares ; Pro et Master : toutes les photos.
// Les 3 plats phares choisis par le restaurant (n'importe quelle rubrique), avec leur photo.
const pharesOf = (r) => (r.phares || []).map((n) => (r.carte || []).flatMap((x) => x.plats).find((pl) => pl.nom === n)).filter(Boolean).slice(0, 3);

const CATEGORIES = { 'bistronomie': 'Bistronomie', 'cuisine-familiale': 'Cuisine familiale', 'bistrot': 'Bistrot', 'bar-a-huitres': 'Bar à huîtres' };
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

const icon = {
  phone: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
  route: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-8-8 18-2-8-8-2z"/></svg>',
  cal: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  ext: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg>',
  check: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"/></svg>',
  share: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5M5 13v8h14v-8"/></svg>',
  map: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg>',
};

// ---------- gabarit commun ----------
// Barre d'onglets du téléphone, en verre dépoli (style « liquid glass ») : Carte, Cuisines, Passeport, Potes.
function tabbar(path) {
  const I = (d) => `<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  const tabs = [
    ['/', 'Carte', 'M9 4L3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5zM9 4v13.5M15 6.5V20', (p) => p === '/' || /^\/paris/.test(p)],
    ['/cuisines/', 'Cuisines', 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9', (p) => p.startsWith('/cuisines')],
    ['/moi/', 'Passeport', 'M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5zM5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3M12 7.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', (p) => p === '/moi/'],
    ['/moi/#classement', 'Potes', 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a6 6 0 0 1 3.5 6', () => false],
  ];
  return `<nav class="tabbar" aria-label="Navigation">${tabs.map(([href, label, d, on]) => `<a href="${href}"${on(path) ? ' class="is-on" aria-current="page"' : ''}>${I(d)}<span>${label}</span></a>`).join('')}</nav>`;
}

function layout({ title, description, body, canonical, image, noindex, jsonld, scripts = [], bodyClass = '' }) {
  const robots = (demo || noindex) ? '<meta name="robots" content="noindex, nofollow">' : '';
  const ogImage = image ? `${site.url}${image}` : '';
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${robots}
${canonical ? `<link rel="canonical" href="${esc(site.url + canonical)}">` : ''}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">` : ''}
<meta name="theme-color" content="#F3F2EC">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Beltab">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/src/styles.css?v=${V}">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head>
<body class="${bodyClass} has-tabbar">
${body}
${tabbar(canonical || '')}
<script src="/src/common.js?v=${V}"></script>
${scripts.map((s) => `<script src="${s.startsWith('/src/') ? s + '?v=' + V : s}"></script>`).join('\n')}
</body>
</html>`;
}

function header() {
  return `<header class="site-header">
<div class="wrap header-row">
<a class="brand" href="/"><span class="brand-name">Beltab</span><span class="brand-sub">Restaurants indépendants</span></a>
<nav aria-label="Navigation principale" class="nav">
<a class="nav-pill" href="/">${icon.map}La carte</a>
<a href="/moi/">Mon passeport</a>
<a href="/regles/">Les règles</a>
<a href="${esc(site.espaceRestaurateur)}">Vous êtes restaurateur ?</a>
</nav>
</div>
</header>`;
}

function footer() {
  return `<footer class="site-footer"><div class="wrap">
<p><strong>Beltab</strong> · ${esc(site.accroche)}</p>
<p><a href="/regles/">Qui peut être sur la carte</a> · <a href="${esc(site.espaceRestaurateur)}">Espace restaurateur</a></p>
</div></footer>`;
}

// ---------- fiche restaurant ----------
function nearest(r, n = 3) {
  const d = (a, b) => Math.hypot(a.lat - b.lat, (a.lng - b.lng) * Math.cos(a.lat * Math.PI / 180));
  return restaurants.filter((o) => o.slug !== r.slug).sort((a, b) => d(r, a) - d(r, b)).slice(0, n)
    .map((o) => ({ o, min: Math.max(1, Math.round(d(r, o) * 111000 / 80)) }));
}

function horairesHtml(h) {
  const hh = (t) => t.replace(/^0(\d)/, '$1').replace(':00', 'h').replace(':', 'h');
  const fmt = (slots) => slots.length ? slots.map(([a, b]) => `${hh(a)}–${hh(b)}`).join(' · ') : 'Fermé';
  return JOURS.map((j) => `<div class="row"><span class="muted">${j[0].toUpperCase() + j.slice(1)}</span><span class="strong">${fmt(h[j] || [])}</span></div>`).join('');
}

function renderFiche(r, niveau, { variant } = {}) {
  const tier = tierOf(niveau);
  const paid = tier >= 1, full = tier >= 2;
  let photoBudget = PHOTO_LIMIT[tier];
  const usePhoto = (src) => { if (!src || photoBudget <= 0) return ''; photoBudget--; return src; };

  const hero = usePhoto(r.photoPrincipale);
  const pdj = r.platDuJour || {};
  const pdjPhoto = paid && pdj.nom ? usePhoto(pdj.photo) : '';

  // carte : gratuit = 1 entrée, 1 plat, 1 dessert ; payant = tout
  let sections;
  if (paid) {
    sections = r.carte;
  } else {
    sections = ['entree', 'plat', 'dessert']
      .map((t) => r.carte.find((s) => s.type === t))
      .filter(Boolean)
      .map((s) => ({ ...s, plats: s.plats.slice(0, 1) }));
  }
  const sectionsHtml = sections.map((s) => `
<div class="menu-section">
<div class="menu-head"><h3>${esc(s.section)}</h3>${s.prix && paid ? `<span class="strong">${esc(s.prix)}</span>` : ''}</div>
${s.plats.map((p) => {
    const ph = full ? usePhoto(p.photo) : '';
    const longPrice = p.prix && p.prix.length > 9;
    return `<div class="dish">${ph ? `<img src="${esc(ph)}" alt="${esc(p.nom)}" loading="lazy" width="80" height="80" data-zoom onerror="this.remove()">` : ''}<span class="dish-name">${esc(p.nom)}${p.description ? `<small class="dish-desc">${esc(p.description)}</small>` : ''}${longPrice ? `<small class="dish-price-line">${esc(p.prix)}</small>` : ''}</span>${p.prix && !longPrice ? `<span class="dish-price">${esc(p.prix)}</span>` : ''}</div>`;
  }).join('')}
</div>`).join('');

  const formules = paid && r.formules?.length ? `<div class="formules">${r.formules.map((f) => `<div class="formule"><div><span class="eyebrow">Formule</span><span class="strong">${esc(f.nom)}</span></div><strong class="big">${esc(f.prix)}</strong></div>`).join('')}</div>` : '';

  // plat du jour
  let pdjHtml = '';
  if (paid && pdj.nom) {
    pdjHtml = `<section class="pdj" data-date="${esc(pdj.date)}">
${pdjPhoto ? `<img src="${esc(pdjPhoto)}" alt="${esc(pdj.nom)}">` : ''}
<div class="pdj-body">
<span class="eyebrow light">Plat du jour</span>
<div class="pdj-line"><span class="pdj-name">${esc(pdj.nom)}</span>${pdj.prix ? `<span class="pdj-price">${esc(pdj.prix)} €</span>` : ''}</div>
${pdj.description ? `<span class="pdj-desc">${esc(pdj.description)}</span>` : ''}
<span class="pdj-note">Publié aujourd'hui par le restaurant, jusqu'à ce soir.</span>
</div></section>`;
  } else if (!paid && pdj.image) {
    pdjHtml = `<section class="card pdj-image" data-date="${esc(pdj.date)}"><h2>L'ardoise du jour</h2><img src="${esc(pdj.image)}" alt="Ardoise du jour envoyée par le restaurant"></section>`;
  }

  const mdj = r.menuDuJour || {};
  const mdjHtml = full && mdj.plat ? `<section class="card mdj" data-date="${esc(mdj.date)}">
<div class="card-head"><h2>Menu du jour</h2>${mdj.prix ? `<strong class="big">${esc(mdj.prix)} €</strong>` : ''}</div>
${mdj.entree ? `<div class="row"><span class="muted">Entrée</span><span>${esc(mdj.entree)}</span></div>` : ''}
<div class="row"><span class="muted">Plat</span><span>${esc(mdj.plat)}</span></div>
${mdj.dessert ? `<div class="row"><span class="muted">Dessert</span><span>${esc(mdj.dessert)}</span></div>` : ''}
</section>` : '';

  // réservation
  const resa = r.reservation || {};
  let resaBtn = '';
  if (paid && resa.type === 'beltab') resaBtn = `<a class="action action-dark" href="${esc(resa.url)}">${icon.cal}Réserver</a>`;
  else if (r.site) resaBtn = `<a class="action" href="${esc(r.site)}" target="_blank" rel="noopener nofollow"><span class="inline">Site web${icon.ext}</span></a>`;

  const actions = `<div class="actions">
${r.telephone ? `<a class="action" href="tel:${esc(r.telephone.replace(/\s/g, ''))}">${icon.phone}Appeler</a>` : `<span class="action action-off">${icon.phone}Appeler</span>`}
<a class="action" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.nom + ' ' + r.adresse)}" rel="nofollow">${icon.route}Itinéraire</a>
${resaBtn}
</div>`;

  const voisins = !paid ? `<section class="voisins"><h2>Autres indépendants à côté</h2><div class="grid-near">${nearest(r).map(({ o, min }) =>
    `<a class="near" href="${urlOf(o)}"><strong>${esc(o.nom)}</strong><span class="muted">${esc((o.categories || []).map((c) => CATEGORIES[c] || c).join(', '))} · ${min} min à pied</span></a>`).join('')}</div></section>` : '';

  const nbPhotos = [r.photoPrincipale, ...(paid ? pharesOf(r).map((pl) => pl.photo) : []), ...(tierOf(r.niveau) >= 2 ? (r.carte || []).flatMap((x) => x.plats.map((pl) => pl.photo)) : [])].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).length;
  const cu = CUISINE[r.cuisine];
  const cats = (cu ? `<a class="chip chip-link" href="/cuisines/${cu.id}/">${esc(cu.nom)}${(r.specialites || []).map((x) => ' · ' + esc(specNom(r.cuisine, x))).join('')}</a>` : '') +
    (r.categories || []).map((c) => `<span class="chip">${esc(CATEGORIES[c] || c)}</span>`).join('');
  const rData = { slug: r.slug, nom: r.nom, url: urlOf(r), logo: r.logo || '', photo: hero || '', quartier: r.arrondissement || '', cuisine: r.cuisine || '', cuisineNom: cu ? cu.nom : '', specialites: r.specialites || [],
    // les boissons ne comptent pas dans le journal (pas de jeu autour de l'alcool)
    carte: sections.filter((x) => !/boisson/i.test(x.section)).map((x) => ({ section: x.section, plats: x.plats.map((pl) => pl.nom) })) };

  const demoSwitch = demo ? `<div class="demo-switch" role="group" aria-label="Voir la fiche en version">
<span>Voir la fiche :</span>
<a href="${urlOf(r)}gratuit/" ${variant === 'gratuit' ? 'aria-current="page"' : ''}>Gratuite</a>
<a href="${urlOf(r)}" ${variant !== 'gratuit' ? 'aria-current="page"' : ''}>${tierOf(r.niveau) >= 1 ? 'Payante (' + esc(r.niveau) + ')' : 'Telle quelle'}</a>
</div>` : '';

  const body = `${header()}
${demoSwitch}
<main class="fiche ${paid ? 'is-paid' : 'is-free'}" data-zoom-group>
${hero ? `<div class="hero"><img src="${esc(hero)}" alt="${esc(r.nom)}" data-zoom onerror="this.parentNode.remove()">${nbPhotos > 1 ? `<button type="button" class="hero-more" onclick="Lightbox.open(this.previousElementSibling)">Voir les ${nbPhotos} photos</button>` : ''}</div>` : ''}
<div class="wrap fiche-grid">
<div class="fiche-main">
<div class="fiche-title">
<div class="title-row"><span class="verified">${icon.check}Restaurant indépendant vérifié</span><button type="button" class="share-btn" id="share-fiche" aria-label="Partager">${icon.share}Partager</button></div>
<h1>${esc(r.nom)}</h1>
<p class="lead">${esc(r.accroche)} ${esc(r.arrondissement)}.</p>
<div class="chips"><span class="chip chip-open" data-hours='${esc(JSON.stringify(r.horaires))}'>Horaires</span><span class="chip">${esc(r.prix)}</span>${cats}${paid && (pdj.nom || mdj.plat) ? '<span class="chip">Plat du jour</span>' : ''}</div>
</div>
${actions}
<div class="jeu-band" id="jeu-band"></div>
${pdjHtml}
${mdjHtml}
${paid && pharesOf(r).length ? `<section class="phares"><h2>Les plats phares</h2><div class="phares-grid">${pharesOf(r).map((pl) => `<div class="phare">${pl.photo ? `<img src="${esc(pl.photo)}" alt="${esc(pl.nom)}" loading="lazy" data-zoom onerror="this.remove()">` : '<span class="phare-ph"></span>'}<strong>${esc(pl.nom)}</strong>${pl.prix ? `<span>${esc(pl.prix)}</span>` : ''}</div>`).join('')}</div></section>` : ''}
<section class="card" id="carte">
<div class="card-head"><h2>La carte</h2><span class="muted small">Mise à jour le ${esc(new Date(r.miseAJour).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }))}</span></div>
${formules}
${sectionsHtml}
${!paid ? '<p class="muted small">Aperçu de la carte : le restaurant présente un plat par catégorie.</p>' : ''}
${paid && r.site ? `<a class="site-more" href="${esc(r.site)}" target="_blank" rel="noopener">Le site du restaurant ›</a>` : ''}
</section>
${r.histoire ? `<section class="card"><h2>Qui est derrière</h2><p>${esc(r.histoire)}</p></section>` : ''}
${voisins}
</div>
<aside class="fiche-side">
<section class="card"><h2>Horaires</h2>${horairesHtml(r.horaires)}</section>
<section class="card"><h2>Adresse</h2><p>${esc(r.adresse)}</p>${r.telephone ? `<p class="muted">${esc(r.telephone)}</p>` : ''}</section>
<section class="card dashed"><strong>Vous êtes le restaurateur ?</strong><p class="muted">${paid ? 'Votre fiche se met à jour depuis votre espace Beltab.' : 'Votre fiche est gratuite. Pour montrer toute votre carte, vos photos et votre plat du jour, passez à l\'offre Chef.'}</p><a href="${esc(site.espaceRestaurateur)}">Gérer ma fiche</a></section>
</aside>
</div>
</main>
${footer()}
<script type="application/json" id="r-data">${JSON.stringify(rData).replace(/</g, '\\u003c')}</script>`;

  const shownMenu = sections.flatMap((s) => s.plats.map((p) => ({ '@type': 'MenuItem', name: p.nom, ...(p.prix && /^\d/.test(p.prix) ? { offers: { '@type': 'Offer', price: p.prix.replace(/[^\d,.]/g, '').replace(',', '.'), priceCurrency: 'EUR' } } : {}) })));
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'Restaurant', name: r.nom, url: site.url + urlOf(r),
    description: r.accroche, priceRange: r.prix,
    address: { '@type': 'PostalAddress', streetAddress: r.adresse, addressLocality: 'Paris', addressCountry: 'FR' },
    geo: { '@type': 'GeoCoordinates', latitude: r.lat, longitude: r.lng },
    ...(r.telephone ? { telephone: r.telephone } : {}),
    ...(hero ? { image: site.url + hero } : {}),
    hasMenu: { '@type': 'Menu', hasMenuItem: shownMenu },
  };

  return layout({
    title: `${r.nom} · restaurant indépendant · ${r.arrondissement} | Beltab`,
    description: `${r.nom}, restaurant indépendant ${r.arrondissement}. ${r.accroche} Carte, horaires et réservation.`,
    canonical: urlOf(r), image: hero || '', noindex: variant === 'gratuit', jsonld,
    scripts: ['/src/fiche.js', '/src/jeu.js', '/src/partage.js', '/src/lightbox.js', '/src/mange.js'], body,
  });
}

// ---------- page carte ----------
function renderCarte() {
  const ico = {
    menu: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    filter: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
    locate: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
    user: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    search: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  };
  const body = `<main class="map-page">
<div id="map" class="map" aria-label="Carte des restaurants indépendants"></div>
<div class="map-top">
<div class="map-bar">
<a class="map-brand" href="/"><span class="map-eyebrow">Paris · 100 % indépendants</span><span class="map-name">Beltab</span></a>
<div class="map-bar-btns"><a class="round-btn me-btn" id="me-btn" href="/moi/" aria-label="Mon passeport">${ico.user}</a>
<button type="button" class="round-btn" id="menu-btn" aria-label="Menu" aria-expanded="false" aria-controls="menu">${ico.menu}</button></div>
</div>
<div class="search-row">
<label class="search">${ico.search}<input id="q" type="search" placeholder="Un quartier, une cuisine, un restaurant" aria-label="Rechercher" autocomplete="off"></label>
<button type="button" class="round-btn" id="filter-btn" aria-label="Filtres" aria-expanded="false" aria-controls="filters">${ico.filter}<span class="badge" id="filter-badge" hidden></span></button>
</div>
<a class="progress-chip" id="progress-chip" href="/moi/" hidden></a>
<ul class="results" id="results" hidden></ul>
<div class="filters" id="filters" role="group" aria-label="Filtres" hidden></div>
<button type="button" class="round-btn locate" id="locate-btn" aria-label="Me localiser">${ico.locate}</button>
</div>
<nav class="menu-panel" id="menu" aria-label="Menu" hidden>
<a href="/">La carte</a>
<a href="/moi/">Mon passeport</a>
<a href="/cuisines/">Les cuisines du monde</a>
<a href="/regles/">Les règles</a>
<a href="${esc(site.espaceRestaurateur)}">Vous êtes restaurateur ?</a>
${demo ? '<p class="menu-note">Version de démonstration : certaines fiches sont des exemples.</p>' : ''}
</nav>
<button type="button" class="outside" id="outside" hidden></button>
<div class="sheet" id="sheet" aria-live="polite" hidden></div>
<div class="booking" id="booking" hidden><div class="booking-panel" role="dialog" aria-modal="true" aria-label="Réserver"><div class="booking-head"><strong id="booking-title">Réserver</strong><button type="button" class="sheet-close" id="booking-close" aria-label="Fermer"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><iframe id="booking-frame" title="Réservation" loading="lazy"></iframe></div></div>
</main>`;
  return layout({
    title: `Beltab · ${site.accroche}`,
    description: 'La carte des restaurants indépendants, authentiques et familiaux à Paris. Pas de chaîne, pas de groupe : que des indépendants.',
    canonical: '/', body, bodyClass: 'is-map',
    scripts: ['https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js', '/src/jeu.js', '/src/partage.js', '/src/lightbox.js', '/src/map.js'],
  }).replace(`<link rel="stylesheet" href="/src/styles.css?v=${V}">`, `<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css">\n<link rel="stylesheet" href="/src/styles.css?v=${V}">`);
}

// ---------- page des règles ----------
function renderRegles() {
  const body = `${header()}
<main class="wrap prose">
<h1>Qui peut être sur la carte</h1>
<p class="lead">Beltab est l'annuaire des restaurants indépendants, authentiques et familiaux. Pas de chaîne, pas de franchise, pas de groupe : les grands groupes ont déjà les moyens de se faire connaître.</p>

<h2>Les conditions</h2>
<ol class="rules">
<li><strong>Indépendant.</strong> Pas de chaîne, pas de franchise, pas de groupe ni de fonds d'investissement au capital.</li>
<li><strong>Présent sur place.</strong> Le patron ou la famille travaille dans le restaurant.</li>
<li><strong>À taille humaine.</strong> 3 établissements au maximum.</li>
<li><strong>Une vraie cuisine.</strong> Chaque restaurant a sa cuisine et ses spécialités. Pas de buffets « à volonté ».</li>
<li><strong>Déclaré et vérifié.</strong> Le restaurateur le déclare à l'inscription, et Beltab le vérifie avec les données publiques des entreprises.</li>
</ol>

<h2>Comment on vérifie</h2>
<p>À l'inscription, nous consultons les données publiques de l'État sur l'entreprise : nombre d'établissements, catégorie d'entreprise et dirigeants. Le restaurateur signe une déclaration sur l'honneur. Si une fiche ne respecte pas les conditions, elle est retirée.</p>

<h2>Nos règles pour vous</h2>
<ul class="rules-plain">
<li><strong>Pas de notes publiques.</strong> Vous pouvez noter vos restaurants pour vous-même ; personne d'autre ne voit vos notes.</li>
<li><strong>Des cartes datées.</strong> Chaque fiche affiche la date de sa dernière mise à jour.</li>
<li><strong>Des fiches tenues par les restaurateurs.</strong> Les prix, les horaires et les plats viennent du restaurant lui-même.</li>
<li><strong>Des photos soignées.</strong> Chaque photo est validée par Beltab avant d'apparaître : nette, belle, sans personne autour. Pas besoin d'un photographe, mais pas de photo floue ou prise à la va-vite. Sinon, nous proposons un photographe.</li>
<li><strong>De vraies photos, pas d'images inventées.</strong> Les photos générées entièrement par une intelligence artificielle sont interdites : elles ne ressemblent jamais à ce qui arrive dans l'assiette. Retoucher une vraie photo (lumière, couleurs, cadrage), y compris avec un outil d'IA, est autorisé.</li>
<li><strong>Les mêmes règles pour tous.</strong> Mêmes catégories, même mise en page : toutes les cartes se lisent de la même façon.</li>
</ul>

<h2>Vous êtes restaurateur ?</h2>
<div class="compare">
<div class="card"><h3>Gratuit</h3><p class="muted">Votre fiche, vos horaires, un aperçu de votre carte : une entrée, un plat, un dessert.</p></div>
<div class="card"><h3>Chef · 29 € par mois</h3><p class="muted">Toute votre carte, vos photos, votre plat du jour mis en page, la réservation. Incluse dans toutes les formules Beltab.</p></div>
</div>
<p><a class="btn" href="${esc(site.espaceRestaurateur)}">Inscrire mon restaurant gratuitement</a></p>
</main>
${footer()}`;
  return layout({
    title: 'Qui peut être sur la carte | Beltab',
    description: 'Les conditions pour figurer sur Beltab, l\'annuaire des restaurants indépendants : pas de chaîne, pas de franchise, pas de groupe.',
    canonical: '/regles/', body,
  });
}

// ---------- jeu : mon passeport ----------
function renderMoi() {
  const body = `${header()}
<main class="wrap moi">
<div class="moi-head">
<div class="moi-avatar" id="moi-avatar">?</div>
<div class="moi-id"><input id="moi-prenom" class="moi-prenom" placeholder="Votre prénom" maxlength="24" aria-label="Votre prénom"><span class="muted small">Explorateur des indépendants</span></div>
</div>
<div class="moi-tabs" role="tablist">
<button type="button" role="tab" data-tab="passeport" aria-selected="true">Passeport</button>
<button type="button" role="tab" data-tab="journal" aria-selected="false">Journal</button>
<button type="button" role="tab" data-tab="classement" aria-selected="false">Classement</button>
</div>
<section id="tab-passeport" class="moi-tab"></section>
<section id="tab-journal" class="moi-tab" hidden></section>
<section id="tab-classement" class="moi-tab" hidden></section>
<p class="muted small moi-local">Pour l'instant, votre passeport est gardé sur ce téléphone. Les comptes Beltab permettront bientôt de le retrouver partout et de suivre vos potes.</p>
</main>
${footer()}`;
  return layout({ title: 'Mon passeport | Beltab', description: 'Votre tour du monde des restaurants indépendants : cuisines goûtées, journal et classement.', canonical: '/moi/', noindex: true, body, scripts: ['/src/jeu.js', '/src/partage.js', '/src/moi.js'] });
}

// ---------- jeu : cuisines du monde ----------
function renderCuisines() {
  const regions = CUISINES.regions.map((rg) => {
    const list = CUISINES.cuisines.filter((c) => c.region === rg.id);
    return `<section class="cu-region"><h2>${esc(rg.nom)}</h2><div class="cu-grid">${list.map((c) => {
      const n = restaurants.filter((r) => r.cuisine === c.id).length;
      return `<a class="cu-tile" href="/cuisines/${c.id}/" data-cuisine="${c.id}" style="--c:${rg.couleur}"><span class="cu-ico">${esc(c.nom.slice(0, 2).toUpperCase())}</span><span class="cu-txt"><strong>${esc(c.nom)}</strong><small>${c.specialites.length ? c.specialites.length + ' spécialités · ' : ''}${n} restaurant${n > 1 ? 's' : ''}</small></span><span class="cu-state" aria-hidden="true"></span></a>`;
    }).join('')}</div></section>`;
  }).join('');
  const body = `${header()}
<main class="wrap cu">
<h1>Les cuisines du monde</h1>
<p class="lead">Faites le tour du monde sans quitter Paris, chez des restaurants indépendants. Chaque cuisine se découpe en spécialités : chacune est une case de votre passeport.</p>
<div class="cu-progress" id="cu-progress"></div>
${regions}
</main>
${footer()}`;
  return layout({ title: 'Les cuisines du monde | Beltab', description: 'Japonaise, coréenne, géorgienne, bretonne… les cuisines et spécialités des restaurants indépendants de Paris.', canonical: '/cuisines/', body, scripts: ['/src/jeu.js', '/src/cuisines.js'] });
}

function renderCuisine(c) {
  const rg = REGION[c.region];
  const restos = restaurants.filter((r) => r.cuisine === c.id);
  const card = (r) => `<a class="cu-resto" href="${urlOf(r)}" data-slug="${r.slug}">${r.logo ? `<img src="${esc(r.logo)}" alt="" loading="lazy">` : `<span class="cu-resto-ph"></span>`}<span><strong>${esc(r.nom)}</strong><small>${esc(r.arrondissement)} · ${esc(r.prix)}</small></span><span class="cu-done" hidden>Fait</span></a>`;
  const specs = c.specialites.length ? c.specialites.map((sp) => {
    const rs = restos.filter((r) => (r.specialites || []).includes(sp.id));
    return `<section class="cu-spec" data-spec="${sp.id}"><div class="cu-spec-head"><span class="cu-state" aria-hidden="true"></span><div><h2>${esc(sp.nom)}</h2><span class="muted small">${esc(sp.desc)}</span></div></div>
${rs.length ? `<div class="cu-restos">${rs.map(card).join('')}</div>` : `<p class="muted small cu-empty">Pas encore de restaurant indépendant sur la carte. Vous en connaissez un ? <a href="${esc(site.espaceRestaurateur)}">Dites-le-nous</a>.</p>`}</section>`;
  }).join('') : (restos.length ? `<div class="cu-restos">${restos.map(card).join('')}</div>` : `<p class="muted cu-empty">Pas encore de restaurant ${esc(c.nom.toLowerCase())} indépendant sur la carte.</p>`);
  const body = `${header()}
<main class="wrap cu" data-cuisine="${c.id}">
<a class="cu-back" href="/cuisines/">${esc(rg.nom)}</a>
<h1>${esc(c.nom)}</h1>
<p class="lead">${restos.length} restaurant${restos.length > 1 ? 's' : ''} indépendant${restos.length > 1 ? 's' : ''}${c.specialites.length ? ` · ${c.specialites.length} spécialités` : ''}. Que des restaurants spécialisés : pas de buffets « à volonté ».</p>
<div class="cu-progress" id="cu-progress"></div>
<div class="cu-specs">${specs}</div>
</main>
${footer()}`;
  return layout({ title: `Cuisine ${c.nom.toLowerCase()} : restaurants indépendants à Paris | Beltab`, description: `Les restaurants indépendants de cuisine ${c.nom.toLowerCase()} à Paris${c.specialites.length ? ' : ' + c.specialites.map((x) => x.nom).join(', ') : ''}.`, canonical: `/cuisines/${c.id}/`, body, scripts: ['/src/jeu.js', '/src/cuisines.js'] });
}

// ---------- génération ----------
fs.rmSync(DIST, { recursive: true, force: true });
copyDir(path.join(ROOT, 'src'), path.join(DIST, 'src'));
copyDir(path.join(ROOT, 'assets'), path.join(DIST, 'assets'));

write('index.html', renderCarte());
write('regles/index.html', renderRegles());
write('moi/index.html', renderMoi());
write('cuisines/index.html', renderCuisines());
for (const c of CUISINES.cuisines) write(`cuisines/${c.id}/index.html`, renderCuisine(c));
write('cuisines.json', JSON.stringify({ regions: CUISINES.regions, cuisines: CUISINES.cuisines }));
for (const r of restaurants) {
  write(`${r.zone}/${r.slug}/index.html`, renderFiche(r, r.niveau, {}));
  if (demo && tierOf(r.niveau) >= 1) write(`${r.zone}/${r.slug}/gratuit/index.html`, renderFiche(r, 'gratuit', { variant: 'gratuit' }));
}

// données publiques pour la carte
const pub = restaurants.map((r) => {
  const paid = tierOf(r.niveau) >= 1;
  return {
    slug: r.slug, nom: r.nom, url: urlOf(r), paid, lat: r.lat, lng: r.lng, accroche: r.accroche,
    arrondissement: r.arrondissement, categories: r.categories, cuisine: r.cuisine || '', specialites: r.specialites || [], prix: r.prix, horaires: r.horaires,
    photo: r.photoPrincipale || '',
    logo: r.logo || '',
    adresse: r.adresse || '', telephone: r.telephone || '', miseAJour: r.miseAJour || '',
    // galerie selon le niveau : gratuit = la photo de présentation, Chef/Starter = 3, Pro/Master = toutes
    photos: [r.photoPrincipale, ...(paid ? pharesOf(r).map((pl) => pl.photo) : []), ...(tierOf(r.niveau) >= 2 ? (r.carte || []).flatMap((x) => x.plats.map((pl) => pl.photo)) : [])].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i),
    // la carte entière pour l'onglet Menu de la colonne (payant) ; en gratuit, l'aperçu suffit
    carte: paid ? (r.carte || []).map((x) => ({ section: x.section, prix: x.prix || '', plats: x.plats.map((pl) => ({ nom: pl.nom, prix: pl.prix || '', desc: pl.description || '' })) })) : [],
    phares: paid ? pharesOf(r).map((pl) => ({ nom: pl.nom, prix: pl.prix || '', photo: pl.photo || '' })) : [],
    // aperçu de la carte pour la colonne de gauche : gratuit = 3 plats, payant = les premières rubriques
    apercu: paid
      ? (r.carte || []).filter((x) => !/boisson/i.test(x.section)).slice(0, 3).map((x) => ({ section: x.section, plats: x.plats.slice(0, 4).map((pl) => ({ nom: pl.nom, prix: pl.prix || '' })) }))
      : ['entree', 'plat', 'dessert'].map((t) => (r.carte || []).find((x) => x.type === t)).filter(Boolean).map((x) => ({ section: x.section, plats: x.plats.slice(0, 1).map((pl) => ({ nom: pl.nom, prix: pl.prix || '' })) })),
    site: r.site || '',
    reservation: r.reservation && r.reservation.url ? { type: paid && r.reservation.type === 'beltab' ? 'beltab' : 'externe', url: r.reservation.url, nom: r.reservation.nom || '' } : null,
    platDuJour: paid && r.platDuJour?.nom ? { date: r.platDuJour.date, nom: r.platDuJour.nom, prix: r.platDuJour.prix } : null,
  };
});
write('restaurants.json', JSON.stringify({ demo, categories: CATEGORIES, restaurants: pub }));
write('_headers', '/restaurants.json\n  Cache-Control: public, max-age=300\n/assets/*\n  Cache-Control: public, max-age=86400\n');
write('404.html', layout({ title: 'Page introuvable | Beltab', description: 'Page introuvable', noindex: true, body: `${header()}<main class="wrap prose"><h1>Page introuvable</h1><p><a href="/">Revenir à la carte</a></p></main>` }));
if (!demo) write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
else write('robots.txt', 'User-agent: *\nDisallow: /\n');
write('manifest.webmanifest', JSON.stringify({ name: 'Beltab', short_name: 'Beltab', start_url: '/', display: 'standalone', background_color: '#F3F2EC', theme_color: '#F3F2EC', lang: 'fr' }));
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['/', '/regles/', '/cuisines/', ...CUISINES.cuisines.map((c) => `/cuisines/${c.id}/`), ...restaurants.map(urlOf)].map((u) => `<url><loc>${site.url}${u}</loc></url>`).join('\n')}\n</urlset>\n`);

console.log(`OK : ${restaurants.length} restaurants, site généré dans dist/${demo ? ' (mode démo : non indexé)' : ''}`);
