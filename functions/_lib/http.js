export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(data), {
    ...init,
    headers
  });
}

export function withCors(response) {
  response.headers.set('access-control-allow-origin', '*');
  response.headers.set('access-control-allow-methods', 'GET, PUT, OPTIONS');
  response.headers.set('access-control-allow-headers', 'content-type');
  return response;
}

export function options() {
  return withCors(new Response(null, { status: 204 }));
}
