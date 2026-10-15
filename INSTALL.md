# Étape 1 — Serveur et comptes (gratuit)

## 1. Supabase (base de données)
1. supabase.com > New project (région Europe).
2. SQL Editor > New query > colle tout `supabase.sql` > Run.
3. Project Settings > API : copie **Project URL** et la clé **service_role** (secrète : jamais dans GitHub, jamais dans index.html).

## 2. GitHub
Remplace `index.html` dans ton dépôt, ajoute le dossier `api/` avec `auth.js` et `_lib.js`.

## 3. Vercel > ton projet > Settings > Environment Variables
| Nom | Valeur |
|---|---|
| SUPABASE_URL | l'URL du projet Supabase |
| SUPABASE_SERVICE_KEY | la clé service_role |
| TOKEN_SECRET | une longue suite de caractères au hasard (40+) |
| ADMIN_PASSWORD | le mot de passe de Noln_mry (6 caractères min, mieux vaut plus long) |

Puis Deployments > Redeploy.

## 4. Créer le compte Noln_mry
Sur le site : « Créer un compte », pseudo `Noln_mry`, mot de passe = la valeur de ADMIN_PASSWORD. Fais-le tout de suite après le déploiement.
Sans ce mot de passe, personne d'autre ne peut prendre ce pseudo ni devenir administrateur.
