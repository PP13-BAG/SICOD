# SICOD - Installation et exploitation

## Démarrage local

```bash
npm install
npm start
```

Application disponible sur `http://localhost:3000`.

## Architecture actuelle

- `frontend/index.html` : structure HTML de l'application
- `frontend/assets/app.css` : design system et styles globaux
- `frontend/assets/app.js` : logique métier principale
- `frontend/assets/js/state.js` : normalisation des données de référence
- `frontend/assets/js/api.js` : adaptateur de stockage / API système
- `frontend/assets/js/modules/pdf-templates.js` : modèles PDF versionnés
- `backend/server.js` : serveur Express local
- `backend/routes/system.routes.js` : endpoints de blueprint et templates
- `backend/schema/d1-target.sql` : schéma cible pour Cloudflare D1

## Stockage actuel

- Frontend : `localStorage` pour l'état applicatif courant
- Backend local : `data/sicod.db` pour la base sql.js/SQLite

Les anciennes bases ou sauvegardes locales n'ont pas été supprimées automatiquement si elles pouvaient contenir des données métier.

## Modifier les modèles PDF

### Depuis l'interface

1. Ouvrir `Paramètres`
2. Aller dans `Exports PDF`
3. Modifier le JSON des modèles
4. Enregistrer

### Depuis les fichiers

- Runtime frontend : `frontend/assets/js/modules/pdf-templates.js`
- Seed backend : `backend/schema/document-templates.seed.json`
- Guide pratique : `docs/pdf-templates.md`

## Préparer la migration Cloudflare

La base du projet est déjà organisée pour une migration progressive :

- Frontend statique compatible Cloudflare Pages
- Endpoints système préparés pour Workers
- Schéma cible D1 disponible dans `backend/schema/d1-target.sql`
- Modèles PDF découplés de la logique de rendu
- Référentiels dynamiques basés sur des identifiants stables

## Recommandations d'exploitation

- Conserver `frontend/assets/` comme source unique des assets servis au navigateur
- Éviter de référencer des chemins locaux système dans les paramètres
- Versionner les modèles PDF en créant de nouveaux `id` / `version`
- Préférer l'archivage logique à la suppression des données métier
