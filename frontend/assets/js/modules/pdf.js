(function(global){
  'use strict';

  const REQUIRED_TEMPLATE_FIELDS = {
    point_situation: ['situation', 'bilan'],
    command_message: ['header']
  };

  function validateTemplateList(items) {
    if (!Array.isArray(items)) {
      return { ok: false, message: 'La matrice PDF doit être un tableau JSON.' };
    }
    for (const item of items) {
      if (!item || typeof item !== 'object') return { ok: false, message: 'Chaque modèle PDF doit être un objet.' };
      if (!item.id || !item.documentType) return { ok: false, message: 'Chaque modèle PDF doit contenir id et documentType.' };
      if (!item.layout || !Array.isArray(item.layout.sections)) {
        return { ok: false, message: `Le modèle ${item.id || '(sans id)'} doit contenir layout.sections.` };
      }
      const required = REQUIRED_TEMPLATE_FIELDS[item.documentType] || [];
      const fields = item.layout.sections.map(section => section?.field).filter(Boolean);
      const missing = required.filter(field => !fields.includes(field));
      if (missing.length) {
        return { ok: false, message: `Le modèle ${item.id} est incomplet : champ(s) manquant(s) ${missing.join(', ')}.` };
      }
    }
    return { ok: true, message: '' };
  }

  global.SICODPdf = {
    validateTemplateList
  };
})(window);
