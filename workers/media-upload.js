// Envoi d'images depuis le panneau /gestion vers R2 (bucket beltab-media, servi par media.beltab.app).
//
//   POST /upload?slug=<client>&kind=<logo|plat|accueil|…>
//        corps : l'image (déjà compressée en WebP par le navigateur), 8 Mo maximum,
//                ou la vidéo d'accueil (MP4 / WebM / MOV), 60 Mo maximum
//        en-tête Authorization : le jeton de session Supabase de l'administrateur
//   → { ok:true, url:"https://media.beltab.app/<client>/uploads/<kind>-<date>.webp" }
//
// Sécurité : le jeton est vérifié auprès de Supabase, puis on vérifie que cette
// personne est bien administratrice du restaurant (table restaurant_admins).
// Aucune clé secrète ici : seule la clé publique Supabase, comme sur les sites.
// Une copie de test (« drevici-test ») range ses images dans le dossier du vrai
// restaurant (« drevici ») : les liens restent bons quand on passe en ligne.

const PUBLIC = 'https://media.beltab.app/';
const MAX = 8 * 1024 * 1024;
const MAX_VIDEO = 60 * 1024 * 1024; // vidéo d'accueil (MP4 / WebM)
const TYPES = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = corsHeaders(origin);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    if (req.method !== 'POST' || url.pathname !== '/upload') return json({ ok: false, error: 'Introuvable' }, 404, cors);
    if (!env.MEDIA) return json({ ok: false, error: 'Bucket R2 non branché' }, 500, cors);

    const slug = (url.searchParams.get('slug') || '').toLowerCase();
    const kind = (url.searchParams.get('kind') || 'image').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'image';
    if (!/^[a-z0-9-]{2,60}$/.test(slug)) return json({ ok: false, error: 'Restaurant inconnu' }, 400, cors);

    const auth = req.headers.get('Authorization') || '';
    if (!auth.startsWith('Bearer ')) return json({ ok: false, error: 'Connexion requise' }, 401, cors);
    const sbH = { apikey: env.SUPABASE_KEY, Authorization: auth };
    const u = await fetch(env.SUPABASE_URL + '/auth/v1/user', { headers: sbH });
    if (!u.ok) return json({ ok: false, error: 'Session expirée' }, 401, cors);
    const user = await u.json();
    const q = await fetch(`${env.SUPABASE_URL}/rest/v1/restaurant_admins?select=client_slug&user_id=eq.${encodeURIComponent(user.id)}&client_slug=eq.${encodeURIComponent(slug)}`, { headers: sbH });
    const rows = q.ok ? await q.json() : [];
    if (!Array.isArray(rows) || !rows.length) return json({ ok: false, error: 'Pas administrateur de ce restaurant' }, 403, cors);

    const type = (req.headers.get('Content-Type') || '').split(';')[0].trim();
    const ext = TYPES[type];
    if (!ext) return json({ ok: false, error: 'Format non accepté' }, 415, cors);
    const isVideo = type.startsWith('video/');
    const limit = isVideo ? MAX_VIDEO : MAX;
    const body = await req.arrayBuffer();
    if (!body.byteLength || body.byteLength > limit) return json({ ok: false, error: `Fichier vide ou trop lourd (${isVideo ? 60 : 8} Mo max)` }, 413, cors);

    const folder = slug.replace(/-(test|preview)$/, '');
    const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const key = `${folder}/uploads/${kind}-${stamp}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    await env.MEDIA.put(key, body, { httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' } });
    return json({ ok: true, url: PUBLIC + key }, 200, cors);
  },
};

function corsHeaders(origin) {
  const ok = /^https:\/\/([a-z0-9-]+\.)*beltab\.app$/.test(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : 'https://beltab.app',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
function json(o, status, headers) {
  return new Response(JSON.stringify(o), { status, headers: { ...headers, 'content-type': 'application/json; charset=utf-8' } });
}
