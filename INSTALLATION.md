# SICOD - Installation et exploitation

## Cible retenue

- frontend statique sur GitHub Pages
- donnees et synchronisation sur Supabase
- aucun backend applicatif obligatoire en production

## Fichiers utiles

- `frontend/index.html` : structure HTML de l application
- `frontend/assets/app.css` : styles globaux
- `frontend/assets/app.js` : logique metier principale
- `frontend/assets/js/api.js` : stockage local, auth Supabase et synchronisation
- `frontend/assets/js/modules/pdf-templates.js` : modeles PDF versionnes
- `supabase/schema.sql` : schema et securite RLS
- `supabase/document-templates.seed.sql` : modeles PDF par defaut
- `docs/supabase-setup.md` : procedure Supabase
- `docs/github-pages-supabase.md` : publication GitHub Pages

## Mise en service

1. publier le frontend sur GitHub Pages
2. executer `supabase/schema.sql`
3. executer `supabase/document-templates.seed.sql`
4. creer les utilisateurs dans `Supabase Auth`
5. configurer la section `Parametres -> Stockage et synchronisation`
6. se connecter
7. pousser l etat courant

## Protection des donnees

Le frontend peut etre public sur GitHub Pages.

Les donnees ne sont pas stockees sur GitHub si :

- tu ne commits pas d exports JSON dans le depot
- tu utilises Supabase comme stockage distant

Les donnees sont protegees si :

- `supabase/schema.sql` a bien ete reapplique
- les policies RLS actuelles sont en place
- seuls des utilisateurs `Supabase Auth` valides existent

## Modifier les modeles PDF

### Depuis l interface

1. ouvrir `Parametres`
2. aller dans `Exports PDF`
3. modifier le JSON des modeles
4. enregistrer

### Depuis les fichiers

- runtime frontend : `frontend/assets/js/modules/pdf-templates.js`
- seed Supabase : `supabase/document-templates.seed.sql`
- guide pratique : `docs/pdf-templates.md`

## Sauvegarde et restauration

Dans `Parametres -> Stockage et synchronisation` :

- `Exporter les donnees`
- `Importer un export JSON dans Supabase`
- `Restaurer un export JSON dans le navigateur`
