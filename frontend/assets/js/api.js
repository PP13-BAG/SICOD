(function(global){
  'use strict';

  const STORAGE_KEY = 'sicodStateV13';
  const REMOTE_CONFIG_KEY = 'sicodRemoteConfigV1';
  const AUTH_SESSION_KEY = 'sicodSupabaseSessionV1';
  const BLUEPRINT_FALLBACK = {
    storageMode: 'local-browser',
    frontend: {
      entrypoint: '/index.html',
      assets: ['/assets/app.css', '/assets/app.js']
    },
    targetPlatform: {
      frontend: 'GitHub Pages ou hebergement statique',
      database: 'Supabase PostgreSQL',
      auth: 'Supabase Auth + RLS',
      objectStorage: 'Supabase Storage (optionnel)'
    },
    schemaFiles: {
      supabase: 'supabase/schema.sql',
      documentTemplates: 'supabase/document-templates.seed.sql'
    }
  };

  let storageMode = 'localStorage';
  let remoteSyncEnabled = false;
  let saveTimer = null;
  let lastSerializedState = '';
  let remoteConfig = loadInitialRemoteConfig();
  let authSession = loadInitialAuthSession();

  const localStorageAdapter = {
    load() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      } catch (error) {
        console.warn('[Storage] Erreur lecture state:', error);
        return null;
      }
    },
    save(data) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        const candidateConfig = sanitizeRemoteConfig(data?.settings?.remoteSync);
        if (candidateConfig.enabled) {
          persistRemoteConfig(candidateConfig);
        }
      } catch (error) {
        console.warn('[Storage] Erreur sauvegarde state:', error);
      }
    }
  };

  function sanitizeRemoteConfig(input) {
    const value = input && typeof input === 'object' ? input : {};
    const provider = value.provider === 'supabase' ? 'supabase' : 'none';
    const enabled = !!value.enabled && provider === 'supabase';
    return {
      provider,
      enabled,
      supabaseUrl: String(value.supabaseUrl || '').trim().replace(/\/+$/, ''),
      supabaseAnonKey: String(value.supabaseAnonKey || '').trim(),
      projectRef: String(value.projectRef || '').trim()
    };
  }

  function sanitizeAuthSession(input) {
    const value = input && typeof input === 'object' ? input : null;
    if (!value || !value.accessToken || !value.refreshToken) return null;
    const expiresAt = Number(value.expiresAt || 0);
    return {
      accessToken: String(value.accessToken),
      refreshToken: String(value.refreshToken),
      expiresAt: Number.isFinite(expiresAt) ? expiresAt : 0,
      tokenType: String(value.tokenType || 'bearer'),
      user: value.user && typeof value.user === 'object' ? value.user : null
    };
  }

  function mapSupabaseSession(payload) {
    const base = payload && typeof payload === 'object' ? payload : {};
    const expiresAt = Number(base.expires_at || 0);
    return sanitizeAuthSession({
      accessToken: base.access_token,
      refreshToken: base.refresh_token,
      expiresAt,
      tokenType: base.token_type,
      user: base.user || null
    });
  }

  function loadInitialRemoteConfig() {
    try {
      const savedConfig = JSON.parse(localStorage.getItem(REMOTE_CONFIG_KEY) || 'null');
      const sanitized = sanitizeRemoteConfig(savedConfig);
      if (sanitized.enabled) return sanitized;
    } catch {}
    try {
      const savedState = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return sanitizeRemoteConfig(savedState?.settings?.remoteSync);
    } catch {
      return sanitizeRemoteConfig(null);
    }
  }

  function loadInitialAuthSession() {
    try {
      return sanitizeAuthSession(JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || 'null'));
    } catch {
      return null;
    }
  }

  function persistRemoteConfig(config) {
    remoteConfig = sanitizeRemoteConfig(config);
    try {
      localStorage.setItem(REMOTE_CONFIG_KEY, JSON.stringify(remoteConfig));
    } catch (error) {
      console.warn('[Storage] Erreur sauvegarde config distante:', error);
    }
    if (!remoteConfig.enabled) {
      setRemoteMode('localStorage');
    }
  }

  function persistAuthSession(session) {
    authSession = sanitizeAuthSession(session);
    try {
      if (authSession) {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(authSession));
      } else {
        localStorage.removeItem(AUTH_SESSION_KEY);
      }
    } catch (error) {
      console.warn('[Auth] Erreur sauvegarde session:', error);
    }
  }

  function clearAuthSession() {
    persistAuthSession(null);
  }

  function isSupabaseConfigured(config = remoteConfig) {
    return config.provider === 'supabase' && config.enabled && !!config.supabaseUrl && !!config.supabaseAnonKey;
  }

  function hasAuthSession() {
    return !!(authSession && authSession.accessToken && authSession.refreshToken);
  }

  function isSessionExpired(session = authSession, safetySeconds = 45) {
    if (!session || !session.expiresAt) return true;
    const expiresAtMs = Number(session.expiresAt) * 1000;
    return Date.now() >= (expiresAtMs - (safetySeconds * 1000));
  }

  function getCurrentUserEmail() {
    return authSession?.user?.email || '';
  }

  function getSupabaseHeaders(extraHeaders = {}, requireAuth = false) {
    if (requireAuth && !authSession?.accessToken) {
      throw new Error('Connexion Supabase requise.');
    }
    return {
      apikey: remoteConfig.supabaseAnonKey,
      Authorization: `Bearer ${requireAuth ? authSession.accessToken : (authSession?.accessToken || remoteConfig.supabaseAnonKey)}`,
      ...extraHeaders
    };
  }

  async function readResponse(response) {
    const text = await response.text().catch(() => '');
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {}
    }
    return { text, json };
  }

  async function fetchJson(url, init) {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(init?.headers || {})
      },
      ...init
    });
    if (!response.ok) {
      const payload = await readResponse(response);
      const message = payload?.json?.msg || payload?.json?.message || payload?.json?.error_description || payload?.json?.error || payload?.text || `HTTP ${response.status}`;
      throw new Error(message);
    }
    const payload = await readResponse(response);
    return payload.json ?? null;
  }

  async function supabaseRequest(path, init, requireAuth = true) {
    if (!isSupabaseConfigured()) throw new Error('Supabase n’est pas configuré.');
    if (requireAuth) {
      const session = await ensureSupabaseSession();
      if (!session?.accessToken) throw new Error('Connexion Supabase requise.');
    }
    return fetchJson(`${remoteConfig.supabaseUrl}${path}`, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        ...getSupabaseHeaders(init?.headers || {}, requireAuth)
      }
    });
  }

  async function authRequest(path, init) {
    if (!isSupabaseConfigured()) throw new Error('Supabase n’est pas configuré.');
    return fetchJson(`${remoteConfig.supabaseUrl}${path}`, {
      ...init,
      headers: {
        apikey: remoteConfig.supabaseAnonKey,
        ...(init?.headers || {})
      }
    });
  }

  function setRemoteMode(mode) {
    storageMode = mode;
    remoteSyncEnabled = mode === 'supabase';
  }

  function getStorageModeLabel() {
    if (storageMode === 'supabase') return 'Supabase + cache local';
    if (isSupabaseConfigured()) return 'Supabase configure · connexion requise';
    return 'Stockage local navigateur';
  }

  async function refreshSupabaseSession() {
    if (!isSupabaseConfigured() || !authSession?.refreshToken) {
      clearAuthSession();
      setRemoteMode('localStorage');
      return null;
    }
    try {
      const payload = await authRequest('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          refresh_token: authSession.refreshToken
        })
      });
      const nextSession = mapSupabaseSession(payload);
      if (!nextSession) throw new Error('Session Supabase invalide.');
      persistAuthSession(nextSession);
      setRemoteMode('supabase');
      return nextSession;
    } catch (error) {
      clearAuthSession();
      setRemoteMode('localStorage');
      throw error;
    }
  }

  async function ensureSupabaseSession() {
    if (!isSupabaseConfigured()) {
      clearAuthSession();
      setRemoteMode('localStorage');
      return null;
    }
    if (!hasAuthSession()) {
      setRemoteMode('auth-required');
      return null;
    }
    if (isSessionExpired()) {
      try {
        return await refreshSupabaseSession();
      } catch (error) {
        return null;
      }
    }
    setRemoteMode('supabase');
    return authSession;
  }

  async function signInWithPassword(email, password) {
    const payload = await authRequest('/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        email: String(email || '').trim(),
        password: String(password || '')
      })
    });
    const nextSession = mapSupabaseSession(payload);
    if (!nextSession) throw new Error('Connexion Supabase invalide.');
    persistAuthSession(nextSession);
    setRemoteMode('supabase');
    return {
      authenticated: true,
      user: nextSession.user || null,
      email: nextSession.user?.email || ''
    };
  }

  async function signOutSupabase() {
    if (isSupabaseConfigured() && authSession?.accessToken) {
      try {
        await fetch(`${remoteConfig.supabaseUrl}/auth/v1/logout`, {
          method: 'POST',
          headers: getSupabaseHeaders({}, true)
        });
      } catch {}
    }
    clearAuthSession();
    setRemoteMode(isSupabaseConfigured() ? 'auth-required' : 'localStorage');
    return { authenticated: false };
  }

  function getAuthState() {
    const configured = isSupabaseConfigured();
    const authenticated = configured && !!authSession?.accessToken && !isSessionExpired(authSession, 0);
    return {
      configured,
      enabled: configured,
      authenticated,
      provider: configured ? 'supabase' : 'none',
      email: authSession?.user?.email || '',
      userId: authSession?.user?.id || '',
      expiresAt: authSession?.expiresAt || null
    };
  }

  async function getSupabaseAppState() {
    const payload = await supabaseRequest('/rest/v1/app_settings?key=eq.app_state&select=value_json,updated_at&limit=1', {}, true);
    const row = Array.isArray(payload) ? payload[0] : null;
    return {
      storageMode: 'supabase',
      state: row?.value_json && typeof row.value_json === 'object' ? row.value_json : null,
      updatedAt: row?.updated_at || null
    };
  }

  async function upsertSupabaseAppState(state) {
    const payload = await supabaseRequest('/rest/v1/app_settings?on_conflict=key', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify([{
        key: 'app_state',
        value_json: state || {}
      }])
    }, true);
    const row = Array.isArray(payload) ? payload[0] : null;
    return {
      success: true,
      storageMode: 'supabase',
      updatedAt: row?.updated_at || null
    };
  }

  async function getSupabaseDocumentTemplates(type) {
    const query = new URLSearchParams();
    query.set('select', 'id,document_type,name,version,variant,schema_json,is_active');
    query.set('is_active', 'eq.true');
    query.set('order', 'document_type.asc,variant.asc,version.asc');
    if (type) query.set('document_type', `eq.${type}`);
    const payload = await supabaseRequest(`/rest/v1/document_templates?${query.toString()}`, {}, true);
    return (Array.isArray(payload) ? payload : []).map((row) => {
      const schema = row?.schema_json && typeof row.schema_json === 'object' ? row.schema_json : {};
      return {
        id: row.id,
        documentType: row.document_type,
        name: row.name,
        version: row.version,
        variant: row.variant,
        isActive: row.is_active !== false,
        layout: schema.layout || {}
      };
    });
  }

  function scheduleRemoteSave(data) {
    if (!remoteSyncEnabled || !isSupabaseConfigured() || !authSession?.accessToken) return;
    const serialized = JSON.stringify(data);
    if (serialized === lastSerializedState) return;
    lastSerializedState = serialized;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await upsertSupabaseAppState(data);
      } catch (error) {
        console.warn('[Storage] Synchronisation distante impossible :', error.message);
      }
    }, 600);
  }

  async function hydrateRemoteState() {
    if (!isSupabaseConfigured()) {
      setRemoteMode('localStorage');
      return null;
    }
    const session = await ensureSupabaseSession();
    if (!session?.accessToken) return null;
    try {
      const payload = await getSupabaseAppState();
      if (payload?.state && typeof payload.state === 'object') {
        localStorageAdapter.save(payload.state);
        setRemoteMode('supabase');
        return payload.state;
      }
      setRemoteMode('supabase');
      return null;
    } catch (error) {
      setRemoteMode('localStorage');
      return null;
    }
  }

  async function getRemoteState() {
    if (!isSupabaseConfigured()) {
      return {
        storageMode: 'local-browser',
        state: null
      };
    }
    const session = await ensureSupabaseSession();
    if (!session?.accessToken) {
      throw new Error('Connexion Supabase requise.');
    }
    const payload = await getSupabaseAppState();
    if (payload?.state && typeof payload.state === 'object') {
      localStorageAdapter.save(payload.state);
    }
    setRemoteMode('supabase');
    return payload;
  }

  async function pushRemoteState(state) {
    if (!isSupabaseConfigured()) throw new Error('Supabase n’est pas configuré.');
    const session = await ensureSupabaseSession();
    if (!session?.accessToken) throw new Error('Connexion Supabase requise.');
    const payload = await upsertSupabaseAppState(state);
    setRemoteMode('supabase');
    localStorageAdapter.save(state);
    lastSerializedState = JSON.stringify(state || {});
    return payload;
  }

  global.SICODApi = {
    storage: {
      load() {
        return localStorageAdapter.load();
      },
      save(data) {
        localStorageAdapter.save(data);
        scheduleRemoteSave(data);
      }
    },
    auth: {
      getState() {
        return getAuthState();
      },
      async restoreSession() {
        try {
          return await ensureSupabaseSession();
        } catch (error) {
          return null;
        }
      },
      async signInWithPassword(email, password) {
        return signInWithPassword(email, password);
      },
      async signOut() {
        return signOutSupabase();
      }
    },
    system: {
      getStorageMode() {
        return storageMode;
      },
      getStorageModeLabel() {
        return getStorageModeLabel();
      },
      getRemoteConfig() {
        return { ...remoteConfig };
      },
      setRemoteConfig(config) {
        persistRemoteConfig(config);
        return { ...remoteConfig };
      },
      getAuthState() {
        return getAuthState();
      },
      async hydrateState() {
        return hydrateRemoteState();
      },
      async getRemoteState() {
        try {
          return await getRemoteState();
        } catch (error) {
          if (error.message === 'Connexion Supabase requise.') {
            setRemoteMode('auth-required');
          } else {
            setRemoteMode('localStorage');
          }
          throw error;
        }
      },
      async pushRemoteState(state) {
        try {
          return await pushRemoteState(state);
        } catch (error) {
          if (error.message === 'Connexion Supabase requise.') {
            setRemoteMode('auth-required');
          } else {
            setRemoteMode('localStorage');
          }
          throw error;
        }
      },
      async getBlueprint() {
        return {
          ...BLUEPRINT_FALLBACK,
          storageMode: isSupabaseConfigured()
            ? (authSession?.accessToken ? 'supabase' : 'supabase-auth-required')
            : 'local-browser',
          bindings: {
            provider: isSupabaseConfigured() ? 'supabase' : null,
            projectRef: remoteConfig.projectRef || null
          }
        };
      },
      async getDocumentTemplates(type) {
        if (!isSupabaseConfigured()) return [];
        const session = await ensureSupabaseSession();
        if (!session?.accessToken) throw new Error('Connexion Supabase requise.');
        const items = await getSupabaseDocumentTemplates(type);
        setRemoteMode('supabase');
        return items;
      }
    }
  };
})(window);
