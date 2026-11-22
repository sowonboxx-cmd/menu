// ════════════════════════════════════════════════════════════════
// resa-notify — emails et SMS des réservations via Brevo
//
//  POST /notify {slug, ref}  appelé par resa.html juste après l'enregistrement
//      → ajoute le client à la base, envoie la confirmation au client
//        et l'alerte « nouvelle réservation » au restaurant.
//  POST /t  statistiques du site (visites, clics) → table site_events
//  Tâche planifiée (toutes les heures)
//      → rappel ~24 h avant : SMS si quota disponible, sinon email.
//
// Secrets (Cloudflare → Worker → Settings → Variables, type « Secret ») :
//   BREVO_API_KEY, SUPABASE_SERVICE_KEY
// Rien de secret dans ce fichier.
// ════════════════════════════════════════════════════════════════

const BREVO = 'https://api.brevo.com/v3';

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const url = new URL(req.url);
    if (req.method === 'POST' && url.pathname === '/notify') {
      try {
        const { slug, ref } = await req.json();
        if (!slug || !ref) return json({ ok: false, error: 'slug et ref requis' }, 400, cors);
        const r = await notifyNew(env, String(slug), String(ref));
        return json(r, r.ok ? 200 : 404, cors);
      } catch (e) {
        return json({ ok: false, error: String(e && e.message || e) }, 500, cors);
      }
    }
    if ((req.method === 'GET' || req.method === 'POST') && url.pathname === '/unsub') return unsub(env, url);
    // ── Message d'un client depuis le site (bouton « Message ») ──
    // Statistiques du site : un signal par visite / clic (envoyé par navigator.sendBeacon, sans cookie).
    if (req.method === 'POST' && url.pathname === '/t') {
      try { await track(env, req); } catch (e) {}
      return new Response(null, { status: 204, headers: cors });
    }
    if (req.method === 'POST' && url.pathname === '/message') {
      try { const r = await contactMessage(env, await req.json()); return json(r, r.ok ? 200 : 400, cors); }
      catch (e) { return json({ ok: false, error: String(e && e.message || e) }, 500, cors); }
    }
    // ── Club : inscription publique + liste des premiers membres ──
    if (req.method === 'POST' && url.pathname === '/club/join') {
      try { return json(await clubJoin(env, await req.json()), 200, cors); }
      catch (e) { return json({ ok: false, error: String(e && e.message || e) }, 500, cors); }
    }
    if (req.method === 'GET' && url.pathname === '/club/members') {
      try { return json(await clubMembers(env, String(url.searchParams.get('slug') || '')), 200, cors); }
      catch (e) { return json({ ok: false, error: String(e && e.message || e) }, 500, cors); }
    }
    if (req.method === 'POST' && url.pathname === '/club/find') {
      try { return json(await clubFind(env, await req.json()), 200, cors); }
      catch (e) { return json({ ok: false, error: String(e && e.message || e) }, 500, cors); }
    }
    if (req.method === 'GET' && url.pathname === '/club/next') {
      try {
        const slug = String(url.searchParams.get('slug') || '');
        if (!/^[a-z0-9-]{2,60}$/.test(slug)) return json({ ok: false }, 400, cors);
        const all = await sb(env, `resa_clients?client_slug=eq.${enc(slug)}&club_member=eq.true&select=club_no&order=club_no.desc.nullslast&limit=1`) || [];
        return json({ ok: true, next: ((all[0] && all[0].club_no) || 0) + 1 }, 200, cors);
      } catch (e) { return json({ ok: false, error: String(e && e.message || e) }, 500, cors); }
    }
    // Tirage des T-shirts : le membre donne sa taille depuis l'écran de bienvenue (avec son code de carte).
    if (req.method === 'POST' && url.pathname === '/club/tshirt') {
      try { return json(await clubTshirt(env, await req.json()), 200, cors); }
      catch (e) { return json({ ok: false, error: String(e && e.message || e) }, 500, cors); }
    }
    if (req.method === 'GET' && url.pathname === '/club/card') {
      try { return json(await clubCard(env, String(url.searchParams.get('slug') || ''), String(url.searchParams.get('code') || '')), 200, cors); }
      catch (e) { return json({ ok: false, error: String(e && e.message || e) }, 500, cors); }
    }
    // ── Jeu Free Oyster (sql/jeu-free-oyster.sql) : partie, état du joueur, prénom du parrain ──
    if (req.method === 'POST' && url.pathname === '/jeu/play') {
      // Le joueur ne voit jamais l'erreur technique (elle reste dans les journaux du Worker).
      let b = {};
      try { b = await req.json(); const r = await jeuPlay(env, b); return json(r, 200, cors); }
      catch (e) { console.error('jeu/play', e); return json({ ok: false, error: 'Le jeu est momentanément indisponible, réessayez dans un instant.', ...(String(b.slug || '').endsWith('-test') ? { detail: String(e && e.message || e) } : {}) }, 500, cors); }
    }
    // Jeu « on joue d'abord » : tirage avant l'inscription (sql/jeu-tirage-avant.sql)
    if (req.method === 'POST' && url.pathname === '/jeu/draw') {
      try {
        const b = await req.json(), slug = String(b.slug || ''), dev = String(b.dev || '').replace(/[^a-z0-9]/gi, '').slice(0, 40);
        if (!jeuSlugOk(slug) || !slug.includes('--') || dev.length < 12) return json({ ok: false, error: 'Jeu inconnu' }, 400, cors);
        const ip = req.headers.get('cf-connecting-ip') || '';
        const ipHash = ip ? [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(slug + '|' + ip)))].map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 32) : null;
        const src = String(b.src || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 40) || null;
        const r = await sb(env, 'rpc/jeu_draw', { method: 'POST', body: { p_slug: slug, p_device: dev, p_ip: ipHash, p_src: src } });
        return json(r && r.ok ? { ok: true, draw: r.draw, result: r.result, prize: JEU_LOTS[r.result], claimed: !!r.claimed } : { ok: false, closed: !!(r && r.closed), error: r && r.closed ? 'Le jeu est terminé.' : 'Réessayez dans un instant' }, 200, cors);
      } catch (e) { console.error('jeu/draw', e); return json({ ok: false, error: 'Le jeu est momentanément indisponible, réessayez dans un instant.' }, 500, cors); }
    }
    if (req.method === 'GET' && url.pathname === '/jeu/me') {
      try { return json(await jeuMe(env, String(url.searchParams.get('slug') || ''), String(url.searchParams.get('t') || '')), 200, cors); }
      catch (e) { return json({ ok: false, error: String(e && e.message || e) }, 500, cors); }
    }
    // ── Plat en test (sql/plat-test.sql) : plat du moment, commande, avis ──
    if (req.method === 'GET' && url.pathname === '/plat/now') {
      try { return json(await platNow(env, String(url.searchParams.get('slug') || ''), String(url.searchParams.get('t') || '')), 200, cors); }
      catch (e) { console.error('plat/now', e); return json({ ok: false }, 200, cors); }
    }
    if (req.method === 'POST' && (url.pathname === '/plat/order' || url.pathname === '/plat/review')) {
      try { const b = await req.json(); return json(url.pathname === '/plat/order' ? await platOrder(env, b) : await platReview(env, b), 200, cors); }
      catch (e) { console.error(url.pathname, e); return json({ ok: false, error: 'Réessayez dans un instant.' }, 500, cors); }
    }
    if (req.method === 'GET' && url.pathname === '/jeu/ami') {
      try { return json(await jeuAmi(env, String(url.searchParams.get('slug') || ''), String(url.searchParams.get('c') || '')), 200, cors); }
      catch (e) { return json({ ok: false }, 200, cors); }
    }
    // ── Parlez à votre carte : les mots s'écrivent pendant qu'on parle (OpenAI Realtime, relayé ici pour garder la clé secrète) ──
    if (url.pathname === '/carte/voice/live' && (req.headers.get('upgrade') || '').toLowerCase() === 'websocket') {
      try { return await voiceLive(env, url); }
      catch (e) { console.error('carte/voice/live', e); return new Response('live indisponible', { status: 502 }); }
    }
    // ── Parlez à votre carte (Master) : une phrase → une liste de changements à valider dans l'admin ──
    if (req.method === 'POST' && url.pathname === '/carte/voice') {
      try {
        const b = await req.json();
        const who = await adminOf(env, req, String(b.slug || ''));
        if (!who) return json({ ok: false, error: 'Accès refusé' }, 403, cors);
        return json(await carteVoice(env, b), 200, cors);
      } catch (e) { console.error('carte/voice', e); return json({ ok: false, error: 'Je n\'ai pas pu comprendre, réessayez.' }, 500, cors); }
    }
    // ── Équipe : qui suis-je (admin / staff) et gestion des accès (admins seulement) ──
    if (req.method === 'POST' && url.pathname.startsWith('/team/')) {
      try { const b = await req.json(); return await team(env, req, url.pathname.slice(6), b, cors); }
      catch (e) { return json({ ok: false, error: String(e.message || e) }, 500, cors); }
    }
    // ── Espace restaurateur (/gestion) : session Supabase + admin du resto ──
    if (['/clients', '/campaign/preview', '/campaign/send', '/club/redeem', '/club/tier', '/club/tshirt-won', '/client/archive', '/client/name', '/jeu/redeem', '/jeu/stats', '/plat/admin', '/plat/save', '/plat/order-status'].includes(url.pathname)) {
      try {
        const body = req.method === 'POST' ? await req.json() : {};
        const slug = String(body.slug || url.searchParams.get('slug') || '');
        // Un staff peut consulter / remettre les lots des campagnes s'il a la zone « campagnes » ; le reste est réservé aux admins.
        const who = await adminOf(env, req, slug) || (['/jeu/redeem', '/jeu/stats'].includes(url.pathname) ? await staffOf(env, req, slug, 'campagnes') : null);
        if (!who) return json({ ok: false, error: 'Accès refusé' }, 403, cors);
        // Club commun à plusieurs établissements (ex. Surzur partage le club de Paris) : resa_settings.club_slug.
        const cslug = await clubSlugOf(env, slug);
        const inClub = cslug === slug ? `client_slug=eq.${enc(slug)}` : `client_slug=in.(${enc(slug)},${enc(cslug)})`;
        if (url.pathname === '/clients') {
          // select=* : les nouvelles colonnes (ex. taille de T-shirt) arrivent sans redéployer.
          const rows = await sb(env, `resa_clients?client_slug=eq.${enc(slug)}&select=*&order=last_seen.desc&limit=5000`) || [];
          if (cslug !== slug) {
            // Les infos du club (carte, n°, staff, coupe, T-shirt) viennent de la fiche du club commun.
            const club = await sb(env, `resa_clients?client_slug=eq.${enc(cslug)}&club_member=eq.true&select=*&limit=5000`) || [];
            const byMail = new Map(club.filter(c => c.email).map(c => [String(c.email).toLowerCase(), c]));
            const seen = new Set();
            for (const r of rows) {
              const c = r.email && byMail.get(String(r.email).toLowerCase());
              if (!c) continue;
              seen.add(c.id);
              for (const k of CLUB_KEYS) r[k] = c[k];
              r.club_id = c.id;
            }
            // Membres du club jamais venus ici : visibles quand même (staff, cadeaux…), sans visites.
            for (const c of club) if (!seen.has(c.id)) rows.push({ ...c, id: -c.id, club_id: c.id, from_club: true, visits: 0 });
          }
          return json({ ok: true, clients: rows, club_slug: cslug }, 200, cors);
        }
        // Un admin ne peut changer que SON nom (fiche dont l'email = son email de connexion), ici et dans le club commun.
        if (url.pathname === '/client/name') {
          const name = String(body.name || '').replace(/\s+/g, ' ').trim().slice(0, 80);
          const me = String(who.email || '').toLowerCase();
          if (!name || !me) return json({ ok: false, error: 'Nom vide' }, 400, cors);
          const upd = await sb(env, `resa_clients?${inClub}&email=eq.${enc(me)}`, { method: 'PATCH', body: { name }, prefer: 'return=representation' });
          if (!upd || !upd.length) return json({ ok: false, error: 'Aucune fiche à votre email de connexion' }, 404, cors);
          return json({ ok: true, name, n: upd.length }, 200, cors);
        }
        if (url.pathname === '/client/archive') {
          const id = parseInt(body.id, 10);
          if (!id || id < 0) return json({ ok: false, error: 'Valeur invalide' }, 400, cors);
          const at = body.on ? new Date().toISOString() : null;
          await sb(env, `resa_clients?id=eq.${id}&client_slug=eq.${enc(slug)}`, { method: 'PATCH', body: { archived_at: at } });
          return json({ ok: true, archived_at: at }, 200, cors);
        }
        if (url.pathname === '/club/tier') {
          const id = parseInt(body.id, 10), tier = String(body.tier || 'membre'), card = body.card ? String(body.card) : null;
          if (!id || !['membre', 'vip', 'staff'].includes(tier) || (card && !['navy', 'gold', 'noir'].includes(card))) return json({ ok: false, error: 'Valeur invalide' }, 400, cors);
          const before = (await sb(env, `resa_clients?id=eq.${id}&${inClub}&select=email,name,club_member,club_code,club_no,club_joined_at,club_tier`) || [])[0];
          await sb(env, `resa_clients?id=eq.${id}&${inClub}`, { method: 'PATCH', body: { club_tier: tier, club_card: tier === 'staff' ? card : null } });
          // Passage en VIP (carte Gold) ou en Staff : le membre reçoit sa nouvelle carte par email.
          let mailed = false;
          if (before && before.club_member && before.email && (tier === 'vip' || tier === 'staff') && (before.club_tier || 'membre') !== tier) {
            try {
              const st = await settings(env, slug);
              if (st) {
                const c = { first: String(before.name || '').trim().split(/\s+/)[0], code: before.club_code, no: before.club_no, joined: before.club_joined_at, tier, card: card || 'noir' };
                const u = await unsubUrl(env, slug, id);
                await sendEmail(env, st, before.email, before.name, tier === 'staff' ? `Votre carte Staff ${st.restaurant_name}` : `Votre nouvelle carte Gold ✨ ${st.restaurant_name}`, mailCard(st, c, st.site_url, u), null, u);
                mailed = true;
              }
            } catch (e) { console.warn('tier email', e); }
          }
          return json({ ok: true, mailed }, 200, cors);
        }
        if (url.pathname === '/club/tshirt-won') {
          const id = parseInt(body.id, 10);
          if (!id) return json({ ok: false, error: 'Valeur invalide' }, 400, cors);
          const at = body.won ? new Date().toISOString() : null;
          await sb(env, `resa_clients?id=eq.${id}&${inClub}`, { method: 'PATCH', body: { tshirt_won_at: at } });
          return json({ ok: true, tshirt_won_at: at }, 200, cors);
        }
        // Code gagnant du jeu (PERLE-XXXX) : vérifier, puis valider une seule fois.
        if (url.pathname === '/jeu/redeem') {
          const code = String(body.code || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
          const full = /^(PERLE|BOO)-/.test(code) ? code : 'PERLE-' + code;
          // codes du jeu principal et des jeux d'un moment du restaurant (slug « cslug--… »)
          const rows = await sb(env, `jeu_plays?or=${enc(`(client_slug.eq.${cslug},client_slug.like.${cslug}--*)`)}&code=eq.${enc(full)}&select=*,player:jeu_players(first_name,last_name,email)`);
          const p = rows && rows[0];
          if (!p) return json({ ok: false, error: 'Code inconnu' }, 404, cors);
          const pl = p.player || {}, name = [pl.first_name, pl.last_name].filter(Boolean).join(' ') || pl.email || '';
          const out = { code: p.code, prize: p.result, mode: p.mode || 'rue', prize_label: JEU_LOTS[p.result] + (p.mode === 'table' ? ' · à table, pour ce repas' : ''), name, expires_at: p.expires_at, redeemed_at: p.redeemed_at, expired: p.expires_at && Date.parse(p.expires_at) < Date.now() };
          if (p.redeemed_at) return json({ ok: false, used: true, play: out, error: 'Lot déjà remis' }, 409, cors);
          if (body.check) return json({ ok: true, play: out }, 200, cors);
          const now = new Date().toISOString();
          const done = await sb(env, `jeu_plays?id=eq.${p.id}&redeemed_at=is.null`, { method: 'PATCH', body: { redeemed_at: now, redeemed_by: who && who.email ? String(who.email) : null }, prefer: 'return=representation' });
          if (!done || !done.length) return json({ ok: false, error: 'Lot déjà remis' }, 409, cors);
          return json({ ok: true, play: { ...out, redeemed_at: now } }, 200, cors);
        }
        if (url.pathname === '/jeu/stats') return json(await jeuStats(env, cslug), 200, cors);
        if (url.pathname === '/plat/admin') return json(await platAdmin(env, slug), 200, cors);
        if (url.pathname === '/plat/save') return json(await platSave(env, slug, body.dish || {}), 200, cors);
        if (url.pathname === '/plat/order-status') {
          const id = parseInt(body.id, 10), st = String(body.status || '');
          if (!id || !['pending', 'confirmed', 'cancelled'].includes(st)) return json({ ok: false, error: 'Valeur invalide' }, 400, cors);
          await sb(env, `plat_orders?id=eq.${id}&client_slug=eq.${enc(slug)}`, { method: 'PATCH', body: { status: st, confirmed_at: st === 'confirmed' ? new Date().toISOString() : null } });
          return json({ ok: true }, 200, cors);
        }
        if (url.pathname === '/club/redeem') {
          const code = String(body.code || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
          const full = code.startsWith('CLUB-') ? code : 'CLUB-' + code;
          const rows = await sb(env, `resa_clients?client_slug=eq.${enc(cslug)}&club_code=eq.${enc(full)}&select=id,name,email,club_no,coupe_used_at,club_joined_at`);
          const c = rows && rows[0];
          if (!c) return json({ ok: false, error: 'Code inconnu' }, 404, cors);
          if (c.coupe_used_at) return json({ ok: false, used: true, client: c, error: 'Coupe déjà offerte' }, 409, cors);
          if (body.check) return json({ ok: true, client: c }, 200, cors);
          const now = new Date().toISOString();
          await sb(env, `resa_clients?id=eq.${c.id}&coupe_used_at=is.null`, { method: 'PATCH', body: { coupe_used_at: now } });
          return json({ ok: true, client: { ...c, coupe_used_at: now } }, 200, cors);
        }
        const st = await settings(env, slug);
        if (!st) return json({ ok: false, error: 'Restaurant non configuré pour les emails' }, 404, cors);
        const f = body.f || {}, tpl = String(body.tpl || 'evt');
        const subject = String(f.subject || f.title || st.restaurant_name).slice(0, 150);
        if (url.pathname === '/campaign/preview') return json({ ok: true, subject, html: campaignHtml(st, tpl, f, '#') }, 200, cors);
        // Envoi
        let list;
        if (body.test) list = [{ id: 0, email: who.email, name: '' }];
        else {
          const all = (await sb(env, `resa_clients?client_slug=eq.${enc(slug)}&marketing_optin=eq.true&select=*&limit=5000`) || []).filter(c => !c.archived_at);
          // Garde-fou : l'admin envoie la liste exacte des destinataires qu'il a affichée (ids).
          // Sans liste, seul « Tous » est accepté ; un segment inconnu n'envoie RIEN (avant : il envoyait à tout le monde).
          if (Array.isArray(body.ids)) { const ids = new Set(body.ids.map(String)); list = all.filter(c => ids.has(String(c.id))); }
          else if (!body.segment || body.segment === 'all') list = all;
          else if (KNOWN_SEGS.has(body.segment)) list = all.filter(c => inSegment(c, body.segment));
          else return json({ ok: false, error: 'Segment non reconnu : envoi annulé, personne n’a reçu l’email.' }, 400, cors);
          if (body.expect != null && list.length !== +body.expect) return json({ ok: false, error: `Le nombre de destinataires ne correspond pas (${list.length} au lieu de ${body.expect}) : envoi annulé.` }, 409, cors);
        }
        if (!list.length) return json({ ok: false, error: 'Aucun destinataire' }, 400, cors);
        const base = new URL(req.url).origin;
        let sent = 0;
        for (let i = 0; i < list.length; i += 500) {
          const chunk = list.slice(i, i + 500);
          const versions = [];
          for (const c of chunk) versions.push({ to: [{ email: c.email, name: c.name || undefined }], params: { unsub: c.id ? `${base}/unsub?s=${enc(slug)}&c=${c.id}&t=${await sign(env, slug + ':' + c.id)}` : '#' } });
          const r = await fetch(BREVO + '/smtp/email', { method: 'POST', headers: brevoHeaders(env), body: JSON.stringify({
            sender: { name: st.restaurant_name, email: env.SENDER_EMAIL }, replyTo: st.reply_to ? { email: st.reply_to } : undefined,
            subject: (body.test ? '[Test] ' : '') + subject, htmlContent: campaignHtml(st, tpl, f, '{{params.unsub}}'), messageVersions: versions }) });
          if (!r.ok) return json({ ok: false, error: 'Brevo ' + r.status + ' ' + await r.text(), sent }, 502, cors);
          sent += chunk.length;
        }
        return json({ ok: true, sent }, 200, cors);
      } catch (e) {
        return json({ ok: false, error: String(e && e.message || e) }, 500, cors);
      }
    }
    return json({ ok: true, service: 'resa-notify' }, 200, cors);
  },
  async scheduled(_evt, env, ctx) {
    ctx.waitUntil(sendReminders(env));
    ctx.waitUntil(coupeReminders(env).catch(e => console.warn('coupe reminders', e)));
  },
};

