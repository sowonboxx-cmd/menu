// Redirection des QR codes : https://go.beltab.app/<CODE>
// 1. enregistre le scan (fonction Supabase qr_hit, qui ne laisse rien lire d'autre)
// 2. redirige vers la destination du code, avec ?src=<CODE> pour suivre la conversion.
// Code inconnu ou désactivé : redirection vers le site Drevici.

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const code = decodeURIComponent(url.pathname.slice(1)).trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const fallback = env.FALLBACK_URL || 'https://drevici.beltab.app/';
    if (!code) return Response.redirect(fallback, 302);

    let dest = null;
    try {
      const r = await fetch(env.SUPABASE_URL + '/rest/v1/rpc/qr_hit', {
        method: 'POST',
        headers: { 'content-type': 'application/json', apikey: env.SUPABASE_KEY, authorization: 'Bearer ' + env.SUPABASE_KEY },
        body: JSON.stringify({ p_code: code, p_ua: req.headers.get('user-agent') || '' }),
      });
      if (r.ok) dest = await r.json();
    } catch (e) { /* on redirige quand même */ }

    let target;
    try {
      target = new URL(dest || fallback);
      if (dest) target.searchParams.set('src', code);
    } catch (e) { target = new URL(fallback); }

    return new Response(null, { status: 302, headers: { location: target.toString(), 'cache-control': 'no-store' } });
  },
};
