(function(global){
  'use strict';

  const STORAGE_KEY = 'sicodStateV13';
  const REMOTE_CONFIG_KEY = 'sicodRemoteConfigV1';
  const BLUEPRINT_FALLBACK = {
    storageMode: 'local-browser',
    frontend: {
      entrypoint: '/index.html',
      assets: ['/assets/app.css', '/assets/app.js']
    },
    targetPlatform: {
      frontend: 'GitHub Pages ou hébergement statique',
      database: 'Supabase PostgreSQL',
      auth: 'Supabase Auth',
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

  function isSupabaseConfigured(config = remoteConfig) {
    return config.provider === 'supabase' && config.enabled && !!config.supabaseUrl && !!config.supabaseAnonKey;
  }

  function getSupabaseHeaders(extraHeaders = {}) {
    return {
      apikey: remoteConfig.supabaseAnonKey,
      Authorization: `Bearer ${remoteConfig.supabaseAnonKey}`,
      ...extraHeaders
    };
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
      const text = await response.text().catch(() => '');
      throw new Error(text ? `HTTP ${response.status} - ${text}` : `HTTP ${response.status}`);
    }
    return response.json();
  }

  async function supabaseRequest(path, init) {
    if (!isSupabaseConfigured()) throw new Error('Supabase n’est pas configuré.');
    return fetchJson(`${remoteConfig.supabaseUrl}${path}`, init);
  }

  function setRemoteMode(mode) {
    storageMode = mode;
    remoteSyncEnabled = mode === 'supabase';
  }

  async function getSupabaseAppState() {
    const payload = await supabaseRequest('/rest/v1/app_settings?key=eq.app_state&select=value_json,updated_at&limit=1', {
      headers: getSupabaseHeaders()
    });
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
      headers: getSupabaseHeaders({
        'content-type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation'
      }),
      body: JSON.stringify([{
        key: 'app_state',
        value_json: state || {}
      }])
    });
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
    const payload = await supabaseRequest(`/rest/v1/document_templates?${query.toString()}`, {
      headers: getSupabaseHeaders()
    });
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
    if (!remoteSyncEnabled || !isSupabaseConfigured()) return;
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
    const payload = await getSupabaseAppState();
    if (payload?.state && typeof payload.state === 'object') {
      localStorageAdapter.save(payload.state);
    }
    setRemoteMode('supabase');
    return payload;
  }

  async function pushRemoteState(state) {
    if (!isSupabaseConfigured()) throw new Error('Supabase n’est pas configuré.');
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
    system: {
      getStorageMode() {
        return storageMode;
      },
      getStorageModeLabel() {
        return storageMode === 'supabase'
          ? 'Supabase + cache local'
          : 'Stockage local navigateur';
      },
      getRemoteConfig() {
        return { ...remoteConfig };
      },
      setRemoteConfig(config) {
        persistRemoteConfig(config);
        return { ...remoteConfig };
      },
      async hydrateState() {
        return hydrateRemoteState();
      },
      async getRemoteState() {
        try {
          return await getRemoteState();
        } catch (error) {
          setRemoteMode('localStorage');
          throw error;
        }
      },
      async pushRemoteState(state) {
        try {
          return await pushRemoteState(state);
        } catch (error) {
          setRemoteMode('localStorage');
          throw error;
        }
      },
      async getBlueprint() {
        return {
          ...BLUEPRINT_FALLBACK,
          storageMode: isSupabaseConfigured() ? 'supabase' : 'local-browser',
          bindings: {
            provider: isSupabaseConfigured() ? 'supabase' : null,
            projectRef: remoteConfig.projectRef || null
          }
        };
      },
      async getDocumentTemplates(type) {
        if (!isSupabaseConfigured()) return [];
        try {
          const items = await getSupabaseDocumentTemplates(type);
          setRemoteMode('supabase');
          return items;
        } catch (error) {
          console.warn('[System] Templates distants indisponibles :', error.message);
          return [];
        }
      }
    }
  };
})(window);
