// Mot magique Instagram : insta.beltab.app/webhook
// Un commentaire contient le mot d'une règle → message privé avec le lien (réponse privée Meta).
// Règles, comptes et envois : sql/insta-mots.sql. Le lien passe par go.beltab.app/<CODE> (qr.sql)
// pour compter les clics et les réservations.
//
// Règles Meta : un seul message privé par commentaire, dans les 7 jours ; ensuite, on ne peut
// écrire que si la personne répond (24 h). Jamais de message en réponse à nos propres commentaires.

const enc = new TextEncoder();
const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

function hasWord(text, mot) {
  const t = ' ' + norm(text).replace(/[^A-Z0-9]+/g, ' ') + ' ';
  const m = norm(mot).replace(/[^A-Z0-9]+/g, ' ').trim();
  return !!m && t.includes(' ' + m + ' ');
}

async function signatureOk(req, raw, secret) {
  const sig = req.headers.get('x-hub-signature-256') || '';
  if (!secret || !sig.startsWith('sha256=')) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(raw)));
  const hex = [...mac].map(b => b.toString(16).padStart(2, '0')).join('');
  const got = sig.slice(7);
  if (got.length !== hex.length) return false;
  let d = 0; for (let i = 0; i < hex.length; i++) d |= hex.charCodeAt(i) ^ got.charCodeAt(i);
  return d === 0;
}

function sb(env, path, init = {}) {
  return fetch(env.SUPABASE_URL + '/rest/v1/' + path, {
    ...init,
    headers: { apikey: env.SUPABASE_SERVICE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY,
               'content-type': 'application/json', ...(init.headers || {}) },
  });
}

const graph = (env, path) => `https://graph.instagram.com/${env.GRAPH_VERSION || 'v23.0'}/${path}`;

async function traiterCommentaire(env, igId, v) {
  const commentId = v.id, texte = v.text || '', from = v.from || {}, mediaId = v.media && v.media.id;
  if (!commentId || !texte || from.id === igId) return;            // nos propres réponses : on ignore

  const [cr, rr] = await Promise.all([
    sb(env, `insta_comptes?ig_id=eq.${encodeURIComponent(igId)}&actif=is.true&select=token,client_slug`),
    sb(env, `insta_mots?ig_id=eq.${encodeURIComponent(igId)}&actif=is.true&select=*`),
  ]);
  const compte = cr.ok ? (await cr.json())[0] : null;
  const regles = rr.ok ? await rr.json() : [];
  if (!compte) return;
  const regle = regles.find(r => (!r.media_id || r.media_id === mediaId) && hasWord(texte, r.mot));
  if (!regle) return;

  // Un seul envoi par commentaire (Meta peut renvoyer la même notification).
  const ins = await sb(env, 'insta_envois', {
    method: 'POST', headers: { prefer: 'return=minimal' },
    body: JSON.stringify({ comment_id: commentId, ig_id: igId, mot_id: regle.id, media_id: mediaId || null,
                           from_id: from.id || null, from_user: from.username || null, texte: texte.slice(0, 500) }),
  });
  if (!ins.ok) return;                                              // déjà traité (clé primaire)

  const lien = regle.qr_code ? 'https://go.beltab.app/' + encodeURIComponent(regle.qr_code) : '';
  const message = regle.message.replace(/\{lien\}/g, lien).slice(0, 1000);

  let erreur = null;
  try {
    const r = await fetch(graph(env, `${igId}/messages`), {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + compte.token },
      body: JSON.stringify({ recipient: { comment_id: commentId }, message: { text: message } }),
    });
    if (!r.ok) erreur = (await r.text()).slice(0, 500);
  } catch (e) { erreur = String(e).slice(0, 500); }

  if (!erreur && regle.reponse_publique) {
    try {
      await fetch(graph(env, `${commentId}/replies`), {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + compte.token },
        body: JSON.stringify({ message: regle.reponse_publique.slice(0, 300) }),
      });
    } catch (e) { /* la réponse publique est un bonus */ }
  }

  if (erreur) {
    console.warn('insta-mots: envoi refusé', commentId, erreur);
    await sb(env, `insta_envois?comment_id=eq.${encodeURIComponent(commentId)}`, {
      method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ statut: 'erreur', erreur }),
    });
  }
}

// Les jetons Instagram durent 60 jours : on les renouvelle quand ils ont plus de 30 jours.
async function renouvelerJetons(env) {
  const avant = new Date(Date.now() - 30 * 864e5).toISOString();
  const r = await sb(env, `insta_comptes?actif=is.true&token_maj=lt.${avant}&select=ig_id,token`);
  if (!r.ok) return;
  for (const c of await r.json()) {
    try {
      const u = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(c.token)}`;
      const t = await fetch(u);
      const j = await t.json();
      if (j.access_token) {
        await sb(env, `insta_comptes?ig_id=eq.${encodeURIComponent(c.ig_id)}`, {
          method: 'PATCH', headers: { prefer: 'return=minimal' },
          body: JSON.stringify({ token: j.access_token, token_maj: new Date().toISOString() }),
        });
      } else console.warn('insta-mots: jeton non renouvelé', c.ig_id, JSON.stringify(j).slice(0, 300));
    } catch (e) { console.warn('insta-mots: renouvellement', c.ig_id, e); }
  }
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname !== '/webhook') return new Response('ok');

    // Vérification de l'adresse par Meta, au moment de brancher le webhook.
    if (req.method === 'GET') {
      const ok = url.searchParams.get('hub.mode') === 'subscribe'
        && env.VERIFY_TOKEN && url.searchParams.get('hub.verify_token') === env.VERIFY_TOKEN;
      return ok ? new Response(url.searchParams.get('hub.challenge') || '') : new Response('forbidden', { status: 403 });
    }
    if (req.method !== 'POST') return new Response('method', { status: 405 });

    const raw = await req.text();
    if (!(await signatureOk(req, raw, env.META_APP_SECRET))) return new Response('signature', { status: 401 });

    let body; try { body = JSON.parse(raw); } catch (e) { return new Response('json', { status: 400 }); }
    for (const entry of body.entry || []) {
      for (const ch of entry.changes || []) {
        if (ch.field === 'comments' && ch.value) {
          ctx.waitUntil(traiterCommentaire(env, String(entry.id), ch.value).catch(e => console.warn('insta-mots', e)));
        }
      }
    }
    return new Response('EVENT_RECEIVED');                         // répondre vite, sinon Meta renvoie
  },

  async scheduled(_evt, env, ctx) {
    ctx.waitUntil(renouvelerJetons(env));
  },
};
