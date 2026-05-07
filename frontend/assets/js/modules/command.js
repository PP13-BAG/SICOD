(function(global){
  'use strict';

  const DRAFT_KEY = 'sicodDraftCommandV1';

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
    if (!payload?.eventId) return { ok: false, message: 'Aucun événement sélectionné pour ce message de commandement.' };
    if (!String(payload.typeLabel || '').trim()) return { ok: false, message: 'Type de message manquant.' };
    return { ok: true };
  }

  global.SICODCommand = {
    clearDraft,
    loadDraft,
    saveDraft,
    validate
  };
})(window);
