# Migration Cloudflare pas a pas

Ce guide prepare le projet pour :

- frontend statique sur Cloudflare Pages
- endpoints `/api/*` sur Cloudflare Pages Functions
- stockage applicatif dans Cloudflare D1
- medias futurs dans Cloudflare R2 si tu l actives plus tard

## 1. Ce qui est deja pret dans le repo

- `frontend/` : application statique deployee par Pages
- `functions/api/*` : endpoints Cloudflare compatibles avec le frontend actuel
- `wrangler.jsonc` : configuration Pages + D1, avec R2 optionnel
- `cloudflare/migrations/0001_initial.sql` : schema D1
- `cloudflare/migrations/0002_seed_document_templates.sql` : seed des modeles PDF
- `frontend/assets/js/api.js` : cache local + synchronisation distante vers `/api/state`

## 2. Prerequis

1. Avoir un compte Cloudflare.
2. Installer Node.js 20+ sur le poste de deploiement.
3. Se placer a la racine du projet.
4. Installer les dependances :

```bash
npm install
```

5. Se connecter a Cloudflare :

```bash
npx wrangler login
```

## 3. Creer les ressources Cloudflare

### 3.1. Creer la base D1 de production

```bash
npx wrangler d1 create sicod-prod
```

Recopie ensuite :

- `database_name`
- `database_id`

dans `wrangler.jsonc` a la place de `__A_REMPLIR__`.

Important :

- le projet utilise uniquement le binding D1 `DB`
- si Wrangler ajoute automatiquement d autres bindings comme `sicod_prod` ou `sicod_preview`, supprime les ensuite de `wrangler.jsonc`
- conserve une seule entree dans `d1_databases`, avec `binding: "DB"`

### 3.2. Creer la base D1 de previsualisation

```bash
npx wrangler d1 create sicod-preview
```

Recopie l identifiant obtenu dans `preview_database_id` dans `wrangler.jsonc`.

Le champ `preview_database_id` doit contenir l identifiant UUID de la base de preview, pas son nom.

### 3.3. Creer le bucket R2

Etape optionnelle.

```bash
npx wrangler r2 bucket create sicod-media
npx wrangler r2 bucket create sicod-media-preview
```

Si tu veux changer les noms, modifie aussi `wrangler.jsonc`.

Si tu obtiens l erreur Cloudflare `10042` avec le message `Please enable R2 through the Cloudflare Dashboard`, ce n est pas un probleme du projet :

1. ouvre le dashboard Cloudflare
2. active R2 sur le compte
3. relance les deux commandes de creation de bucket

Tu peux aussi poursuivre la migration sans R2 dans un premier temps :

- laisse D1 et Pages en place
- retire temporairement le bloc `r2_buckets` de `wrangler.jsonc` si Wrangler refuse de demarrer
- remets le bloc plus tard une fois R2 active

Dans l etat actuel du projet, R2 prepare le futur stockage des medias mais n est pas indispensable pour faire fonctionner l application sur Cloudflare.

Si tu ne peux pas activer R2, garde simplement :

- les logos, bannieres, icones et fichiers statiques dans `frontend/assets/`
- les modeles et donnees dans D1
- les futures pieces jointes hors Cloudflare pour l instant, ou desactive cette fonctionnalite tant qu elle n est pas necessaire

Pour un premier deploiement Cloudflare gratuit, D1 + Pages Functions + assets statiques dans `frontend/` suffisent.

## 4. Appliquer le schema D1

### 4.1. En local

```bash
npm run cf:d1:migrate:local
```

### 4.2. En distant

```bash
npm run cf:d1:migrate
```

Important :

- avec les versions recentes de Wrangler, les commandes D1 partent en local par defaut si tu ne forces pas `--remote`
- pour la base Cloudflare distante, il faut donc utiliser `--remote`
- le script `npm run cf:d1:migrate` du projet le fait maintenant automatiquement

Cette etape cree :

- `app_settings`
- `document_templates`
- les tables metier cibles

### 4.3. Verifier que les migrations sont bien passees en production

```bash
npx wrangler d1 execute sicod-prod --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name" --config wrangler.jsonc
```

Tu dois notamment voir :

- `app_settings`
- `document_templates`
- `d1_migrations`

## 5. Verifier localement en mode Pages Functions

Lance l application dans le runtime Cloudflare :

```bash
npm run cf:dev
```

Note :

- `wrangler pages dev` lit automatiquement `wrangler.jsonc` a la racine du projet
- n ajoute pas `--config wrangler.jsonc` a cette commande, Pages ne supporte pas ce parametre en mode `dev`

Puis ouvre l URL donnee par Wrangler.

A verifier :

- la page charge bien
- `/api/health` repond
- `/api/system/blueprint` repond
- `/api/document-templates` repond
- `/api/state` repond
- le bandeau de stockage indique `Cloudflare D1 + cache local` apres hydratation

