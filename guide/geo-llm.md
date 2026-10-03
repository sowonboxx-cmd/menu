# Optimisation GEO / LLM — être trouvé et cité par les IA

Checklist à appliquer à **chaque site client**, en complément de `seo.md`.
Objectif : quand quelqu'un demande à ChatGPT, Perplexity, Claude, Gemini ou Siri « un bon bar à huîtres à Lyon » ou « les horaires du Comptoir », l'IA trouve le site, comprend les informations et peut les reprendre correctement.

- Dernière mise à jour : 4 octobre 2026.
- GEO = *Generative Engine Optimization* (optimisation pour les moteurs génératifs).
- Document vivant : le domaine bouge vite, à relire tous les trois mois.

---

## Ce qu'on peut promettre, et ce qu'on ne peut pas

On peut garantir que le site est **lisible, autorisé, clair et cohérent** pour les IA. Personne ne peut garantir qu'une IA **recommandera** le restaurant : elle choisit selon ses sources, la question posée et les avis. Formulation honnête pour le client : « Votre site est prêt à être lu et repris par les IA, et on le vérifie. »

## 1. Comment une IA trouve un restaurant

1. **Recherche en direct** au moment de la question : ChatGPT, Perplexity, Claude et Gemini interrogent un index web (le leur, celui de Bing ou celui de Google) puis lisent les pages trouvées.
2. **Sources tierces** : fiche Google, Apple Plans, TripAdvisor, TheFork, articles de presse, guides, Reddit. Pour un restaurant, elles pèsent souvent plus que le site lui-même.
3. **Mémoire d'entraînement** : ce que le modèle a lu avant sa date de coupure. Lent et peu contrôlable.

