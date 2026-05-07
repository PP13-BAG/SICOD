import { getAppState, putAppState } from '../_lib/db.js';
import { json, options, withCors } from '../_lib/http.js';

export const onRequestOptions = () => options();

export async function onRequestGet({ env }) {
  const state = await getAppState(env);
  return withCors(json({
    storageMode: 'cloudflare-d1',
    state: state || null
  }));
}

export async function onRequestPut({ env, request }) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || !body.state || typeof body.state !== 'object') {
    return withCors(json({ success: false, error: 'Payload invalide' }, { status: 400 }));
  }
  await putAppState(env, body.state);
  return withCors(json({ success: true }));
}
