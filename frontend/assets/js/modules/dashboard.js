(function(global){
  'use strict';

  global.SICODDashboard = {
    summarize(state) {
      const events = (state.events || []).filter(item => !item.deletedAt && item.status !== 'Archivé');
      const ps = (state.ps || []).filter(item => !item.deletedAt);
      return {
        activeEvents: events.length,
        publishedPS: ps.filter(item => ['Validé', 'Diffusé'].includes(item.status)).length
      };
    }
  };
})(window);
