(function(global){
  'use strict';

  function toText(value, fallback = '') {
    const text = String(value ?? '').trim();
    return text || fallback;
  }

  function readValue(id, fallback = '') {
    const el = document.getElementById(id);
    return el ? toText(el.value, fallback) : fallback;
  }

  function readChecked(id) {
    return !!document.getElementById(id)?.checked;
  }

  function setEmptyState(message, actionLabel, actionHandler) {
    const button = actionLabel && actionHandler
      ? `<button class="fr-btn small" type="button" onclick="${actionHandler}">${actionLabel}</button>`
      : '';
    return `<div class="empty-state"><p class="help">${message}</p>${button}</div>`;
  }

  function notify(message) {
    alert(message);
  }

  function confirmAction(message) {
    return confirm(message);
  }

  global.SICODUI = {
    confirmAction,
    notify,
    readChecked,
    readValue,
    setEmptyState,
    toText
  };
})(window);
