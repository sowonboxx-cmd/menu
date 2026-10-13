#!/usr/bin/env python3
"""Fabrique le SOCLE COMMUN Beltab (dossier beltab/) à partir du labo drevici-preview/.

Principe (validé par Will le 13/10/2026) :
  - drevici-preview est le laboratoire : toute nouvelle fonction y est construite et testée.
  - Ce script en dérive le socle commun : le même code, sans rien de propre à Drevici.
    Tout ce qui change d'un restaurant à l'autre est lu dans window.BELTAB, que le Worker
    commun (workers/beltab-sites.js) injecte selon l'adresse du site (workers/tenants.js).
  - « publie » = relancer ce script puis pousser : tous les restaurants du socle reçoivent
    la nouvelle version d'un coup. Le contenu (carte, photos, clients) reste dans la base,
    rangé par restaurant : il n'est jamais touché par une mise à jour.

Chaque remplacement est vérifié : si le labo a changé et qu'un repère n'est plus trouvé,
le script s'arrête en le disant, au lieu de produire un socle qui afficherait Drevici.

Usage : python3 tools/socle.py
"""
import os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LAB = os.path.join(ROOT, 'drevici-preview')
OUT = os.path.join(ROOT, 'beltab')

# Fichiers du labo qui forment le socle. Les dossiers propres à Drevici (club/, seo/,
# media/, charte/, cabine/) ne sont pas copiés : chaque resto a ses images dans clients/<slug>/.
FILES = ['index.html', 'book.html', 'admin.html', 'floorplan.js']

# Première chose exécutée dans chaque page : BT = la configuration du restaurant.
BT_LINE = '<script>var BT=window.BELTAB||{};BT.features=BT.features||{};</script>'


def rep(src, old, new, count=1, label=''):
    n = src.count(old)
    if n != count:
        sys.exit(f'✗ Repère introuvable ou ambigu ({n} trouvé(s), {count} attendu(s)) : {label or old[:80]!r}')
    return src.replace(old, new)


def rex(src, pattern, new, label, flags=re.S):
    out, n = re.subn(pattern, new, src, count=1, flags=flags)
    if n != 1:
        sys.exit(f'✗ Repère introuvable : {label}')
    return out


def head(src):
    i = src.find('<head>')
    if i < 0 or i > 400:
        sys.exit('✗ <head> introuvable en haut de page')
    return src[:i] + '<head>\n' + BT_LINE + src[i + 6:]


# ─────────────────────────────── index.html ───────────────────────────────
def index(s):
    s = head(s)
    # En-tête : le nom vient des données du restaurant.
    s = rep(s, '<img class="logo-img" alt="Drevici Oyster"', '<img class="logo-img" alt=""', 1)
    s = rep(s, '<span class="logo-text" id="logoText">Drevici Oyster</span>', '<span class="logo-text" id="logoText"></span>', 1)
    # Données d'exemple : plus de carte Drevici en repli (mieux vaut une page vide qu'un autre resto).
    s = rep(s, "restaurantName: 'Drevici Oyster',", "restaurantName: '',", 1)
    s = rex(s, r"(let DATA = \{\n  heroActive: )true,\n  hero: \{[^\n]*\},\n  intro: \{[^\n]*\},",
            r"\1false,\n  hero: { fr:'' },\n  intro: { active:false, text:{fr:''} },", 'DATA hero/intro')
    s = rex(s, r"(\n  pinnedShowRail: true,[^\n]*\n  tabs: )\[\n.*?\n  \]\n\};",
            r"\1[]\n};", 'DATA tabs')
    # Club : seulement si la formule l'inclut. (Les cartes du club restent à généraliser
    # avant de l'ouvrir à un 2e restaurant : textes et visuels sont encore ceux de Drevici.)
    s = rep(s, "const CLUB_ON = /preview|localhost|127\\.0\\.0\\.1|file:/.test(location.href);",
            "const CLUB_ON = !!BT.features.club;", 1, 'CLUB_ON')
    s = rex(s, r"const CLUB_SLUG = 'drevici-test';[^\n]*", "const CLUB_SLUG = BT.resaSlug || BT.slug;", 'CLUB_SLUG')
    s = rep(s, "||'drevicioysterbar')", "||'')", 1, 'instagram par défaut')
    # Quel restaurant : donné par le Worker, plus par le chemin.
    s = rep(s, "const CLIENT_SLUG_RACINE = 'drevici-preview';", "const CLIENT_SLUG_RACINE = BT.slug || '';", 1)
    s = rep(s, "const IS_PREVIEW = /-preview$/.test(_lastSegment);", "const IS_PREVIEW = !!BT.preview;", 1)
    s = rep(s, "const CLIENT_SLUG = _lastSegment.replace(/-preview$/, '');",
            "const CLIENT_SLUG = BT.slug || _lastSegment.replace(/-preview$/, '');", 1)
    s = rep(s, "const PROD_BASE = 'https://drevici.beltab.app/';", "const PROD_BASE = BT.prodBase || '/';", 1)
    # Visuels réseaux sociaux : plus de nom, logo ni hashtags Drevici en repli.
    s = rep(s, "getRestaurantName() || 'Drevici Oyster'", "getRestaurantName() || BT.name || ''", 2)
    s = rep(s, "getRestaurantLogo() || 'https://drevicioyster.com/wp-content/uploads/2026/06/Logo-transparent.png'",
            "getRestaurantLogo() || ''", 1)
    s = rep(s, "#drevicioyster #paris #evenement #huitres</div>", "${BT.hashtags||''}</div>", 1)
    s = rep(s, "const hashtags = '#huitres #paris #morbihan #fruitsdemer #drevicioyster #directproducteur';",
            "const hashtags = BT.hashtags || '';", 1)
    s = rep(s, "  setSiteIcon(logo);", "  setSiteIcon(DATA.favicon||logo);", 1, 'favicon')
    s = rep(s, "a.download = `drevici-${s.tplId}-${fmt}.png`;", "a.download = `${CLIENT_SLUG}-${s.tplId}-${fmt}.png`;", 1)
    return s


