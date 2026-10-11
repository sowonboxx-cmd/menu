// ════════════════════════════════════════════════════════════════
// resa-notify — emails et SMS des réservations via Brevo
//
//  POST /notify {slug, ref}  appelé par resa.html juste après l'enregistrement
//      → ajoute le client à la base, envoie la confirmation au client
//        et l'alerte « nouvelle réservation » au restaurant.
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
    if (req.method === 'GET' && url.pathname === '/unsub') return unsub(env, url);
    // ── Espace restaurateur (/gestion) : session Supabase + admin du resto ──
    if (['/clients', '/campaign/preview', '/campaign/send'].includes(url.pathname)) {
      try {
        const body = req.method === 'POST' ? await req.json() : {};
        const slug = String(body.slug || url.searchParams.get('slug') || '');
        const who = await adminOf(env, req, slug);
        if (!who) return json({ ok: false, error: 'Accès refusé' }, 403, cors);
        if (url.pathname === '/clients') {
          const rows = await sb(env, `resa_clients?client_slug=eq.${enc(slug)}&select=id,email,phone,name,visits,first_seen,last_seen,marketing_optin&order=last_seen.desc&limit=5000`);
          return json({ ok: true, clients: rows || [] }, 200, cors);
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
          const all = await sb(env, `resa_clients?client_slug=eq.${enc(slug)}&marketing_optin=eq.true&select=id,email,name,visits,last_seen&limit=5000`) || [];
          list = all.filter(c => inSegment(c, body.segment));
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
async function sendEmail(env, st, to, toName, subject, html, replyTo) {
  const body = {
    sender: { name: st.restaurant_name, email: env.SENDER_EMAIL },
    to: [{ email: to, name: toName || undefined }],
    subject, htmlContent: html,
  };
  const rt = replyTo || st.reply_to;
  if (rt) body.replyTo = { email: rt };
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
  return `<!doctype html><html><body style="margin:0;background:#f5f3ef;font-family:-apple-system,Segoe UI,Inter,Arial,sans-serif;color:#16181d">
  <div style="max-width:520px;margin:0 auto;padding:28px 18px"><div style="text-align:center;font-family:Georgia,serif;font-size:24px;font-weight:700;letter-spacing:.03em;color:#10285e;margin-bottom:18px">${esc(title)}</div>
  <div style="background:#fff;border-radius:18px;padding:22px 22px 18px;line-height:1.5">${inner}</div>
  <p style="text-align:center;color:#a3a7b1;font-size:11.5px;margin-top:16px">Réservation gérée avec Beltab</p></div></body></html>`;
}

// ── Utilitaires ───────────────────────────────────────────────────
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
function inSegment(c, seg) {
  const days = c.last_seen ? (Date.now() - Date.parse(c.last_seen)) / 864e5 : 999;
  if (seg === 'fideles') return (c.visits || 0) >= 3;
  if (seg === 'relance') return days > 60;
  if (seg === 'nouveaux') return (c.visits || 0) <= 1;
  return true;
}
async function sign(env, msg) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.SUPABASE_SERVICE_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const b = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg)));
  return [...b.slice(0, 16)].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function unsub(env, url) {
  const s = url.searchParams.get('s') || '', c = url.searchParams.get('c') || '', t = url.searchParams.get('t') || '';
  const page = m => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:-apple-system,Inter,Arial,sans-serif;background:#f5f3ef;display:grid;place-items:center;min-height:90vh;margin:0"><div style="background:#fff;border-radius:18px;padding:28px 26px;max-width:380px;text-align:center"><p style="font-size:16px;line-height:1.5;margin:0">${m}</p></div>`, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  if (!/^\d+$/.test(c) || t !== await sign(env, s + ':' + c)) return page('Lien invalide.');
  await sb(env, `resa_clients?id=eq.${c}&client_slug=eq.${enc(s)}`, { method: 'PATCH', body: { marketing_optin: false } });
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
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, '+')}:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet"><title>${esc(f.title || st.restaurant_name)}</title></head>
<body style="margin:0;padding:0;background:#f5f3ef"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ef"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden"><tr><td>
<div style="text-align:center;padding:22px 20px 18px;font-family:${serif};font-size:22px;font-weight:bold;letter-spacing:3px;color:${col}">${esc(String(st.restaurant_name).toUpperCase())}</div>
${body}
<div style="text-align:center;padding:18px 20px 22px;border-top:1px solid #f0ede7;font-family:Arial,sans-serif;font-size:12px;line-height:1.6;color:#8a8f99">${foot}<br><a href="${unsubUrl}" style="color:#8a8f99">Se désinscrire</a></div>
</td></tr></table></td></tr></table></body></html>`;
}