Conséquence : le site doit être **lisible sans JavaScript** (les robots des IA ne l'exécutent généralement pas, voir `seo.md` section 0), **indexé dans Bing et Google**, et **cohérent avec les fiches tierces**.

## 2. Autoriser les robots des IA (robots.txt)

Chaque entreprise a des robots distincts : certains servent à **répondre aux questions** (à toujours autoriser), d'autres à **entraîner** les modèles (choix du client).

| Robot | Entreprise | Rôle |
|---|---|---|
| OAI-SearchBot | OpenAI | Index de ChatGPT Search |
| ChatGPT-User | OpenAI | Lit une page à la demande d'un utilisateur |
| GPTBot | OpenAI | Entraînement des modèles |
| Claude-SearchBot | Anthropic | Index de la recherche de Claude |
| Claude-User | Anthropic | Lit une page à la demande d'un utilisateur |
| ClaudeBot | Anthropic | Entraînement des modèles |
| PerplexityBot | Perplexity | Index des réponses Perplexity |
| Perplexity-User | Perplexity | Lit une page à la demande d'un utilisateur |
| Googlebot | Google | Recherche Google, y compris les aperçus IA |
| Google-Extended | Google | Autorise ou non l'usage pour Gemini (entraînement, ancrage) |
| Bingbot | Microsoft | Bing et Copilot ; l'index Bing alimente aussi d'autres IA |
| Applebot / Applebot-Extended | Apple | Siri, Spotlight / entraînement Apple |

**Modèle recommandé** (visibilité maximale, à placer à la racine de chaque domaine) :

```
User-agent: *
Allow: /
Disallow: /admin.html
Disallow: /qrc.html
Disallow: /qrf.html

Sitemap: https://DOMAINE/sitemap.xml
```

Si un client refuse l'entraînement, ajouter des blocs `Disallow: /` uniquement pour `GPTBot`, `ClaudeBot`, `Google-Extended`, `Applebot-Extended` — **jamais** pour les robots de recherche.

- [ ] Vérifier dans Cloudflare (domaine → *AI Crawl Control* / *Bots*) que le blocage automatique des robots IA est **désactivé**, sinon le robots.txt ne suffit pas : Cloudflare les bloque avant.
- [ ] Vérifier que le robots.txt servi contient bien nos règles (aujourd'hui, sur workers.dev, Cloudflare sert un robots.txt générique sans règle).

## 3. Rendre les informations faciles à reprendre

Les IA citent des phrases claires et factuelles. Sur la page d'accueil, en texte visible (et dans le HTML sans JavaScript) :

- [ ] Un paragraphe « Qui sommes-nous » de 2 ou 3 phrases : nom, type de cuisine, quartier et ville, spécialité, ambiance. Ex. : « Le Comptoir est un bar à huîtres du 2e arrondissement de Lyon, qui sert les huîtres de sa propre production en Bretagne. »
- [ ] Un bloc **Infos pratiques** : adresse complète, horaires par jour, téléphone, prix moyen, réservation (lien), terrasse, accessibilité PMR, options végétariennes / sans gluten, moyens de paiement, transports proches.
- [ ] Une petite **FAQ** (5 à 8 questions réelles) : « Faut-il réserver ? », « Y a-t-il une terrasse ? », « Les huîtres viennent d'où ? », « Ouvert le dimanche ? ». Format question / réponse courte, avec le balisage `FAQPage` en JSON-LD.
- [ ] La carte en texte avec prix (déjà prévue dans `seo.md`).
- [ ] Mêmes informations, mot pour mot, que sur la fiche Google (nom, adresse, téléphone, horaires).

## 4. Données structurées

Les mêmes que dans `seo.md` section 4 (`Restaurant`, `Menu`, `FAQPage`). Elles servent aux deux : Google les lit, et les IA y trouvent des faits sans ambiguïté.

## 5. Fichier llms.txt

Un fichier texte à la racine (`/llms.txt`) qui résume le site pour les IA : qui, quoi, où, et les liens importants.

**Ce qu'il faut savoir honnêtement** : c'est une proposition de standard, pas une obligation. Google a déclaré en 2026 qu'il n'en a pas besoin pour ses fonctions IA. Aucun grand assistant n'a confirmé l'utiliser pour classer les résultats, même si certains acteurs (Anthropic, OpenAI) en publient pour leur propre documentation. Il ne coûte presque rien et sert de **preuve visible** du travail fait : on le met, sans en faire un argument principal.

Modèle :

```
# Nom du restaurant

> Type de cuisine à Quartier, Ville. Une phrase sur la spécialité.

## Infos pratiques
- Adresse : …
- Horaires : lun–ven 12h–14h30 et 19h–22h30 ; sam 19h–23h ; fermé dimanche
- Téléphone : …
- Prix moyen : … € par personne
- Réservation : https://DOMAINE/resa

## Pages
- [La carte](https://DOMAINE/#carte) : plats et prix à jour
- [Réserver](https://DOMAINE/resa) : réservation en ligne
- [Instagram](https://instagram.com/…)
- [Fiche Google](https://maps.google.com/…)
```

- [ ] Généré automatiquement depuis `menu.json` (même Worker que le HTML), donc toujours à jour.

## 6. Être présent là où les IA cherchent

- [ ] Site validé dans **Bing Webmaster Tools** + IndexNow (Bing alimente Copilot et une partie des recherches d'autres IA).
- [ ] Google Search Console (Gemini et les aperçus IA de Google s'appuient sur l'index Google).
- [ ] **Apple Business Connect** (Siri, Apple Plans).
- [ ] Fiches cohérentes sur Google, TripAdvisor, TheFork, Yelp, Instagram, avec lien vers le site.
- [ ] Mentions dans des sources tierces quand c'est possible : presse locale, guides, blogs, listes « meilleurs restaurants de… ». C'est ce qui fait le plus pencher une IA vers une recommandation.

## 7. Vérifier et prouver

### Tests techniques (à chaque mise en ligne)

| Test | Comment | Résultat attendu |
|---|---|---|
| Lisible par un robot IA | `curl -A "OAI-SearchBot" https://DOMAINE/` | Nom, horaires, plats en texte |
| Robots autorisés | Ouvrir `https://DOMAINE/robots.txt` | Pas de blocage des robots de recherche |
| Résumé IA | Ouvrir `https://DOMAINE/llms.txt` | Fichier présent et à jour |
| Données structurées | [Test des résultats enrichis](https://search.google.com/test/rich-results) | Restaurant + FAQ détectés |
| Score indicatif | Un outil d'audit GEO, par ex. [score-geo.fr](https://score-geo.fr/en/), [GEO-Auditor](https://geo-auditor.septeo.com/) ou [citeme.io](https://www.citeme.io/fr/tools/ai-visibility-checker) | Score en hausse avant / après |

Les scores GEO des outils en ligne n'ont pas de norme commune : ils servent à montrer une progression, pas une note officielle. Toujours utiliser le même outil pour l'avant / après.

### Test réel dans les IA (tous les mois)

Poser les mêmes questions dans ChatGPT (recherche activée), Perplexity, Gemini et Claude, puis noter si le restaurant apparaît et si les infos sont justes :

1. « Où manger [type de cuisine] à [quartier / ville] ? »
2. « Quels sont les horaires de [nom du restaurant] ? »
3. « Est-ce que [nom du restaurant] prend les réservations en ligne ? »
4. « Quel est le prix moyen chez [nom du restaurant] ? »
5. « Qu'est-ce qu'il y a à la carte chez [nom du restaurant] ? »

Garder les captures datées dans le rapport du client.

### Phrase pour le client

« Votre site est ouvert aux IA (voici le fichier robots.txt et le fichier llms.txt), elles peuvent lire votre carte et vos horaires sans artifice (voici ce qu'elles voient), Google comprend que vous êtes un restaurant (voici le test), et voici ce que répondent ChatGPT et Perplexity aujourd'hui. On refait ce test chaque mois. »

## 8. Fiche à copier pour chaque nouveau site

```
Site : ……………………   Domaine : ……………………   Date : ……
[ ] Contenu lisible sans JS (curl avec un robot IA)
[ ] robots.txt : robots de recherche autorisés, choix entraînement noté : oui / non
[ ] Blocage IA Cloudflare désactivé
[ ] Paragraphe de présentation + Infos pratiques + FAQ en texte
[ ] JSON-LD Restaurant + Menu + FAQPage validé
[ ] llms.txt en ligne et généré depuis menu.json
[ ] Bing Webmaster + IndexNow, Search Console, Apple Business Connect
[ ] Fiches tierces cohérentes (Google, TripAdvisor, TheFork, Instagram)
[ ] Score GEO avant : ……   après : ……   (outil : ……)
[ ] Test des 5 questions dans ChatGPT, Perplexity, Gemini, Claude archivé
```