// ── Nouvelle réservation ──────────────────────────────────────────
async function notifyNew(env, slug, ref) {
  const st = await settings(env, slug);
  if (!st) return { ok: false, error: 'restaurant non configuré' };
  // On « réserve » l'envoi : ne passe qu'une fois, et seulement pour une résa récente.
  const since = new Date(Date.now() - 30 * 60e3).toISOString();
  const rows = await sb(env, `restaurant_reservations?client_slug=eq.${enc(slug)}&ref=eq.${enc(ref)}&confirm_sent_at=is.null&created_at=gte.${enc(since)}`,
    { method: 'PATCH', body: { confirm_sent_at: new Date().toISOString() }, prefer: 'return=representation' });
  const r = rows && rows[0];
  if (!r) return { ok: false, error: 'réservation introuvable ou déjà traitée' };

  if (r.from_email) {
    await sb(env, 'rpc/resa_upsert_client', { method: 'POST', body: {
      p_slug: slug, p_email: r.from_email, p_phone: normPhone(r.phone) || '', p_name: r.from_name || '', p_optin: !!r.marketing_optin } }).catch(() => {});
  }
  const jobs = [];
  if (r.from_email) jobs.push(sendEmail(env, st, r.from_email, r.from_name,
    `Votre réservation chez ${st.restaurant_name} est confirmée`, mailClient(st, r)));
  if (st.notify_email) jobs.push(sendEmail(env, st, st.notify_email, st.restaurant_name,
    `Nouvelle réservation · ${r.date_label} · ${r.slot} · ${r.covers} pers.`, mailResto(st, r), r.from_email));
  const res = await Promise.allSettled(jobs);
  return { ok: true, sent: res.filter(x => x.status === 'fulfilled').length };
}

// ── Messages des clients : enregistrés (contact_messages) puis envoyés au resto + à Will ──
// ── Statistiques du site (sql/stats-site.sql) ──
// Rien d'identifiant : un numéro d'onglet au hasard, la source, le bouton. Les robots sont ignorés.
const KNOWN = new Map();
async function knownSlug(env, slug) {
  if (KNOWN.has(slug)) return KNOWN.get(slug);
  let ok = !!(await settings(env, slug).catch(() => null));
  if (!ok && slug.endsWith('-test')) ok = !!(await settings(env, slug.slice(0, -5)).catch(() => null)) || slug === 'drevici-test';
  KNOWN.set(slug, ok); return ok;
}
async function track(env, req) {
  const ua = req.headers.get('user-agent') || '';
  if (!ua || /bot|crawl|spider|slurp|headless|lighthouse|facebookexternalhit|preview|monitor/i.test(ua)) return;
  let b; try { b = JSON.parse(await req.text()); } catch (e) { return; }
  if (!b || typeof b !== 'object') return;
  const cut = (v, n) => String(v == null ? '' : v).slice(0, n);
  const slug = cut(b.slug, 60), kind = b.k === 'view' ? 'view' : b.k === 'click' ? 'click' : '';
  const sid = cut(b.sid, 40).replace(/[^a-z0-9]/gi, ''), name = cut(b.n, 40).replace(/[^a-z0-9_-]/gi, '');
  const src = cut(b.src, 60).replace(/[^A-Za-z0-9:._-]/g, '');
  if (!/^[a-z0-9-]{2,60}$/.test(slug) || !kind || sid.length < 6) return;
  if (!(await knownSlug(env, slug))) return;
  await sb(env, 'site_events', { method: 'POST', prefer: 'return=minimal',
    body: { client_slug: slug, sid, kind, name: name || null, src: src || null, path: cut(b.p, 80) || null } });
}
async function contactMessage(env, b) {
  if (b && b.hp) return { ok: true };                       // champ piège rempli = robot : on ignore sans le dire
  const cut = (v, n) => String(v || '').trim().slice(0, n);
  const slug = cut(b.slug, 60), name = cut(b.name, 80), email = cut(b.email, 120).toLowerCase(), phone = cut(b.phone, 30), message = cut(b.message, 2000);
  if (!slug || !name || !message || (!email && !phone)) return { ok: false, error: 'Indiquez votre nom, votre message, et un email ou un téléphone.' };
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'Adresse email invalide.' };
  const st = await settings(env, slug);
  if (!st) return { ok: false, error: 'restaurant non configuré' };
  // Pas plus de 3 messages en 10 minutes par personne.
  const since = new Date(Date.now() - 10 * 60e3).toISOString();
  const who = email ? `email=eq.${enc(email)}` : `phone=eq.${enc(phone)}`;
  const recent = await sb(env, `contact_messages?client_slug=eq.${enc(slug)}&created_at=gte.${enc(since)}&${who}&select=id`).catch(() => []);
  if (recent && recent.length >= 3) return { ok: false, error: 'Trop de messages d’un coup, réessayez dans quelques minutes.' };
  await sb(env, 'contact_messages', { method: 'POST', body: { client_slug: slug, name, email: email || null, phone: phone || null, message, page: cut(b.page, 200) || null } });
  // Case cochée (jamais pré-cochée) : la personne entre dans la base clients avec son accord, comme à la réservation.
  if (email) await sb(env, 'rpc/resa_upsert_client', { method: 'POST', body: {
    p_slug: slug, p_email: email, p_phone: normPhone(phone) || '', p_name: name, p_optin: b.optin === true } }).catch(() => {});
  const to = [...new Set([st.notify_email, env.ADMIN_EMAIL].filter(Boolean).join(',').split(/[,;\s]+/).filter(Boolean).map(x => x.toLowerCase()))].join(',');
  if (to) await sendEmail(env, st, to, st.restaurant_name, `Nouveau message de ${name}`, mailMessage(st, { name, email, phone, message, optin: b.optin === true }), email || undefined).catch(() => {});
  return { ok: true };
}
const mailMessage = (st, m) => page(st.restaurant_name,
  `<p><b>Nouveau message depuis le site</b></p>
   <div style="background:#f6f4f0;border-radius:12px;padding:14px 16px;margin:12px 0;white-space:pre-line;font-size:15px">${esc(m.message)}</div>
   <table style="border-collapse:collapse;font-size:15px">${line('De', m.name)}${m.email ? line('Email', m.email) : ''}${m.phone ? line('Téléphone', m.phone) : ''}${line('Offres', m.optin ? 'accepte de recevoir les offres' : 'non')}</table>
   <p style="color:#6b7080;font-size:13.5px">${m.email ? 'Répondre à cet email écrit directement au client.' : 'Pas d’email laissé : rappelez le client.'} Tous les messages sont aussi dans /admin → Messages.</p>`);

// ── Rappels (~24 h avant) ─────────────────────────────────────────
async function sendReminders(env) {
  const all = await sb(env, 'resa_settings?active=eq.true&select=*');
  if (!all || !all.length) return;
  const bySlug = Object.fromEntries(all.map(s => [s.client_slug, s]));
  const today = parisDate(0), tomorrow = parisDate(1);
  const list = await sb(env, `restaurant_reservations?client_slug=in.(${all.map(s => enc(s.client_slug)).join(',')})` +
    `&date_iso=in.(${today},${tomorrow})&reminder_sent_at=is.null&or=(status.is.null,status.not.in.(cancelled,noshow))&select=*`);
  const now = Date.now();
  for (const r of list || []) {
    const at = resaTime(r.date_iso, r.slot);
    if (!at) continue;
    const h = (at - now) / 36e5;
    const created = r.created_at ? Date.parse(r.created_at) : 0;
    // Entre 2 h et 24 h avant, et pas pour une résa faite il y a moins de 2 h.
    if (h <= 2 || h > 24 || now - created < 2 * 36e5) continue;
    const st = bySlug[r.client_slug];
    // On marque d'abord (évite les doublons si deux tâches se chevauchent).
    const claimed = await sb(env, `restaurant_reservations?client_slug=eq.${enc(r.client_slug)}&ref=eq.${enc(r.ref)}&reminder_sent_at=is.null`,
      { method: 'PATCH', body: { reminder_sent_at: new Date().toISOString() }, prefer: 'return=representation' });
    if (!claimed || !claimed.length) continue;
    let channel = 'none';
    const phone = normPhone(r.phone);
    if (st.sms_reminders && phone) {
      const ok = await sb(env, 'rpc/sms_take', { method: 'POST', body: { p_slug: r.client_slug, p_kind: 'reminders', p_limit: st.sms_reminder_limit || 500 } }).catch(() => false);
      if (ok === true) {
        try { await sendSms(env, st, phone, smsReminder(st, r)); channel = 'sms'; } catch (e) { /* bascule email */ }
      }
      await quotaAlert(env, st).catch(() => {});
    }
    if (channel === 'none' && r.from_email) {
      try { await sendEmail(env, st, r.from_email, r.from_name, `Rappel : votre table chez ${st.restaurant_name} ${when(r)}`, mailReminder(st, r)); channel = 'email'; } catch (e) {}
    }
    await sb(env, `restaurant_reservations?client_slug=eq.${enc(r.client_slug)}&ref=eq.${enc(r.ref)}`,
      { method: 'PATCH', body: { reminder_channel: channel } }).catch(() => {});
  }
}

