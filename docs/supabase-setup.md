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
   - aucun secret manuel a saisir si `frontend/assets/config.js` est deja renseigne
   - verifier seulement que l URL Supabase publiee correspond bien au projet
4. enregistrer les autres parametres applicatifs si besoin

Ensuite :

1. se connecter avec un utilisateur Supabase
2. cliquer `Verifier la connexion`
3. cliquer `Pousser vers Supabase`

Le bandeau doit ensuite afficher :

- `Supabase sécurisé`

## 5. Import initial des donnees existantes

Si tu as deja un export JSON :

1. ouvrir `Parametres`
2. section `Stockage et synchronisation`
3. utiliser `Importer un export JSON dans Supabase`

Le JSON exporte sert de sauvegarde de secours ou de migration.

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
- le bandeau passe sur `Supabase sécurisé`
- les listes et exports restent fonctionnels

## 8. Depannage connexion

Si la connexion e-mail / mot de passe echoue :

1. verifier dans `Authentication` -> `Providers` que le provider `Email` est bien actif
2. verifier dans `Authentication` -> `Users` que l utilisateur existe bien
3. verifier que l utilisateur n est pas desactive
4. verifier que l e-mail est confirme :
   - soit `email_confirmed_at` est renseigne
   - soit l utilisateur a clique sur le mail de confirmation

Rappel Supabase :

- sur les projets heberges, la confirmation d e-mail est active par defaut
- un utilisateur non confirme ne peut pas se connecter par mot de passe

Si besoin, pour un usage interne simple :

- creer manuellement un utilisateur dans `Authentication` -> `Users`
- confirmer son e-mail
- puis se connecter depuis SICOD
