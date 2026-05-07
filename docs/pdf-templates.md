# Modeles d'export PDF

Les exports PDF de l'application sont pilotes par des modeles JSON versionnes, separes de leur habillage visuel.

## Ou les modifier

- Dans l'application : `Parametres` -> `Exports PDF`
- En frontend : `frontend/assets/js/modules/pdf-templates.js`
- Dans Supabase : `supabase/document-templates.seed.sql`

## Deux niveaux de personnalisation

### 1. Modifier l'apparence sans toucher a la matrice

Dans `Parametres` -> `Exports PDF` -> `Apparence des PDF`, tu peux changer simplement :

- la couleur principale
- la couleur des cartouches
- la couleur du texte
- la couleur d'alerte
- la taille du logo

Ce mode est le plus sur quand tu veux adapter le rendu sans changer la structure du document.

### 2. Modifier la matrice du document

Dans `Parametres` -> `Exports PDF` -> `JSON des modeles`, tu modifies :

- l'ordre des sections
- les titres
- les champs utilises
- l'orientation de page
- la variante metier

## Structure minimale

```json
{
  "id": "ps_detail_v2",
  "documentType": "point_situation",
  "name": "Point de situation detail v2",
  "version": 2,
  "isActive": true,
  "variant": "detail",
  "layout": {
    "page": "A4",
    "orientation": "portrait",
    "sections": [
      { "type": "text", "title": "Situation generale", "field": "situation" },
      { "type": "bilan", "title": "Bilan", "field": "bilan" },
      { "type": "text", "title": "Moyens engages", "field": "means" }
    ]
  }
}
```

## Regles

- `id` : identifiant technique immuable
- `documentType` : `point_situation` ou `command_message`
- `variant` : variante metier comme `detail`, `focus`, `default`
- `version` : incrementer a chaque evolution significative
- `isActive` : `true` pour rendre le modele disponible
- `layout.sections` : ordre reel des blocs exportes

## Champs utiles

- `situation`
- `bilan`
- `means`
- `measures`
- `attention`
- `communication`
- `sources`
- `image`
- `header`
- `services`

## Modifier un modele existant proprement

1. Dupliquer un modele existant.
2. Changer `id`, `name`, `version` et eventuellement `variant`.
3. Ajuster `orientation` et `sections`.
4. Enregistrer dans `Parametres` -> `Exports PDF`.
5. Tester l'export correspondant.

## Recommandation

Pour eviter les regressions, creer une nouvelle version plutot que modifier un modele deja utilise en production.
