# SICOD sur Supabase

Cette version du projet vise :

- frontend statique sur GitHub Pages ou autre hebergement statique
- donnees centralisees dans Supabase
- aucun backend applicatif obligatoire

## 1. Creer le projet Supabase

1. creer un projet Supabase
2. noter :
   - `Project URL`
   - `Publishable key` ou `anon key`

## 2. Initialiser la base

Dans l editeur SQL Supabase :

1. executer `supabase/schema.sql`
2. executer `supabase/document-templates.seed.sql`

## 3. Configurer SICOD

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

1. cliquer `Tester Supabase`
2. cliquer `Pousser l etat courant`

Le bandeau doit ensuite afficher :

- `Supabase + cache local`

## 4. Import initial des donnees existantes

Si tu as deja un export JSON :

1. ouvrir `Parametres`
2. section `Stockage et synchronisation`
3. utiliser `Importer un export JSON dans Supabase`

Sinon :

1. cliquer `Exporter les donnees`
2. conserver le fichier JSON comme sauvegarde
3. cliquer `Pousser l etat courant`

## 5. Securite minimale

Le schema fourni autorise l acces direct depuis le frontend avec la cle publique.

Avantage :

- mise en route immediate

Limite :

- securite applicative minimale

Pour un durcissement ulterieur, il faudra :

- ajouter Supabase Auth
- restreindre les policies RLS
- journaliser les acces

## 6. Verification rapide

Dans Supabase :

- table `app_settings` : une ligne `app_state`
- table `document_templates` : 3 modeles par defaut

Dans l application :

- le test Supabase est vert
- le bandeau passe sur `Supabase + cache local`
- les listes et exports restent fonctionnels
