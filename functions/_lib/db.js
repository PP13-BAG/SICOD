const APP_STATE_KEY = 'app_state';
const DEFAULT_DOCUMENT_TEMPLATES = [
  {
    id: 'ps_detail_v1',
    document_type: 'point_situation',
    name: 'Point de situation detail',
    version: 1,
    variant: 'detail',
    schema_json: JSON.stringify({
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
    })
  },
  {
    id: 'ps_focus_v1',
    document_type: 'point_situation',
    name: 'Point de situation focus',
    version: 1,
    variant: 'focus',
    schema_json: JSON.stringify({
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
    })
  },
  {
    id: 'command_message_v1',
    document_type: 'command_message',
    name: 'Message de commandement standard',
    version: 1,
    variant: 'default',
    schema_json: JSON.stringify({
      layout: {
        page: 'A4',
        orientation: 'portrait',
        sections: [
          { type: 'header', title: 'Entete', field: 'header' },
          { type: 'table', title: 'Mesures', field: 'measures' },
          { type: 'table', title: 'Services', field: 'services' }
        ]
      }
    })
  }
];

async function ensureDefaultDocumentTemplates(env) {
  const countRow = await env.DB.prepare(
    'SELECT COUNT(*) AS count FROM document_templates'
  ).first();
  const count = Number(countRow?.count || 0);
  if (count > 0) return;

  const statement = env.DB.prepare(`
    INSERT OR REPLACE INTO document_templates
      (id, document_type, name, version, variant, schema_json, is_active, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, CURRENT_TIMESTAMP)
  `);

  for (const template of DEFAULT_DOCUMENT_TEMPLATES) {
    await statement.bind(
      template.id,
      template.document_type,
      template.name,
      template.version,
      template.variant,
      template.schema_json
    ).run();
  }
}

export async function getAppState(env) {
  try {
    const row = await env.DB.prepare(
      'SELECT value_json FROM app_settings WHERE key = ?1 LIMIT 1'
    ).bind(APP_STATE_KEY).first();
    if (!row?.value_json) return null;
    try {
      return JSON.parse(row.value_json);
    } catch {
      return null;
    }
  } catch (error) {
    console.warn('[D1] Lecture app_state impossible:', error?.message || error);
    return null;
  }
}

export async function putAppState(env, state) {
  const payload = JSON.stringify(state || {});
  try {
    await env.DB.prepare(`
      INSERT INTO app_settings (key, value_json, updated_at)
      VALUES (?1, ?2, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value_json = excluded.value_json,
        updated_at = CURRENT_TIMESTAMP
    `).bind(APP_STATE_KEY, payload).run();
  } catch (error) {
    console.warn('[D1] Ecriture app_state impossible:', error?.message || error);
    throw error;
  }
  return state;
}

export async function getDocumentTemplates(env, type = '') {
  try {
    await ensureDefaultDocumentTemplates(env);
    const query = type
      ? 'SELECT id, document_type, name, version, variant, schema_json, is_active FROM document_templates WHERE document_type = ?1 AND is_active = 1 ORDER BY document_type, variant, version'
      : 'SELECT id, document_type, name, version, variant, schema_json, is_active FROM document_templates WHERE is_active = 1 ORDER BY document_type, variant, version';
    const statement = env.DB.prepare(query);
    const result = type ? await statement.bind(type).all() : await statement.all();
    return (result.results || []).map((row) => {
      let schema = {};
      try {
        schema = JSON.parse(row.schema_json || '{}');
      } catch {
        schema = {};
      }
      return {
        id: row.id,
        documentType: row.document_type,
        name: row.name,
        version: row.version,
        variant: row.variant,
        isActive: !!row.is_active,
        layout: schema.layout || {}
      };
    });
  } catch (error) {
    console.warn('[D1] Lecture document_templates impossible:', error?.message || error);
    return [];
  }
}
