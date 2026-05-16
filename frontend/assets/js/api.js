(function(global){
  'use strict';

  const AUTH_SESSION_KEY = 'sicodSupabaseSessionV1';
  const USER_ROLE_VALUES = ['admin', 'redacteur', 'lecture'];
  const ROLE_RANK = { lecture: 1, redacteur: 2, admin: 3 };
  const PASSWORD_POLICY = Object.freeze({
    minLength: 12,
    requireUpper: true,
    requireLower: true,
    requireDigit: true,
    requireSpecial: true
  });
  const REFERENCE_TABLES = {
    eventTypes: 'reference_event_types',
    commandTypes: 'reference_command_types',
    directoryGroups: 'reference_directory_groups',
    directoryEntities: 'reference_directory_entities',
    planTypes: 'reference_plan_types',
    planRiskTypes: 'reference_plan_risk_types',
    planPriorities: 'reference_plan_priorities',
    planStatuses: 'reference_plan_statuses',
    dutyRoles: 'reference_duty_roles',
    dutyAgents: 'reference_duty_agents',
    reflexFamilies: 'reference_reflex_families'
  };
  const runtimeConfig = sanitizeRemoteConfig(global.SICODConfig || {});
  let storageMode = runtimeConfig.enabled ? 'auth-required' : 'local-browser';
  let saveTimer = null;
  let lastSerializedState = '';
  let authSession = loadInitialAuthSession();
  let authRoles = [];
  let refreshSessionPromise = null;
  let lastDirectoryTouchAt = 0;
  let authRolesLoaded = false;
  let lastRolesFetchFailureAt = 0;
  let lastWriteDeniedAt = 0;

  function sanitizeRemoteConfig(input) {
    const value = input && typeof input === 'object' ? input : {};
    const provider = value.remoteProvider === 'supabase' || value.provider === 'supabase' ? 'supabase' : 'none';
    const enabled = !!value.remoteEnabled || !!value.enabled || provider === 'supabase';
    return {
      provider,
      enabled: provider === 'supabase' && enabled,
      supabaseUrl: String(value.supabaseUrl || '').trim().replace(/\/+$/, ''),
      supabaseAnonKey: String(value.supabasePublishableKey || value.supabaseAnonKey || '').trim(),
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

  function loadInitialAuthSession() {
    try {
      return sanitizeAuthSession(JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY) || 'null'));
    } catch {
      return null;
    }
  }

  function persistAuthSession(session) {
    authSession = sanitizeAuthSession(session);
    try {
      if (authSession) {
        sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(authSession));
      } else {
        sessionStorage.removeItem(AUTH_SESSION_KEY);
      }
    } catch (error) {
      console.warn('[Auth] Erreur sauvegarde session:', error);
    }
  }

  function clearAuthSession() {
    persistAuthSession(null);
    authRoles = [];
    lastDirectoryTouchAt = 0;
    authRolesLoaded = false;
    lastRolesFetchFailureAt = 0;
  }

  function getResolvedRole() {
    if (authRoles.includes('admin')) return 'admin';
    if (authRoles.includes('redacteur')) return 'redacteur';
    if (authRoles.includes('lecture')) return 'lecture';
    return '';
  }

  function getRoleRank(role) {
    return ROLE_RANK[String(role || '').trim().toLowerCase()] || 0;
  }

  function hasRequiredRole(requiredRole) {
    return getRoleRank(getResolvedRole()) >= getRoleRank(requiredRole);
  }

  function ensureRequiredRole(requiredRole, message) {
    if (!hasRequiredRole(requiredRole)) {
      throw new Error(message || 'Droits insuffisants.');
    }
  }

  function normalizeRoleList(input) {
    return Array.from(new Set((Array.isArray(input) ? input : [])
      .map((item) => String(item || '').trim().toLowerCase())
      .filter((item) => USER_ROLE_VALUES.includes(item))));
  }

  function notifyWriteDenied(message = 'Votre compte est en lecture seule. Les modifications ne peuvent pas être enregistrées.') {
    const now = Date.now();
    if (now - lastWriteDeniedAt < 8000) return;
    lastWriteDeniedAt = now;
    try {
      global.dispatchEvent(new CustomEvent('sicod-write-denied', {
        detail: { message }
      }));
    } catch {}
  }

  function parseJwtClaims(token) {
    const value = String(token || '').trim();
    if (!value) return {};
    const parts = value.split('.');
    if (parts.length < 2) return {};
    try {
      const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padding = (4 - (normalized.length % 4 || 4)) % 4;
      const payload = normalized + '='.repeat(padding);
      return JSON.parse(atob(payload));
    } catch {
      return {};
    }
  }

  function getSessionAal(session = authSession) {
    const claims = parseJwtClaims(session?.accessToken);
    const aal = String(claims?.aal || '').trim().toLowerCase();
    if (aal) return aal;
    const amr = Array.isArray(claims?.amr) ? claims.amr.map((item) => String(item || '').toLowerCase()) : [];
    if (amr.includes('mfa')) return 'aal2';
    if (amr.length) return 'aal1';
    return '';
  }

  function validatePasswordStrength(password, options = {}) {
    const value = String(password || '');
    const requireValue = options.requireValue !== false;
    if (!value) {
      return requireValue ? 'Mot de passe requis.' : '';
    }
    if (value.length < PASSWORD_POLICY.minLength) {
      return `Le mot de passe doit contenir au moins ${PASSWORD_POLICY.minLength} caractères.`;
    }
    if (PASSWORD_POLICY.requireUpper && !/[A-Z]/.test(value)) {
      return 'Le mot de passe doit contenir au moins une majuscule.';
    }
    if (PASSWORD_POLICY.requireLower && !/[a-z]/.test(value)) {
      return 'Le mot de passe doit contenir au moins une minuscule.';
    }
    if (PASSWORD_POLICY.requireDigit && !/[0-9]/.test(value)) {
      return 'Le mot de passe doit contenir au moins un chiffre.';
    }
    if (PASSWORD_POLICY.requireSpecial && !/[^A-Za-z0-9]/.test(value)) {
      return 'Le mot de passe doit contenir au moins un caractère spécial.';
    }
    return '';
  }

  function getCurrentUserLabel(user = authSession?.user) {
    const meta = user && typeof user === 'object' ? (user.user_metadata || {}) : {};
    const fullName = [meta.first_name, meta.last_name].map((value) => String(value || '').trim()).filter(Boolean).join(' ').trim();
    const displayName = String(meta.display_name || meta.full_name || fullName || '').trim();
    if (displayName) return displayName;
    return String(user?.email || '').trim();
  }

  function isSupabaseConfigured(config = runtimeConfig) {
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

  function getSupabaseHeaders(extraHeaders = {}, requireAuth = false) {
    if (requireAuth && !authSession?.accessToken) {
      throw new Error('Connexion Supabase requise.');
    }
    return {
      apikey: runtimeConfig.supabaseAnonKey,
      Authorization: `Bearer ${requireAuth ? authSession.accessToken : (authSession?.accessToken || runtimeConfig.supabaseAnonKey)}`,
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

  async function supabaseRequest(path, init, requireAuth = true, options = {}) {
    if (!isSupabaseConfigured()) throw new Error('Supabase n’est pas configuré.');
    if (requireAuth && !options.skipSessionCheck) {
      const session = await ensureSupabaseSession();
      if (!session?.accessToken) throw new Error('Connexion Supabase requise.');
    } else if (requireAuth && !authSession?.accessToken) {
      throw new Error('Connexion Supabase requise.');
    }
    return fetchJson(`${runtimeConfig.supabaseUrl}${path}`, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        ...getSupabaseHeaders(init?.headers || {}, requireAuth)
      }
    });
  }

  async function authRequest(path, init) {
    if (!isSupabaseConfigured()) throw new Error('Supabase n’est pas configuré.');
    return fetchJson(`${runtimeConfig.supabaseUrl}${path}`, {
      ...init,
      headers: {
        apikey: runtimeConfig.supabaseAnonKey,
        ...(init?.headers || {})
      }
    });
  }

  function setRemoteMode(mode) {
    storageMode = mode;
  }

  function getStorageModeLabel() {
    if (isSupabaseConfigured()) return 'Base de donnée';
    return 'Mode non configuré';
  }

  async function refreshSupabaseSession() {
    if (refreshSessionPromise) return refreshSessionPromise;
    refreshSessionPromise = refreshSupabaseSessionInternal().finally(() => {
      refreshSessionPromise = null;
    });
    return refreshSessionPromise;
  }

  async function refreshSupabaseSessionInternal() {
    if (!isSupabaseConfigured() || !authSession?.refreshToken) {
      clearAuthSession();
      setRemoteMode('auth-required');
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
      setRemoteMode('auth-required');
      throw error;
    }
  }

  async function ensureSupabaseSession() {
    if (!isSupabaseConfigured()) {
      clearAuthSession();
      setRemoteMode('local-browser');
      return null;
    }
    if (!hasAuthSession()) {
      setRemoteMode('auth-required');
      return null;
    }
    if (isSessionExpired()) {
      try {
        const session = await refreshSupabaseSession();
        if (session?.accessToken) await loadCurrentUserRoles().catch(() => authRoles);
        return session;
      } catch {
        return null;
      }
    }
    setRemoteMode('supabase');
    if (!authRolesLoaded && authSession?.accessToken) {
      await loadCurrentUserRoles().catch(() => authRoles);
    }
    if (authSession?.accessToken) {
      await touchCurrentUserDirectoryEntryThrottled().catch(() => null);
    }
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
    await loadCurrentUserRoles(true).catch(() => {
      authRoles = [];
      authRolesLoaded = true;
    });
    await touchCurrentUserDirectoryEntryThrottled(true).catch(() => null);
    setRemoteMode('supabase');
    return {
      authenticated: true,
      user: nextSession.user || null,
      email: nextSession.user?.email || ''
    };
  }

  async function signUpManagedUser(email, password, displayName) {
    const cleanEmail = String(email || '').trim();
    const cleanPassword = String(password || '');
    if (!cleanEmail || !cleanPassword) throw new Error('E-mail et mot de passe requis.');
    const passwordError = validatePasswordStrength(cleanPassword, { requireValue: true });
    if (passwordError) throw new Error(passwordError);
    const payload = await authRequest('/auth/v1/signup', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        email: cleanEmail,
        password: cleanPassword,
        data: {
          display_name: String(displayName || cleanEmail).trim()
        }
      })
    });
    return payload?.user || payload;
  }

  async function signOutSupabase() {
    if (isSupabaseConfigured() && authSession?.accessToken) {
      try {
        await fetch(`${runtimeConfig.supabaseUrl}/auth/v1/logout`, {
          method: 'POST',
          headers: getSupabaseHeaders({}, true)
        });
      } catch {}
    }
    clearAuthSession();
    setRemoteMode(isSupabaseConfigured() ? 'auth-required' : 'local-browser');
    return { authenticated: false };
  }

  async function updateSupabasePassword(password) {
    const nextPassword = String(password || '');
    if (!nextPassword) throw new Error('Mot de passe manquant.');
    const passwordError = validatePasswordStrength(nextPassword, { requireValue: true });
    if (passwordError) throw new Error(passwordError);
    const session = await ensureSupabaseSession();
    if (!session?.accessToken) throw new Error('Connexion Supabase requise.');
    const payload = await fetchJson(`${runtimeConfig.supabaseUrl}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        ...getSupabaseHeaders({
          'content-type': 'application/json'
        }, true)
      },
      body: JSON.stringify({
        password: nextPassword
      })
    });
    if (payload?.access_token && payload?.refresh_token) {
      const mapped = mapSupabaseSession(payload);
      if (mapped) persistAuthSession(mapped);
    } else if (payload?.user && authSession) {
      persistAuthSession({
        ...authSession,
        user: payload.user
      });
    }
    setRemoteMode('supabase');
    return {
      success: true,
      user: payload?.user || authSession?.user || null
    };
  }

  function getAuthState() {
    const configured = isSupabaseConfigured();
    const authenticated = configured && !!authSession?.accessToken && !isSessionExpired(authSession, 0);
    const role = getResolvedRole();
    const resolvedRole = role || (authenticated ? 'lecture' : '');
    const sessionAal = authenticated ? getSessionAal(authSession) : '';
    return {
      configured,
      enabled: configured,
      authenticated,
      provider: configured ? 'supabase' : 'none',
      email: authSession?.user?.email || '',
      userId: authSession?.user?.id || '',
      expiresAt: authSession?.expiresAt || null,
      roles: authRoles.slice(),
      role: resolvedRole,
      isAdmin: resolvedRole === 'admin',
      canWrite: getRoleRank(resolvedRole) >= getRoleRank('redacteur'),
      sessionAal,
      mfaRecommended: resolvedRole === 'admin' && sessionAal !== 'aal2'
    };
  }

  async function fetchCurrentUserRoles() {
    const userId = authSession?.user?.id;
    if (!userId) return [];
    const payload = await supabaseRequest(`/rest/v1/app_user_roles?user_id=eq.${encodeURIComponent(userId)}&select=role_key`, {}, true, { skipSessionCheck: true });
    const rows = Array.isArray(payload) ? payload : [];
    return rows.map((row) => String(row?.role_key || '')).filter(Boolean);
  }

  async function loadCurrentUserRoles(force = false) {
    if (!authSession?.accessToken) {
      authRoles = [];
      authRolesLoaded = false;
      return authRoles;
    }
    if (authRolesLoaded && !force) return authRoles;
    const now = Date.now();
    if (!force && lastRolesFetchFailureAt && now - lastRolesFetchFailureAt < 60000) {
      return authRoles;
    }
    try {
      authRoles = normalizeRoleList(await fetchCurrentUserRoles());
      authRolesLoaded = true;
      lastRolesFetchFailureAt = 0;
      return authRoles;
    } catch (error) {
      lastRolesFetchFailureAt = now;
      throw error;
    }
  }

  async function touchCurrentUserDirectoryEntry() {
    const user = authSession?.user;
    const userId = String(user?.id || '').trim();
    const email = String(user?.email || '').trim();
    if (!userId || !email) return null;
    return supabaseRequest('/rest/v1/app_user_directory?on_conflict=user_id', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify([{
        user_id: userId,
        email,
        display_name: getCurrentUserLabel(user),
        last_seen_at: new Date().toISOString()
      }])
    }, true, { skipSessionCheck: true });
  }

  async function touchCurrentUserDirectoryEntryThrottled(force = false) {
    const now = Date.now();
    if (!force && now - lastDirectoryTouchAt < 60000) return null;
    lastDirectoryTouchAt = now;
    try {
      return await touchCurrentUserDirectoryEntry();
    } catch (error) {
      lastDirectoryTouchAt = 0;
      throw error;
    }
  }

  async function getSupabaseManagedUsers() {
    ensureRequiredRole('admin', 'Accès réservé aux administrateurs.');
    const [directoryRows, roleRows] = await Promise.all([
      supabaseRequest('/rest/v1/app_user_directory?select=user_id,email,display_name,last_seen_at,created_at&order=email.asc', {}, true),
      supabaseRequest('/rest/v1/app_user_roles?select=user_id,role_key&order=user_id.asc,role_key.asc', {}, true)
    ]);
    const roleMap = new Map();
    (Array.isArray(roleRows) ? roleRows : []).forEach((row) => {
      const userId = String(row?.user_id || '');
      const roleKey = String(row?.role_key || '');
      if (!userId || !roleKey) return;
      if (!roleMap.has(userId)) roleMap.set(userId, []);
      roleMap.get(userId).push(roleKey);
    });
    return (Array.isArray(directoryRows) ? directoryRows : []).map((row) => ({
      userId: row.user_id,
      email: row.email || '',
      displayName: row.display_name || '',
      lastSeenAt: row.last_seen_at || null,
      createdAt: row.created_at || null,
      roles: normalizeRoleList(roleMap.get(row.user_id) || [])
    }));
  }

  async function saveSupabaseManagedUserRoles(userId, roles) {
    ensureRequiredRole('admin', 'Accès réservé aux administrateurs.');
    const targetUserId = String(userId || '').trim();
    if (!targetUserId) throw new Error('Utilisateur cible manquant.');
    const nextRoles = normalizeRoleList(roles);
    if (!nextRoles.length) throw new Error('Au moins un rôle doit être attribué.');
    await supabaseRequest(`/rest/v1/app_user_roles?user_id=eq.${encodeURIComponent(targetUserId)}`, {
      method: 'DELETE'
    }, true);
    await supabaseRequest('/rest/v1/app_user_roles', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify(nextRoles.map((roleKey) => ({
        user_id: targetUserId,
        role_key: roleKey
      })))
    }, true);
    return {
      success: true,
      userId: targetUserId,
      roles: nextRoles
    };
  }

  async function upsertSupabaseManagedUser(user) {
    ensureRequiredRole('admin', 'Accès réservé aux administrateurs.');
    const value = user && typeof user === 'object' ? user : {};
    let userId = String(value.userId || '').trim();
    const email = String(value.email || '').trim();
    const displayName = String(value.displayName || email || '').trim();
    const password = String(value.password || '');
    const lastSeenAt = String(value.lastSeenAt || '').trim() || new Date().toISOString();
    const roles = normalizeRoleList([value.role || 'lecture']);
    if (!email) throw new Error('E-mail utilisateur requis.');
    if (!userId) {
      const created = await signUpManagedUser(email, password, displayName);
      userId = String(created?.id || '').trim();
      if (!userId) throw new Error("Création Auth impossible : identifiant utilisateur non retourné.");
    }
    await supabaseRequest('/rest/v1/app_user_directory?on_conflict=user_id', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify([{
        user_id: userId,
        email,
        display_name: displayName,
        last_seen_at: lastSeenAt
      }])
    }, true);
    await saveSupabaseManagedUserRoles(userId, roles);
    return {
      userId,
      email,
      displayName,
      roles
    };
  }

  async function deleteSupabaseManagedUser(userId) {
    ensureRequiredRole('admin', 'Accès réservé aux administrateurs.');
    const targetUserId = String(userId || '').trim();
    if (!targetUserId) throw new Error('Utilisateur cible manquant.');
    await supabaseRequest(`/rest/v1/app_user_roles?user_id=eq.${encodeURIComponent(targetUserId)}`, {
      method: 'DELETE'
    }, true);
    await supabaseRequest(`/rest/v1/app_user_directory?user_id=eq.${encodeURIComponent(targetUserId)}`, {
      method: 'DELETE'
    }, true);
    return {
      success: true,
      userId: targetUserId
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
    ensureRequiredRole('redacteur', 'Votre compte est en lecture seule. Les modifications ne peuvent pas être enregistrées.');
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

  async function getSupabaseReferenceCollection(tableName) {
    const query = new URLSearchParams();
    query.set('select', 'id,code,slug,status,label,sort_order,is_active,deleted_at,replaced_by_id,updated_at,created_at');
    query.set('order', 'sort_order.asc,label.asc');
    const payload = await supabaseRequest(`/rest/v1/${tableName}?${query.toString()}`, {}, true);
    return Array.isArray(payload) ? payload : [];
  }

  async function getSupabaseReferenceCatalog() {
    const entries = await Promise.all(Object.entries(REFERENCE_TABLES).map(async ([key, table]) => {
      try {
        const rows = await getSupabaseReferenceCollection(table);
        return [key, rows];
      } catch {
        return [key, []];
      }
    }));
    return Object.fromEntries(entries);
  }

  async function upsertSupabaseReferenceCollection(tableName, rows) {
    return supabaseRequest(`/rest/v1/${tableName}?on_conflict=id`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify(rows)
    }, true);
  }

  async function pushSupabaseReferenceCatalog(catalog) {
    ensureRequiredRole('admin', 'Accès réservé aux administrateurs.');
    const source = catalog && typeof catalog === 'object' ? catalog : {};
    await Promise.all(Object.entries(REFERENCE_TABLES).map(async ([key, table]) => {
      const rows = Array.isArray(source[key]) ? source[key] : [];
      const payload = rows.map((item, index) => ({
        id: item.id,
        label: item.label,
        code: item.code || null,
        slug: item.slug || null,
        status: item.status || 'active',
        sort_order: Number.isFinite(item.sortOrder) ? item.sortOrder : index,
        is_active: item.isActive !== false,
        deleted_at: item.deletedAt || null,
        replaced_by_id: item.replacedById || null,
        updated_at: item.updatedAt || new Date().toISOString(),
        created_at: item.createdAt || new Date().toISOString()
      }));
      await upsertSupabaseReferenceCollection(table, payload);
    }));
    return true;
  }

  function scheduleRemoteSave(data) {
    if (!isSupabaseConfigured() || !authSession?.accessToken) return;
    if (!hasRequiredRole('redacteur')) {
      notifyWriteDenied();
      return;
    }
    const serialized = JSON.stringify(data || {});
    if (serialized === lastSerializedState) return;
    lastSerializedState = serialized;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await upsertSupabaseAppState(data);
      } catch (error) {
        console.warn('[Storage] Synchronisation Supabase impossible :', error.message);
      }
    }, 450);
  }

  async function hydrateRemoteState() {
    if (!isSupabaseConfigured()) {
      setRemoteMode('local-browser');
      return null;
    }
    const session = await ensureSupabaseSession();
    if (!session?.accessToken) return null;
    try {
      const payload = await getSupabaseAppState();
      setRemoteMode('supabase');
      return payload?.state && typeof payload.state === 'object' ? payload.state : null;
    } catch {
      setRemoteMode('auth-required');
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
    if (!session?.accessToken) throw new Error('Connexion Supabase requise.');
    const payload = await getSupabaseAppState();
    setRemoteMode('supabase');
    return payload;
  }

  async function pushRemoteState(state) {
    if (!isSupabaseConfigured()) throw new Error('Supabase n’est pas configuré.');
    const session = await ensureSupabaseSession();
    if (!session?.accessToken) throw new Error('Connexion Supabase requise.');
    const payload = await upsertSupabaseAppState(state);
    setRemoteMode('supabase');
    lastSerializedState = JSON.stringify(state || {});
    return payload;
  }

  global.SICODApi = {
    storage: {
      load() {
        return null;
      },
      save(data) {
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
        } catch {
          return null;
        }
      },
      async signInWithPassword(email, password) {
        return signInWithPassword(email, password);
      },
      async signOut() {
        return signOutSupabase();
      },
      async updatePassword(password) {
        return updateSupabasePassword(password);
      },
      validatePassword(password, options) {
        const message = validatePasswordStrength(password, options);
        return { ok: !message, message };
      },
      getPasswordPolicy() {
        return { ...PASSWORD_POLICY };
      },
      async refreshRoles() {
        return loadCurrentUserRoles(true);
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
        return { ...runtimeConfig };
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
          }
          throw error;
        }
      },
      async getDocumentTemplates(type) {
        if (!isSupabaseConfigured()) return [];
        const session = await ensureSupabaseSession();
        if (!session?.accessToken) throw new Error('Connexion Supabase requise.');
        const items = await getSupabaseDocumentTemplates(type);
        setRemoteMode('supabase');
        return items;
      },
      async getReferenceCatalog() {
        if (!isSupabaseConfigured()) return {};
        const session = await ensureSupabaseSession();
        if (!session?.accessToken) throw new Error('Connexion Supabase requise.');
        return getSupabaseReferenceCatalog();
      },
      async pushReferenceCatalog(catalog) {
        if (!isSupabaseConfigured()) throw new Error('Supabase n’est pas configuré.');
        const session = await ensureSupabaseSession();
        if (!session?.accessToken) throw new Error('Connexion Supabase requise.');
        await pushSupabaseReferenceCatalog(catalog);
        return true;
      },
      async listManagedUsers() {
        if (!isSupabaseConfigured()) return [];
        const session = await ensureSupabaseSession();
        if (!session?.accessToken) throw new Error('Connexion Supabase requise.');
        return getSupabaseManagedUsers();
      },
      async saveManagedUserRoles(userId, roles) {
        if (!isSupabaseConfigured()) throw new Error('Supabase n’est pas configuré.');
        const session = await ensureSupabaseSession();
        if (!session?.accessToken) throw new Error('Connexion Supabase requise.');
        return saveSupabaseManagedUserRoles(userId, roles);
      },
      async upsertManagedUser(user) {
        if (!isSupabaseConfigured()) throw new Error('Supabase non configuré.');
        const session = await ensureSupabaseSession();
        if (!session?.accessToken) throw new Error('Connexion Supabase requise.');
        return upsertSupabaseManagedUser(user);
      },
      async deleteManagedUser(userId) {
        if (!isSupabaseConfigured()) throw new Error('Supabase non configuré.');
        const session = await ensureSupabaseSession();
        if (!session?.accessToken) throw new Error('Connexion Supabase requise.');
        return deleteSupabaseManagedUser(userId);
      },
    }
  };
})(window);
