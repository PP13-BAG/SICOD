(function(global){
  'use strict';

  function setEmptyState(message, actionLabel, actionHandler) {
    const button = actionLabel && actionHandler
      ? `<button class="fr-btn small" type="button" onclick="${actionHandler}">${actionLabel}</button>`
      : '';
    return `<div class="empty-state"><p class="help">${message}</p>${button}</div>`;
  }

  function notify(message, type) {
    if (typeof global.showToast === 'function') global.showToast(message, type || 'info');
    else alert(message);
  }

  function confirmAction(message) {
    if (typeof global.confirmAsync === 'function') return global.confirmAsync(message);
    return Promise.resolve(confirm(message));
  }

  global.SICODUI = {
    confirmAction,
    notify,
    setEmptyState
  };
})(window);
