'use strict';

const path = require('path');
const documentTemplateService = require('../services/document-template-service');

module.exports = function registerSystemRoutes(app) {
  app.get('/api/system/blueprint', (req, res) => {
    res.json({
      storageMode: 'local-sqljs',
      frontend: {
        entrypoint: '/index.html',
        assets: ['/assets/app.css', '/assets/app.js']
      },
      targetCloudflare: {
        frontend: 'Cloudflare Pages',
        api: 'Cloudflare Workers',
        database: 'Cloudflare D1',
        objectStorage: 'Cloudflare R2'
      },
      schemaFiles: {
        d1Target: path.join('backend', 'schema', 'd1-target.sql'),
        documentTemplates: path.join('backend', 'schema', 'document-templates.seed.json')
      }
    });
  });

  app.get('/api/document-templates', (req, res) => {
    res.json({
      items: documentTemplateService.getTemplatesByType(req.query.type || '')
    });
  });
};
