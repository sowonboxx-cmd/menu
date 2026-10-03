// Kuisto — SEO / GEO pour les sites restaurants (un seul fichier pour tous les sites).
//
// Pourquoi : la carte est construite en JavaScript depuis Supabase. Google l'exécute parfois,
// mais Bing et les robots des IA (ChatGPT, Claude, Perplexity) ne lancent généralement pas le
// JavaScript : ils voyaient une page titrée « Menu », sans plat, sans horaire, sans adresse.
//
// Ce que fait ce Worker, au moment où Cloudflare sert la page :
//   /             → la même page, avec en plus dans le HTML : titre et description du restaurant,
//                   balises de partage, données structurées schema.org (Restaurant + Menu), et un
//                   bloc texte (adresse, horaires, carte complète) retiré dès que le JavaScript
//                   démarre — un visiteur voit exactement le site d'avant.
//   /robots.txt   → autorise les moteurs et les robots IA (recette : tout bloqué)
//   /sitemap.xml  → liste des pages publiques
//   /llms.txt     → résumé texte du restaurant pour les IA
// Tout le reste est servi tel quel. Les données viennent de la même ligne Supabase que le site
// (menu_data / client_slug), gardées en cache 5 minutes.
//
// Réglages par site, dans le fichier wrangler du site (bloc "vars") :
//   CLIENT_SLUG       slug Supabase du restaurant (ex. "drevici")
//   SITE_ENV          "production" ou "preview" (la recette n'est jamais indexée)
//   CANONICAL_ORIGIN  domaine définitif du restaurant (ex. "https://drevici-oyster.fr") ;
//                     vide = l'adresse sur laquelle la page est servie
//   SUPABASE_URL / SUPABASE_KEY  même projet et même clé publique que la page

const CACHE_SECONDS = 300;
const PUBLIC_PAGES = ['/', '/resa'];
const PRIVATE_PATHS = ['/admin', '/admin.html', '/qrc', '/qrc.html', '/qrf', '/qrf.html', '/calendar', '/calendar.html', '/fidelite', '/fidelite.html'];
const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const DAYS_SCHEMA = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const isPreview = (env.SITE_ENV || 'production') !== 'production';
    let res;
    try {
      res = await route(request, url, env, ctx, isPreview);
    } catch (e) {
      // Jamais de page cassée à cause du SEO : en cas de souci, on sert le fichier d'origine.
      console.error('menu-seo', e && e.stack || e);
      res = await env.ASSETS.fetch(request);
    }
    if (isPreview) {
      res = new Response(res.body, res);
      res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    } else if (PRIVATE_PATHS.includes(url.pathname)) {
      res = new Response(res.body, res);
      res.headers.set('X-Robots-Tag', 'noindex');
    }
    return res;
  }
};

