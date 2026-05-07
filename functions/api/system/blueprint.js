import { json, options, withCors } from '../../_lib/http.js';

export const onRequestOptions = () => options();

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  return withCors(json({
    storageMode: 'cloudflare-d1',
    frontend: {
      entrypoint: '/index.html',
      assets: ['/assets/app.css', '/assets/app.js']
    },
    targetCloudflare: {
      frontend: 'Cloudflare Pages',
      api: 'Cloudflare Pages Functions',
      database: 'Cloudflare D1',
      objectStorage: 'Cloudflare R2'
    },
    apiBase: url.origin,
    schemaFiles: {
      d1Target: 'cloudflare/migrations/0001_initial.sql',
      documentTemplates: 'cloudflare/migrations/0002_seed_document_templates.sql'
    },
    bindings: {
      database: env.DB ? 'DB' : null,
      mediaBucket: env.MEDIA_BUCKET ? 'MEDIA_BUCKET' : null
    }
  }));
}
