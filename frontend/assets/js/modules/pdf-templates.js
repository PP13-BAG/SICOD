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

  const DEFAULT_HTML_TEMPLATES = [
    {
      id: 'command_message',
      label: 'Message de commandement',
      fileName: 'message-commandement.html',
      html: buildHtmlTemplate('Message de commandement', [
        '{{header}}',
        '{{measures}}',
        '{{services}}',
        '{{signature}}'
      ])
    },
    {
      id: 'point_situation_detail',
      label: 'Point de situation - detail',
      fileName: 'point-situation-detail.html',
      html: buildHtmlTemplate('Point de situation - detail', [
        '{{cartouche}}',
        '{{situation}}',
        '{{bilan}}',
        '{{means}}',
        '{{measures}}',
        '{{attention}}',
        '{{communication}}',
        '{{image}}',
        '{{sources}}',
        '{{signature}}'
      ])
    },
    {
      id: 'point_situation_focus',
      label: 'Point de situation - focus',
      fileName: 'point-situation-focus.html',
      html: buildHtmlTemplate('Point de situation - focus', [
        '{{cartouche}}',
        '{{situation}}',
        '{{bilan}}',
        '{{means}}',
        '{{attention}}',
        '{{image}}',
        '{{measures}}',
        '{{communication}}',
        '{{signature}}'
      ])
    },
    {
      id: 'main_courante',
      label: 'Main courante',
      fileName: 'main-courante.html',
      html: buildHtmlTemplate('Main courante', ['{{header}}', '{{entries}}'])
    },
    {
      id: 'duty_statistics',
      label: 'Statistiques astreinte',
      fileName: 'statistiques-astreinte.html',
      html: buildHtmlTemplate('Statistiques astreinte', ['{{summary}}', '{{charts}}'])
    },
    {
      id: 'duty_schedule',
      label: 'Tableau astreinte',
      fileName: 'tableau-astreinte.html',
      html: buildHtmlTemplate('Tableau astreinte', ['{{period}}', '{{table}}', '{{signature}}'])
    },
    {
      id: 'planning_follow_up',
      label: 'Suivi de la planification',
      fileName: 'suivi-planification.html',
      html: buildHtmlTemplate('Tableau de suivi de la planification ORSEC', ['{{summary}}', '{{table}}'])
    },
    {
      id: 'planning_statistics',
      label: 'Statistiques planification',
      fileName: 'statistiques-planification.html',
      html: buildHtmlTemplate('Statistiques planification', ['{{summary}}', '{{charts}}'])
    },
    {
      id: 'directory',
      label: 'Annuaire ORSEC',
      fileName: 'annuaire-orsec.html',
      html: buildHtmlTemplate('Annuaire ORSEC', ['{{header}}', '{{directory}}'])
    },
    {
      id: 'reflex_sheet',
      label: 'Fiches reflexes',
      fileName: 'fiches-reflexes.html',
      html: buildHtmlTemplate('Fiche reflexe', ['{{header}}', '{{sections}}'])
    }
  ];

  function buildHtmlTemplate(title, blocks) {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body{font-family:Marianne,Segoe UI,Arial,sans-serif;margin:0;background:#ffffff;color:#161616}
    main{max-width:210mm;margin:0 auto;padding:12mm}
    header{border-bottom:2px solid #000091;padding-bottom:6mm;margin-bottom:6mm}
    h1{margin:0;font-size:22px;color:#000091}
    .block{margin:0 0 6mm}
    .block-title{margin:0 0 2mm;font-size:14px;font-weight:700;color:#000091}
    .block-body{min-height:14mm;padding:4mm;border:1px solid #d6d6d6;background:#f5f5fe}
  </style>
</head>
<body>
  <main>
    <header>
      <h1>${title}</h1>
    </header>
    ${blocks.map((block, index) => `<section class="block" data-block="${index + 1}">
      <div class="block-title">Bloc ${index + 1}</div>
      <div class="block-body">${block}</div>
    </section>`).join('\n    ')}
  </main>
</body>
</html>`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function ensureState(state) {
    state.settings = state.settings || {};
    if (!Array.isArray(state.settings.documentTemplates) || !state.settings.documentTemplates.length) {
      state.settings.documentTemplates = clone(DEFAULT_TEMPLATES);
    }
    if (!state.settings.htmlExportTemplates || typeof state.settings.htmlExportTemplates !== 'object') {
      state.settings.htmlExportTemplates = {};
    }
    DEFAULT_TEMPLATES.forEach(template => {
      const exists = state.settings.documentTemplates.some(item => item.id === template.id);
      if (!exists) state.settings.documentTemplates.push(clone(template));
    });
    DEFAULT_HTML_TEMPLATES.forEach(template => {
      if (!state.settings.htmlExportTemplates[template.id]) {
        state.settings.htmlExportTemplates[template.id] = template.html;
      }
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

  function listHtmlTemplates(state) {
    ensureState(state);
    return DEFAULT_HTML_TEMPLATES.map((template) => ({
      id: template.id,
      label: template.label,
      fileName: template.fileName,
      html: String(state.settings.htmlExportTemplates[template.id] || template.html || '')
    }));
  }

  function getHtmlTemplate(state, id) {
    ensureState(state);
    const entry = DEFAULT_HTML_TEMPLATES.find((item) => item.id === id) || DEFAULT_HTML_TEMPLATES[0];
    if (!entry) return null;
    return {
      id: entry.id,
      label: entry.label,
      fileName: entry.fileName,
      html: String(state.settings.htmlExportTemplates[entry.id] || entry.html || '')
    };
  }

  function setHtmlTemplate(state, id, html) {
    ensureState(state);
    const entry = DEFAULT_HTML_TEMPLATES.find((item) => item.id === id);
    if (!entry) return null;
    state.settings.htmlExportTemplates[entry.id] = String(html || entry.html || '');
    return getHtmlTemplate(state, entry.id);
  }

  function resetHtmlTemplate(state, id) {
    ensureState(state);
    const entry = DEFAULT_HTML_TEMPLATES.find((item) => item.id === id);
    if (!entry) return null;
    state.settings.htmlExportTemplates[entry.id] = entry.html;
    return getHtmlTemplate(state, entry.id);
  }

  global.SICODPdfTemplates = {
    DEFAULT_TEMPLATES,
    DEFAULT_HTML_TEMPLATES,
    ensureState,
    getTemplate,
    getHtmlTemplate,
    listTemplates,
    listHtmlTemplates,
    resetHtmlTemplate,
    sanitizeTemplates,
    setHtmlTemplate,
    setTemplates
  };
})(window);
