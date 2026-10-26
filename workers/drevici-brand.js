// ════════════════════════════════════════════════════════════════
// Drevici Oyster · une seule adresse, deux maisons (Drevici uniquement)
//
//   drevicioyster.fr/          → page d'entrée (choisir Paris ou Surzur)
//   drevicioyster.fr/paris/…   → le site de Paris   (ce Worker, menu-seo.js)
//   drevicioyster.fr/surzur/…  → le site de Surzur  (Worker drevici-surzur, via SURZUR)
//   drevicioyster.fr/book      → redirigé vers /paris/book (et toute autre page)
//
// Les deux sites ne changent pas : ils croient toujours être à la racine. Ce
// fichier enlève le préfixe à l'aller, et au retour remet le préfixe dans les
// adresses (liens absolus, redirections, canonical, sitemap, données structurées).
//
// Ne s'active que pour les adresses listées dans BRAND.hosts (wrangler.drevici*.jsonc) :
// sur toute autre adresse, le site répond exactement comme avant. Les autres
// restaurants n'utilisent pas ce fichier.
// ════════════════════════════════════════════════════════════════
import site from './menu-seo.js';

const SECTIONS = ['paris', 'surzur'];
// Fichiers de la page d'entrée servis à la racine sans redirection (images, logos, polices…)
const ROOT_ASSET = /^\/(seo|charte|media|jeu|club|studio\/qr-drevici\.js)\b|\.(png|jpe?g|webp|svg|gif|ico|css|js|woff2?|mp4|webm|json)$/i;

function cfg(env) {
  try { return typeof env.BRAND === 'string' ? JSON.parse(env.BRAND) : env.BRAND; } catch (e) { return null; }
}

export default {
  async fetch(request, env, ctx) {
    const B = cfg(env), url = new URL(request.url);
    if (!B || !(B.hosts || []).includes(url.hostname)) return site.fetch(request, env, ctx);

    const origin = url.origin, path = url.pathname;
    // Adresses des sites tels qu'ils se voient eux-mêmes → adresses sous la marque
    const map = [[origin + '/accueil', origin + '/']];
    for (const [sec, hosts] of Object.entries(B.alias || {})) for (const h of hosts) map.push(['https://' + h, origin + '/' + sec]);

    if (path === '/robots.txt') return new Response(`User-agent: *\nAllow: /\n${SECTIONS.map(s => `Sitemap: ${origin}/${s}/sitemap.xml`).join('\n')}\n`, { headers: { 'content-type': 'text/plain; charset=utf-8' } });

    const m = path.match(/^\/(paris|surzur)(\/.*)?$/);
    if (!m) {
      // Racine : la page d'entrée. Fichiers de la page d'entrée : servis depuis Paris.
      if (path === '/' || path === '/index.html') return pass('paris', '/accueil', '', request, env, ctx, B, origin, map, true);
      if (ROOT_ASSET.test(path)) return pass('paris', path, '', request, env, ctx, B, origin, map, true);
      // Toute autre page à la racine (ancien lien, /book, /qr/…) → Paris
      return Response.redirect(origin + '/paris' + path + url.search, 301);
    }
    if (!m[2]) return Response.redirect(origin + path + '/' + url.search, 301);   // /paris → /paris/
    return pass(m[1], m[2], '/' + m[1], request, env, ctx, B, origin, map, false);
  }
};

async function pass(sec, subPath, prefix, request, env, ctx, B, origin, map, atRoot) {
  const url = new URL(request.url);
  const target = B.sections[sec];                       // 'self' ou nom d'une liaison (ex. SURZUR)
  // Le site reçoit sa propre adresse (ex. drevici.beltab.app) : il ne voit jamais le préfixe
  const host = (B.alias[sec] || [])[0] || url.host;
  const up = new URL(subPath + url.search, 'https://' + host);
  const req = new Request(up.toString(), request);
  let res = target === 'self' ? await site.fetch(req, env, ctx) : await env[target].fetch(req);

  const h = new Headers(res.headers);
  // Redirections : adresse absolue d'un site → adresse sous la marque ; adresse relative → avec le préfixe
  const loc = h.get('location');
  if (loc) {
    let l = rewrite(loc, map);
    if (l.startsWith('/') && !l.startsWith('//')) l = prefix + l;
    h.set('location', l);
  }
  const ct = h.get('content-type') || '';
  if (!/text\/html|xml|text\/plain|javascript/.test(ct) || request.method === 'HEAD' || res.status === 304) return new Response(res.body, { status: res.status, headers: h });
  let body = rewrite(await res.text(), map);
  // Liens « /quelque-chose » dans le HTML d'une section → « /paris/quelque-chose »
  if (!atRoot && /text\/html/.test(ct)) body = body.replace(/(\s(?:href|src|action|poster)=["'])\/(?!\/)/g, '$1' + prefix + '/');
  h.delete('content-length'); h.delete('etag');
  return new Response(body, { status: res.status, headers: h });
}

// Remplace chaque adresse connue une seule fois (une seule passe : pas de double préfixe)
function rewrite(s, map) {
  const keys = map.map(([a]) => a).sort((a, b) => b.length - a.length);
  const re = new RegExp(keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  const dict = Object.fromEntries(map);
  return s.replace(re, k => dict[k]);
}
