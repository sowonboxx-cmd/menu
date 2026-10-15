-- Paris : le service du soir finit à 23:00 pour que le dernier créneau réservable reste 22:30.
-- (La page de réservation tire maintenant ses créneaux des services : toutes les 30 min,
--  de l'heure de début jusqu'à l'heure de fin non comprise.)
-- À lancer au moment de « publie » (sans effet visible avant).

update restaurant_services
set end_time = '23:00'
where client_slug = 'drevici-paris' and name = 'Soir';

select client_slug, name, start_time, end_time
from restaurant_services
where client_slug in ('drevici-paris', 'drevici-surzur')
order by client_slug, sort_order;