// Alerte à Beltab quand un resto atteint 80 % de son quota de rappels SMS (une fois / mois).
async function quotaAlert(env, st) {
  if (!env.ADMIN_EMAIL) return;
  const m = parisDate(0).slice(0, 7);
  const u = await sb(env, `sms_usage?client_slug=eq.${enc(st.client_slug)}&month=eq.${m}&select=*`);
  const row = u && u[0]; const lim = st.sms_reminder_limit || 500;
  if (!row || row.alert_sent || row.reminders < lim * 0.8) return;
  await sb(env, `sms_usage?client_slug=eq.${enc(st.client_slug)}&month=eq.${m}`, { method: 'PATCH', body: { alert_sent: true } });
  await sendEmail(env, { restaurant_name: 'Beltab' }, env.ADMIN_EMAIL, 'Beltab',
    `SMS : ${st.restaurant_name} à ${row.reminders}/${lim} rappels ce mois-ci`,
    page('Beltab', `<p>${esc(st.restaurant_name)} (${esc(st.client_slug)}) a utilisé <b>${row.reminders}</b> rappels SMS sur ${lim} ce mois-ci.</p><p>Au-delà, les rappels partent automatiquement par email.</p>`));
}

// ── Brevo ─────────────────────────────────────────────────────────
async function sendEmail(env, st, to, toName, subject, html, replyTo, unsubUrl) {
  const body = {
    sender: { name: st.restaurant_name, email: env.SENDER_EMAIL },
    // Plusieurs destinataires possibles, séparés par des virgules (ex. notify_email = « resto@…, moi@… »).
    to: String(to).split(/[,;\s]+/).filter(Boolean).map(e => ({ email: e, name: toName || undefined })),
    subject, htmlContent: html,
  };
  const rt = replyTo || st.reply_to;
  if (rt) body.replyTo = { email: rt };
  // Désinscription en 1 clic dans Gmail / Apple Mail (en plus du lien en bas de l'email).
  if (unsubUrl) body.headers = { 'List-Unsubscribe': `<${unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' };
  const r = await fetch(BREVO + '/smtp/email', { method: 'POST', headers: brevoHeaders(env), body: JSON.stringify(body) });
  if (!r.ok) throw new Error('Brevo email ' + r.status + ' ' + await r.text());
}
async function sendSms(env, st, phone, content) {
  const r = await fetch(BREVO + '/transactionalSMS/sms', { method: 'POST', headers: brevoHeaders(env),
    body: JSON.stringify({ sender: smsSender(st.restaurant_name), recipient: phone, content, type: 'transactional' }) });
  if (!r.ok) throw new Error('Brevo SMS ' + r.status + ' ' + await r.text());
}
const brevoHeaders = env => ({ 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' });
// Expéditeur SMS : 11 caractères max, lettres et chiffres uniquement.
const smsSender = n => (String(n || 'Beltab').normalize('NFD').replace(/[^A-Za-z0-9]/g, '').slice(0, 11) || 'Beltab');

// ── Contenus ──────────────────────────────────────────────────────
// SMS court (< 160 caractères), sans emoji, pour ne compter qu'un crédit.
function smsReminder(st, r) {
  const t = `${st.restaurant_name} : rappel de votre table ${when(r)} a ${r.slot}, ${r.covers} pers.` +
    (st.phone ? ` Empechement ? Appelez le ${st.phone}.` : '');
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E]/g, '').slice(0, 160);
}
function details(r) {
  return `<table style="border-collapse:collapse;margin:14px 0;font-size:15px">
    ${line('Date', r.date_label)}${line('Heure', r.slot)}${line('Couverts', r.covers)}${r.espace ? line('Espace', r.espace) : ''}
    ${r.note && r.note !== 'Aucune' ? line('Note', r.note) : ''}${line('Référence', r.ref)}</table>`;
}
const line = (k, v) => `<tr><td style="padding:4px 18px 4px 0;color:#6b7080">${esc(k)}</td><td style="padding:4px 0;font-weight:600">${esc(v)}</td></tr>`;
function infos(st) {
  return `<p style="color:#6b7080;font-size:13.5px;margin-top:22px">${[st.address, st.phone].filter(Boolean).map(esc).join(' · ')}</p>`;
}
const mailClient = (st, r) => page(st.restaurant_name,
  `<p>Bonjour ${esc(firstName(r.from_name))},</p><p>Votre réservation est bien enregistrée. Nous avons hâte de vous recevoir.</p>${details(r)}
   <p>Un empêchement ? Répondez simplement à cet email${st.phone ? ` ou appelez-nous au ${esc(st.phone)}` : ''}.</p>${infos(st)}`);
const mailReminder = (st, r) => page(st.restaurant_name,
  `<p>Bonjour ${esc(firstName(r.from_name))},</p><p>Petit rappel : nous vous attendons ${when(r)}.</p>${details(r)}
   <p>Un empêchement ? Répondez à cet email${st.phone ? ` ou appelez-nous au ${esc(st.phone)}` : ''}, votre table pourra profiter à d'autres.</p>${infos(st)}`);
const mailResto = (st, r) => page(st.restaurant_name,
  `<p><b>Nouvelle réservation</b></p>${details(r)}
   <table style="border-collapse:collapse;font-size:15px">${line('Client', r.from_name)}${line('Email', r.from_email)}${line('Téléphone', r.phone)}
   ${line('Offres', r.marketing_optin ? 'accepte de recevoir les offres' : 'non')}</table>
   <p style="color:#6b7080;font-size:13.5px">Répondre à cet email écrit directement au client.</p>`);
function page(title, inner) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><style>:root{color-scheme:light only;supported-color-schemes:light only}</style></head><body style="margin:0;background:#f5f3ef;font-family:-apple-system,Segoe UI,Inter,Arial,sans-serif;color:#16181d">
  <div style="max-width:520px;margin:0 auto;padding:28px 18px"><div style="text-align:center;font-family:Georgia,serif;font-size:24px;font-weight:700;letter-spacing:.03em;color:#10285e;margin-bottom:18px">${esc(title)}</div>
  <div style="background:#fff;border-radius:18px;padding:22px 22px 18px;line-height:1.5">${inner}</div>
  <p style="text-align:center;color:#a3a7b1;font-size:11.5px;margin-top:16px">Réservation gérée avec Beltab</p></div></body></html>`;
}

// ── Utilitaires ───────────────────────────────────────────────────
const CLUB_KEYS = ['club_member', 'club_no', 'club_code', 'club_joined_at', 'club_tier', 'club_card', 'club_show', 'coupe_used_at', 'tshirt_size', 'tshirt_won_at'];
async function clubSlugOf(env, slug) {
  const r = await sb(env, `resa_settings?client_slug=eq.${enc(slug)}&select=*`).catch(() => null);
  const c = r && r[0] && r[0].club_slug;
  return c && /^[a-z0-9-]{2,60}$/.test(c) ? c : slug;
}
async function settings(env, slug) {
  const r = await sb(env, `resa_settings?client_slug=eq.${enc(slug)}&active=eq.true&select=*`);
  return r && r[0];
}
async function sb(env, path, { method = 'GET', body, prefer } = {}) {
  // Nouvelles clés Supabase (sb_secret_…) : en-tête apikey seul. Anciennes clés JWT : apikey + Bearer.
  const k = env.SUPABASE_SERVICE_KEY || '';
  const h = { apikey: k, 'content-type': 'application/json' };
  if (!k.startsWith('sb_')) h.authorization = 'Bearer ' + k;
  if (prefer) h.prefer = prefer;
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error('Supabase ' + r.status + ' ' + await r.text());
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
// « +33 6 12 34 56 78 » / « 06 12… » → « 33612345678 » (format Brevo). '' si absent.
function normPhone(p) {
  if (!p || /non renseign/i.test(p)) return '';
  let d = String(p).replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  else if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = '33' + d.slice(1);
  d = d.replace(/^330/, '33');
  return d.length >= 10 ? d : '';
}
function parisOffsetMin(date) {
  const s = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', timeZoneName: 'shortOffset' }).formatToParts(date).find(p => p.type === 'timeZoneName').value;
  const m = s.match(/GMT([+-]\d+)(?::(\d+))?/); return m ? (+m[1]) * 60 + Math.sign(+m[1]) * (+(m[2] || 0)) : 0;
}
function parisDate(addDays) {
  const d = new Date(Date.now() + addDays * 864e5);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(d); // AAAA-MM-JJ
}
function resaTime(dateIso, slot) {
  const m = String(slot || '').match(/(\d{1,2})\D?(\d{2})?/); if (!m || !dateIso) return 0;
  const asUtc = Date.parse(`${dateIso}T${String(m[1]).padStart(2, '0')}:${m[2] || '00'}:00Z`);
  return asUtc - parisOffsetMin(new Date(asUtc)) * 60e3;
}
const when = r => r.date_iso === parisDate(0) ? "aujourd'hui" : 'demain';
const firstName = n => String(n || '').trim().split(/\s+/)[0] || '';
const enc = encodeURIComponent;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function corsHeaders(req, env) {
  const o = req.headers.get('origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = allowed.some(a => o === a || (a.startsWith('*.') && o.endsWith(a.slice(1))));
  return { 'access-control-allow-origin': ok ? o : (allowed[0] || '*'), 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type, authorization', vary: 'origin' };
}
const json = (o, s, h) => new Response(JSON.stringify(o), { status: s, headers: { ...h, 'content-type': 'application/json' } });

// ════════════════ Campagnes email (espace restaurateur) ════════════════
async function adminOf(env, req, slug) {
  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ') || !/^[a-z0-9-]{2,60}$/.test(slug)) return null;
  const u = await fetch(env.SUPABASE_URL + '/auth/v1/user', { headers: { apikey: env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_KEY, authorization: auth } });
  if (!u.ok) return null;
  const user = await u.json();
  const rows = await sb(env, `restaurant_admins?select=client_slug&user_id=eq.${enc(user.id)}&client_slug=eq.${enc(slug)}`).catch(() => []);
  return rows && rows.length ? { id: user.id, email: user.email } : null;
}
// ════════════════ Équipe (comptes admin / staff) ════════════════
// Slugs d'un même établissement : un accès donné depuis l'admin couvre la carte, les réservations et la copie de test.
const SLUG_FAMILY = { drevici: ['drevici', 'drevici-paris', 'drevici-test'], 'drevici-test': ['drevici', 'drevici-paris', 'drevici-test'] };
const familyOf = slug => SLUG_FAMILY[slug] || [slug];
const STAFF_AREAS = ['resa', 'calendrier', 'campagnes', 'tshirts'];
async function userOf(env, req) {
  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  const u = await fetch(env.SUPABASE_URL + '/auth/v1/user', { headers: { apikey: env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_KEY, authorization: auth } });
  return u.ok ? u.json() : null;
}
async function staffOf(env, req, slug, area) {
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) return null;
  const user = await userOf(env, req); if (!user) return null;
  const base = slug.split('--')[0];
  const rows = await sb(env, `restaurant_staff?user_id=eq.${enc(user.id)}&select=perms,slugs`).catch(() => []);
  const ok = (rows || []).some(r => (r.slugs || []).includes(base) && (!area || (r.perms || []).includes(area)));
  return ok ? { id: user.id, email: user.email, staff: true } : null;
}
async function authAdmin(env, path, { method = 'GET', body } = {}) {
  const k = env.SUPABASE_SERVICE_KEY || '';
  const h = { apikey: k, 'content-type': 'application/json' };
  if (!k.startsWith('sb_')) h.authorization = 'Bearer ' + k;
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/${path}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); const j = t ? JSON.parse(t) : null;
  if (!r.ok) throw new Error('Auth ' + r.status + ' ' + (j && (j.msg || j.message || j.error_description) || t));
  return j;
}
async function findUserByEmail(env, email) {
  for (let page = 1; page <= 20; page++) {
    const j = await authAdmin(env, `users?page=${page}&per_page=200`);
    const list = (j && j.users) || [];
    const u = list.find(x => String(x.email || '').toLowerCase() === email);
    if (u) return u;
    if (list.length < 200) return null;
  }
  return null;
}
const TEAM_LABEL = { resa: 'Réservations', calendrier: 'Calendrier et events', campagnes: 'Campagnes QR', tshirts: 'T-shirts' };
async function team(env, req, action, b, cors) {
  const slug = String(b.slug || '');
  if (action === 'me') {
    const user = await userOf(env, req);
    if (!user) return json({ ok: false, error: 'Non connecté' }, 401, cors);
    if (await adminOf(env, req, slug)) return json({ ok: true, role: 'admin', email: user.email }, 200, cors);
    const base = slug.split('--')[0];
    const rows = await sb(env, `restaurant_staff?user_id=eq.${enc(user.id)}&select=perms,slugs`) || [];
    const r = rows.find(x => (x.slugs || []).includes(base));
    return json({ ok: true, role: r ? 'staff' : null, perms: r ? r.perms || [] : [], email: user.email }, 200, cors);
  }
  const me = await adminOf(env, req, slug);
  if (!me) return json({ ok: false, error: 'Réservé aux administrateurs' }, 403, cors);
  const fam = familyOf(slug);
  // Slugs de la famille que l'admin gère lui-même (on ne donne jamais plus que ce qu'on a).
  const mine = (await sb(env, `restaurant_admins?user_id=eq.${enc(me.id)}&client_slug=in.(${fam.map(enc).join(',')})&select=client_slug`) || []).map(r => r.client_slug);
  if (action === 'list') {
    // « locked » : administrateur protégé (sql/equipe.sql), impossible à retirer. Colonne absente : personne n'est protégé.
    const admins = await sb(env, `restaurant_admins?client_slug=eq.${enc(slug)}&select=user_id,locked`).catch(() => sb(env, `restaurant_admins?client_slug=eq.${enc(slug)}&select=user_id`)) || [];
    const staff = await sb(env, `restaurant_staff?client_slug=eq.${enc(familyOf(slug)[0])}&select=user_id,email,perms,created_at`) || [];
    const out = [];
    for (const a of admins) {
      let email = '', prenom = '';
      try { const u = await authAdmin(env, `users/${a.user_id}`); email = u.email || ''; prenom = (u.user_metadata && u.user_metadata.prenom) || ''; } catch (e) {}
      out.push({ user_id: a.user_id, email, prenom, role: 'admin', me: a.user_id === me.id, locked: !!a.locked });
    }
    for (const s of staff) {
      let prenom = '';
      try { const u = await authAdmin(env, `users/${s.user_id}`); prenom = (u.user_metadata && u.user_metadata.prenom) || ''; } catch (e) {}
      out.push({ user_id: s.user_id, email: s.email, prenom, role: 'staff', perms: s.perms || [], created_at: s.created_at });
    }
    return json({ ok: true, members: out, areas: STAFF_AREAS.map(k => ({ k, label: TEAM_LABEL[k] })) }, 200, cors);
  }
  const perms = (Array.isArray(b.perms) ? b.perms : []).filter(p => STAFF_AREAS.includes(p));
  if (action === 'add') {
    const email = String(b.email || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, error: 'Email invalide' }, 400, cors);
    const role = b.role === 'admin' ? 'admin' : 'staff';
    let user = await findUserByEmail(env, email), created = false;
    const prenomNew = String(b.prenom || '').trim().slice(0, 40);
    if (!user) { user = await authAdmin(env, 'users', { method: 'POST', body: { email, email_confirm: true, user_metadata: prenomNew ? { prenom: prenomNew } : {} } }); created = true; }
    else if (prenomNew && !(user.user_metadata && user.user_metadata.prenom)) await authAdmin(env, `users/${user.id}`, { method: 'PUT', body: { user_metadata: { ...(user.user_metadata || {}), prenom: prenomNew } } }).catch(() => {});
    if (role === 'admin') {
      for (const s of mine) await sb(env, 'restaurant_admins?on_conflict=user_id,client_slug', { method: 'POST', body: { user_id: user.id, client_slug: s }, prefer: 'resolution=ignore-duplicates' }).catch(async () => {
        const ex = await sb(env, `restaurant_admins?user_id=eq.${enc(user.id)}&client_slug=eq.${enc(s)}&select=user_id`);
        if (!ex || !ex.length) await sb(env, 'restaurant_admins', { method: 'POST', body: { user_id: user.id, client_slug: s } });
      });
      await sb(env, `restaurant_staff?user_id=eq.${enc(user.id)}&client_slug=eq.${enc(fam[0])}`, { method: 'DELETE' });
    } else {
      if (user.id === me.id) return json({ ok: false, error: 'Vous êtes déjà administrateur' }, 400, cors);
      const isAdm = await sb(env, `restaurant_admins?user_id=eq.${enc(user.id)}&client_slug=eq.${enc(slug)}&select=user_id`);
      if (isAdm && isAdm.length) return json({ ok: false, error: 'Cette personne est déjà administrateur' }, 400, cors);
      await sb(env, 'restaurant_staff?on_conflict=user_id,client_slug', { method: 'POST', body: { user_id: user.id, client_slug: fam[0], slugs: mine, email, perms, created_by: me.id }, prefer: 'resolution=merge-duplicates' });
    }
    // Lien pour choisir son mot de passe (aussi pour un compte qui existait déjà : il peut s'en servir ou l'ignorer).
    const site = String(b.site || '').replace(/[?#].*$/, '');
    const redirect = /^https:\/\/([a-z0-9-]+\.)*(beltab\.app|drevicioyster\.com)\//.test(site) ? site : undefined;
    const link = await authAdmin(env, 'generate_link', { method: 'POST', body: { type: 'recovery', email, redirect_to: redirect } });
    const url = link.action_link || (link.properties && link.properties.action_link);
    const st = await settings(env, familyOf(slug).includes('drevici-paris') ? 'drevici-paris' : slug).catch(() => null) || { restaurant_name: 'Beltab' };
    const what = role === 'admin' ? 'un accès <b>administrateur</b> (tout le back-office)' : `un accès <b>staff</b> : ${perms.map(p => TEAM_LABEL[p]).join(', ') || 'aucune section pour l’instant'}`;
    const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px 22px;color:#1d2433">
      <h2 style="font-family:Georgia,serif;margin:0 0 14px">${esc(st.restaurant_name)}</h2>
      <p>Bonjour,</p><p>${esc(me.email || 'Un administrateur')} vous a donné ${what}.</p>
      <p>Cliquez sur le bouton pour choisir votre mot de passe, puis connectez-vous avec cette adresse : <b>${esc(email)}</b>.</p>
      <p style="margin:26px 0"><a href="${esc(url)}" style="background:#1f3a5f;color:#fff;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:700">Choisir mon mot de passe</a></p>
      <p style="font-size:12.5px;color:#6b7280">Ce lien ne sert qu’une fois. S’il a expiré, demandez à l’administrateur de vous le renvoyer.</p></div>`;
    await sendEmail(env, st, email, '', `Votre accès à l’espace ${st.restaurant_name}`, html);
    return json({ ok: true, created, role }, 200, cors);
  }
  const uid = String(b.user_id || '');
  if (!/^[0-9a-f-]{36}$/.test(uid)) return json({ ok: false, error: 'Compte inconnu' }, 400, cors);
  if (action === 'name') {
    const prenom = String(b.prenom || '').trim().slice(0, 40);
    const isAdm = await sb(env, `restaurant_admins?user_id=eq.${enc(uid)}&client_slug=eq.${enc(slug)}&select=user_id`);
    const isStf = await sb(env, `restaurant_staff?user_id=eq.${enc(uid)}&client_slug=eq.${enc(fam[0])}&select=user_id`);
    if (!(isAdm && isAdm.length) && !(isStf && isStf.length)) return json({ ok: false, error: 'Cette personne ne fait pas partie de votre équipe' }, 403, cors);
    const u = await authAdmin(env, `users/${uid}`);
    await authAdmin(env, `users/${uid}`, { method: 'PUT', body: { user_metadata: { ...((u && u.user_metadata) || {}), prenom } } });
    return json({ ok: true, prenom }, 200, cors);
  }
  if (action === 'update') {
    await sb(env, `restaurant_staff?user_id=eq.${enc(uid)}&client_slug=eq.${enc(fam[0])}`, { method: 'PATCH', body: { perms } });
    return json({ ok: true }, 200, cors);
  }
  if (action === 'remove') {
    if (uid === me.id) return json({ ok: false, error: 'Vous ne pouvez pas retirer votre propre accès' }, 400, cors);
    if (b.role === 'admin') {
      const lk = await sb(env, `restaurant_admins?user_id=eq.${enc(uid)}&locked=is.true&select=user_id`).catch(() => []);
      if (lk && lk.length) return json({ ok: false, error: 'Administrateur protégé : son accès ne peut pas être retiré' }, 403, cors);
      for (const s of mine) await sb(env, `restaurant_admins?user_id=eq.${enc(uid)}&client_slug=eq.${enc(s)}`, { method: 'DELETE' }); }
    else await sb(env, `restaurant_staff?user_id=eq.${enc(uid)}&client_slug=eq.${enc(fam[0])}`, { method: 'DELETE' });
    return json({ ok: true }, 200, cors);
  }
  return json({ ok: false, error: 'Action inconnue' }, 404, cors);
}
const KNOWN_SEGS = new Set(['fideles', 'relance', 'nouveaux', 'club']);
function inSegment(c, seg) {
  const days = c.last_seen ? (Date.now() - Date.parse(c.last_seen)) / 864e5 : 999;
  if (seg === 'fideles') return (c.visits || 0) >= 3;
  if (seg === 'relance') return days > 60;
  if (seg === 'nouveaux') return (c.visits || 0) <= 1;
  if (seg === 'club') return !!c.club_member;
  return true;
}
// Lien de désinscription signé (même lien que les campagnes).
const unsubUrl = async (env, slug, id) => id ? `https://resa.beltab.app/unsub?s=${enc(slug)}&c=${id}&t=${await sign(env, slug + ':' + id)}` : '';
const unsubFoot = u => u ? `<p style="color:#9aa0aa;font-size:11.5px;text-align:center;margin:18px 0 0">Vous recevez cet email car vous êtes membre du club. <a href="${esc(u)}" style="color:#9aa0aa">Se désinscrire des offres</a></p>` : '';
async function sign(env, msg) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.SUPABASE_SERVICE_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const b = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg)));
  return [...b.slice(0, 16)].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function unsub(env, url) {
  const s = url.searchParams.get('s') || '', c = url.searchParams.get('c') || '', t = url.searchParams.get('t') || '';
  const page = m => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:-apple-system,Inter,Arial,sans-serif;background:#f5f3ef;display:grid;place-items:center;min-height:90vh;margin:0"><div style="background:#fff;border-radius:18px;padding:28px 26px;max-width:380px;text-align:center"><p style="font-size:16px;line-height:1.5;margin:0">${m}</p></div>`, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  if (!/^\d+$/.test(c) || t !== await sign(env, s + ':' + c)) return page('Lien invalide.');
  // unsub_at : date de désinscription (liste « ne pas contacter »). Repli si la colonne n'existe pas encore.
  await sb(env, `resa_clients?id=eq.${c}&client_slug=eq.${enc(s)}`, { method: 'PATCH', body: { marketing_optin: false, unsub_at: new Date().toISOString() } })
    .catch(() => sb(env, `resa_clients?id=eq.${c}&client_slug=eq.${enc(s)}`, { method: 'PATCH', body: { marketing_optin: false } }));
  return page('C’est noté : vous ne recevrez plus nos offres par email.');
}
const nl = s => esc(s).replace(/\n/g, '<br>');
function campaignHtml(st, tpl, f, unsubUrl) {
  const col = /^#[0-9a-f]{3,8}$/i.test(f.color || '') ? f.color : '#10285e';
  const font = String(f.font || 'Playfair Display').replace(/[^\w\s-]/g, '');
  const serif = `'${font}',Georgia,'Times New Roman',serif`;
  const link = esc(f.link || st.site_url || '#');
  const cta = esc(f.cta || 'Réserver ma table');
  const btn = (c = col, fg = '#ffffff') => `<table role="presentation" align="center" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background:${c}"><a href="${link}" style="display:inline-block;padding:14px 28px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:${fg};text-decoration:none;border-radius:999px">${cta}</a></td></tr></table>`;
  const img = f.image ? `<img src="${esc(f.image)}" width="600" alt="" style="display:block;width:100%;max-width:600px;height:auto;border:0">` : '';
  const kick = f.kicker ? `<p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#b8945a">${esc(f.kicker)}</p>` : '';
  const title = (c = col, extra = '') => `<h1 style="margin:0 0 12px;font-family:${serif};font-size:30px;line-height:1.2;font-weight:bold;color:${c};${extra}">${esc(f.title || '')}</h1>`;
  const text = (c = '#3b3f48') => f.text ? `<p style="margin:0 0 22px;font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:${c}">${nl(f.text)}</p>` : '';
  const box = (k, v) => v ? `<td style="background:#f5f3ef;border-radius:12px;padding:12px 14px;font-family:Arial,sans-serif" width="50%"><div style="font-size:12px;color:#6b7080">${esc(k)}</div><div style="font-size:15px;font-weight:bold;color:#16181d">${esc(v)}</div></td>` : '';
  let body = '';
  if (tpl === 'plat') {
    const d = f.dish || {};
    body = `${img}<div style="padding:26px 30px 30px">${kick}${title()}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ef;border-radius:16px;margin:0 0 20px"><tr>${d.img ? `<td width="120" style="padding:12px"><img src="${esc(d.img)}" width="110" height="110" alt="" style="display:block;border-radius:12px;object-fit:cover"></td>` : ''}<td style="padding:14px;font-family:Arial,sans-serif"><div style="font-family:${serif};font-size:19px;font-weight:bold;color:${col}">${esc(d.name || '')}</div><div style="font-size:13.5px;color:#555;line-height:1.45;margin:4px 0 6px">${esc(d.desc || '')}</div><div style="font-size:16px;font-weight:bold">${esc(d.price || '')}</div></td></tr></table>
      ${text()}${btn()}</div>`;
  } else if (tpl === 'retour') {
    body = `<div style="background:${col};padding:44px 30px 40px;text-align:center">${title('#ffffff', 'font-style:italic;font-weight:normal;font-size:34px')}${text('rgba(255,255,255,.85)')}
      ${f.gift ? `<div style="display:inline-block;border:1.5px dashed rgba(255,255,255,.55);border-radius:14px;padding:14px 22px;margin:0 0 24px"><div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.7)">Votre cadeau</div><div style="font-family:${serif};font-size:24px;font-weight:bold;letter-spacing:2px;color:#ffffff">${esc(f.gift)}</div></div>` : ''}
      ${btn('#ffffff', col)}</div>`;
  } else if (tpl === 'menu') {
    const lines = String(f.items || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
      if (/^#/.test(l)) return `<tr><td colspan="2" style="padding:16px 0 4px;font-family:Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#b8945a">${esc(l.replace(/^#\s*/, ''))}</td></tr>`;
      const m = l.match(/^(.*?)[\s–—-]+(\d[\d,.]*\s*€?)$/); const n = m ? m[1] : l, p = m ? m[2] : '';
      return `<tr><td style="padding:11px 0;border-bottom:1px solid #ece8e0;font-family:Arial,sans-serif;font-size:15px;color:#16181d">${esc(n)}</td><td align="right" style="padding:11px 0;border-bottom:1px solid #ece8e0;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:${col};white-space:nowrap">${esc(p)}${p && !/€/.test(p) ? ' €' : ''}</td></tr>`;
    }).join('');
    body = `${img}<div style="padding:26px 30px 30px">${kick}${title()}${text()}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px">${lines}</table>${btn()}</div>`;
  } else if (tpl === 'anniv') {
    body = `<div style="background:${col};padding:40px 30px 10px;text-align:center"><div style="font-family:${serif};font-size:64px;line-height:1;font-weight:bold;color:#ffffff">${esc(f.big || '')}</div><p style="margin:10px 0 0;font-family:Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:#d9bf8c">${esc(f.kicker || '')}</p></div>${img}
      <div style="padding:28px 30px 30px;text-align:center">${title()}${text()}${btn()}</div>`;
  } else {
    body = `${img}<div style="padding:26px 30px 30px">${kick}${title()}${text()}
      ${f.info1 || f.info2 ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="8" style="margin:0 0 14px"><tr>${box('Quand', f.info1)}${box('Prix', f.info2)}</tr></table>` : ''}${btn()}</div>`;
  }
  const foot = [st.restaurant_name, st.address, st.phone].filter(Boolean).map(esc).join(' · ');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><style>:root{color-scheme:light only;supported-color-schemes:light only}</style><link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, '+')}:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet"><title>${esc(f.title || st.restaurant_name)}</title></head>
<body style="margin:0;padding:0;background:#f5f3ef"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ef"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden"><tr><td>
<div style="text-align:center;padding:22px 20px 18px;font-family:${serif};font-size:22px;font-weight:bold;letter-spacing:3px;color:${col}">${esc(String(st.restaurant_name).toUpperCase())}</div>
${body}
<div style="text-align:center;padding:18px 20px 22px;border-top:1px solid #f0ede7;font-family:Arial,sans-serif;font-size:12px;line-height:1.6;color:#8a8f99">${foot}<br><a href="${unsubUrl}" style="color:#8a8f99">Se désinscrire</a></div>
</td></tr></table></td></tr></table></body></html>`;
}


