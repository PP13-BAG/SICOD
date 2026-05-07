(function(global){
  'use strict';

  function requiresAuth() {
    const state = global.SICODApi?.system?.getAuthState?.() || {};
    return !!state.configured;
  }

  function isAuthenticated() {
    const state = global.SICODApi?.system?.getAuthState?.() || {};
    return !!state.authenticated;
  }

  function accessSummary() {
    const state = global.SICODApi?.system?.getAuthState?.() || {};
    return {
      configured: !!state.configured,
      authenticated: !!state.authenticated,
      email: state.email || '',
      role: state.role || 'authenticated'
    };
  }

  global.SICODAuth = {
    accessSummary,
    isAuthenticated,
    requiresAuth
  };
})(window);
