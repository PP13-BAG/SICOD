(function(global){
  'use strict';

  const TEMPLATE_FIELD_GUIDE = [
    { field: 'situation', label: 'Situation générale', use: 'Bloc narratif principal du point de situation.' },
    { field: 'bilan', label: 'Bilan', use: 'Tableau ou bloc de synthèse victimes / impacts.' },
    { field: 'means', label: 'Moyens engagés', use: 'Moyens humains, matériels, colonnes, renforts.' },
    { field: 'measures', label: 'Mesures prises', use: 'Décisions et actions engagées.' },
    { field: 'attention', label: 'Points d attention', use: 'Risques résiduels, tensions, échéances.' },
    { field: 'communication', label: 'Communication', use: 'Communication institutionnelle et messages clés.' },
    { field: 'sources', label: 'Sources', use: 'Services contributeurs ou sources consolidées.' },
    { field: 'image', label: 'Visuel / cartographie', use: 'Image ou carte associée au document.' },
    { field: 'header', label: 'Entête', use: 'Bloc d entête du message de commandement.' },
    { field: 'services', label: 'Services', use: 'Tableau des services / entités engagés.' }
  ];

  global.SICODSettings = {
    getTemplateFieldGuide() {
      return TEMPLATE_FIELD_GUIDE.slice();
    }
  };
})(window);