async function route(request, url, env, ctx, isPreview) {
  const path = url.pathname;
  if (request.method !== 'GET' && request.method !== 'HEAD') return env.ASSETS.fetch(request);

  if (path === '/robots.txt') return text(robotsTxt(url, env, isPreview));
  if (path === '/sitemap.xml') {
    const row = await loadRow(env, ctx);
    return new Response(sitemapXml(origin(url, env), row), { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=300' } });
  }
  if (path === '/llms.txt') {
    const row = await loadRow(env, ctx);
    return text(row ? llmsTxt(row.data, origin(url, env)) : '# Menu\n');
  }

  const res = await env.ASSETS.fetch(request);
  const type = res.headers.get('content-type') || '';
  if ((path === '/' || path === '/index.html') && res.ok && type.includes('text/html')) {
    const row = await loadRow(env, ctx);
    if (!row) return res;
    return enrichHomePage(res, row.data, origin(url, env), isPreview);
  }
  return res;
}

// ---------- données ----------

async function loadRow(env, ctx) {
  const slug = env.CLIENT_SLUG;
  if (!slug || !env.SUPABASE_URL || !env.SUPABASE_KEY) return null;
  const api = `${env.SUPABASE_URL}/rest/v1/menu_data?client_slug=eq.${encodeURIComponent(slug)}&select=data,updated_at`;
  const cache = caches.default;
  const key = new Request(`https://menu-seo.cache/${encodeURIComponent(slug)}`);
  const hit = await cache.match(key);
  if (hit) return hit.json();
  const r = await fetch(api, { headers: { apikey: env.SUPABASE_KEY, Authorization: `Bearer ${env.SUPABASE_KEY}` } });
  if (!r.ok) return null;
  const rows = await r.json();
  const row = Array.isArray(rows) && rows[0] && rows[0].data ? rows[0] : null;
  if (row) {
    ctx.waitUntil(cache.put(key, new Response(JSON.stringify(row), { headers: { 'cache-control': `public, max-age=${CACHE_SECONDS}` } })));
  }
  return row;
}

function origin(url, env) {
  return (env.CANONICAL_ORIGIN || url.origin).replace(/\/+$/, '');
}

// ---------- extraction des infos du restaurant ----------

const fr = v => (v && typeof v === 'object') ? (v.fr || '') : (v || '');
const clean = s => String(s || '').replace(/\s+/g, ' ').trim();

function niceName(raw) {
  const s = clean(raw);
  // « DREVICI OYSTER » → « Drevici Oyster » (les noms tout en majuscules lisent mal dans un titre)
  if (s && s === s.toUpperCase() && /[A-Z]/.test(s)) {
    return s.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  }
  return s;
}

function info(d) {
  const seo = d.seo || {};
  const name = niceName(d.restaurantName) || 'Restaurant';
  const a = d.address || {};
  const street = clean(a.street), zip = clean(a.zip), city = clean(a.city);
  const addrLine = [street, [zip, city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const headline = clean(fr((d.homeCover || {}).headline)).replace(/\.$/, '');
  const intro = (d.intro && d.intro.active !== false) ? clean(fr(d.intro.text)) : '';
  const phoneDigits = String(a.phone || '').replace(/[^\d+]/g, '');
  const phoneIntl = /^0\d{9}$/.test(phoneDigits) ? '+33' + phoneDigits.slice(1) : phoneDigits;
  const phonePretty = /^0\d{9}$/.test(phoneDigits) ? phoneDigits.replace(/(\d{2})(?=\d)/g, '$1 ') : clean(a.phone);
  const s = d.social || {};
  const sameAs = [
    s.instagram && (/^https?:/.test(s.instagram) ? s.instagram : `https://www.instagram.com/${s.instagram.replace(/^@/, '')}`),
    s.facebook && (/^https?:/.test(s.facebook) ? s.facebook : `https://www.facebook.com/${s.facebook}`),
    s.tiktok && (/^https?:/.test(s.tiktok) ? s.tiktok : `https://www.tiktok.com/@${s.tiktok.replace(/^@/, '')}`),
    s.website, a.mapsUrl
  ].filter(Boolean);
  const reserveUrl = clean((d.homeCover || {}).cta2Url);
  const image = clean((d.homeCover || {}).image) || clean(((d.homeCover || {}).slideshow || [])[0] && d.homeCover.slideshow[0].image);
  const logo = clean((d.homeCover || {}).logo) || clean(d.restaurantLogo);
  const sections = (d.tabs || [])
    .filter(t => t.visible !== false && t.id !== '__home')
    .map(t => ({
      name: clean(fr(t.label)),
      groups: (t.cards || []).map(c => c.type === 'variants' ? variantsGroup(c) : ({
        name: clean(fr(c.label)),
        dishes: (c.dishes || c.items || []).filter(x => !x.hidden).map(x => ({
          name: clean(fr(x.name)),
          desc: clean(fr(x.desc)),
          price: dishPrice(x)
        })).filter(x => x.name)
      })).filter(g => g.dishes.length)
    })).filter(s => s.name && s.groups.length);
  return { seo, name, street, zip, city, addrLine, headline, intro, phoneIntl, phonePretty, sameAs, reserveUrl, image, logo, mapsUrl: clean(a.mapsUrl), hours: hours(d.schedule), sections };
}

// Carte « parfums » (un produit, plusieurs variantes) : un seul plat, un prix par variante.
function variantsGroup(c) {
  const vs = (c.variants || []).filter(v => clean(fr(v.name)));
  const prices = vs.map(v => num(v.price)).filter(n => n != null);
  const same = prices.length === vs.length && prices.every(p => p === prices[0]);
  const price = !prices.length ? { text: '', offers: [] }
    : same ? { text: euro(prices[0]), offers: [{ label: '', price: prices[0] }] }
    : { text: vs.filter(v => num(v.price) != null).map(v => `${clean(fr(v.name))} — ${euro(num(v.price))}`).join(' · '), offers: vs.filter(v => num(v.price) != null).map(v => ({ label: clean(fr(v.name)), price: num(v.price) })) };
  return { name: '', dishes: clean(fr(c.label)) ? [{ name: clean(fr(c.label)), desc: same ? vs.map(v => clean(fr(v.name))).join(' · ') : '', price }] : [] };
}

function dishPrice(x) {
  // Boissons : un prix par contenance (12 cl, 75 cl…), affiché à la place du prix simple.
  const sizes = (x.sizes || []).filter(z => num(z.price) != null);
  if (sizes.length) {
    const parts = sizes.map(z => ({ label: z.cl ? `${z.cl} ${z.unit === 'l' ? 'L' : 'cl'}` : clean(z.format), price: num(z.price) }));
    return { text: parts.map(p => `${p.label ? p.label + ' — ' : ''}${euro(p.price)}`).join(' · '), offers: parts };
  }
  if (x.priceType === 'dual' && (x.p1 || x.p2)) {
    const parts = [];
    if (x.p1) parts.push({ label: x.qty1 ? `Les ${x.qty1}` : '', price: num(x.p1) });
    if (x.p2) parts.push({ label: x.qty2 ? `Les ${x.qty2}` : '', price: num(x.p2) });
    return { text: parts.map(p => `${p.label ? p.label + ' — ' : ''}${euro(p.price)}`).join(' · '), offers: parts };
  }
  const n = num(x.price);
  if (n == null) return { text: clean(x.price), offers: [] };
  return { text: euro(n), offers: [{ label: '', price: n }] };
}
const euro = n => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',')) + ' €';
const schemaPrice = n => (Number.isInteger(n) ? String(n) : n.toFixed(2));
function num(v) {
  const m = String(v == null ? '' : v).replace(',', '.').match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

// Même lecture des horaires que le site : les « services » du jour, sinon open/close.
// Les heures après minuit sont stockées 24+ (26 = 2h du matin).
function hours(schedule) {
  return (schedule || []).map((d, i) => {
    const svcs = (d.services || []).length ? d.services : (d.open != null ? [{ open: d.open, close: d.close }] : []);
    const ok = d.active !== false ? svcs.filter(s => s.open != null && s.close != null) : [];
    return { day: d.day || DAYS_FR[i], schemaDay: DAYS_SCHEMA[i], services: ok.map(s => ({ open: s.open, close: s.close })) };
  });
}
const hhmm = h => { const v = ((Number(h) % 24) + 24) % 24; const hh = Math.floor(v); const mm = Math.round((v - hh) * 60); return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; };
const hFr = h => { const v = ((Number(h) % 24) + 24) % 24; const hh = Math.floor(v); const mm = Math.round((v - hh) * 60); return mm ? `${hh}h${String(mm).padStart(2, '0')}` : `${hh}h`; };
const hoursLine = h => h.services.length ? h.services.map(s => `${hFr(s.open)} – ${hFr(s.close)}`).join(', ') : 'Fermé';

// ---------- page d'accueil enrichie ----------

function texts(i) {
  const where = [i.zip && /^75\d{3}$/.test(i.zip) ? `Paris ${Number(i.zip.slice(3))}${i.zip.slice(3) === '001' ? 'er' : 'e'}` : i.city].filter(Boolean)[0] || '';
  const tagline = i.seo.tagline || i.headline || '';
  let title = i.seo.title || [i.name, tagline].filter(Boolean).join(' — ');
  if (where && !title.toLowerCase().includes(where.toLowerCase().split(' ')[0])) title += ` · ${where}`;
  const cats = i.sections.map(s => s.name.toLowerCase()).slice(0, 4);
  let desc = i.seo.description || [
    `${i.name}${tagline ? ', ' + tagline.charAt(0).toLowerCase() + tagline.slice(1) : ''}.`,
    i.addrLine ? `${i.addrLine}.` : '',
    cats.length ? `À la carte : ${cats.join(', ')}.` : '',
    i.reserveUrl ? 'Réservation en ligne.' : ''
  ].filter(Boolean).join(' ');
  if (desc.length > 160) desc = desc.slice(0, 157).replace(/\s+\S*$/, '') + '…';
  return { title, desc, where, tagline };
}

function jsonLd(i, base) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': i.seo.schemaType || 'Restaurant',
    '@id': `${base}/#restaurant`,
    name: i.name,
    url: `${base}/`,
    description: texts(i).desc
  };
  if (i.image) ld.image = [i.image];
  if (i.logo) ld.logo = i.logo;
  if (i.phoneIntl) ld.telephone = i.phoneIntl;
  if (i.street || i.city) ld.address = { '@type': 'PostalAddress', streetAddress: i.street, postalCode: i.zip, addressLocality: i.city, addressCountry: 'FR' };
  if (i.mapsUrl) ld.hasMap = i.mapsUrl;
  if (i.seo.cuisine) ld.servesCuisine = i.seo.cuisine;
  if (i.seo.priceRange) ld.priceRange = i.seo.priceRange;
  if (i.reserveUrl) ld.acceptsReservations = i.reserveUrl;
  if (i.sameAs.length) ld.sameAs = i.sameAs;
  const spec = [];
  i.hours.forEach(h => h.services.forEach(s => spec.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${h.schemaDay}`, opens: hhmm(s.open), closes: hhmm(s.close) })));
  if (spec.length) ld.openingHoursSpecification = spec;
  if (i.sections.length) {
    ld.hasMenu = {
      '@type': 'Menu',
      name: 'La carte',
      url: `${base}/`,
      inLanguage: 'fr',
      hasMenuSection: i.sections.map(s => ({
        '@type': 'MenuSection',
        name: s.name,
        hasMenuItem: s.groups.flatMap(g => g.dishes.map(x => {
          const item = { '@type': 'MenuItem', name: x.name };
          if (x.desc) item.description = x.desc;
          if (x.price.offers.length) {
            const offers = x.price.offers.map(o => Object.assign({ '@type': 'Offer', price: schemaPrice(o.price), priceCurrency: 'EUR' }, o.label ? { name: o.label } : {}));
            item.offers = offers.length === 1 ? offers[0] : offers;
          }
          return item;
        }))
      }))
    };
  }
  return ld;
}

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function headHtml(i, base, isPreview) {
  const t = texts(i);
  const img = i.image ? `<meta property="og:image" content="${esc(i.image)}">\n<meta name="twitter:image" content="${esc(i.image)}">\n` : '';
  const icon = i.logo ? `<link rel="icon" href="${esc(i.logo)}">\n<link rel="apple-touch-icon" href="${esc(i.logo)}">\n` : '';
  return `
<meta name="description" content="${esc(t.desc)}">
${isPreview ? '<meta name="robots" content="noindex, nofollow">\n' : ''}<link rel="canonical" href="${esc(base)}/">
<meta property="og:type" content="restaurant">
<meta property="og:site_name" content="${esc(i.name)}">
<meta property="og:title" content="${esc(t.title)}">
<meta property="og:description" content="${esc(t.desc)}">
<meta property="og:url" content="${esc(base)}/">
<meta property="og:locale" content="fr_FR">
${img}<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(t.title)}">
<meta name="twitter:description" content="${esc(t.desc)}">
${icon}<link rel="alternate" type="text/plain" href="${esc(base)}/llms.txt" title="Résumé pour les IA">
<script type="application/ld+json">${JSON.stringify(jsonLd(i, base)).replace(/</g, '\\u003c')}</script>
`;
}

// Bloc texte pour les robots qui ne lancent pas le JavaScript. Il est retiré immédiatement par
// le script qui le suit : un visiteur ne le voit jamais, Google (qui lance le JavaScript) voit la
// carte normale du site — le même contenu, donc aucune « page cachée ».
function bodyHtml(i, base) {
  const t = texts(i);
  const hrs = i.hours.map(h => `<li>${esc(h.day)} : ${esc(hoursLine(h))}</li>`).join('');
  const menu = i.sections.map(s => `
<section><h2>${esc(s.name)}</h2>${s.groups.map(g => `
${g.name ? `<h3>${esc(g.name)}</h3>` : ''}<ul>${g.dishes.map(x => `<li><strong>${esc(x.name)}</strong>${x.price.text ? ` — ${esc(x.price.text)}` : ''}${x.desc ? `<br>${esc(x.desc)}` : ''}</li>`).join('')}</ul>`).join('')}
</section>`).join('');
  return `<div id="kuistoSeo" style="max-width:760px;margin:0 auto;padding:24px;font-family:system-ui,sans-serif;line-height:1.5">
<header><h1>${esc(i.name)}${t.where ? ` — ${esc(t.tagline || 'Restaurant')}` : ''}</h1>
${i.intro ? `<p>${esc(i.intro)}</p>` : ''}</header>
<section><h2>Infos pratiques</h2><ul>
${i.addrLine ? `<li>Adresse : ${i.mapsUrl ? `<a href="${esc(i.mapsUrl)}">${esc(i.addrLine)}</a>` : esc(i.addrLine)}</li>` : ''}
${i.phonePretty ? `<li>Téléphone : <a href="tel:${esc(i.phoneIntl)}">${esc(i.phonePretty)}</a></li>` : ''}
${i.reserveUrl ? `<li><a href="${esc(i.reserveUrl)}">Réserver une table en ligne</a></li>` : ''}
</ul><h3>Horaires</h3><ul>${hrs}</ul></section>
<section><h2>La carte</h2>${menu}</section>
</div><script>(function(){var e=document.getElementById('kuistoSeo');if(e)e.remove();})();</script>`;
}

function enrichHomePage(res, data, base, isPreview) {
  const i = info(data);
  const t = texts(i);
  return new HTMLRewriter()
    .on('html', { element(el) { el.setAttribute('data-seo', '1'); } })
    .on('head > title', { element(el) { el.setInnerContent(t.title); } })
    .on('head', { element(el) { el.append(headHtml(i, base, isPreview), { html: true }); } })
    .on('body', { element(el) { el.prepend(bodyHtml(i, base), { html: true }); } })
    .transform(res);
}

// ---------- fichiers pour les robots ----------

function text(body) {
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300' } });
}

function robotsTxt(url, env, isPreview) {
  if (isPreview) return 'User-agent: *\nDisallow: /\n';
  return [
    '# Moteurs de recherche et assistants IA bienvenus (recherche, réponses et entraînement).',
    'User-agent: *',
    'Allow: /',
    ...PRIVATE_PATHS.map(p => `Disallow: ${p}`),
    '',
    `Sitemap: ${origin(url, env)}/sitemap.xml`,
    ''
  ].join('\n');
}

function sitemapXml(base, row) {
  const lastmod = row && row.updated_at ? `<lastmod>${String(row.updated_at).slice(0, 10)}</lastmod>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PUBLIC_PAGES.map(p => `  <url><loc>${esc(base + p)}</loc>${p === '/' ? lastmod : ''}</url>`).join('\n')}
</urlset>
`;
}

function llmsTxt(data, base) {
  const i = info(data);
  const t = texts(i);
  const lines = [`# ${i.name}`, '', `> ${t.desc}`, ''];
  if (i.intro) lines.push(i.intro, '');
  lines.push('## Infos pratiques');
  if (i.addrLine) lines.push(`- Adresse : ${i.addrLine}`);
  if (i.phonePretty) lines.push(`- Téléphone : ${i.phonePretty}`);
  lines.push(`- Horaires : ${i.hours.map(h => `${h.day} ${hoursLine(h)}`).join(' ; ')}`);
  if (i.reserveUrl) lines.push(`- Réservation en ligne : ${i.reserveUrl}`);
  lines.push('', '## Liens', `- [Site et carte](${base}/)`);
  if (i.mapsUrl) lines.push(`- [Plan Google Maps](${i.mapsUrl})`);
  i.sameAs.filter(u => u !== i.mapsUrl).forEach(u => lines.push(`- ${u}`));
  lines.push('', '## La carte');
  i.sections.forEach(s => {
    lines.push('', `### ${s.name}`);
    s.groups.forEach(g => {
      if (g.name) lines.push(`*${g.name}*`);
      g.dishes.forEach(x => lines.push(`- ${x.name}${x.price.text ? ` — ${x.price.text}` : ''}${x.desc ? ` : ${x.desc}` : ''}`));
    });
  });
  return lines.join('\n') + '\n';
}
