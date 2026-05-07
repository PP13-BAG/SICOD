(function(global){
  'use strict';

  function slugify(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-_]+/g, '')
      .replace(/-+/g, '-');
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function buildReferenceItem(type, label, index, existing) {
    const trimmed = String(label || '').trim();
    const base = existing || {};
    const createdAt = base.createdAt || nowIso();
    return {
      id: base.id || `${type}_${slugify(trimmed) || index + 1}`,
      type,
      code: base.code || slugify(trimmed) || `${type}-${index + 1}`,
      label: trimmed,
      slug: slugify(trimmed),
      status: base.status || 'active',
      sortOrder: Number.isFinite(base.sortOrder) ? base.sortOrder : index,
      isActive: base.isActive !== false,
      createdAt,
      updatedAt: nowIso(),
      deletedAt: base.deletedAt || null,
      replacedById: base.replacedById || null
    };
  }

  function ensureReferenceCollection(state, type, labels, existingItems) {
    const existingBySlug = new Map(
      (Array.isArray(existingItems) ? existingItems : [])
        .filter(Boolean)
        .map(item => [slugify(item.slug || item.label || item.code || item.id), item])
    );
    const normalized = (Array.isArray(labels) ? labels : [])
      .map(label => String(label || '').trim())
      .filter(Boolean)
      .map((label, index) => {
        const key = slugify(label);
        return buildReferenceItem(type, label, index, existingBySlug.get(key));
      });
    state.referenceData = state.referenceData || {};
    state.referenceData[type] = normalized;
    state.settings = state.settings || {};
    state.settings.dynamicLists = state.settings.dynamicLists || {};
    state.settings.dynamicLists[type] = normalized.map(item => item.label);
    return normalized;
  }

  function ensureReferenceData(state, defaults) {
    state.referenceData = state.referenceData || {};
    Object.entries(defaults || {}).forEach(([type, fallbackLabels]) => {
      const existingItems = Array.isArray(state.referenceData[type]) ? state.referenceData[type] : [];
      const legacyLabels = Array.isArray(state.settings?.dynamicLists?.[type]) ? state.settings.dynamicLists[type] : [];
      const labels = legacyLabels.length ? legacyLabels : (existingItems.length ? existingItems.map(item => item.label) : fallbackLabels);
      ensureReferenceCollection(state, type, labels, existingItems);
    });
    return state.referenceData;
  }

  function getActiveReferenceItems(state, type, defaults) {
    if ((!state.referenceData || !Array.isArray(state.referenceData[type])) && defaults) {
      ensureReferenceData(state, defaults);
    }
    return (state.referenceData?.[type] || [])
      .filter(item => item && item.isActive !== false && !item.deletedAt && item.status !== 'archived')
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || String(a.label || '').localeCompare(String(b.label || ''), 'fr'));
  }

  function getReferenceLabels(state, type, defaults) {
    return getActiveReferenceItems(state, type, defaults).map(item => item.label);
  }

  function setReferenceLabels(state, type, labels) {
    const existingItems = Array.isArray(state.referenceData?.[type]) ? state.referenceData[type] : [];
    return ensureReferenceCollection(state, type, labels, existingItems);
  }

  function resolveReference(state, type, label, defaults) {
    const trimmed = String(label || '').trim();
    const items = getActiveReferenceItems(state, type, defaults);
    const found = items.find(item => item.label === trimmed || item.slug === slugify(trimmed));
    if (found) return found;
    if (!trimmed) return null;
    const created = buildReferenceItem(type, trimmed, items.length);
    state.referenceData = state.referenceData || {};
    state.referenceData[type] = items.concat(created);
    state.settings = state.settings || {};
    state.settings.dynamicLists = state.settings.dynamicLists || {};
    state.settings.dynamicLists[type] = state.referenceData[type].map(item => item.label);
    return created;
  }

  function archiveRecord(collection, id) {
    const record = (Array.isArray(collection) ? collection : []).find(item => item && item.id === id);
    if (!record) return null;
    record.deletedAt = nowIso();
    record.status = record.status === 'active' ? 'archived' : record.status;
    record.updatedAt = nowIso();
    return record;
  }

  function getActiveRecords(collection) {
    return (Array.isArray(collection) ? collection : []).filter(item => item && !item.deletedAt);
  }

  function migrateSnapshots(state) {
    getActiveRecords(state.events).forEach(event => {
      if (event.type && !event.typeLabelSnapshot) event.typeLabelSnapshot = event.type;
    });
    getActiveRecords(state.planItems).forEach(item => {
      if (item.type && !item.typeLabelSnapshot) item.typeLabelSnapshot = item.type;
      if (item.risk && !item.riskLabelSnapshot) item.riskLabelSnapshot = item.risk;
      if (item.priority && !item.priorityLabelSnapshot) item.priorityLabelSnapshot = item.priority;
      if (item.status && !item.statusLabelSnapshot) item.statusLabelSnapshot = item.status;
    });
    getActiveRecords(state.contacts).forEach(contact => {
      if (contact.group && !contact.groupLabelSnapshot) contact.groupLabelSnapshot = contact.group;
      if (contact.entity && !contact.entityLabelSnapshot) contact.entityLabelSnapshot = contact.entity;
    });
    getActiveRecords(state.dutyAvailabilities).forEach(item => {
      if (item.role && !item.roleLabelSnapshot) item.roleLabelSnapshot = item.role;
      if (item.agent && !item.agentLabelSnapshot) item.agentLabelSnapshot = item.agent;
    });
  }

  global.SICODDataModel = {
    archiveRecord,
    ensureReferenceData,
    getActiveRecords,
    getActiveReferenceItems,
    getReferenceLabels,
    migrateSnapshots,
    resolveReference,
    setReferenceLabels,
    slugify
  };
})(window);
