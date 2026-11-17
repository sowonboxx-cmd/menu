# Contrôle avant publication (obligatoire avant chaque « publie »)

Règle (Will, 17/11/2026) : avant de pousser la preview en ligne, Claude lance ce contrôle,
lit chaque comparaison, et donne le rapport à Will. Pas de publication si une erreur
ou un changement non prévu apparaît.

1. `python3 -m http.server 8793` à la racine du dépôt (si pas déjà lancé)
2. `node outils/controle/capture.js <dossier>` — en ligne (drevici/) et preview (drevici-preview/),
   téléphone (iPhone 13) et ordinateur (1400 px) : accueil, chaque catégorie, une fiche plat
   par catégorie, menu rapide. Vidéos et animations figées, hasard figé, images forcées.
   `CONTROLE_WEB=1` compare les vrais sites au lieu des fichiers.
3. `python3 outils/controle/compare.py <dossier>` — images côte à côte, zones changées en rouge,
   % de pixels modifiés, erreurs JavaScript.
4. Rapport : liste en français des changements (commits depuis la dernière publication de
   drevici/index.html), chaque écran classé Prévu / À valider / Anormal, publié en artifact.

Toujours vérifier une modification sur téléphone ET ordinateur, même si elle n'en vise qu'un.
Non couvert : Espace admin (connexion), envoi réel des photos.
