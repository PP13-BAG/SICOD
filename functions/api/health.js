import { json, options, withCors } from '../_lib/http.js';

export const onRequestOptions = () => options();

export async function onRequestGet() {
  return withCors(json({
    ok: true,
    runtime: 'cloudflare-pages-functions',
    timestamp: new Date().toISOString()
  }));
}
