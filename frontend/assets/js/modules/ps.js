(function(global){
  'use strict';

  const DRAFT_KEY = 'sicodDraftPsV1';

  function saveDraft(payload) {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(payload || {}));
    } catch {}
  }

  function loadDraft() {
    try {
      return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function clearDraft() {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {}
  }

  function validate(payload) {
    if (!payload?.eventId) return { ok: false, message: 'Aucun événement sélectionné pour ce point de situation.' };
    if (!String(payload.title || '').trim() && !String(payload.situation || '').trim()) {
      return { ok: false, message: 'Ajoutez au minimum un titre ou une situation générale.' };
    }
    return { ok: true };
  }

  global.SICODPS = {
    clearDraft,
    loadDraft,
    saveDraft,
    validate
  };
})(window);
