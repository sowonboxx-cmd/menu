-- Surzur : adresse(s) qui reçoivent les nouvelles réservations.
-- Remplace l'adresse ci-dessous. Pour plusieurs personnes : 'a@x.fr, b@y.fr'
-- (garde ton adresse dedans si tu veux continuer à recevoir les réservations de Surzur).

update resa_settings
set notify_email = 'EMAIL-SURZUR@exemple.fr'
where client_slug = 'drevici-surzur';

-- Vérification : Surzur et Paris doivent avoir chacun leurs adresses.
select client_slug, notify_email
from resa_settings
where client_slug in ('drevici-paris', 'drevici-surzur');
