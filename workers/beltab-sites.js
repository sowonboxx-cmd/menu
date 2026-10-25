// ════════════════════════════════════════════════════════════════
// Worker commun Beltab : UN seul Worker pour tous les restaurants du socle.
//  1. Reconnaît le restaurant par l'adresse du site (workers/tenants.js).
//  2. Donne sa configuration à la page : <script>window.BELTAB={...}</script>.
//  3. Passe la main au Worker SEO/IA commun (menu-seo.js) avec les réglages
//     de CE restaurant (sa carte, son SEO). Le cache SEO est rangé par slug.
// Une adresse inconnue reçoit une page 404 : jamais le site d'un autre restaurant.
// Mode démo : invisible sur Google (noindex + robots.txt fermé).
// ════════════════════════════════════════════════════════════════
import seo from './menu-seo.js';
import { tenantFor, tenantByKey, publicConfig, OFFERS } from './tenants.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // Adresse *.workers.dev (avant de brancher le domaine) : le restaurant indiqué par DEV_TENANT.
    const t = tenantFor(url.hostname) || (env.DEV_TENANT && url.hostname.endsWith('.workers.dev') ? tenantByKey(env.DEV_TENANT) : null);
    if (!t) return new Response('Site introuvable', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex' } });

    const tenv = Object.assign({}, env, {
      CLIENT_SLUG: t.slug,
      SITE_ENV: t.demo ? 'demo' : 'production',
      SEO: t.seo || null,
      CANONICAL_ORIGIN: t.canonical || ''
    });
    let res = await seo.fetch(request, tenv, ctx);

    const type = res.headers.get('content-type') || '';
    if (!type.includes('text/html')) return res;
    // Démo seulement : « voir comme » une autre formule (?formule=starter|pro|master, ?formule=reel
    // pour revenir). Le choix est gardé une journée dans ce navigateur. Un vrai client n'est jamais concerné.
    let trial = null, cookie = null;
    if (t.demo) {
      const q = url.searchParams.get('formule');
      const m = (request.headers.get('cookie') || '').match(/(?:^|;\s*)bt_formule=(starter|pro|master)\b/);
      if (q && Object.hasOwn(OFFERS, q)) { trial = q; cookie = `bt_formule=${q}; Path=/; Max-Age=86400; Secure; SameSite=Lax`; }
      else if (q === 'reel') cookie = 'bt_formule=; Path=/; Max-Age=0; Secure; SameSite=Lax';
      else if (m) trial = m[1];
      if (trial === t.offer) trial = null;
    }
    const cfg = JSON.stringify(publicConfig(t, trial)).replace(/</g, '\\u003c');
    res = new HTMLRewriter()
      .on('head', { element(el) { el.prepend(`<script>window.BELTAB=${cfg};</script>`, { html: true }); } })
      .transform(res);
    res = new Response(res.body, res);
    res.headers.set('cache-control', 'no-cache');
    if (cookie) res.headers.append('set-cookie', cookie);
    return res;
  }
};
