INSERT OR REPLACE INTO document_templates (id, document_type, name, version, variant, schema_json, is_active, updated_at)
VALUES
(
  'ps_detail_v1',
  'point_situation',
  'Point de situation detail',
  1,
  'detail',
  '{"layout":{"page":"A4","orientation":"portrait","sections":[{"type":"text","title":"Situation generale","field":"situation"},{"type":"bilan","title":"Bilan","field":"bilan"},{"type":"text","title":"Moyens engages","field":"means"},{"type":"text","title":"Mesures prises","field":"measures"},{"type":"text","title":"Points d attention","field":"attention"},{"type":"text","title":"Communication","field":"communication"},{"type":"image","title":"Visuel associe","field":"image","optional":true},{"type":"text","title":"Sources","field":"sources","optional":true}]}}',
  1,
  CURRENT_TIMESTAMP
),
(
  'ps_focus_v1',
  'point_situation',
  'Point de situation focus',
  1,
  'focus',
  '{"layout":{"page":"A4","orientation":"landscape","sections":[{"type":"text","title":"Situation generale","field":"situation","forcedHeight":26},{"type":"bilan","title":"Bilan","field":"bilan"},{"type":"text","title":"Moyens","field":"means","forcedHeight":22},{"type":"text","title":"Points d attention","field":"attention","forcedHeight":22},{"type":"image","title":"Cartographie","field":"image","forcedHeight":48},{"type":"text","title":"Mesures prises","field":"measures","forcedHeight":22},{"type":"text","title":"Communication","field":"sources","forcedHeight":24}]}}',
  1,
  CURRENT_TIMESTAMP
),
(
  'command_message_v1',
  'command_message',
  'Message de commandement standard',
  1,
  'default',
  '{"layout":{"page":"A4","orientation":"portrait","sections":[{"type":"header","title":"Entete","field":"header"},{"type":"table","title":"Mesures","field":"measures"},{"type":"table","title":"Services","field":"services"}]}}',
  1,
  CURRENT_TIMESTAMP
);
