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
  return { 'access-control-allow-origin': ok ? o : (allowed[0] || '*'), 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'origin' };
}
const json = (o, s, h) => new Response(JSON.stringify(o), { status: s, headers: { ...h, 'content-type': 'application/json' } });
