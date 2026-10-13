#!/usr/bin/env python3
"""Nouveau restaurant sur le socle commun Beltab : fabrique le SQL à coller dans Supabase.

    python3 tools/nouveau-client.py soyonne            → sql/clients/soyonne.sql
    python3 tools/nouveau-client.py soyonne --demo     → idem, emails du resto vers Will

Le contenu vient de tools/clients/<nom>.py (DATA = la carte, RESA = réglages de réservation).
L'entrée du restaurant (adresse du site, formule, SEO) est dans workers/tenants.js.

Le SQL est purement additif et sans risque à relancer :
  - la carte n'est écrite que si elle n'existe pas encore (jamais d'écrasement des modifs du resto) ;
  - les réglages emails, la salle, les tables et les services idem ;
  - l'accès /admin n'est donné qu'aux comptes de Will (jamais en copiant les admins d'un autre resto).
"""
import importlib.util, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WILL = ['beltab.app@gmail.com', 'sowonboxx@gmail.com']   # comptes agence : accès à tous les restos qu'on gère
NOTIFY_AGENCY = 'beltab.app@gmail.com'                   # toujours en copie des nouvelles réservations


def q(s):
    return "'" + str(s).replace("'", "''") + "'"


def load(name):
    p = os.path.join(ROOT, 'tools', 'clients', name + '.py')
    spec = importlib.util.spec_from_file_location(name, p)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def tenant(name):
    src = open(os.path.join(ROOT, 'workers', 'tenants.js'), encoding='utf-8').read()
    m = re.search(r'\n  ' + re.escape(name) + r': \{(.*?)\n  \}', src, re.S)
    if not m:
        sys.exit(f'✗ « {name} » absent de workers/tenants.js : ajouter son entrée d\'abord.')
    body = m.group(1)
    get = lambda k: (re.search(k + r": '([^']*)'", body) or [None, None])[1]
    return {'slug': get('slug'), 'resaSlug': get('resaSlug') or get('slug'), 'host': (re.search(r"hosts: \['([^']+)'", body) or [None, ''])[1],
            'demo': bool(re.search(r'demo: true', body))}


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    name = sys.argv[1]
    m, t = load(name), tenant(name)
    demo = '--demo' in sys.argv or t['demo']
    slug, rslug, R = t['slug'], t['resaSlug'], m.RESA
    if not re.fullmatch(r'[a-z0-9-]{2,60}', slug or ''):
        sys.exit('✗ slug invalide')
    data = json.dumps(m.DATA, ensure_ascii=False, separators=(',', ':'))
    if '$carte$' in data:
        sys.exit('✗ La carte contient « $carte$ »')
    notify = NOTIFY_AGENCY if demo else ', '.join(x for x in [R.get('notify_email'), NOTIFY_AGENCY] if x)
    reply = NOTIFY_AGENCY if demo else R.get('reply_to', '')
    site = 'https://' + t['host']
    # Plusieurs espaces possibles : chaque espace porte ses tables (« tables » de premier niveau = premier espace).
    spaces = [dict(x) for x in R['spaces']]
    if R.get('tables') and not spaces[0].get('tables'):
        spaces[0]['tables'] = R['tables']
    blocks = []
    for i, sp_ in enumerate(spaces):
        blk = f"    insert into restaurant_spaces (client_slug, name, sort_order) values ({q(rslug)}, {q(sp_['name'])}, {i}) returning id into sp;"
        tb = sp_.get('tables') or []
        if tb:
            blk += "\n    insert into restaurant_tables (client_slug, space_id, name, seats) values\n      " + (',\n      ').join(f"({q(rslug)}, sp, {q(n)}, {int(c)})" for n, c in tb) + ";"
        blocks.append(blk)
    spaces_sql = "\n".join(blocks)

    out = [f"""-- ════════════════════════════════════════════════════════════════
-- {R['restaurant_name']} — mise en place sur le socle commun Beltab
-- Fabriqué par tools/nouveau-client.py. À coller UNE FOIS dans Supabase → SQL Editor → Run.
-- Purement additif, sans risque à relancer : rien de ce qui existe déjà n'est remplacé.
-- {'MODE DÉMO : les alertes et les réponses clients arrivent chez Will, pas au restaurant.' if demo else 'Restaurant en ligne : alertes au restaurant + Will en copie.'}
-- ════════════════════════════════════════════════════════════════

-- 1) La carte (le site lit cette ligne ; ensuite tout se modifie dans /admin)
insert into menu_data (client_slug, data)
values ({q(slug)}, $carte${data}$carte$::jsonb)
on conflict do nothing;

-- 2) Réglages des emails de réservation (Brevo)
insert into resa_settings (client_slug, restaurant_name, reply_to, notify_email, address, phone, site_url,
                           sms_reminders, sms_marketing_credits, active)
values ({q(rslug)}, {q(R['restaurant_name'])}, {q(reply)}, {q(notify)}, {q(R['address'])}, {q(R['phone'])}, {q(site)},
        false, 0, true)
on conflict (client_slug) do nothing;

-- 3) Espaces, tables et services (seulement si le restaurant n'en a encore aucun)
do $$
declare sp uuid;
begin
  if not exists (select 1 from restaurant_spaces where client_slug = {q(rslug)}) then
{spaces_sql}
  end if;
  if not exists (select 1 from restaurant_services where client_slug = {q(rslug)}) then
    insert into restaurant_services (client_slug, name, start_time, end_time, sort_order) values
      {(',' + chr(10) + '      ').join(f"({q(rslug)}, {q(n)}, {q(a)}, {q(b)}, {i})" for i, (n, a, b) in enumerate(R['services']))};
  end if;
end $$;

-- 4) Accès /admin pour les comptes de Will (l'équipe du resto : sql/acces-equipe.sql, à la signature)
insert into public.restaurant_admins (user_id, client_slug)
select u.id, s.slug
from auth.users u
cross join (values {', '.join(f'({q(x)})' for x in sorted({slug, rslug}))}) as s(slug)
where u.email in ({', '.join(q(x) for x in WILL)})
  and not exists (select 1 from public.restaurant_admins a where a.user_id = u.id and a.client_slug = s.slug);

-- Vérification : une ligne par élément, tout doit être à « oui »
select 'carte' as quoi, exists(select 1 from menu_data where client_slug = {q(slug)}) as ok
union all select 'emails', exists(select 1 from resa_settings where client_slug = {q(rslug)})
union all select 'tables', exists(select 1 from restaurant_tables where client_slug = {q(rslug)})
union all select 'services', exists(select 1 from restaurant_services where client_slug = {q(rslug)})
union all select 'accès Will', exists(select 1 from restaurant_admins where client_slug = {q(slug)});
"""]
    os.makedirs(os.path.join(ROOT, 'sql', 'clients'), exist_ok=True)
    path = os.path.join(ROOT, 'sql', 'clients', name + '.sql')
    open(path, 'w', encoding='utf-8').write(''.join(out))
    print(f'✓ {os.path.relpath(path, ROOT)} ({len(data)//1024} Ko de carte) — site : {site}' + (' — DÉMO' if demo else ''))


if __name__ == '__main__':
    main()
