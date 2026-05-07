# Publication GitHub Pages + Supabase

Cette cible remplace avantageusement `pages.dev` si ce domaine est filtre sur le reseau professionnel.

## Principe

- le frontend statique SICOD est publie sur GitHub Pages
- les donnees et modeles PDF sont stockes dans Supabase
- l application reste utilisable aussi en local

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
- publie `frontend/`
- deploie le site sur GitHub Pages

## 4. Configuration Supabase

Une fois le site publie :

1. ouvrir l application GitHub Pages
2. aller dans `Parametres`
3. configurer la section `Stockage et synchronisation`
4. activer `Supabase`
5. tester la connexion
6. pousser l etat courant

## 5. Domaine

Si `github.io` est autorise sur le reseau, tu peux utiliser l URL GitHub Pages native.

Sinon, tu peux ajouter un domaine personnalise plus tard.
