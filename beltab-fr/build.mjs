// Beltab — génère le site statique de beltab.fr dans dist/
// Usage : node build.mjs   (aucune dépendance)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const DIST = path.join(ROOT, 'dist');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/restaurants.json'), 'utf8'));
const { site, restaurants, demo } = data;

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
const PHOTO_LIMIT = [0, 3, Infinity];

const CATEGORIES = { 'bistronomie': 'Bistronomie', 'cuisine-familiale': 'Cuisine familiale', 'bistrot': 'Bistrot' };
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

const icon = {
  phone: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
  route: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-8-8 18-2-8-8-2z"/></svg>',
  cal: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  ext: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg>',
  check: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"/></svg>',
  map: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg>',
};

// ---------- gabarit commun ----------
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
<meta name="theme-color" content="#F6F6F4">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/src/styles.css">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head>
<body class="${bodyClass}">
${demo ? '<div class="demo-banner">Version de démonstration : les restaurants et les prix sont des exemples.</div>' : ''}
${body}
<script src="/src/common.js"></script>
${scripts.map((s) => `<script src="${s}"></script>`).join('\n')}
</body>
</html>`;
}

function header() {
  return `<header class="site-header">
<div class="wrap header-row">
<a class="brand" href="/"><span class="brand-name">Beltab</span><span class="brand-sub">Restaurants indépendants</span></a>
<nav aria-label="Navigation principale" class="nav">
<a class="nav-pill" href="/">${icon.map}La carte</a>
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
  const fmt = (slots) => slots.length ? slots.map(([a, b]) => `${a.replace(':00', 'h').replace(':', 'h')}–${b.replace(':00', 'h').replace(':', 'h')}`).join(' · ') : 'Fermé';
  return JOURS.map((j) => `<div class="row"><span class="muted">${j[0].toUpperCase() + j.slice(1)}</span><span class="strong">${fmt(h[j] || [])}</span></div>`).join('');
}

function renderFiche(r, niveau, { variant } = {}) {
  const tier = tierOf(niveau);
  const paid = tier >= 1, full = tier >= 2;
  let photoBudget = PHOTO_LIMIT[tier];
  const usePhoto = (src) => { if (!src || photoBudget <= 0) return ''; photoBudget--; return src; };

  const hero = paid ? usePhoto(r.photoPrincipale) : '';
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
    const ph = paid ? usePhoto(p.photo) : '';
    return `<div class="dish">${ph ? `<img src="${esc(ph)}" alt="${esc(p.nom)}" loading="lazy" width="80" height="80">` : ''}<span class="dish-name">${esc(p.nom)}</span>${p.prix ? `<span class="dish-price">${esc(p.prix)}</span>` : ''}</div>`;
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
  else if (resa.url) resaBtn = `<a class="action action-outline" href="${esc(resa.url)}" rel="nofollow"><span class="inline">Réserver${icon.ext}</span><small>via ${esc(resa.nom || 'le restaurant')}</small></a>`;

  const actions = `<div class="actions">
${r.telephone ? `<a class="action" href="tel:${esc(r.telephone.replace(/\s/g, ''))}">${icon.phone}Appeler</a>` : `<span class="action action-off">${icon.phone}Appeler</span>`}
<a class="action" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.nom + ' ' + r.adresse)}" rel="nofollow">${icon.route}Itinéraire</a>
${resaBtn}
</div>`;

  const voisins = !paid ? `<section class="voisins"><h2>Autres indépendants à côté</h2><div class="grid-near">${nearest(r).map(({ o, min }) =>
    `<a class="near" href="${urlOf(o)}"><strong>${esc(o.nom)}</strong><span class="muted">${esc((o.categories || []).map((c) => CATEGORIES[c] || c).join(', '))} · ${min} min à pied</span></a>`).join('')}</div></section>` : '';

  const cats = (r.categories || []).map((c) => `<span class="chip">${esc(CATEGORIES[c] || c)}</span>`).join('');

  const demoSwitch = demo ? `<div class="demo-switch" role="group" aria-label="Voir la fiche en version">
<span>Voir la fiche :</span>
<a href="${urlOf(r)}gratuit/" ${variant === 'gratuit' ? 'aria-current="page"' : ''}>Gratuite</a>
<a href="${urlOf(r)}" ${variant !== 'gratuit' ? 'aria-current="page"' : ''}>${tierOf(r.niveau) >= 1 ? 'Payante (' + esc(r.niveau) + ')' : 'Telle quelle'}</a>
</div>` : '';

  const body = `${header()}
${demoSwitch}
<main class="fiche ${paid ? 'is-paid' : 'is-free'}">
${hero ? `<div class="hero"><img src="${esc(hero)}" alt="${esc(r.nom)}"></div>` : ''}
<div class="wrap fiche-grid">
<div class="fiche-main">
<div class="fiche-title">
<span class="verified">${icon.check}Restaurant indépendant vérifié</span>
<h1>${esc(r.nom)}</h1>
<p class="lead">${esc(r.accroche)} ${esc(r.arrondissement)}.</p>
<div class="chips"><span class="chip chip-open" data-hours='${esc(JSON.stringify(r.horaires))}'>Horaires</span><span class="chip">${esc(r.prix)}</span>${cats}${paid && (pdj.nom || mdj.plat) ? '<span class="chip">Plat du jour</span>' : ''}</div>
</div>
${actions}
${pdjHtml}
${mdjHtml}
<section class="card">
<div class="card-head"><h2>La carte</h2><span class="muted small">Mise à jour le ${esc(new Date(r.miseAJour).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }))}</span></div>
${formules}
${sectionsHtml}
${!paid ? '<p class="muted small">Aperçu de la carte : le restaurant présente un plat par catégorie.</p>' : ''}
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
${footer()}`;

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
    scripts: ['/src/fiche.js'], body,
  });
}