## 6. Deployer sur Cloudflare Pages

Tu as deux chemins.

### Option A. Deploiement le plus simple : Git + Pages

1. Pousser le repo sur GitHub ou GitLab.
2. Dans Cloudflare Dashboard :
   - `Workers & Pages`
   - `Create application`
   - `Pages`
   - `Connect to Git`
3. Selectionner le repo.
4. Parametrer :
   - Framework preset : `None`
   - Build command : laisser vide
   - Build output directory : `frontend`
5. Verifier que `wrangler.jsonc` est bien pris en compte.
6. Ajouter les bindings D1/R2 si le dashboard te les demande explicitement.
7. Lancer le premier deploiement.

### Option B. Deploiement en CLI

```bash
npm run cf:deploy
```

Si Pages n existe pas encore, Wrangler peut le creer automatiquement. Le nom attendu dans ce projet est `sicod-pages`.

Pour la protection du site ensuite, voir aussi :

- `docs/cloudflare-access.md`
- `docs/cloudflare-basic-auth.md`

## 7. Basculer les donnees depuis le navigateur

Le projet actuel reste partiellement centre sur le cache navigateur.

La migration la plus simple est :

1. Ouvrir l application locale actuelle.
2. Verifier que toutes les donnees attendues sont bien presentes.
3. Recuperer la valeur `localStorage` de la cle `sicodStateV13` depuis le navigateur local.
4. Ouvrir ensuite la version Cloudflare.
5. Injecter cet etat dans D1 via l endpoint `/api/state`.

Important :

- `localhost` et `https://sicod-pages.pages.dev` n ont pas le meme `localStorage`
- le site deployee ne peut donc pas relire automatiquement les donnees stockees dans ton navigateur local
- la premiere bascule des donnees doit etre faite une fois, manuellement, ou via un outil d import dedie

### 7.1. Copier l etat local actuel

Dans l application locale, ouvre les outils developpeur du navigateur puis execute :

```js
copy(localStorage.getItem('sicodStateV13'));
```

### 7.2. Injecter cet etat dans la version Cloudflare

Sur `https://sicod-pages.pages.dev`, ouvre ensuite les outils developpeur et execute :

```js
const raw = prompt('Collez ici le contenu de sicodStateV13');
await fetch('/api/state', {
  method: 'PUT',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ state: JSON.parse(raw) })
}).then((r) => r.json());
location.reload();
```

### 7.3. Verifier le resultat

Apres rechargement :

- `/api/state` doit retourner un objet dans `state`
- le bandeau doit afficher `Cloudflare D1 + cache local`
- l interface doit retrouver tes donnees

Depuis l application, la page `Parametres` permet aussi maintenant :

- d exporter l etat courant en JSON
- de pousser l etat courant vers Cloudflare D1
- de recharger l etat depuis Cloudflare
- de verifier rapidement l etat de D1 et des modeles PDF
4. Laisser l application enregistrer un premier etat dans D1 via `/api/state`.

Si tu veux une migration plus stricte et industrialisee, il faudra ajouter un export/import structure des donnees metier. Ce n est pas encore automatise dans cette version.

## 8. Ce qui fonctionne apres migration

- frontend servi par Pages
- endpoints systeme et templates sur Pages Functions
- etat applicatif stocke en cache local puis synchronise dans D1
- modeles PDF disponibles depuis D1
- base prete pour remplacer progressivement les blocs `payload_json` par des lectures/ecritures metier plus fines

## 9. Ce qu il faudra faire ensuite pour une migration totalement aboutie

La presente preparation est deployee et exploitable, mais il reste une phase 2 recommandee :

1. sortir du stockage d etat global unique `app_state`
2. brancher de vrais endpoints metier :
   - `/api/events`
   - `/api/points-situation`
   - `/api/command-messages`
   - `/api/contacts`
   - `/api/planning`
   - `/api/duty`
3. gerer les pieces jointes dans R2
4. proteger l acces via Cloudflare Access
5. ajouter une migration export/import des donnees locales existantes

## 10. Checklist de bascule

- `wrangler.jsonc` complete avec les vrais IDs
- D1 production creee
- D1 preview creee
- migrations appliquees
- R2 cree
- `npm run cf:dev` OK
- `npm run cf:deploy` OK
- `/api/health` OK
- `/api/system/blueprint` OK
- `/api/document-templates` OK
- `/api/state` OK
- ouverture de l app en ligne OK
- premiere synchronisation D1 OK

## 11. Fichiers a connaitre

- `wrangler.jsonc`
- `functions/api/health.js`
- `functions/api/system/blueprint.js`
- `functions/api/document-templates.js`
- `functions/api/state.js`
- `functions/_lib/db.js`
- `cloudflare/migrations/0001_initial.sql`
- `cloudflare/migrations/0002_seed_document_templates.sql`
