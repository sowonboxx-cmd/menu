# Optimisation SEO — sites restaurants Kuisto

Checklist à appliquer à **chaque site client**, à la mise en ligne puis à chaque grosse modification.
Objectif : chaque page est trouvée, lue et bien présentée par Google et Bing, avec le nom du restaurant, la ville et le type de cuisine.

- Dernière mise à jour : 4 octobre 2026.
- Document compagnon : `geo-llm.md` (visibilité dans les IA). Les deux se complètent : une IA ne peut citer que ce qu'elle arrive à lire.

---

## 0. Le point le plus important : le contenu doit exister sans JavaScript

Nos sites construisent la carte en JavaScript à partir de `menu.json`. Un humain voit tout, mais un robot qui ne lance pas le JavaScript voit une page presque vide.

**Constat sur Drevici (4 oct. 2026)**, en lisant la page comme un robot :

| Élément | Ce que voit le robot |
|---|---|
| Titre de la page | « Menu » (pas le nom du restaurant) |
| Méta description | Aucune |
| Contenu lisible | ≈ 670 caractères, surtout des textes de l'admin (« Modifier », « Publier », « Confirmer la suppression »…) |
| Plats, prix, horaires, adresse | Absents |
| Données structurées (schema.org) | Aucune |
| sitemap.xml | Absent (404) |

Google sait exécuter le JavaScript, mais plus tard et pas toujours. **Bing et les robots des IA (ChatGPT, Claude, Perplexity) ne l'exécutent généralement pas.** Tant que ce point n'est pas réglé, le reste de la liste a peu d'effet.

**Solution en place : `workers/menu-seo.js` (un seul fichier pour tous les sites)**. Au moment où la page est servie par Cloudflare, ce Worker lit les données du restaurant (la même ligne Supabase que le site) et écrit directement dans le HTML :

- le `<title>`, la méta description et les balises Open Graph du restaurant ;
- un bloc de texte réel : nom, type de cuisine, adresse, horaires, téléphone, liens de réservation, et la carte (catégories, plats, descriptions, prix) ;
- les données structurées JSON-LD (section 4) ;
- il sert aussi `robots.txt`, `sitemap.xml` et `llms.txt`, générés depuis les mêmes données ;
- la recette (`*-preview`) n'est jamais indexée (`noindex` partout, robots.txt qui bloque tout).

Le bloc texte est retiré dès que le JavaScript démarre : un visiteur voit exactement le même site qu'avant. Rien à regénérer à chaque modification de menu (cache de 5 minutes).

**Brancher un nouveau site** : dans son fichier `wrangler.<site>.jsonc`, ajouter `"main": "./workers/menu-seo.js"`, `"binding": "ASSETS"` et `"run_worker_first": true` dans `assets`, puis le bloc `vars` (`CLIENT_SLUG`, `SITE_ENV`, `CANONICAL_ORIGIN`, `SUPABASE_URL`, `SUPABASE_KEY`). Modèle : `wrangler.drevici-preview.jsonc`.

**Résultat mesuré sur Drevici (recette, Lighthouse)** : SEO 91 → 100, Bonnes pratiques 96 → 100. Accessibilité 74 (inchangée : zoom bloqué, contraste des prix dorés et des liens réseaux, voir section 2 et 7).

**Test de validation** : `curl -A "GPTBot" https://<domaine>/` doit montrer le nom du restaurant, les plats et les horaires en texte.

---

## 1. Domaine et indexation

