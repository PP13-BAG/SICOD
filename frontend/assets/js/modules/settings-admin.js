(function(global){
  'use strict';

  const REFERENCE_MAP = {
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

  global.SICODSettingsAdmin = {
    getReferenceTableMap() {
      return { ...REFERENCE_MAP };
    }
  };
})(window);
