(function(global){
  'use strict';

  global.SICODEvents = {
    getActive(events) {
      return (Array.isArray(events) ? events : []).filter(item => item && !item.deletedAt && item.status !== 'Archivé');
    }
  };
})(window);