// ---------- page carte ----------
function renderCarte() {
  const body = `${header()}
<main class="map-page">
<div id="map" class="map" aria-label="Carte des restaurants indépendants"></div>
<div class="map-top">
<p class="map-tagline">${esc(site.accroche)}</p>
<label class="search"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="q" type="search" placeholder="Un quartier, une cuisine, un restaurant" aria-label="Rechercher"></label>
<div class="filters" id="filters" role="group" aria-label="Filtres"></div>
</div>
<div class="sheet" id="sheet" aria-live="polite"></div>
</main>`;
  return layout({
    title: `Beltab · ${site.accroche}`,
    description: 'La carte des restaurants indépendants, authentiques et familiaux à Paris. Pas de chaîne, pas de groupe : que des indépendants.',
    canonical: '/', body, bodyClass: 'is-map',
    scripts: ['https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js', '/src/map.js'],
  }).replace('<link rel="stylesheet" href="/src/styles.css">', '<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css">\n<link rel="stylesheet" href="/src/styles.css">');
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
<li><strong>Déclaré et vérifié.</strong> Le restaurateur le déclare à l'inscription, et Beltab le vérifie avec les données publiques des entreprises.</li>
</ol>

<h2>Comment on vérifie</h2>
<p>À l'inscription, nous consultons les données publiques de l'État sur l'entreprise : nombre d'établissements, catégorie d'entreprise et dirigeants. Le restaurateur signe une déclaration sur l'honneur. Si une fiche ne respecte pas les conditions, elle est retirée.</p>

<h2>Nos règles pour vous</h2>
<ul class="rules-plain">
<li><strong>Pas de notes publiques.</strong> Vous pouvez noter vos restaurants pour vous-même ; personne d'autre ne voit vos notes.</li>
<li><strong>Des cartes datées.</strong> Chaque fiche affiche la date de sa dernière mise à jour.</li>
<li><strong>Des fiches tenues par les restaurateurs.</strong> Les prix, les horaires et les plats viennent du restaurant lui-même.</li>
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

// ---------- génération ----------
fs.rmSync(DIST, { recursive: true, force: true });
copyDir(path.join(ROOT, 'src'), path.join(DIST, 'src'));
copyDir(path.join(ROOT, 'assets'), path.join(DIST, 'assets'));

write('index.html', renderCarte());
write('regles/index.html', renderRegles());
for (const r of restaurants) {
  write(`${r.zone}/${r.slug}/index.html`, renderFiche(r, r.niveau, {}));
  if (demo && tierOf(r.niveau) >= 1) write(`${r.zone}/${r.slug}/gratuit/index.html`, renderFiche(r, 'gratuit', { variant: 'gratuit' }));
}

// données publiques pour la carte
const pub = restaurants.map((r) => {
  const paid = tierOf(r.niveau) >= 1;
  return {
    slug: r.slug, nom: r.nom, url: urlOf(r), lat: r.lat, lng: r.lng, accroche: r.accroche,
    arrondissement: r.arrondissement, categories: r.categories, prix: r.prix, horaires: r.horaires,
    photo: paid ? r.photoPrincipale || '' : '',
    platDuJour: paid && r.platDuJour?.nom ? { date: r.platDuJour.date, nom: r.platDuJour.nom, prix: r.platDuJour.prix } : null,
  };
});
write('restaurants.json', JSON.stringify({ demo, categories: CATEGORIES, restaurants: pub }));
write('_headers', '/restaurants.json\n  Cache-Control: public, max-age=300\n/assets/*\n  Cache-Control: public, max-age=86400\n');
write('404.html', layout({ title: 'Page introuvable | Beltab', description: 'Page introuvable', noindex: true, body: `${header()}<main class="wrap prose"><h1>Page introuvable</h1><p><a href="/">Revenir à la carte</a></p></main>` }));
if (!demo) write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
else write('robots.txt', 'User-agent: *\nDisallow: /\n');
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['/', '/regles/', ...restaurants.map(urlOf)].map((u) => `<url><loc>${site.url}${u}</loc></url>`).join('\n')}\n</urlset>\n`);

console.log(`OK : ${restaurants.length} restaurants, site généré dans dist/${demo ? ' (mode démo : non indexé)' : ''}`);
