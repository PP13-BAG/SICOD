import { getDocumentTemplates } from '../_lib/db.js';
import { json, options, withCors } from '../_lib/http.js';

export const onRequestOptions = () => options();

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type') || '';
  const items = await getDocumentTemplates(env, type);
  return withCors(json({ items }));
}
