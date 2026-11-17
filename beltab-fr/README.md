# beltab.fr — la carte des restaurants indépendants

Site statique, sans dépendance. Les restaurants sont dans `data/restaurants.json` ; `node build.mjs` génère le site dans `dist/`.

## Mettre en ligne (Cloudflare Pages)

1. Pousser ce dossier sur GitHub (un dépôt à part, ou un dossier du dépôt `menu`).
2. Cloudflare › Workers & Pages › Créer › Pages › connecter le dépôt.
3. Commande de build : `node build.mjs` · Dossier de sortie : `dist`.
4. Domaine personnalisé : `beltab.fr` (et `www.beltab.fr`).

## Les adresses

- `/` : la carte (MapLibre + tuiles OpenFreeMap, gratuites, sans clé).
- `/paris-17/le-truffaut/` : une fiche restaurant, générée en HTML pour que Google et les IA la lisent.
- `/regles/` : qui peut être sur la carte, et les règles.
- `/restaurants.json` : les données publiques lues par la carte.

## Les niveaux (champ `niveau` de chaque restaurant)

| niveau | Carte | Photos | Plat du jour | Voisins | Réservation |
|---|---|---|---|---|---|
| `gratuit` | 1 entrée, 1 plat, 1 dessert | aucune | image (`platDuJour.image`) | affichés | lien externe |
| `chef`, `local`, `starter` | complète | 3 | texte mis en page | masqués | Beltab |
| `pro`, `master` | complète + formules | toutes | texte + menu du jour complet | masqués | Beltab |

Un plat du jour ou un menu du jour ne s'affiche que le jour de sa date (`"date": "2026-11-17"`), heure de Paris : il disparaît à minuit. `"auto"` = toujours affiché (démo).

## Mode démo

`"demo": true` dans `data/restaurants.json` :
- bandeau « Version de démonstration » sur toutes les pages ;
- aucune page indexée par Google (`noindex` + `robots.txt` fermé) ;
- chaque fiche payante a aussi sa version gratuite à `/…/gratuit/`, avec un bouton pour passer de l'une à l'autre.

Passer à `"demo": false` seulement quand les fiches sont de vrais restaurants inscrits.

## Plus tard

- Lire les restaurants depuis Supabase au lieu du JSON (même structure).
- Comptes utilisateurs (connexion Google, favoris, listes, notes privées).
- Vérification automatique via l'API Recherche d'entreprises.