// ════════════════ Club ════════════════
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const clubCode = () => 'CLUB-' + Array.from(crypto.getRandomValues(new Uint8Array(4)), b => CODE_CHARS[b % CODE_CHARS.length]).join('');
const cap = s => String(s || '').trim().replace(/\s+/g, ' ').slice(0, 40).replace(/(^|[\s'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
async function clubJoin(env, b) {
  const slug = String(b.slug || '');
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) return { ok: false, error: 'Restaurant inconnu' };
  if (b.hp) return { ok: true, code: 'CLUB-OK', no: 0 }; // robot (champ caché rempli)
  const st = await settings(env, slug);
  if (!st) return { ok: false, error: 'Restaurant inconnu' };
  const email = String(b.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: 'Email invalide' };
  const phone = normPhone(b.phone);
  if (!phone || phone.length < 10) return { ok: false, error: 'Téléphone invalide' };
  if (!b.consent) return { ok: false, error: 'Merci d\'accepter de recevoir les offres du club' };
  const first = cap(b.first), last = cap(b.last);
  if (!first) return { ok: false, error: 'Prénom requis' };
  const src = String(b.src || 'site').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 60) || 'SITE';
  // Déjà membre (même email, ou même téléphone) → on renvoie sa carte, jamais une 2e coupe.
  const ex = await sb(env, `resa_clients?client_slug=eq.${enc(slug)}&or=${enc(`(email.eq."${email}",phone.eq."${phone}")`)}&select=id,email,name,club_member,club_code,club_no,coupe_used_at&order=club_member.desc.nullslast`) || [];
  const mem = ex.find(c => c.club_member && c.club_code);
  if (mem) return { ok: true, already: true, code: mem.club_code, no: mem.club_no, first: (mem.name || first).split(' ')[0], used: !!mem.coupe_used_at };
  const all = await sb(env, `resa_clients?client_slug=eq.${enc(slug)}&club_member=eq.true&select=club_no&order=club_no.desc.nullslast&limit=1`) || [];
  const no = ((all[0] && all[0].club_no) || 0) + 1;
  const row = { club_member: true, club_joined_at: new Date().toISOString(), club_no: no, club_show: b.show !== false, marketing_optin: true,
    phone, name: [first, last].filter(Boolean).join(' '), source: src };
  let code = '';
  for (let i = 0; i < 5 && !code; i++) {
    const c = clubCode();
    try {
      const own = ex.find(x => x.email === email);
      if (own) await sb(env, `resa_clients?id=eq.${own.id}`, { method: 'PATCH', body: { ...row, club_code: c } });
      else await sb(env, 'resa_clients', { method: 'POST', body: { client_slug: slug, email, visits: 0, ...row, club_code: c } });
      code = c;
    } catch (e) { if (!/duplicate|23505/.test(String(e))) throw e; }
  }
  if (!code) return { ok: false, error: 'Réessayez dans un instant' };
  try {
    const me = (await sb(env, `resa_clients?client_slug=eq.${enc(slug)}&club_code=eq.${enc(code)}&select=id&limit=1`) || [])[0];
    const u = await unsubUrl(env, slug, me && me.id);
    await sendEmail(env, st, email, first, `Bienvenue au club ${st.restaurant_name} 🥂`, mailClub(st, first, code, no, b.site, u), null, u);
  } catch (e) { console.warn('club email', e); }
  return { ok: true, code, no, first };
}
// Carte du membre (niveau + visuel), lue par le site à partir du code stocké sur le téléphone.
// Ne renvoie que le prénom et l'initiale, jamais l'email ni le téléphone.
async function clubCard(env, slug, code) {
  code = code.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (!/^[a-z0-9-]{2,60}$/.test(slug) || !/^CLUB-[A-Z0-9]{4}$/.test(code)) return { ok: false };
  const rows = await sb(env, `resa_clients?client_slug=eq.${enc(slug)}&club_code=eq.${enc(code)}&club_member=eq.true&select=*&limit=1`) || [];
  const r = rows[0]; if (!r) return { ok: false };
  const tier = ['membre', 'vip', 'staff'].includes(r.club_tier) ? r.club_tier : 'membre';
  const card = tier === 'staff' ? (['navy', 'gold', 'noir'].includes(r.club_card) ? r.club_card : 'noir') : tier === 'vip' ? 'gold' : 'navy';
  const [f, ...l] = String(r.name || '').trim().split(/\s+/);
  return { ok: true, tier, card, first: f || '', initial: l.length ? l[l.length - 1][0].toUpperCase() : '', no: r.club_no, joined: r.club_joined_at, used: !!r.coupe_used_at, tshirt: r.tshirt_size || null };
}
// Taille de T-shirt du membre (tirage au sort des 100 premiers membres). size vide = ne participe pas.
const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
async function clubTshirt(env, b) {
  const slug = String(b.slug || ''), code = String(b.code || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const size = String(b.size || '').toUpperCase();
  if (!/^[a-z0-9-]{2,60}$/.test(slug) || !/^CLUB-[A-Z0-9]{4}$/.test(code)) return { ok: false, error: 'Carte inconnue' };
  if (size && !TSHIRT_SIZES.includes(size)) return { ok: false, error: 'Taille inconnue' };
  const done = await sb(env, `resa_clients?client_slug=eq.${enc(slug)}&club_code=eq.${enc(code)}&club_member=eq.true`, { method: 'PATCH', body: { tshirt_size: size || null, tshirt_at: new Date().toISOString() }, prefer: 'return=representation' });
  if (!done || !done.length) return { ok: false, error: 'Carte inconnue' };
  return { ok: true, size: size || null };
}
// « Déjà membre ? Retrouver ma carte » (nouveau téléphone, autre navigateur…) :
// il faut l'email ET le téléphone de l'inscription, sur la même fiche, pour récupérer le code.
async function clubFind(env, b) {
  const slug = String(b.slug || '');
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) return { ok: false, error: 'Restaurant inconnu' };
  const email = String(b.email || '').trim().toLowerCase();
  const phone = normPhone(b.phone);
  if (!email || !phone || phone.length < 10) return { ok: false, error: 'Indiquez votre email et votre téléphone' };
  const rows = await sb(env, `resa_clients?client_slug=eq.${enc(slug)}&email=eq.${enc(email)}&phone=eq.${enc(phone)}&club_member=eq.true&select=*&limit=1`) || [];
  const r = rows[0];
  if (!r || !r.club_code) return { ok: false, error: 'Aucune carte trouvée avec cet email et ce téléphone.' };
  const tier = ['membre', 'vip', 'staff'].includes(r.club_tier) ? r.club_tier : 'membre';
  const card = tier === 'staff' ? (['navy', 'gold', 'noir'].includes(r.club_card) ? r.club_card : 'noir') : tier === 'vip' ? 'gold' : 'navy';
  const [f, ...l] = String(r.name || '').trim().split(/\s+/);
  return { ok: true, code: r.club_code, no: r.club_no, first: f || '', last: l.join(' '), joined: r.club_joined_at, used: !!r.coupe_used_at, tier, card, tshirt: r.tshirt_size || null };
}
// ── Relances « votre coupe vous attend » ──────────────────────────
// Membres du club qui n'ont pas encore eu leur coupe et acceptent les offres :
// un email quand il reste 15 jours, puis quand il en reste 7. Une seule fois chacun.
// Envoi entre 10 h et 20 h (heure de Paris) pour ne pas réveiller les gens.
async function coupeReminders(env) {
  const hour = Number(new Date().toLocaleString('fr-FR', { hour: '2-digit', hour12: false, timeZone: 'Europe/Paris' }));
  if (hour < 10 || hour >= 20) return;
  const all = await sb(env, 'resa_settings?active=eq.true&select=*');
  for (const st of all || []) {
    const slug = st.client_slug;
    const now = Date.now(), d = n => new Date(now - (COUPE_DAYS - n) * 864e5).toISOString();
    // fenêtre : inscrits il y a entre 15 et 23 jours (J-15) / entre 23 et 30 jours (J-7)
    for (const [left, col, from, to] of [[15, 'coupe_rem15_at', d(7), d(15)], [7, 'coupe_rem7_at', d(0), d(7)]]) {
      const rows = await sb(env, `resa_clients?client_slug=eq.${enc(slug)}&club_member=eq.true&coupe_used_at=is.null&marketing_optin=eq.true&${col}=is.null&club_joined_at=gt.${enc(from)}&club_joined_at=lte.${enc(to)}&select=id,email,name,club_code,club_no,club_joined_at,club_tier,club_card&limit=200`).catch(() => []) || [];
      for (const c of rows) {
        const claimed = await sb(env, `resa_clients?id=eq.${c.id}&${col}=is.null`, { method: 'PATCH', body: { [col]: new Date().toISOString() }, prefer: 'return=representation' }).catch(() => null);
        if (!claimed || !claimed.length || !c.email) continue;
        const first = String(c.name || '').trim().split(/\s+/)[0];
        const daysLeft = Math.max(1, Math.ceil(COUPE_DAYS - (now - Date.parse(c.club_joined_at)) / 864e5));
        const u = await unsubUrl(env, slug, c.id);
        try {
          await sendEmail(env, st, c.email, c.name, left === 15 ? `Votre coupe vous attend encore ${daysLeft} jours 🥂` : `Plus que ${daysLeft} jours pour votre coupe 🥂`, mailCoupeReminder(st, c, first, daysLeft, u), null, u);
        } catch (e) { console.warn('coupe reminder', e); }
      }
    }
  }
}
const mailCoupeReminder = (st, c, first, left, unsub) => page(st.restaurant_name,
  `<p>Bonjour ${esc(first)},</p><p>${left <= 7 ? `Plus que <b>${left} jours</b> pour profiter de votre coupe offerte !` : `Votre coupe offerte vous attend encore <b>${left} jours</b>.`}</p>
   ${cardMail({ first, code: c.club_code, no: c.club_no, joined: c.club_joined_at, tier: c.club_tier || 'membre', card: c.club_card })}
   <p>🥂 Réservez votre table et donnez votre code en arrivant : <b style="font-family:'Courier New',monospace;letter-spacing:1px">${esc(c.club_code)}</b>.<br>Champagne, ou un verre de vin, une bière, un soft.</p>
   ${st.site_url ? `<p style="text-align:center;margin:22px 0"><a href="${esc(String(st.site_url).replace(/\/$/, ''))}/book?club=${enc(c.club_code)}" style="background:#10285e;color:#fff;text-decoration:none;border-radius:999px;padding:13px 26px;font-weight:600;display:inline-block">Réserver ma table</a></p>` : ''}
   <p style="color:#6b7080;font-size:12.5px">Une coupe par membre, pour un repas réservé. Réservé aux plus de 18 ans. L'abus d'alcool est dangereux pour la santé, à consommer avec modération.</p>${infos(st)}${unsubFoot(unsub)}`);
async function clubMembers(env, slug) {
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) return { ok: false };
  const rows = await sb(env, `resa_clients?client_slug=eq.${enc(slug)}&club_member=eq.true&select=name,club_no,club_show&order=club_no.asc&limit=100`) || [];
  return { ok: true, total: rows.length, members: rows.filter(r => r.club_show !== false).map(r => { const [f, ...l] = String(r.name || '').split(' '); return { no: r.club_no, name: f + (l.length ? ' ' + l[l.length - 1][0] + '.' : '') }; }) };
}
const COUPE_DAYS = 30;
const coupeLimit = d => new Date(d.getTime() + COUPE_DAYS * 864e5).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
// Carte du club dans les emails : image de fond (sans texte) + prénom, code et numéro écrits par-dessus.
// Sans images (Outlook…), le fond uni de la carte reste et le texte reste lisible.
const CARD_IMG = 'https://drevici-preview.beltab.app/club/email/carte-';
const cardKind = (tier, card) => tier === 'staff' ? ({ noir: 'staff', gold: 'gold', navy: 'navy' }[card || 'noir'] || 'staff') : tier === 'vip' ? 'gold' : 'navy';
function cardMail(c) {
  const k = cardKind(c.tier, c.card), staff = c.tier === 'staff', url = CARD_IMG + k + '.jpg';
  const C = { navy: { bg: '#10285e', nm: '#ffffff', cd: '#cfd8ea', lb: '#9fb0d0', no: '#ffffff' }, gold: { bg: '#dcbd7c', nm: '#2b1f0b', cd: '#3a2a0c', lb: '#6b4b14', no: '#2b1f0b' }, staff: { bg: '#141416', nm: '#f3dfa8', cd: '#bfa36a', lb: '#8d7a52', no: '#e9c982' } }[k];
  const no = String(c.no || '').padStart(3, '0'), d = c.joined ? new Date(c.joined) : new Date();
  const since = String(d.getMonth() + 1).padStart(2, '0') + ' / ' + String(d.getFullYear()).slice(2);
  const mono = "font-family:'Courier New',Courier,monospace";
  const right = (staff && k === 'staff') ? `<div style="font-family:Arial,sans-serif;font-size:6px;letter-spacing:1.5px;color:${C.lb};text-transform:uppercase">Membre depuis</div><div style="${mono};font-size:10px;font-weight:700;color:${C.no};letter-spacing:1px">${since}</div>`
    : `<div style="font-family:Arial,sans-serif;font-size:6px;letter-spacing:1.5px;color:${C.lb};text-transform:uppercase">Membre n°</div><div style="${mono};font-size:12px;font-weight:700;color:${C.no};letter-spacing:1.5px">${no}</div>`;
  const top = (staff && k === 'staff') ? `<div style="font-family:Georgia,serif;font-size:25px;font-weight:700;color:rgba(233,201,130,.9);text-align:right;padding:38px 16px 0 0">${no}</div>` : '';
  return `<table role="presentation" width="320" cellpadding="0" cellspacing="0" align="center" style="width:320px;margin:18px auto;border-collapse:separate">
  <tr><td width="320" height="201" background="${url}" bgcolor="${C.bg}" style="background:${C.bg} url('${url}') center / cover no-repeat;border-radius:13px;height:201px;padding:0">
  <table role="presentation" width="100%" height="201" cellpadding="0" cellspacing="0" style="height:201px"><tr><td valign="top" height="140">${top}</td></tr>
  <tr><td valign="bottom" style="padding:0 18px 15px 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td valign="bottom" style="${mono};color:${C.nm}"><div style="font-size:14px;font-weight:700;letter-spacing:2px">${esc(String(c.first || '').toUpperCase())}</div><div style="font-size:9px;letter-spacing:2.5px;color:${C.cd};margin-top:3px">${esc(String(c.code || '').replace(/^CLUB-/, 'CLUB · '))}</div></td>
    <td valign="bottom" align="right">${right}</td></tr></table></td></tr></table></td></tr></table>`;
}
const mailCard = (st, c, site, unsub) => page(st.restaurant_name,
  `<p>Bonjour ${esc(c.first)},</p>${c.tier === 'staff' ? `<p>Bienvenue dans l'équipe ! Voici votre <b>carte Staff</b> ${esc(st.restaurant_name)}.</p>` : `<p>Bonne nouvelle : vous passez <b>membre VIP</b>. Voici votre nouvelle <b>carte Gold</b> ✨</p>`}
   ${cardMail(c)}
   <p style="text-align:center">Votre code reste le même : <b style="font-family:'Courier New',monospace;letter-spacing:1px">${esc(c.code)}</b></p>
   ${site ? `<p style="text-align:center;margin:22px 0"><a href="${esc(site.replace(/\/$/, ''))}/#club" style="background:#10285e;color:#fff;text-decoration:none;border-radius:999px;padding:13px 26px;font-weight:600;display:inline-block">Voir ma carte</a></p>` : ''}${infos(st)}${unsubFoot(unsub)}`);
const mailClub = (st, first, code, no, site, unsub) => page(st.restaurant_name,
  `<p>Bonjour ${esc(first)},</p><p>Bienvenue au club ! Vous êtes le membre <b>n° ${no}</b>.</p>
   ${cardMail({ first, code, no, tier: 'membre' })}
   <p>🥂 <b>Une coupe vous attend jusqu'au ${coupeLimit(new Date())}</b>, lors de votre premier repas réservé. Donnez simplement ce code en arrivant.</p>
   <p>Pas champagne ? Un verre de vin, une bière ou un soft, au choix.</p>
   ${site ? `<p style="text-align:center;margin:22px 0"><a href="${esc(site)}" style="background:#10285e;color:#fff;text-decoration:none;border-radius:999px;padding:13px 26px;font-weight:600;display:inline-block">Réserver ma table</a></p>` : ''}
   <p style="color:#6b7080;font-size:12.5px">Une coupe par membre (champagne, ou tout autre verre de la carte jusqu'à 10 €), pour un repas réservé, valable 30 jours après l'inscription. Réservé aux plus de 18 ans. L'abus d'alcool est dangereux pour la santé, à consommer avec modération.</p>${infos(st)}${unsubFoot(unsub)}`);


// ════════════════ Jeu Free Oyster ════════════════
// Une partie par personne (email OU téléphone), + 1 partie une seule fois quand un ami joue avec son lien.
// Tout joueur rejoint le club (carte + coupe) ; les offres email/SMS restent une case à part, jamais pré-cochée.
const JEU_LOTS = { huitre: 'Une huître offerte', plateau: 'Un plateau de 6 huîtres', tshirt: 'Un T-shirt Drevici', bonus: 'Une huître bonus', trio: '3 huîtres offertes', shot: 'Un shot potion offert', perdu: '' };
// Jeux d'un moment (Halloween…) : slug « <restaurant>--<jeu> » (ex. drevici-paris--halloween-2026).
// Ses joueurs et ses parties sont à part ; réglages, club et validation des codes restent ceux du restaurant.
const jeuBase = s => String(s || '').split('--')[0];
const JEU_NOMS = { 'halloween-2026': 'Trick or Huître' };
const jeuNom = s => JEU_NOMS[String(s || '').split('--')[1]] || 'Free Oyster';
const rnd = (n, chars = CODE_CHARS) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => chars[b % chars.length]).join('');
const jeuSlugOk = s => /^[a-z0-9-]{2,60}$/.test(s);
// Contre les faux emails : les gros lots, pour lesquels on revient (plateau, 3 huîtres, T-shirt…),
// ne sont donnés QUE par email ; le code n'est jamais renvoyé au téléphone. Restent à l'écran : le shot,
// l'huître Free Oyster et les lots « à table, pour ce repas », consommés tout de suite sur place.
const jeuMailOnly = r => !!r && !['perdu', 'shot', 'huitre', 'bonus'].includes(r.result) && (r.mode || 'rue') !== 'table';
const maskEmail = e => { const [u, d] = String(e || '').split('@'); return d ? (u.slice(0, 2) + '•••@' + d) : ''; };
async function jeuPlay(env, b) {
  const slug = String(b.slug || '');
  if (!jeuSlugOk(slug)) return { ok: false, error: 'Jeu inconnu' };
  if (b.hp) return { ok: true, result: 'perdu', plays_left: 0 };            // robot : champ caché rempli
  const st = await settings(env, jeuBase(slug));
  if (!st) return { ok: false, error: 'Jeu inconnu' };
  const src = String(b.src || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 40) || null;
  let pl = null;
  if (b.t) {
    // joueur qui revient (partie bonus) : reconnu par le jeton gardé sur son téléphone
    pl = (await sb(env, `jeu_players?client_slug=eq.${enc(slug)}&token=eq.${enc(String(b.t).slice(0, 40))}&select=*`) || [])[0];
    if (!pl) return { ok: false, error: 'Partie introuvable, remplissez le formulaire.', reset: true };
  } else {
    const email = String(b.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: 'Email invalide' };
    const phone = normPhone(b.phone);
    if (!phone || phone.length < 10) return { ok: false, error: 'Téléphone invalide' };
    const first = cap(b.first), last = cap(b.last);
    if (!first) return { ok: false, error: 'Prénom requis' };
    if (!last) return { ok: false, error: 'Nom requis' };
    const ex = await sb(env, `jeu_players?client_slug=eq.${enc(slug)}&or=${enc(`(email.eq."${email}",phone.eq."${phone}")`)}&select=*`) || [];
    if (ex.length) {
      // déjà inscrit : même personne. S'il a encore une partie (bonus), il la joue ; sinon « déjà joué ».
      pl = ex.find(x => x.email === email && x.phone === phone) || ex[0];
      if (b.optin === true && !pl.optin) { await sb(env, `jeu_players?id=eq.${pl.id}`, { method: 'PATCH', body: { optin: true } }).catch(() => {}); pl.optin = true; }
    } else {
      let parrain = null;
      const ami = String(b.ami || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      if (ami) parrain = (await sb(env, `jeu_players?client_slug=eq.${enc(slug)}&ref_code=eq.${enc(ami)}&select=id`) || [])[0] || null;
      for (let i = 0; i < 5 && !pl; i++) {
        try {
          pl = (await sb(env, 'jeu_players', { method: 'POST', prefer: 'return=representation', body: {
            client_slug: slug, email, phone, first_name: first, last_name: last, token: rnd(24, 'abcdefghijkmnpqrstuvwxyz23456789'),
            ref_code: rnd(6), referred_by: parrain ? parrain.id : null, optin: b.optin === true, src } }) || [])[0];
        } catch (e) { if (!/duplicate|23505/.test(String(e))) throw e; }
      }
      if (!pl) return { ok: false, error: 'Réessayez dans un instant' };
    }
  }
  // tirage déjà fait avant l'inscription (« on joue d'abord ») : on le rattache au joueur
  const draw = String(b.draw || '').replace(/[^a-f0-9]/g, '').slice(0, 64);
  const r = draw ? await sb(env, 'rpc/jeu_claim', { method: 'POST', body: { p_player: pl.id, p_draw: draw } })
                 : await sb(env, 'rpc/jeu_play', { method: 'POST', body: { p_player: pl.id, p_src: src } });
  // Carte du club : seulement si la case « Je rejoins le club » est cochée (elle vaut accord pour les offres).
  // Sans la case : on joue pour le lot, sans carte ni coupe, et les coordonnées ne servent qu'au jeu.
  let club = null;
  if (pl.optin) { try { club = await jeuClub(env, st, jeuBase(slug), pl, src); } catch (e) { console.warn('jeu club', e); } }
  const base = { t: pl.token, ref_code: pl.ref_code, first: pl.first_name, club };
  if (!r || !r.ok) return { ...base, ok: false, done: !!(r && r.done), closed: !!(r && r.closed), bonus_used: !!(r && r.bonus_used), reset_draw: !!(r && r.reset_draw),
    error: r && r.closed ? 'Le jeu est terminé.' : r && r.done ? 'Vous avez déjà joué.' : (r && r.error) || 'Réessayez dans un instant' };
  if (r.result !== 'perdu' && r.result !== 'shot' && st.notify_email) {
    // petit mot à l'équipe : un lot gagné (pour prévoir au comptoir)
    sendEmail(env, st, st.notify_email, st.restaurant_name, `${jeuNom(slug)} · ${JEU_LOTS[r.result]} gagné(e) par ${pl.first_name}`,
      page(st.restaurant_name, `<p><b>${esc(pl.first_name)} ${esc(pl.last_name || '')}</b> vient de gagner : <b>${esc(JEU_LOTS[r.result])}</b>.</p><p>Code : <b style="font-family:'Courier New',monospace;letter-spacing:1px">${esc(r.code)}</b>, valable jusqu'au ${new Date(r.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' })}. À valider dans l'espace restaurateur → Clients.</p>`)).catch(() => {});
  }
  // Le joueur reçoit son code par email (toujours pour les lots « par email », et pour tous les lots des jeux d'un moment).
  const mailOnly = jeuMailOnly(r);
  let mailed = false;
  if ((mailOnly || slug.includes('--')) && r.code && pl.email) { try { await sendEmail(env, st, pl.email, pl.first_name, `${slug.includes('--') ? 'Ton' : 'Votre'} code ${jeuNom(slug)} : ${r.code}`, mailJeu(st, slug, pl.first_name, r)); mailed = true; } catch (e) { console.warn('jeu email', e); } }
  return { ...base, ok: true, result: r.result, prize: JEU_LOTS[r.result], code: mailOnly ? null : r.code, by_email: mailOnly, email_hint: mailOnly ? maskEmail(pl.email) : undefined, mail_failed: mailOnly && !mailed,
    expires_at: r.expires_at, mode: r.mode || 'rue', plays_left: r.plays_left, bonus_used: r.bonus_used };
}
function mailJeu(st, slug, first, r) {
  const until = new Date(r.expires_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
  const site = st.site_url ? String(st.site_url).replace(/\/$/, '') : '';
  // Jeux d'un moment (Halloween…) : on tutoie, couleurs orange. Free Oyster : on vouvoie, couleurs de la maison.
  const tu = slug.includes('--');
  const how = tu
    ? (r.result === 'shot' ? 'Passe au comptoir quand tu veux, sans réserver, et montre ce code : ton shot t\'attend.'
      : r.result === 'tshirt' ? 'Dis-nous quand tu passes (par téléphone ou sur Instagram), puis montre ce code au comptoir pour récupérer ton T-shirt.'
      : 'Réserve une table et montre ce code en arrivant : ton lot t\'attend à table.')
    : (r.result === 'tshirt' ? 'Dites-nous quand vous passez (par téléphone ou sur Instagram), puis montrez ce code au comptoir pour récupérer votre T-shirt.'
      : r.result === 'huitre' ? 'Passez au comptoir ou réservez une table, et montrez ce code : votre huître vous attend.'
      : 'Réservez une table et montrez ce code en arrivant : votre lot vous attend à table.');
  const bs = tu ? 'background:#f97316;color:#1b1222' : 'background:#1f3a5f;color:#ffffff';
  const btn = r.result !== 'shot' && r.result !== 'tshirt' && site ? `<p style="text-align:center;margin:22px 0 6px"><a href="${esc(site)}/book?jeu=${enc(r.code)}" style="${bs};text-decoration:none;border-radius:999px;padding:13px 26px;font-weight:700;display:inline-block">Réserver ma table</a></p>` : '';
  return page(st.restaurant_name, `<p style="margin:0 0 6px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:${tu ? '#c2410c' : '#1f3a5f'};font-weight:700">${esc(jeuNom(slug))}</p>
   <p style="margin:0 0 14px;font-size:20px;font-weight:700">Bravo ${esc(first || '')} ! ${tu ? 'Tu as' : 'Vous avez'} gagné : ${esc(JEU_LOTS[r.result] || '')}</p>
   <div style="text-align:center;background:#f5efe6;border-radius:14px;padding:14px;margin:0 0 14px"><div style="font-family:'Courier New',monospace;font-size:28px;font-weight:700;letter-spacing:4px">${esc(r.code)}</div><div style="font-size:13px;color:#6b5b7b;margin-top:4px">Valable jusqu'au ${esc(until)} · une seule fois</div></div>
   <p style="margin:0">${how}</p>${btn}
   <p style="margin:16px 0 0;font-size:12px;color:#8a8478">${esc(st.restaurant_name)} · 8 rue Biot, 75017 Paris. Aucun achat obligatoire.</p>`);
}
// Joueur qui a coché « Je rejoins le club » → membre du club (même règle que l'inscription au club du site).
async function jeuClub(env, st, slug, pl, src) {
  const ex = await sb(env, `resa_clients?client_slug=eq.${enc(slug)}&or=${enc(`(email.eq."${pl.email}",phone.eq."${pl.phone}")`)}&select=id,email,club_member,club_code,club_no,marketing_optin&order=club_member.desc.nullslast`) || [];
  const mem = ex.find(c => c.club_member && c.club_code);
  if (mem) {
    if (pl.optin && !mem.marketing_optin) await sb(env, `resa_clients?id=eq.${mem.id}`, { method: 'PATCH', body: { marketing_optin: true } }).catch(() => {});
    return { code: mem.club_code, no: mem.club_no, first: pl.first_name, already: true };
  }
  const all = await sb(env, `resa_clients?client_slug=eq.${enc(slug)}&club_member=eq.true&select=club_no&order=club_no.desc.nullslast&limit=1`) || [];
  const no = ((all[0] && all[0].club_no) || 0) + 1;
  const own = ex.find(x => x.email === pl.email);
  const row = { club_member: true, club_joined_at: new Date().toISOString(), club_no: no, club_show: true, phone: pl.phone,
    name: [pl.first_name, pl.last_name].filter(Boolean).join(' '), source: 'JEU' + (src ? '-' + src : '') };
  row.marketing_optin = true;
  let code = '';
  for (let i = 0; i < 5 && !code; i++) {
    const c = clubCode();
    try {
      if (own) await sb(env, `resa_clients?id=eq.${own.id}`, { method: 'PATCH', body: { ...row, club_code: c } });
      else await sb(env, 'resa_clients', { method: 'POST', body: { client_slug: slug, email: pl.email, visits: 0, ...row, club_code: c } });
      code = c;
    } catch (e) { if (!/duplicate|23505/.test(String(e))) throw e; }
  }
  if (!code) return null;
  try {
    const me = (await sb(env, `resa_clients?client_slug=eq.${enc(slug)}&club_code=eq.${enc(code)}&select=id&limit=1`) || [])[0];
    const u = await unsubUrl(env, slug, me && me.id);
    await sendEmail(env, st, pl.email, pl.first_name, `Bienvenue au club ${st.restaurant_name} 🥂`, mailClub(st, pl.first_name, code, no, st.site_url ? String(st.site_url).replace(/\/$/, '') + '/book' : '', u), null, u);
  } catch (e) { console.warn('jeu club email', e); }
  return { code, no, first: pl.first_name };
}
async function jeuMe(env, slug, t) {
  if (!jeuSlugOk(slug) || !/^[a-z0-9]{10,40}$/.test(t)) return { ok: false };
  const pl = (await sb(env, `jeu_players?client_slug=eq.${enc(slug)}&token=eq.${enc(t)}&select=id,first_name,email,ref_code,plays_allowed,plays_used,ref_bonus_at,optin`) || [])[0];
  if (!pl) return { ok: false };
  const last = (await sb(env, `jeu_plays?player_id=eq.${pl.id}&select=*&order=id.desc&limit=1`) || [])[0] || null;
  const friends = (await sb(env, `jeu_players?referred_by=eq.${pl.id}&select=id`) || []).length;
  return { ok: true, first: pl.first_name, ref_code: pl.ref_code, plays_left: pl.plays_allowed - pl.plays_used, bonus_used: !!pl.ref_bonus_at, friends, club: !!pl.optin,
    last: last && { result: last.result, prize: JEU_LOTS[last.result], code: jeuMailOnly(last) ? null : last.code, by_email: jeuMailOnly(last), email_hint: jeuMailOnly(last) ? maskEmail(pl.email) : undefined, expires_at: last.expires_at, mode: last.mode || 'rue', redeemed: !!last.redeemed_at } };
}
async function jeuAmi(env, slug, c) {
  c = c.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!jeuSlugOk(slug) || c.length !== 6) return { ok: false };
  const pl = (await sb(env, `jeu_players?client_slug=eq.${enc(slug)}&ref_code=eq.${enc(c)}&select=first_name`) || [])[0];
  return pl ? { ok: true, first: pl.first_name } : { ok: false };
}
// Chiffres du jeu pour l'espace restaurateur (joueurs, parties, lots, parrainages, par poster).
async function jeuStats(env, slug) {
  const players = await sb(env, `jeu_players?client_slug=eq.${enc(slug)}&select=id,optin,src,referred_by,created_at&limit=20000`) || [];
  const plays = await sb(env, `jeu_plays?client_slug=eq.${enc(slug)}&select=*&limit=50000`) || [];
  const by = (arr, k) => arr.reduce((m, x) => (m[x[k] || '—'] = (m[x[k] || '—'] || 0) + 1, m), {});
  const won = plays.filter(p => p.result !== 'perdu');
  return { ok: true, players: players.length, optin: players.filter(p => p.optin).length, referred: players.filter(p => p.referred_by).length,
    plays: plays.length, bonus_plays: plays.filter(p => p.n > 1).length, results: by(plays, 'result'), redeemed: won.filter(p => p.redeemed_at).length, won: won.length,
    by_src: by(players, 'src') };
}


