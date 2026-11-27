-- Mot magique Instagram : un commentaire contenant le mot → un message privé avec le lien.
-- À coller une fois dans Supabase → SQL Editor → Run (après qr.sql).
--
-- Fonctionnement :
--   1. Meta prévient le Worker « insta-mots » (insta.beltab.app/webhook) à chaque commentaire.
--   2. Le Worker cherche une règle active du compte dont le mot est dans le commentaire.
--   3. Il envoie la réponse privée (un seul message par commentaire, dans les 7 jours : règle Meta),
--      et, si la règle le prévoit, une courte réponse publique sous le commentaire.
--   4. Le lien du message est un QR code traçable (go.beltab.app/<CODE>, voir qr.sql) :
--      les clics et les réservations qui suivent sont comptés comme pour une carte QR.
--
-- Rien n'est lisible depuis le navigateur : RLS activé, aucune règle publique.
-- Seul le Worker (clé service) lit et écrit ces tables.

create table if not exists public.insta_comptes (
  ig_id       text primary key,              -- identifiant Instagram du compte pro (donné par Meta)
  client_slug text not null,                 -- drevici, …
  nom         text,                          -- « drevicioyster »
  token       text not null,                 -- jeton d'accès Instagram (60 jours, renouvelé tout seul)
  token_maj   timestamptz not null default now(),
  actif       boolean not null default true
);

create table if not exists public.insta_mots (
  id              uuid primary key default gen_random_uuid(),
  ig_id           text not null references public.insta_comptes(ig_id) on delete cascade,
  mot             text not null,             -- « TABLE » (majuscules ou non, accents ignorés)
  media_id        text,                      -- vide = tous les posts et reels ; sinon un seul post
  message         text not null,             -- le message privé ; {lien} est remplacé par le lien
  qr_code         text,                      -- code de cabine_qr : le lien devient go.beltab.app/<CODE>
  reponse_publique text,                     -- facultatif : « C'est envoyé en message privé ! »
  actif           boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists insta_mots_compte on public.insta_mots (ig_id) where actif;

create table if not exists public.insta_envois (
  comment_id  text primary key,              -- un seul envoi par commentaire
  ig_id       text not null,
  mot_id      uuid references public.insta_mots(id) on delete set null,
  media_id    text,
  from_id     text,
  from_user   text,
  texte       text,
  statut      text not null default 'envoye', -- envoye, erreur
  erreur      text,
  at          timestamptz not null default now()
);
create index if not exists insta_envois_mot on public.insta_envois (mot_id, at desc);

alter table public.insta_comptes enable row level security;
alter table public.insta_mots    enable row level security;
alter table public.insta_envois  enable row level security;

-- Exemple (à adapter) : le compte Drevici, puis une règle « TABLE ».
-- insert into public.insta_comptes (ig_id, client_slug, nom, token) values ('<IG_ID>', 'drevici', 'drevicioyster', '<JETON>');
-- insert into public.insta_mots (ig_id, mot, message, qr_code, reponse_publique) values
--   ('<IG_ID>', 'TABLE', 'Merci ! Voici le lien pour réserver votre table, l''offre est déjà dedans : {lien}', 'INSTA-TABLE', 'C''est envoyé en message privé !');
