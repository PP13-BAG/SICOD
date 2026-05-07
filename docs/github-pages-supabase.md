# Publication GitHub Pages + Supabase

Cette cible remplace avantageusement `pages.dev` si ce domaine est filtre sur le reseau professionnel.

## Principe

- le frontend statique SICOD est publie sur GitHub Pages
- les donnees et modeles PDF sont stockes dans Supabase
- l application reste utilisable aussi en local
- l acces aux donnees se fait apres authentification Supabase

## 1. Creer le depot GitHub

1. creer ou reutiliser un depot GitHub
2. pousser ce projet

## 2. Activer GitHub Pages

Le projet inclut un workflow GitHub Actions qui publie automatiquement le contenu du dossier `frontend/`.

Dans GitHub :

1. `Settings`
2. `Pages`
3. `Source` : `GitHub Actions`

## 3. Deploiement

A chaque push sur `main`, le workflow :

- recupere le repo
- publie le contenu de `frontend/`
- deploie le site sur GitHub Pages

## 4. Configuration Supabase

Une fois le site publie :

1. ouvrir l application GitHub Pages
2. se connecter avec un compte Supabase Auth
3. aller dans `Parametres`
4. configurer la section `Stockage et synchronisation`
5. activer `Supabase`
6. verifier la connexion
7. pousser l etat courant

## 5. Securite

Le site GitHub Pages peut etre public sans exposer les donnees applicatives, a condition que :

- `supabase/schema.sql` ait ete reapplique avec les policies actuelles
- les acces aux tables SICOD soient reserves au role `authenticated`
- les utilisateurs soient geres dans `Supabase Auth`
- aucune `secret key` Supabase ne soit injectee dans le frontend

Ce qui reste public :

- le code HTML/CSS/JS
- les logos, icones, banniere et assets statiques

Ce qui ne doit pas etre public :

- `public.app_settings.value_json`
- `public.document_templates`
- tout futur stockage metier dans Supabase

## 6. Domaine

Si `github.io` est autorise sur le reseau, tu peux utiliser l URL GitHub Pages native.

Sinon, tu peux ajouter un domaine personnalise plus tard.
