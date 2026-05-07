# Protection Cloudflare Access

Cette procedure protege le site de production SICOD deployee sur Cloudflare Pages.

## Principe recommande

Pour la production :

- proteger un domaine personnalise, par exemple `sicod.mondomaine.fr`
- garder `*.pages.dev` uniquement pour le debug ou le rediriger vers le domaine principal

Pour les previews :

- utiliser la protection Access integree aux preview deployments dans Pages

Pourquoi :

- le mecanisme natif Pages pour les previews ne protege pas le domaine de production
- pour la production, la methode propre est une application Access `Self-hosted` sur le domaine public

Sources officielles Cloudflare :

- application self-hosted publique :
  https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/
- domaine personnalise Pages :
  https://developers.cloudflare.com/pages/configuration/custom-domains/
- protection des previews :
  https://developers.cloudflare.com/pages/configuration/preview-deployments/
- debug Pages et conflit possible avec Access pendant la validation :
  https://developers.cloudflare.com/pages/configuration/debugging-pages/
- redirection `pages.dev` vers domaine custom :
  https://developers.cloudflare.com/pages/how-to/redirect-to-custom-domain/

## 1. Ajouter un domaine personnalise au projet Pages

Exemple recommande :

- production : `sicod.mondomaine.fr`
- preview/staging : `staging-sicod.mondomaine.fr`

Etapes :

1. Cloudflare Dashboard
2. `Workers & Pages`
3. projet `sicod-pages`
4. `Custom domains`
5. `Set up a domain`
6. entrer le domaine choisi
7. attendre l etat `Active`

Important :

- n active pas Access avant que le domaine soit bien valide
- la doc Cloudflare indique que la validation du domaine peut echouer si Access bloque le trafic pendant cette phase

## 2. Configurer l identite dans Zero Trust

Dans Cloudflare Zero Trust :

1. `Settings`
2. `Authentication`
3. ajouter au moins un fournisseur d identite

Le plus simple pour commencer :

- `One-time PIN` si tu veux un acces rapide par email

Le plus propre en exploitation :

- Microsoft Entra ID / Azure AD
- Google Workspace
- Okta

## 3. Creer l application Access de production

Dans Cloudflare Zero Trust :

1. `Access controls`
2. `Applications`
3. `Add an application`
4. choisir `Self-hosted`

Renseigner ensuite :

- `Application name` : `SICOD Production`
- `Session duration` : par exemple `24h` ou `168h`
- `Domain` : `sicod.mondomaine.fr`

Puis creer au moins une politique `Allow`.

Exemple simple :

- `Emails` : tes adresses autorisees

Exemple plus propre :

- `Emails ending in` : ton domaine d administration
- ou groupe issu de ton fournisseur d identite

## 4. Regler les politiques recommandees

Pour un outil operationnel, je recommande :

- une politique `Allow` pour les utilisateurs autorises
- une session pas trop courte pour eviter les reauthentifications en crise
- eventuellement une seconde politique plus stricte pour l administration

Exemple de reglage raisonnable :

- utilisateurs COD : `Allow`
- domaine email professionnel uniquement
- `Session duration` : `24h`

Si tu veux encore plus de securite :

- exiger un IdP d entreprise
- limiter a des groupes
- ajouter des controles d appareil plus tard

## 5. Proteger les previews

Pour les previews Pages, Cloudflare propose un mecanisme specifique.

Etapes :

1. `Workers & Pages`
2. projet `sicod-pages`
3. `Settings`
4. `General`
5. `Enable access policy`

Attention :

- cela protege uniquement les URLs de preview
- cela ne protege pas automatiquement le domaine de production ni le `sicod-pages.pages.dev`

## 6. Que faire du domaine `pages.dev`

Deux approches propres :

1. le garder pour le debug interne uniquement
2. le rediriger vers le domaine principal

En production, la meilleure pratique est :

- servir le site sur `sicod.mondomaine.fr`
- rediriger `sicod-pages.pages.dev` vers le domaine principal

## 7. Faut-il modifier le code de l application ?

Pas pour proteger l acces de base.

Cloudflare Access se place devant le site :

- le frontend
- les Pages Functions
- les endpoints `/api/*`

Tout sera protege par le meme hostname.

## 8. Quand modifier le code ?

Seulement si tu veux que l application connaisse l identite du visiteur.

Exemples :

- afficher le nom de l utilisateur connecte
- journaliser les actions par utilisateur
- differencier des droits d administration

Dans ce cas, tu pourras ajouter plus tard le plugin officiel Pages :

- `@cloudflare/pages-plugin-cloudflare-access`

Doc officielle :

- https://developers.cloudflare.com/pages/functions/plugins/cloudflare-access/

## 9. Checklist finale recommande

1. domaine custom Pages actif
2. Access self-hosted cree sur ce domaine
3. politique `Allow` testee
4. preview access active si besoin
5. redirection de `pages.dev` vers le domaine principal ou restriction d usage interne
6. verification que `/api/health` et l interface complete sont bien accessibles apres connexion