// ════════════════ Plat en test ════════════════
// La carte de table (un QR par serveur) mène au plat du moment. « Je le commande » crée une commande à confirmer
// (au nom du serveur de la carte). Le téléphone garde un jeton : en rouvrant la page, le client peut noter, une fois.
const platPublic = d => d && { id: d.id, name: d.name, descr: d.descr, photo: d.photo, price_test: d.price_test, price_normal: d.price_normal, share: d.share_text };
async function platNow(env, slug, t) {
  if (!jeuSlugOk(slug)) return { ok: false };
  const d = (await sb(env, `plat_test?client_slug=eq.${enc(slug)}&status=eq.en_test&order=updated_at.desc&limit=1&select=*`) || [])[0];
  let order = null;
  if (/^[a-z0-9]{12,40}$/.test(t)) {
    const o = (await sb(env, `plat_orders?client_slug=eq.${enc(slug)}&token=eq.${enc(t)}&select=id,plat_id,code,status,created_at`) || [])[0];
    if (o) { const r = (await sb(env, `plat_reviews?order_id=eq.${o.id}&select=id`) || [])[0]; order = { code: o.code, status: o.status, at: o.created_at, plat_id: o.plat_id, reviewed: !!r }; }
  }
  return { ok: true, dish: platPublic(d), order };
}
async function platOrder(env, b) {
  const slug = String(b.slug || '');
  if (!jeuSlugOk(slug) || b.hp) return { ok: false };
  const d = (await sb(env, `plat_test?client_slug=eq.${enc(slug)}&status=eq.en_test&order=updated_at.desc&limit=1&select=id`) || [])[0];
  if (!d) return { ok: false, error: 'Pas de plat en test en ce moment.' };
  const src = String(b.src || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 60) || null;
  const token = rnd(24, 'abcdefghijkmnpqrstuvwxyz23456789'), code = String(100 + Math.floor(Math.random() * 900));
  await sb(env, 'plat_orders', { method: 'POST', body: { client_slug: slug, plat_id: d.id, src, token, code } });
  return { ok: true, token, code };
}
async function platReview(env, b) {
  const slug = String(b.slug || ''), t = String(b.t || '');
  if (!jeuSlugOk(slug) || !/^[a-z0-9]{12,40}$/.test(t)) return { ok: false, error: 'Commande introuvable' };
  const o = (await sb(env, `plat_orders?client_slug=eq.${enc(slug)}&token=eq.${enc(t)}&select=id,plat_id`) || [])[0];
  if (!o) return { ok: false, error: 'Commande introuvable' };
  const rating = Math.max(1, Math.min(5, parseInt(b.rating, 10) || 0));
  if (!rating) return { ok: false, error: 'Choisissez une note' };
  const email = String(b.email || '').trim().toLowerCase().slice(0, 120), first = cap(b.first);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: 'Email invalide' };
  const tags = (Array.isArray(b.tags) ? b.tags : []).map(x => String(x).slice(0, 30)).slice(0, 6);
  try {
    await sb(env, 'plat_reviews', { method: 'POST', body: { client_slug: slug, plat_id: o.plat_id, order_id: o.id, rating, tags, comment: String(b.comment || '').trim().slice(0, 600) || null, first_name: first || null, email: email || null, optin: !!(email && b.optin === true) } });
  } catch (e) { if (/duplicate|23505/.test(String(e))) return { ok: false, already: true, error: 'Vous avez déjà donné votre avis, merci !' }; throw e; }
  // Accord pour les offres (case jamais pré-cochée) : la personne entre dans la base clients
  if (email && b.optin === true) await sb(env, 'rpc/resa_upsert_client', { method: 'POST', body: { p_slug: slug, p_email: email, p_phone: '', p_name: first || '', p_optin: true } }).catch(() => {});
  return { ok: true };
}
async function platAdmin(env, slug) {
  const since = new Date(Date.now() - 90 * 864e5).toISOString();
  const [dishes, orders, reviews] = await Promise.all([
    sb(env, `plat_test?client_slug=eq.${enc(slug)}&select=*&order=created_at.desc`),
    sb(env, `plat_orders?client_slug=eq.${enc(slug)}&created_at=gte.${enc(since)}&select=id,plat_id,src,code,status,created_at,confirmed_at&order=created_at.desc&limit=2000`),
    sb(env, `plat_reviews?client_slug=eq.${enc(slug)}&created_at=gte.${enc(since)}&select=*&order=created_at.desc&limit=2000`)]);
  return { ok: true, dishes: dishes || [], orders: orders || [], reviews: reviews || [] };
}
async function platSave(env, slug, d) {
  const cut = (v, n) => v == null ? null : String(v).trim().slice(0, n) || null;
  const num = v => v === '' || v == null || isNaN(+v) ? null : +v;
  const st = ['brouillon', 'en_test', 'pause', 'carte', 'arrete'].includes(d.status) ? d.status : 'brouillon';
  const row = { client_slug: slug, name: cut(d.name, 120) || 'Plat en test', descr: cut(d.descr, 600), photo: cut(d.photo, 400), price_test: num(d.price_test), price_normal: num(d.price_normal),
    share_text: cut(d.share_text, 60), commission: num(d.commission), status: st, updated_at: new Date().toISOString() };
  // Un seul plat « en test » à la fois : les autres passent en pause
  if (st === 'en_test') await sb(env, `plat_test?client_slug=eq.${enc(slug)}&status=eq.en_test${d.id ? `&id=neq.${parseInt(d.id, 10)}` : ''}`, { method: 'PATCH', body: { status: 'pause' } });
  const r = d.id ? await sb(env, `plat_test?id=eq.${parseInt(d.id, 10)}&client_slug=eq.${enc(slug)}`, { method: 'PATCH', body: row, prefer: 'return=representation' })
                 : await sb(env, 'plat_test', { method: 'POST', body: row, prefer: 'return=representation' });
  return { ok: true, dish: (r || [])[0] };
}

