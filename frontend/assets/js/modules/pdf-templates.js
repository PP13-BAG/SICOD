(function(global){
  'use strict';

  const DEFAULT_TEMPLATES = [
    {
      id: 'ps_detail_v1',
      documentType: 'point_situation',
      name: 'Point de situation detail',
      version: 1,
      isActive: true,
      variant: 'detail',
      layout: {
        page: 'A4',
        orientation: 'portrait',
        sections: [
          { type: 'text', title: 'Situation generale', field: 'situation' },
          { type: 'bilan', title: 'Bilan', field: 'bilan' },
          { type: 'text', title: 'Moyens engages', field: 'means' },
          { type: 'text', title: 'Mesures prises', field: 'measures' },
          { type: 'text', title: 'Points d attention', field: 'attention' },
          { type: 'text', title: 'Communication', field: 'communication' },
          { type: 'image', title: 'Visuel associe', field: 'image', optional: true },
          { type: 'text', title: 'Sources', field: 'sources', optional: true }
        ]
      }
    },
    {
      id: 'ps_focus_v1',
      documentType: 'point_situation',
      name: 'Point de situation focus',
      version: 1,
      isActive: true,
      variant: 'focus',
      layout: {
        page: 'A4',
        orientation: 'landscape',
        sections: [
          { type: 'text', title: 'Situation generale', field: 'situation', forcedHeight: 26 },
          { type: 'bilan', title: 'Bilan', field: 'bilan' },
          { type: 'text', title: 'Moyens', field: 'means', forcedHeight: 22 },
          { type: 'text', title: 'Points d attention', field: 'attention', forcedHeight: 22 },
          { type: 'image', title: 'Cartographie', field: 'image', forcedHeight: 48 },
          { type: 'text', title: 'Mesures prises', field: 'measures', forcedHeight: 22 },
          { type: 'text', title: 'Communication', field: 'sources', forcedHeight: 24 }
        ]
      }
    },
    {
      id: 'command_message_v1',
      documentType: 'command_message',
      name: 'Message de commandement standard',
      version: 1,
      isActive: true,
      variant: 'default',
      layout: {
        page: 'A4',
        orientation: 'portrait',
        sections: [
          { type: 'header', title: 'Entete', field: 'header' },
          { type: 'table', title: 'Mesures', field: 'measures' },
          { type: 'table', title: 'Services', field: 'services' }
        ]
      }
    }
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function ensureState(state) {
    state.settings = state.settings || {};
    if (!Array.isArray(state.settings.documentTemplates) || !state.settings.documentTemplates.length) {
      state.settings.documentTemplates = clone(DEFAULT_TEMPLATES);
      return;
    }
    DEFAULT_TEMPLATES.forEach(template => {
      const exists = state.settings.documentTemplates.some(item => item.id === template.id);
      if (!exists) state.settings.documentTemplates.push(clone(template));
    });
  }

  function getTemplate(state, documentType, variant) {
    ensureState(state);
    const templates = state.settings.documentTemplates || [];
    return templates.find(item => item.documentType === documentType && item.variant === variant && item.isActive !== false)
      || templates.find(item => item.documentType === documentType && item.isActive !== false)
      || null;
  }

  function listTemplates(state, documentType) {
    ensureState(state);
    const templates = state.settings.documentTemplates || [];
    return documentType
      ? templates.filter(item => item.documentType === documentType)
      : templates.slice();
  }

  function sanitizeTemplates(rawTemplates) {
    const source = Array.isArray(rawTemplates) ? rawTemplates : DEFAULT_TEMPLATES;
    return source
      .filter(item => item && typeof item === 'object')
      .map((item, index) => ({
        id: String(item.id || `template_${index + 1}`),
        documentType: String(item.documentType || 'point_situation'),
        name: String(item.name || item.id || `Modele ${index + 1}`),
        version: Number(item.version || 1),
        isActive: item.isActive !== false,
        variant: String(item.variant || 'default'),
        layout: {
          page: item.layout?.page || 'A4',
          orientation: item.layout?.orientation || 'portrait',
          sections: Array.isArray(item.layout?.sections) ? item.layout.sections.map(section => ({ ...section })) : []
        }
      }))
      .filter(item => item.layout.sections.length);
  }

  function setTemplates(state, rawTemplates) {
    ensureState(state);
    const sanitized = sanitizeTemplates(rawTemplates);
    state.settings.documentTemplates = sanitized.length ? sanitized : clone(DEFAULT_TEMPLATES);
    return state.settings.documentTemplates;
  }

  global.SICODPdfTemplates = {
    DEFAULT_TEMPLATES,
    ensureState,
    getTemplate,
    listTemplates,
    sanitizeTemplates,
    setTemplates
  };
})(window);