- [ ] Le site est sur **le domaine du restaurant** (ex. `restaurant-x.fr`), pas sur `*.workers.dev`. Les sous-domaines workers.dev ne doivent pas être indexés (balise `noindex` ou redirection 301 vers le vrai domaine).
- [ ] HTTPS partout, une seule version : `www` **ou** sans `www` (l'autre redirige en 301).
- [ ] Balise `<link rel="canonical" href="https://domaine/...">` sur chaque page.
- [ ] `<html lang="fr">` correct.
- [ ] `robots.txt` explicite à la racine, qui autorise l'exploration et indique le sitemap (modèle dans `geo-llm.md`, section 2).
- [ ] `sitemap.xml` avec toutes les pages publiques (accueil, carte, réservation, chaque langue), avec `<lastmod>` mis à jour à chaque publication.
- [ ] Site ajouté et validé dans **Google Search Console** et **Bing Webmaster Tools** ; sitemap envoyé dans les deux.
- [ ] **IndexNow** activé (Bing, Yandex, Naver… sont prévenus à chaque modification). Sur Cloudflare : option *Crawler Hints* dans le tableau de bord du domaine.
- [ ] Les pages techniques (admin, `qrc.html`, `qrf.html`, calendrier, fidélité…) sont exclues : `noindex` + absentes du sitemap.

## 2. Balises de chaque page

- [ ] `<title>` unique, ≤ 60 caractères : `Nom du restaurant — Type de cuisine à Ville` (ex. « Le Comptoir — Bar à huîtres à Lyon 2e »).
- [ ] `<meta name="description">` unique, 140 à 160 caractères, avec cuisine, quartier/ville et un argument (terrasse, produits de la mer, réservation en ligne…).
- [ ] Open Graph : `og:title`, `og:description`, `og:image` (1200 × 630, photo du lieu ou d'un plat), `og:url`, `og:type=restaurant` ou `website`, `og:locale=fr_FR`.
- [ ] Twitter/X : `twitter:card=summary_large_image`.
- [ ] Viewport **sans** `user-scalable=no` ni `maximum-scale=1` (bloquer le zoom fait perdre des points d'accessibilité dans Lighthouse). Constaté sur Drevici.

## 3. Structure du contenu

- [ ] **Un seul H1** par page : nom du restaurant + type + ville.
- [ ] H2 pour les grandes parties (La carte, Horaires, Réserver, Infos pratiques), H3 pour les catégories de la carte, les plats en texte simple ou H4.
- [ ] Texte visible (pas seulement des images) : quelques phrases de présentation, l'adresse, les horaires, le téléphone, comment venir.
- [ ] La carte en **vrai texte** : nom du plat, description, prix. Jamais une carte uniquement en image ou en PDF.
- [ ] Liens internes clairs (Carte, Réserver, Contact) et liens sortants vers Google Maps, Instagram, plateforme de réservation.
- [ ] Mentions légales présentes (obligatoire en France, et signe de sérieux pour les moteurs).

## 4. Données structurées (schema.org, format JSON-LD)

À générer automatiquement depuis `menu.json` (voir section 0). Contenu minimum :

- [ ] Type `Restaurant` (ou `BarOrPub`, `CafeOrCoffeeShop`…) avec : `name`, `url`, `image`, `logo`, `telephone`, `address` (`PostalAddress` complète), `geo` (latitude/longitude), `servesCuisine`, `priceRange` (ex. « €€ »), `acceptsReservations` (+ lien), `openingHoursSpecification`, `sameAs` (Instagram, fiche Google, TripAdvisor…).
- [ ] `hasMenu` → `Menu` → `MenuSection` (catégories) → `MenuItem` (plats) avec `name`, `description`, `offers.price` + `priceCurrency: "EUR"`, et si possible `suitableForDiet` (végétarien, sans gluten…).
- [ ] **Jamais** de faux avis ni de note inventée (`aggregateRating` seulement avec de vrais avis affichés sur le site).
- [ ] Validation : aucune erreur dans le [Test des résultats enrichis](https://search.google.com/test/rich-results) et le [Schema Markup Validator](https://validator.schema.org/).

## 5. Images

- [ ] Chaque photo a un `alt` qui décrit vraiment l'image : « Assiette de 6 huîtres creuses de Bretagne, citron » plutôt que « photo1 ».
- [ ] Noms de fichiers parlants : `huitres-creuses-bretagne.webp`.
- [ ] Formats légers (WebP ou AVIF), dimensionnés à la taille d'affichage, avec `width` et `height` renseignés (évite que la page saute au chargement).
- [ ] `loading="lazy"` sur toutes les images **sauf** la première image visible (photo d'accueil).
- [ ] Les photos ont une adresse fixe (URL) : pas d'images intégrées en base64, sinon Google Images ne les indexe pas.

## 6. Icônes et identité (favicons)

- [ ] `favicon.ico` 48 × 48 à la racine.
- [ ] `<link rel="icon" type="image/png" sizes="192x192">` et 512 × 512.
- [ ] `<link rel="apple-touch-icon" sizes="180x180">`.
- [ ] `site.webmanifest` avec nom, couleurs et icônes.
- [ ] Le logo du restaurant (pas celui de Kuisto) dans les icônes et dans `logo` du JSON-LD.

## 7. Vitesse et qualité technique

- [ ] Score **PageSpeed Insights** : Performance ≥ 90 sur mobile, SEO = 100, Accessibilité ≥ 90, Bonnes pratiques ≥ 90.
- [ ] Polices : un seul appel Google Fonts, uniquement les familles et graisses utilisées (Drevici en charge plusieurs, en double), avec `display=swap`.
- [ ] Scripts non indispensables à l'affichage chargés en `defer` (ex. Supabase sur la page publique).
- [ ] Core Web Vitals au vert dans Search Console (LCP < 2,5 s, INP < 200 ms, CLS < 0,1).
- [ ] Aucune erreur dans la console du navigateur sur la page publique.

## 8. Langues

Les sites proposent FR / EN / ES / IT / KR / JP via un bouton. Pour Google, une langue qui change seulement en JavaScript **n'existe pas**.

- [ ] Chaque langue a sa propre adresse (`/en/`, `/es/`…) avec son contenu dans le HTML (même Worker que la section 0).
- [ ] Balises `hreflang` entre toutes les versions, plus `x-default`.
- [ ] Chaque langue a son propre `<title>` et sa description traduits.

## 9. Référencement local (le plus rentable pour un restaurant)

- [ ] **Fiche Google Business Profile** complète : catégorie exacte, horaires (y compris jours fériés), photos récentes, lien vers le site, lien « Menu » vers la carte du site, lien de réservation.
- [ ] **Exactement** les mêmes nom, adresse et téléphone partout : site, Google, Apple Plans (Apple Business Connect), Bing Places, TripAdvisor, TheFork, réseaux sociaux.
- [ ] Le site renvoie vers ces fiches (`sameAs`) et les fiches renvoient vers le site.
- [ ] Encourager les vrais avis Google (QR code « Avis Google », voir grille tarifaire) et y répondre.

---

## 10. Prouver le travail au client

Pour chaque site, garder un dossier « Rapport SEO » avec des captures **avant / après** :

| Preuve | Outil | Objectif |
|---|---|---|
| Score SEO, performance, accessibilité | [PageSpeed Insights](https://pagespeed.web.dev/) | SEO 100, le reste ≥ 90 |
| Données structurées valides | [Test des résultats enrichis](https://search.google.com/test/rich-results) | « Restaurant » détecté, 0 erreur |
| Pages indexées | Google Search Console → Pages | Toutes les pages publiques indexées |
| Indexation Bing | Bing Webmaster Tools | Sitemap lu, pages indexées |
| Ce que voit un robot | `curl -A "Googlebot" https://domaine/` | Nom, plats, horaires visibles en texte |
| Aperçu de partage | [opengraph.xyz](https://www.opengraph.xyz/) | Belle carte avec photo et titre |

Phrase à dire au client : « Votre site est lisible par Google et Bing sans artifice : voici son score (100/100 en SEO), voici la preuve que Google comprend que c'est un restaurant, avec sa carte et ses horaires. »

## 11. Fiche à copier pour chaque nouveau site

```
Site : ……………………   Domaine : ……………………   Date : ……
[ ] 0. Contenu lisible sans JS (curl OK)
[ ] 1. Domaine propre, HTTPS, canonical, robots.txt, sitemap, Search Console, Bing, IndexNow
[ ] 2. Title, description, Open Graph, viewport zoomable
[ ] 3. Un H1, structure H2/H3, carte en texte, mentions légales
[ ] 4. JSON-LD Restaurant + Menu validé
[ ] 5. Images : alt, WebP, tailles, lazy
[ ] 6. Favicons + manifest
[ ] 7. PageSpeed ≥ 90 / SEO 100
[ ] 8. Une URL par langue + hreflang
[ ] 9. Google Business, Apple, Bing Places, TripAdvisor, TheFork cohérents
[ ] 10. Rapport avant / après archivé
```