// ════════════════ Parlez à votre carte (Master) ════════════════
// Le restaurateur dit ce qui change ; on renvoie une liste d'actions sur la carte, qu'il valide dans l'admin.
// Rien n'est enregistré ici : l'admin applique les changements après validation (et garde de quoi annuler).
// Clé : ANTHROPIC_API_KEY (Claude) ou, à défaut, OPENAI_API_KEY (ChatGPT). Secrets Cloudflare du Worker.
const VOICE_ACTIONS = ['ajouter', 'modifier', 'masquer', 'afficher', 'supprimer', 'deplacer', 'renommer_section', 'modifier_menu', 'mise_en_page'];
const VOICE_SCHEMA = {
  type: 'object',
  properties: {
    refus: { type: 'string', description: "Seulement si tu ne proposes AUCUN changement (demande hors sujet, ou aucun plat ne correspond) : une phrase courte et polie qui explique pourquoi, en français. Toujours vide dès que « changements » contient quelque chose : ne propose jamais un changement ET un refus." },
    reservations: {
      type: 'object',
      description: "Seulement si le restaurateur demande à VOIR ou CONNAÎTRE ses réservations, à venir ou passées (« montre les réservations de demain », « qui vient ce soir ? », « qui est venu vendredi 20 ? », « les 7 prochains jours ») : la période à afficher. Sinon, ne pas remplir.",
      properties: {
        du: { type: 'string', description: 'Premier jour, au format AAAA-MM-JJ.' },
        au: { type: 'string', description: 'Dernier jour inclus, au format AAAA-MM-JJ (le même que « du » pour un seul jour).' },
        moment: { type: 'string', enum: ['', 'midi', 'soir'], description: '« midi » ou « soir » si précisé, sinon vide.' },
        heure: { type: 'string', description: "Une heure précise si demandée (« qui vient à 20 h ? » → « 20:00 »), sinon vide." }
      },
      required: ['du', 'au']
    },
    changements: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: VOICE_ACTIONS },
          ref: { type: 'string', description: "Pour modifier, masquer, afficher, supprimer, déplacer : la référence exacte de l'élément dans la carte (ex. « 2.0.3 »)." },
          cible: { type: 'string', description: "Pour modifier, masquer, afficher, supprimer, déplacer : le nom ACTUEL du plat visé, tel qu'il est écrit dans la carte (ex. « Falafels, poivrons confits & sauce blanche aux herbes »). Jamais le nouveau nom." },
          onglet: { type: 'integer', description: "Pour ajouter ou déplacer : numéro de la catégorie (le premier nombre des références)." },
          sous_categorie: { type: 'integer', description: "Pour ajouter ou déplacer : numéro de la sous-catégorie dans cette catégorie (le deuxième nombre). 0 par défaut." },
          nom: { type: 'string', description: 'Nouveau nom (ajouter, modifier si le nom change, ou renommer_section : le nouveau nom de la section / catégorie « onglet »).' },
          titre: { type: 'string', description: 'modifier_menu : nouveau titre du menu personnalisé.' },
          sous_titre: { type: 'string', description: 'modifier_menu : nouveau sous-titre du menu (formules et prix, dates, jours, conditions). Texte complet ; une formule par ligne, séparées par \\n.' },
          note: { type: 'string', description: "modifier_menu : la petite ligne en bas du menu imprimé, en A5 (« Prix TTC, service compris », « Produits frais de Normandie »). Texte complet ; vide pour l'enlever." },
          description: { type: 'string', description: 'Nouvelle description, si elle est donnée ou change.' },
          prix: { type: 'number', description: 'Prix en euros pour un plat (ex. 11 ou 12.5).' },
          supplement: { type: 'boolean', description: "Avec « prix », dans un MENU seulement : true si c'est un supplément par rapport au prix du menu, affiché « +14 » (« tarte au chocolat plus 14 », « supplément de 3 € », « +7 »). false si le restaurateur veut un prix normal sans le +. Ne pas remplir sinon." },
          element: { type: 'string', enum: ['titre', 'sous_titre', 'sections', 'plats', 'prix', 'tout'], description: "mise_en_page : ce qui change d'aspect. « titre » = titre du menu, « sous_titre » = ligne sous le titre, « sections » = noms des sections (Entrée, Plats…), « plats » = noms des plats, « prix » = les prix, « tout » = l'alignement de tout le menu." },
          taille: { type: 'integer', description: "mise_en_page : changement de taille en %, par rapport à maintenant. « un peu plus gros » = 10, « plus gros » = 20, « beaucoup plus gros » = 35 ; négatif pour plus petit. 0 ou vide si la taille ne change pas." },
          couleur: { type: 'string', description: "mise_en_page : nouvelle couleur en hexadécimal (« en or » = #B8912F, « en bleu marine » = #10285E, « en noir » = #1A1A1A, « en blanc » = #FFFFFF, « en rouge » = #A33A2A). Vide si la couleur ne change pas." },
          alignement: { type: 'string', enum: ['', 'centre', 'gauche'], description: "mise_en_page avec element « tout » : « centre » pour centrer le menu, « gauche » pour l'aligner à gauche." },
          formats: { type: 'array', description: "Boissons : prix par format. Pour modifier, « index » = position du format existant ; pour ajouter, donner cl et format.", items: { type: 'object', properties: { index: { type: 'integer' }, cl: { type: 'number' }, format: { type: 'string', enum: ['', 'verre', 'bouteille', 'pinte', 'demi', 'carafe'] }, prix: { type: 'number' } }, required: ['prix'] } },
          resume: { type: 'string', description: "Ce qui va changer, en une phrase courte en français, pour le restaurateur (ex. « Ajouter « Tartinade Saint-Jacques » à 11 € dans Tartinades »)." }
        },
        required: ['action', 'resume']
      }
    }
  },
  required: ['changements']
};
const VOICE_SYSTEM = `Tu aides un restaurateur à mettre à jour la carte de son site. Il parle (sa phrase vient d'une dictée, elle peut contenir des fautes).
Tu ne fais QUE des changements sur la carte : ajouter, modifier (nom, description, prix), masquer, afficher, supprimer ou déplacer un plat ou une boisson.
Quand le restaurateur est dans un MENU (menu personnalisé ou menu du jour, voir plus bas), TOUT ce menu se modifie à la voix et rien n'est hors sujet : son titre, son sous-titre (formules et prix : « entrée + plat 20 €, plat + dessert 20 €, entrée plat dessert 25 € »), la ligne du bas du menu imprimé, le nom de chaque section (« À grignoter », « Entrée (10€) »), et chaque plat (ajouter, renommer, changer le prix, retirer, déplacer). Ne refuse jamais une telle demande en disant qu'elle ne concerne pas la carte. Dans un menu, « catégorie », « section », « rubrique », « partie » ou « titre de la catégorie » (« À grignoter », « Entrée (10€) », « Desserts ») veulent dire une SECTION : pour la renommer ou changer son prix, utilise « renommer_section » avec son numéro (« onglet ») et le nom complet nouveau (garde le prix s'il n'est pas changé, ex. « Apéritif » ou « Entrée (12€) »). Ce n'est jamais le titre du menu ni une description. « Passe les entrées à 15 € » quand la section s'appelle « Entrée (10€) » → renommer_section « Entrée (15€) ». Fais toujours ce que le restaurateur demande, même si le prix ne colle pas avec le prix total du menu ou le sous-titre : ne refuse jamais pour une question de calcul ou de cohérence : c'est son choix.
Le restaurateur peut aussi demander à VOIR ses réservations (aujourd'hui, demain, après-demain, ce soir, ce midi, vendredi, ce week-end, cette semaine, les 7 prochains jours, qui vient à 20 h…) : dans ce cas, ne propose aucun changement et remplis seulement « reservations » (du, au, moment, heure), en partant de la date du jour donnée plus bas. Ça marche aussi pour le PASSÉ : « qui est venu hier ? », « qui est venu le vendredi 20 ? », « les réservations de la semaine dernière », « combien de couverts samedi dernier ? » → les dates passées correspondantes. Un jour de la semaine sans date, avec un verbe au passé (« qui est venu vendredi ? »), c'est le dernier passé ; au présent ou au futur (« qui vient vendredi ? »), c'est le prochain. Une date précise (« le 20 ») sans mois : le mois en cours si ce jour est déjà passé ou aujourd'hui, sinon le mois dernier, sauf si la phrase parle du futur. « Cette semaine » = d'aujourd'hui à dimanche ; « les 7 prochains jours » = aujourd'hui + 6 jours ; « le week-end » = samedi et dimanche qui viennent.
Pour tout le reste (questions sans demande de changement, conversation, horaires, autre sujet), ne propose aucun changement et remplis « refus ».
Une demande polie posée comme une question (« est-ce que tu peux… », « tu pourrais regarder la carte et corriger les fautes ? ») EST une demande de changement : fais-la.
Règles :
- Utilise uniquement les références de la carte fournie. Si un plat est ambigu ou introuvable, ne devine pas : remplis « refus » en demandant de préciser.
- « Le plat est fini », « on n'en a plus », « retire-le pour ce soir » = masquer (pas supprimer). Supprimer seulement si on te dit de supprimer ou d'enlever définitivement.
- Pour ajouter, choisis la catégorie la plus logique de la carte. N'invente pas de description si on ne t'en donne pas.
- Les prix sont en euros. « Onze euros cinquante » = 11.5.
- Un supplément (prix affiché « +2 », souvent dans un menu) : « passe le supplément à 5 € » = action « modifier » avec « prix » 5 (le + est gardé tout seul).
- Boissons à plusieurs formats (ex. « [0] 12cl 8€ ; [1] 75cl 46€ ») : pour changer un prix, utilise TOUJOURS « formats » avec l'« index » du format, jamais « prix » seul. Le verre = le plus petit format (12 à 20 cl) ; la bouteille = 75 cl ; le pot ou la fillette = 37,5 à 50 cl ; la pinte = 50 cl ; le demi = 25 cl. Si une contenance est dite (« le 50 cl »), prends ce format.
- Si la boisson a plusieurs formats et que la phrase ne dit pas lequel (« le Chablis à 9 € »), ne devine pas : remplis « refus » en demandant « le verre ou la bouteille ? » (avec les vrais formats de cette boisson). Si un seul format existe, change-le.
- « Le verre à 9 et la bouteille à 48 » = un seul changement avec deux formats.
- Un changement par élément ; plusieurs changements si la phrase en demande plusieurs.
- Orthographe (« corrige l'orthographe de… », « il y a une faute dans… », « corrige les fautes de la carte ») : action « modifier » avec le nom et/ou la description corrigés. Corrige SEULEMENT les vraies fautes en français (accents, s ou x du pluriel, accords, majuscules des noms propres, tirets comme Saint-Jacques). Ne change ni les mots, ni le style, ni la ponctuation voulue, ni les noms de marques, de domaines ou de cuvées. Pour toute la carte : un changement par plat qui a vraiment une faute, rien pour les autres. Si tu ne trouves aucune faute, remplis « refus » avec « Je n'ai trouvé aucune faute sur la carte. ». Maximum 20 corrections : s'il y en a plus, fais les 20 premières et ajoute dans « refus » « Il en reste : redemandez pour la suite. ». Dans « resume », montre la correction : « Corriger « ancien » en « nouveau » ».
- Si le restaurateur dicte une écriture (« écris Saint-Jacques avec un tiret »), applique-la exactement.
- « renommer_section » (avec « onglet » et « nom ») : renommer une catégorie de la carte ou une section d'un menu. Dans un menu personnalisé, le prix d'une section est souvent dans son nom (« Entrée (10€) ») : pour le changer, renomme la section (« Entrée (11€) »).
- « mise_en_page » (seulement pour un menu) : changer l'aspect, pas le contenu. « Mets le titre plus gros », « les prix en or », « les plats un peu plus petits », « aligne tout à gauche ». Un changement par élément (« element »), avec « taille » (en %, relatif), « couleur » et/ou « alignement ». « Plus gros » sans précision = 20.
- Dans un menu, un prix dit « plus 14 », « +14 » ou « supplément de 14 » est un supplément : « prix » 14 avec « supplement » true (il s'affiche « +14 »). « À 14 € » tout court sur un plat qui avait un supplément : garde « supplement » vide (le + reste).
- Trouver le plat visé : le restaurateur ne dit souvent qu'un ou deux mots du nom (« les falafels », « la moussaka », « le sashimi »), parfois mal transcrits par la dictée (« falafel » pour « Falafels », « mousaka »). Cherche dans la carte le plat dont le nom contient ces mots (ou des mots très proches à l'oreille) et prends sa référence, sans demander. Ne refuse que si aucun plat ne ressemble, ou si plusieurs plats correspondent autant. Mets toujours son nom actuel dans « cible ».
- Majuscules des noms de plats : une majuscule au début, puis les mots en minuscules, SAUF les noms propres et ce qui s'écrit d'habitude avec des majuscules (Bretagne, Normandie, Paimpol, Richelieu, Louis XVI, Saint-Jacques, Comté, AOP). Si le restaurateur demande une majuscule (« mets Louis XVI en majuscule », « le L en majuscule »), fais-le avec « modifier » et le nom corrigé. Dans les noms que tu écris, mets toi-même ces majuscules.
- « Modifie X par Y », « remplace X par Y » : même chose. Ex. « modifie pâté en croûte Richelieu par pâté en croûte Stéphane » → « modifier » sur la référence de « Pâté en croûte Richelieu », « nom » « Pâté en croûte Stéphane », « cible » « Pâté en croûte Richelieu ».
- « À la place de X, mets Y », « remplace X par Y », « X devient Y », « change X en Y », « au lieu de X, Y » : X est le plat ACTUEL (à trouver dans la carte), Y est le NOUVEAU nom → « modifier » avec la référence de X et « nom » Y. Y n'a pas besoin d'exister dans la carte : ne cherche jamais Y.
- « modifier_menu » (seulement pour un menu) : changer son titre (« titre »), son sous-titre (« sous_titre » : formules et prix, dates, jours, conditions, ex. « Entrée + plat 20 €\nPlat + dessert 20 €\nEntrée + plat + dessert 25 € » ou « Du 21 au 27 septembre ») ou la ligne du bas du menu imprimé (« note »). Pour le sous-titre, renvoie le texte complet, en gardant ce qui ne change pas.
- Dans un MENU (personnalisé ou menu du jour) : « le titre », « le nom du menu », « appelle le menu… » = le TITRE DU MENU → « modifier_menu » avec « titre ». « Le sous-titre », « la ligne en dessous », le prix du menu, les dates = « sous_titre ». « Le titre » ne veut jamais dire une description. Les plats d'un menu n'ont PAS de description : ne remplis jamais « description » dans un menu ; si le restaurateur donne des précisions sur un plat (« palette de veau, purée maison »), mets-les dans le NOM du plat. Pour renommer un plat d'un menu, utilise « modifier » avec « nom ».
- Dans un menu personnalisé, « Section » = catégorie : les références et « onglet » s'utilisent pareil. Les plats d'un menu ont souvent un prix vide (compris dans la formule) ou un supplément (« +3 ») : ne mets un prix que si on le demande.
- « resume » : une phrase courte, au vouvoiement implicite (infinitif), avec les noms entre guillemets français.`;

