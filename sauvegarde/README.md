# Sauvegarde de la base

Chaque nuit vers 3 h, GitHub copie toute la base Supabase (comptes,
structure, données) et dépose l'archive dans un bucket R2 **privé**, chez
Cloudflare. La copie est donc hors de Supabase : si le projet Supabase
disparaît, elle reste.

Le programme est dans `.github/workflows/sauvegarde-base.yml`. Tant que les
quatre accès ci-dessous ne sont pas renseignés, il ne fait rien et le
signale par un simple avertissement.

> Les accès ne se collent **jamais** dans une conversation, un fichier ou un
> message. Uniquement dans les cases prévues de Cloudflare, Supabase et GitHub.

---

## Mise en place (une seule fois, environ 10 minutes)

### 1. Le bucket des sauvegardes, chez Cloudflare

1. **R2 → Create bucket** → nom : `beltab-sauvegardes`.
2. **Ne rien rendre public** : pas de domaine, pas d'URL publique. Ce bucket
   contient les données des clients de tes clients.
3. Dans le bucket : **Settings → Object lifecycle rules → Add rule** →
   supprimer les objets après **30 jours**. C'est ce qui garde 30 nuits.

### 2. La clé d'accès R2

1. **R2 → Manage API tokens → Create API token**.
2. Permission : **Object Read & Write**, limitée au bucket
   `beltab-sauvegardes` uniquement.
3. Cloudflare affiche trois valeurs une seule fois : l'**Access Key ID**, le
   **Secret Access Key**, et l'**Account ID** (dans l'adresse du point
   d'accès, `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`). Garde l'onglet
   ouvert pour l'étape 4.

### 3. L'adresse de la base, chez Supabase

1. Dans le projet : bouton **Connect** en haut.
2. Prends la chaîne **Session pooler** — pas « Direct connection » : les
   machines de GitHub ne savent pas joindre l'adresse directe.
3. Remplace `[YOUR-PASSWORD]` par le mot de passe de la base. Oublié ?
   **Project Settings → Database → Reset database password**. Ça ne touche pas
   au site, qui utilise la clé publique et non ce mot de passe.

### 4. Ranger les accès dans GitHub

Repo `menu` → **Settings → Secrets and variables → Actions → New repository
secret**, quatre fois :

| Nom du secret          | Valeur                                  |
|------------------------|-----------------------------------------|
| `SUPABASE_DB_URL`      | la chaîne Session pooler de l'étape 3   |
| `R2_ACCOUNT_ID`        | l'Account ID de l'étape 2               |
| `R2_ACCESS_KEY_ID`     | l'Access Key ID de l'étape 2            |
| `R2_SECRET_ACCESS_KEY` | le Secret Access Key de l'étape 2       |

Un secret GitHub ne se relit plus une fois enregistré, même par toi, et
n'apparaît jamais dans les journaux.

### 5. Premier essai

**Actions → Sauvegarde de la base → Run workflow.** Au bout d'une minute ou
deux, la pastille doit être verte, et un fichier
`base/sauvegarde-AAAA-MM-JJ_HHMM.tar.gz` doit apparaître dans le bucket.

---

## Si une nuit échoue

GitHub envoie un email. Les causes habituelles : mot de passe de la base
changé (mettre à jour `SUPABASE_DB_URL`), clé R2 supprimée, projet Supabase
en pause.

**À savoir :** sur un repo public, GitHub désactive les tâches planifiées
après 60 jours sans aucun commit, et prévient par email. Un clic sur
« Enable workflow » dans l'onglet Actions les relance.

---

## Restaurer

On restaure **toujours d'abord dans un projet Supabase neuf**, jamais par
dessus la base en service : on vérifie, puis on bascule.

1. Télécharger l'archive voulue depuis le bucket, la décompresser : trois
   fichiers, `roles.sql`, `schema.sql`, `data.sql`.
2. Créer un nouveau projet Supabase, récupérer sa chaîne Session pooler.
3. Lancer, depuis un ordinateur où `psql` est installé :

   ```sh
   psql --single-transaction --variable ON_ERROR_STOP=1 \
     --file roles.sql \
     --file schema.sql \
     --command 'SET session_replication_role = replica' \
     --file data.sql \
     --dbname "<chaîne du nouveau projet>"
   ```

4. Vérifier les menus et les réservations dans le nouveau projet.
5. Pour basculer les sites dessus : remplacer `SUPABASE_URL` et
   `SUPABASE_ANON_KEY` dans les fichiers HTML (preview d'abord).

**Faire un essai de restauration une fois, au début.** Une sauvegarde jamais
restaurée, on ne sait pas si elle marche.
