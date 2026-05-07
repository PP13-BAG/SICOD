# SICOD sur Supabase

Cette cible repose sur :

- frontend statique publie sur GitHub Pages ou un hebergement statique equivalent
- donnees centralisees dans Supabase
- authentification par `Supabase Auth`
- protection des tables par `Row Level Security`

## 1. Creer le projet Supabase

1. creer un projet Supabase
2. noter :
   - `Project URL`
   - `Publishable key`

Ne jamais utiliser la `secret key` dans le frontend.

## 2. Initialiser ou mettre a jour la base

Dans l editeur SQL Supabase :

1. executer `supabase/schema.sql`
2. executer `supabase/document-templates.seed.sql`

Important :

- reexecuter `supabase/schema.sql` apres chaque mise a jour de la securite
- le schema actuel reserve l acces aux tables SICOD aux seuls utilisateurs `authenticated`

## 3. Creer les utilisateurs

Dans `Supabase Dashboard` :

1. ouvrir `Authentication`
2. creer un ou plusieurs utilisateurs e-mail / mot de passe

Deux modes possibles :

- gestion des utilisateurs : un compte par personne
- mot de passe unique : un seul compte partage

Le second mode fonctionne, mais il est moins propre en traçabilite.

## 4. Configurer SICOD

Dans l application :

1. ouvrir `Parametres`
2. section `Stockage et synchronisation`
3. renseigner :
   - `Fournisseur distant` : `Supabase`
   - `Activation` : `Activer la synchronisation distante`
   - `URL Supabase`
   - `Project ref`
   - `Cle publique Supabase`
4. enregistrer les parametres

Ensuite :

1. se connecter avec un utilisateur Supabase
2. cliquer `Verifier la connexion`
3. cliquer `Pousser vers Supabase`

Le bandeau doit ensuite afficher :

- `Supabase + cache local`

## 5. Import initial des donnees existantes

Si tu as deja un export JSON :

1. ouvrir `Parametres`
2. section `Stockage et synchronisation`
3. utiliser `Importer un export JSON dans Supabase`

Pour une restauration locale de secours :

1. utiliser `Restaurer un export JSON dans le navigateur`

## 6. Ce qui est public et ce qui ne l est pas

Public :

- le code source du frontend si le depot GitHub est public
- les fichiers statiques publies par GitHub Pages

Non public apres durcissement :

- les donnees stockees dans Supabase
- les modeles stockes dans `public.document_templates`

Condition importante :

- il faut bien avoir reapplique le `supabase/schema.sql` mis a jour
- et n utiliser que des utilisateurs Supabase Auth valides

## 7. Verification rapide

Dans Supabase :

- table `app_settings` : une ligne `app_state`
- table `document_templates` : 3 modeles par defaut

Dans l application :

- la connexion Supabase est verte
- le bandeau passe sur `Supabase + cache local`
- les listes et exports restent fonctionnels