// La voix enregistrée sur le téléphone est transcrite ici (OpenAI), avec les noms des plats de la carte en indice :
// plus fiable que la dictée du navigateur (Safari décroche), et « Saint-Jacques », « gratinées »… sont bien écrits.
async function voiceTranscribe(env, b64, mime, carte) {
  if (!env.OPENAI_API_KEY) throw Object.assign(new Error('no key'), { user: 'La voix n\'est pas encore branchée (clé manquante).' });
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  if (bin.length < 1500) return '';
  const m = String(mime || 'audio/webm');
  const ext = m.includes('mp4') || m.includes('m4a') || m.includes('aac') ? 'm4a' : m.includes('ogg') ? 'ogg' : m.includes('wav') ? 'wav' : 'webm';
  const noms = [...new Set(carte.split('\n').filter(l => /^\d+\.\d+\.\d+ \|/.test(l)).map(l => (l.split(' | ')[2] || '').trim()).filter(Boolean))].join(', ').slice(0, 900);
  const send = async model => {
    const fd = new FormData();
    fd.append('file', new Blob([bin], { type: m.split(';')[0] }), 'voix.' + ext);
    fd.append('model', model); fd.append('language', 'fr');
    fd.append('prompt', 'Un restaurateur modifie sa carte (prix en euros). Plats et boissons de la carte : ' + noms);
    return fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { authorization: 'Bearer ' + env.OPENAI_API_KEY }, body: fd });
  };
  let r = await send(env.TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe');
  if (!r.ok && (r.status === 400 || r.status === 404)) r = await send('whisper-1');
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 || r.status === 403) throw Object.assign(new Error('OpenAI audio ' + r.status + ' ' + JSON.stringify(j).slice(0, 200)), { user: 'La clé OpenAI n\'a pas le droit « Audio ». Ajoutez-le dans ses permissions.' });
  if (!r.ok) throw new Error('OpenAI audio ' + r.status + ' ' + JSON.stringify(j).slice(0, 300));
  return String(j.text || '').trim();
}