# ─────────────────────────────── book.html ───────────────────────────────
def book(s):
    s = head(s)
    s = rep(s, '<title>Réservation — Drevici Oyster</title>', '<title>Réservation</title>', 1)
    s = rep(s, 'id="headerLogoImg" src="" alt="Drevici Oyster"', 'id="headerLogoImg" src="" alt=""', 1)
    s = rep(s, '<span class="logo-text" id="headerLogoText">Drevici Oyster</span>', '<span class="logo-text" id="headerLogoText"></span>', 1)
    s = rex(s, r'<div class="cov-note">Pour les groupes de plus de 10 personnes.*?</div>',
            '<div class="cov-note" id="covNote"></div>', 'note groupes')
    s = rep(s, "const CLIENT_SLUG = 'drevici-paris';", "const CLIENT_SLUG = BT.resaSlug || BT.slug;", 1)
    s = rep(s, "const WRITE_SLUG = 'drevici-test';", "const WRITE_SLUG = BT.preview ? (BT.testSlug || 'test') : CLIENT_SLUG;", 1)
    s = rep(s, "const MENU_CLIENT_SLUG = 'drevici';", "const MENU_CLIENT_SLUG = BT.slug;", 1)
    s = rep(s, "const LOCATION_NAME = 'Paris';", "const LOCATION_NAME = BT.location || '';", 1)
    # Jours et créneaux : tirés des HORAIRES de la carte (un resto ouvert le midi n'est pas un bar
    # du soir). Créneaux toutes les 30 min, le dernier 1 h avant la fermeture du service.
    s = rep(s, "const DINNER      = [", "let DINNER      = [", 1)
    s = rep(s, "  const closed = CLOSED_DAYS;", "  const closed = beltabClosedDays();", 1)
    s = rep(s, "  noMsg.classList.add('hidden');\n", "  noMsg.classList.add('hidden');\n  DINNER = beltabSlots(S.date);\n", 1, 'slots du jour')
    s = rep(s, "    if (d.restaurantLogo) {\n      if (logoImg)",
            "    BT_SCHEDULE = Array.isArray(d.schedule) ? d.schedule : null;\n    beltabColors(d.brandColors);\n"
            "    renderCal();\n    if (d.restaurantLogo && d.showHeaderLogo !== false) {\n      if (logoImg)", 1, 'branding')
    s = rep(s, "async function loadHeaderBranding() {", r'''// ── Socle Beltab : horaires et couleurs du restaurant (lus dans sa carte) ──
let BT_SCHEDULE = null;
const BT_DAYS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
function beltabDay(dow) { return (BT_SCHEDULE || []).find(x => x && x.day === BT_DAYS[dow]); }
function beltabClosedDays() {
  if (!BT_SCHEDULE) return CLOSED_DAYS;
  return [0,1,2,3,4,5,6].filter(i => { const d = beltabDay(i); return !d || !(d.services || []).length; });
}
function beltabSlots(date) {
  const d = date && beltabDay(date.getDay());
  if (!d || !(d.services || []).length) return DINNER;
  const out = [], hm = m => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  d.services.forEach(s => {
    const a = Math.round(Number(s.open) * 60), b0 = Math.round(Number(s.close) * 60), b = b0 <= a ? b0 + 1440 : b0;
    for (let m = Math.ceil(a / 30) * 30; m <= b - 60; m += 30) out.push(hm(m));
  });
  return out.length ? [...new Set(out)] : DINNER;
}
function beltabColors(c) {
  if (!c) return;
  const r = document.documentElement.style;
  if (c.primary) r.setProperty('--navy', c.primary);
  if (c.accent) r.setProperty('--gold', c.accent);
  if (c.bg) r.setProperty('--bg', c.bg);
  const m = document.querySelector('meta[name="theme-color"]'); if (m && c.primary) m.setAttribute('content', c.primary);
}
async function loadHeaderBranding() {''', 1)
    # Titre + note « groupes » remplis avec les infos du restaurant.
    s = rep(s, '</body>', '''<script>
(function(){
  if (BT.name) document.title = 'Réservation — ' + BT.name;
  const n = document.getElementById('covNote'); if (!n) return;
  const e = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const tel = BT.phone ? ' au <a href="tel:' + e(BT.phone.replace(/\\s/g, '')) + '">' + e(BT.phone) + '</a>' : '';
  const mail = BT.email ? (tel ? ' ou' : '') + ' par email à <a href="mailto:' + e(BT.email) + '">' + e(BT.email) + '</a>' : '';
  n.innerHTML = 'Pour les groupes de plus de ' + (BT.groupMax || 10) + ' personnes, contactez-nous directement' + tel + mail + '.';
})();
</script>
</body>''', 1, '</body>')
    return s


