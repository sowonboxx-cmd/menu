-- Paris : drevicioyster@gmail.com reçoit tous les emails du resto
-- (nouvelles réservations + messages du site), en plus des adresses déjà en place.
-- Ne touche pas aux autres adresses ; ne fait rien si elle y est déjà. Surzur n'est pas concerné.

update resa_settings
set notify_email = case
  when coalesce(trim(notify_email), '') = '' then 'drevicioyster@gmail.com'
  else notify_email || ', drevicioyster@gmail.com'
end
where client_slug = 'drevici-paris'
  and coalesce(notify_email, '') not ilike '%drevicioyster@gmail.com%';

-- Vérification : la liste complète des destinataires de Paris
select client_slug, notify_email from resa_settings where client_slug = 'drevici-paris';
