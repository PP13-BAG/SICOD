function unauthorizedResponse(realm = 'SICOD') {
  return new Response('Authentification requise.', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${realm}", charset="UTF-8"`,
      'cache-control': 'no-store'
    }
  });
}

function decodeBasicAuth(headerValue) {
  if (!headerValue || !headerValue.startsWith('Basic ')) return null;
  try {
    const encoded = headerValue.slice(6).trim();
    const decoded = atob(encoded);
    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex < 0) return null;
    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1)
    };
  } catch {
    return null;
  }
}

export async function onRequest(context) {
  const expectedUser = context.env.BASIC_AUTH_USER;
  const expectedPassword = context.env.BASIC_AUTH_PASSWORD;
  const realm = context.env.BASIC_AUTH_REALM || 'SICOD';

  if (!expectedUser || !expectedPassword) {
    return context.next();
  }

  const credentials = decodeBasicAuth(context.request.headers.get('authorization'));
  if (!credentials) {
    return unauthorizedResponse(realm);
  }

  if (credentials.username !== expectedUser || credentials.password !== expectedPassword) {
    return unauthorizedResponse(realm);
  }

  return context.next();
}