# ─────────────────────────────── admin.html ───────────────────────────────
def admin(s):
    s = head(s)
    s = rep(s, "const SLUG=QS.get('slug')||'drevici-test';", "const SLUG=BT.preview?(BT.testSlug||'test'):BT.slug;", 1)
    s = rep(s, "const RESA_SLUG='drevici-paris', STATS_SLUG='drevici';",
            "const RESA_SLUG=BT.resaSlug||BT.slug, STATS_SLUG=BT.slug;", 1)
    s = rep(s, "const SITE_URL='https://drevici-preview.beltab.app/';", "const SITE_URL=location.origin+'/';", 1)
    s = rep(s, "const RESA_ADMIN_URL='https://drevici.beltab.app/reservations';", "const RESA_ADMIN_URL='/reservations';", 1)
    s = rep(s, "const CL_SLUG=SLUG;", "const CL_SLUG=BT.preview?SLUG:RESA_SLUG;", 1)
    # Interrupteurs par formule : une rubrique dont la fonction est coupée (false) disparaît du menu.
    s = rep(s, "['menus','spe','Mes menus'],['stats','vue','Statistiques']];",
            "['menus','spe','Mes menus'],['stats','vue','Statistiques']]"
            ".filter(n=>{const f={emails:'campaigns',menus:'formules'}[n[0]];return !f||BT.features[f]!==false;});", 1, 'NAV')
    # Un compte n'entre que dans SON restaurant : sinon message clair + déconnexion
    # (les règles de la base bloquent déjà ses données ; ceci évite un écran trompeur).
    s = rep(s, "async function boot(){\n  const r=await loadAll();",
            "async function boot(){\n"
            "  if(!BT.preview){ const {data:ok}=await sb.from('restaurant_admins').select('client_slug').eq('user_id',SESSION.user.id).eq('client_slug',SLUG);\n"
            "    if(!ok||!ok.length){ await sb.auth.signOut(); SESSION=null; render(); const e=$('#loginErr'); if(e) e.textContent='Ce compte n\\u2019a pas accès à '+(BT.name||'ce restaurant')+'.'; return; } }\n"
            "  const r=await loadAll();", 1, 'boot')
    s = rep(s, "<i>DREVICI OYSTER</i><img src=\"club/gentleman.webp\"", "<i>${esc(String(BT.name||'').toUpperCase())}</i><img src=\"club/gentleman.webp\"", 1)
    s = rep(s, "<i>${k==='staff'?'DREVICI<br>OYSTER':'DREVICI OYSTER'}</i>", "<i>${esc(String(BT.name||'').toUpperCase())}</i>", 1)
    return s


PATCH = {'index.html': index, 'book.html': book, 'admin.html': admin}


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in FILES:
        src = open(os.path.join(LAB, f), encoding='utf-8').read()
        out = PATCH.get(f, lambda x: x)(src)
        open(os.path.join(OUT, f), 'w', encoding='utf-8').write(out)
    # Contrôle final : aucune trace de Drevici dans le code exécuté (les commentaires sont tolérés).
    bad = []
    for f in PATCH:
        for i, line in enumerate(open(os.path.join(OUT, f), encoding='utf-8'), 1):
            code = line.split('//')[0] if not line.lstrip().startswith(('//', '*', '/*')) else ''
            if re.search(r"drevici", code, re.I) and not re.search(r"club/|clubWelcome|club-|DREVICI<br>|BZH", code):
                bad.append(f'{f}:{i}: {line.strip()[:120]}')
    if bad:
        print('⚠ Mentions de Drevici restantes (à vérifier) :')
        print('\n'.join(bad))
    print('✓ Socle commun écrit dans beltab/ (' + ', '.join(FILES) + ')')


if __name__ == '__main__':
    main()