// Le navigateur ne peut pas envoyer la clé OpenAI : il se connecte ici (session admin vérifiée), on relaie vers OpenAI.
// Le navigateur n'a le droit d'envoyer que du son (append / commit / clear) ; on renvoie les morceaux de texte au fil de l'eau.
async function voiceLive(env, url) {
  const slug = String(url.searchParams.get('slug') || ''), t = String(url.searchParams.get('t') || '');
  const who = await adminOf(env, new Request('https://x/', { headers: { authorization: 'Bearer ' + t } }), slug);
  if (!who) return new Response('Accès refusé', { status: 403 });
  if (!env.OPENAI_API_KEY) return new Response('clé manquante', { status: 503 });
  const up = await fetch('https://api.openai.com/v1/realtime?intent=transcription', { headers: { Upgrade: 'websocket', Authorization: 'Bearer ' + env.OPENAI_API_KEY } });
  const ows = up.webSocket;
  if (!ows) { console.error('voice live upstream', up.status, (await up.text().catch(() => '')).slice(0, 300)); return new Response('OpenAI ' + up.status, { status: 502 }); }
  ows.accept();
  const pair = new WebSocketPair(); const client = pair[0], server = pair[1]; server.accept();
  let open = true; const t0 = Date.now();
  const close = () => { if (!open) return; open = false; try { server.close(1000, 'fin'); } catch (e) {} try { ows.close(1000, 'fin'); } catch (e) {} };
  const kill = setTimeout(close, 90000); // une phrase, pas une conversation : 90 s maximum
  const OK_FROM_CLIENT = ['input_audio_buffer.append', 'input_audio_buffer.commit', 'input_audio_buffer.clear'];
  server.addEventListener('message', ev => {
    if (!open) return; let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.type === 'beltab.config') {
      const noms = (Array.isArray(m.noms) ? m.noms : []).map(x => String(x).replace(/[<>\r\n]/g, ' ').trim().slice(0, 60)).filter(Boolean).slice(0, 80);
      const tr = { model: env.LIVE_MODEL || 'gpt-live-transcribe', languages: ['fr'], delay: env.LIVE_DELAY || 'low',
        prompt: 'Un restaurateur modifie la carte de son restaurant à voix haute : noms de plats et de boissons, prix en euros, formats (verre, bouteille).' };
      if (noms.length) tr.keywords = noms;
      ows.send(JSON.stringify({ type: 'session.update', session: { type: 'transcription', audio: { input: { format: { type: 'audio/pcm', rate: 24000 }, transcription: tr, turn_detection: null } } } }));
      return;
    }
    if (OK_FROM_CLIENT.includes(m.type)) ows.send(ev.data);
  });
  ows.addEventListener('message', ev => {
    if (!open) return; let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.type === 'error') console.error('voice live openai', JSON.stringify(m).slice(0, 400));
    if (/^(session\.updated|transcription_session\.updated|error|input_audio_buffer\.committed|conversation\.item\.input_audio_transcription\.(delta|completed|failed))$/.test(m.type)) server.send(ev.data);
  });
  server.addEventListener('close', () => { clearTimeout(kill); close(); });
  ows.addEventListener('close', () => { clearTimeout(kill); close(); });
  ows.addEventListener('error', () => { clearTimeout(kill); close(); });
  return new Response(null, { status: 101, webSocket: client });
}

async function carteVoice(env, b) {
  const carte = String(b.carte || '').slice(0, 60000);
  let texte = String(b.texte || '').slice(0, 1200).trim();
  if (!texte && b.audio) {
    try { texte = (await voiceTranscribe(env, String(b.audio), b.mime, carte)).slice(0, 1200); }
    catch (e) { console.error('carte/voice audio', e); return { ok: false, error: e.user || 'Je n\'ai pas pu écouter l\'enregistrement. Réessayez.' }; }
    if (!texte) return { ok: false, error: 'Je n\'ai rien entendu. Parlez un peu plus près du micro et réessayez.' };
  }
  // 1re étape (voix) : on renvoie tout de suite ce qui a été compris, l'écran l'affiche pendant qu'on lit la carte.
  if (b.etape === 'transcrire') return { ok: true, texte };
  if (!texte) return { ok: false, error: 'Je n\'ai rien entendu.' };
  const cible = String(b.cible || 'carte').slice(0, 120);
  const now = new Date(), jour = now.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), isoJ = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
  const user = `Date du jour : ${jour} (${isoJ}).\n` + (cible !== 'carte' ? `Le restaurateur est dans son ${cible} (un MENU), pas la carte : tous les changements portent sur ce menu, et tout ce menu se modifie (titre, sous-titre, ligne du bas, sections, plats).\n` : '') + `La carte (référence | catégorie > sous-catégorie | nom | prix | état | description) :\n${carte}\n\nCe que dit le restaurateur : « ${texte} »`;
  let out;
  if (env.ANTHROPIC_API_KEY) {
    // Compréhension : Sonnet 5.5 (bien plus fiable que Haiku sur les dictées rapides ou approximatives).
    // Si le modèle est indisponible, on retombe sur Haiku plutôt que d'échouer.
    const ask = model => fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: 2000, system: VOICE_SYSTEM,
        tools: [{ name: 'carte', description: 'Les changements à proposer sur la carte.', input_schema: VOICE_SCHEMA }],
        tool_choice: { type: 'tool', name: 'carte' }, messages: [{ role: 'user', content: user }] })
    });
    let r = await ask(env.VOICE_MODEL || 'claude-sonnet-5-5');
    if (!r.ok && r.status !== 429) { console.error('voice model', r.status); r = await ask('claude-haiku-4-5-20251001'); }
    const j = await r.json();
    if (!r.ok) throw new Error('Anthropic ' + r.status + ' ' + JSON.stringify(j).slice(0, 300));
    const tu = (j.content || []).find(c => c.type === 'tool_use');
    out = tu && tu.input;
  } else if (env.OPENAI_API_KEY) {
    // Compréhension côté OpenAI : GPT-4.1 (bien plus fiable que 4o-mini pour retrouver le bon plat), repli sur 4o-mini.
    const ask = model => fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + env.OPENAI_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: VOICE_SYSTEM }, { role: 'user', content: user }],
        tools: [{ type: 'function', function: { name: 'carte', description: 'Les changements à proposer sur la carte.', parameters: VOICE_SCHEMA } }],
        tool_choice: { type: 'function', function: { name: 'carte' } } })
    });
    let r = await ask(env.VOICE_MODEL || 'gpt-4.1');
    if (!r.ok && r.status !== 429) { console.error('voice model', r.status); r = await ask('gpt-4o-mini'); }
    const j = await r.json();
    if (!r.ok) throw new Error('OpenAI ' + r.status + ' ' + JSON.stringify(j).slice(0, 300));
    const call = j.choices && j.choices[0] && j.choices[0].message && (j.choices[0].message.tool_calls || [])[0];
    out = call && JSON.parse(call.function.arguments || '{}');
  } else {
    return { ok: false, error: 'La voix n\'est pas encore branchée (clé manquante).' };
  }
  const ch = (out && Array.isArray(out.changements) ? out.changements : []).filter(c => c && VOICE_ACTIONS.includes(c.action)).slice(0, 20);
  const R = out && out.reservations, okD = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
  const voir = R && okD(R.du) ? { du: R.du, au: okD(R.au) && R.au >= R.du ? R.au : R.du, moment: ['midi', 'soir'].includes(R.moment) ? R.moment : '', heure: /^\d{1,2}:\d{2}$/.test(String(R.heure || '')) ? R.heure : '' } : null;
  return { ok: true, texte, refus: voir ? '' : String((out && out.refus) || ''), changements: voir ? [] : ch, voir };
}
