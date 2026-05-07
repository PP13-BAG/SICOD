'use strict';

const fs = require('fs');
const path = require('path');

const TEMPLATES_PATH = path.join(__dirname, '..', 'schema', 'document-templates.seed.json');

function readTemplates() {
  try {
    const raw = fs.readFileSync(TEMPLATES_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[Templates] Impossible de lire les modèles PDF :', error.message);
    return [];
  }
}

function getTemplatesByType(documentType) {
  const templates = readTemplates();
  return documentType ? templates.filter(item => item.documentType === documentType) : templates;
}

module.exports = {
  getTemplatesByType,
  readTemplates
};
