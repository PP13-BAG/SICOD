# Protection gratuite sans Cloudflare Access

Si Cloudflare Access demande un moyen de paiement sur ton compte, la solution la plus simple pour proteger l application est :

- un middleware Pages Functions
- une authentification HTTP Basic
- des identifiants stockes en secrets Cloudflare

Cette solution est gratuite et fonctionne avec Cloudflare Pages.

Sources officielles Cloudflare :

- middleware Pages Functions :
  https://developers.cloudflare.com/pages/functions/middleware/
- secrets Pages :
  https://developers.cloudflare.com/workers/wrangler/commands/pages/#secret-put

## Principe

Le projet contient maintenant :

- `functions/_middleware.js`

Ce middleware protege :

- le frontend
- les fichiers statiques
- les endpoints `/api/*`

Tant que les secrets ne sont pas definis, la protection reste inactive.

Des que les secrets sont poses dans le projet Pages, le navigateur demandera un identifiant et un mot de passe.

## 1. Definir les secrets Cloudflare

Depuis la racine du projet :

```bash
npx wrangler pages secret put BASIC_AUTH_USER --project-name sicod-pages
```

Entre ensuite le nom utilisateur voulu, par exemple :

```text
sicod
```

Puis :

```bash
npx wrangler pages secret put BASIC_AUTH_PASSWORD --project-name sicod-pages
```

Entre un mot de passe fort.

Optionnel :

```bash
npx wrangler pages secret put BASIC_AUTH_REALM --project-name sicod-pages
```

Exemple :

```text
SICOD Prefecture
```

## 2. Redeployer

```bash
npm run cf:deploy
```

## 3. Tester

Ouvre ensuite :

- `https://sicod-pages.pages.dev`

Le navigateur doit demander :

- un identifiant
- un mot de passe

## 4. Desactiver temporairement la protection

Deux options simples :

1. supprimer les secrets dans le dashboard Cloudflare
2. redefinir un couple utilisateur / mot de passe different

Commande utile pour lister les secrets :

```bash
npx wrangler pages secret list --project-name sicod-pages
```

## 5. Avantages

- gratuit
- tres simple
- protege aussi les endpoints API
- ne demande pas de carte bancaire

## 6. Limites

- experience moins elegante que Cloudflare Access
- pas de gestion fine par utilisateur
- pas de journalisation d identite metier
- partage d un mot de passe commun si tu restes sur un seul compte

## 7. Recommandation pratique

Pour un usage interne restreint, je te recommande :

- un utilisateur unique : `sicod`
- un mot de passe long et fort
- rotation reguliere du mot de passe

Si plus tard tu peux utiliser Access, il restera preferable pour :

- les comptes individuels
- les groupes
- la tracabilite
- les politiques de session
