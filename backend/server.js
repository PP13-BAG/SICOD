/**
 * SICOD — Backend Express
 * Système d'Information du Centre Opérationnel Départemental
 * COD Préfecture des Bouches-du-Rhône (13)
 *
 * Stack  : Node.js + Express + sql.js (SQLite pur JS, zéro dépendance native)
 * Licence : usage interne — ministère de l'Intérieur
 * Version : refactorée
 *
 * ──────────────────────────────────────────────────────────────────────────
 * MIGRATION CLOUDFLARE — points documentés :
 *
 *   [CF-D1]      : Remplacer sql.js par Cloudflare D1 (SQLite managé)
 *                  → chaque `db.run2()` devient `await env.DB.prepare().run()`
 *                  → chaque `db.all()` devient `await env.DB.prepare().all()`
 *
 *   [CF-R2]      : Remplacer le stockage local (DB_PATH, fs.*) par Cloudflare R2
 *                  → retirer l'export/import binaire, D1 gère la persistance
 *
 *   [CF-WORKERS] : Convertir le serveur Express en Worker Cloudflare Pages
 *                  → remplacer app.get/post/patch par ittyRouter ou hono
 *                  → retirer les requires Node.js (fs, path)
 *
 *   [CF-ACCESS]  : Ajouter la vérification du JWT Cloudflare Access
 *                  → middleware `verifyCloudflareAccess(request, env)`
 *
 *   [CF-GRIST]   : Grist reste valide dans Workers (fetch disponible)
 *                  → déplacer la config dans env (wrangler.toml secrets)
 * ──────────────────────────────────────────────────────────────────────────
 */

'use strict';

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');
const initSqlJs = require('sql.js');
const registerSystemRoutes = require('./routes/system.routes');

// ────────────────────────────────────────────────────────────────────────────
// Configuration
// ────────────────────────────────────────────────────────────────────────────

const PORT    = process.env.PORT    || 3000;
const HOST    = process.env.HOST    || '0.0.0.0';

// [CF-R2] Ce chemin sera supprimé lors de la migration vers D1/R2
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_PATH  = path.join(DATA_DIR, 'sicod.db');

// [CF-GRIST] Ces variables seront déplacées dans wrangler.toml secrets
const GRIST_CONFIG = {
  enabled   : !!process.env.GRIST_API_KEY,
  apiKey    : process.env.GRIST_API_KEY  || '',
  serverUrl : process.env.GRIST_SERVER   || 'https://grist.numerique.gouv.fr',
  docId     : process.env.GRIST_DOC_ID   || '',
};

// ────────────────────────────────────────────────────────────────────────────
// Application Express
// ────────────────────────────────────────────────────────────────────────────

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.get(['/assets/banniere.png', '/banniere.png'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'assets', 'banniere.png'));
});
// [CF-WORKERS] Le service de fichiers statiques sera géré par Cloudflare Pages
app.use(express.static(path.join(__dirname, '..', 'frontend')));
registerSystemRoutes(app);

// ────────────────────────────────────────────────────────────────────────────
// Couche base de données — [CF-D1] isolée ici pour faciliter la migration
// ────────────────────────────────────────────────────────────────────────────

/** @type {import('sql.js').Database} */
let db;

/**
 * Schéma SQL — identique pour sql.js (local) et D1 (Cloudflare).
 * [CF-D1] Ce schéma sera appliqué via `wrangler d1 execute`.
 */
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS evenements (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    libelle       TEXT    NOT NULL,
    type_evenement TEXT,
    synergi_id    TEXT,
    date_debut    TEXT,
    commune       TEXT,
    niveau        TEXT,
    description   TEXT,
    statut        TEXT DEFAULT 'actif',
    created_at    TEXT DEFAULT (strftime('%d/%m/%Y %H:%M','now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS points_situation (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    evenement_id      INTEGER,
    numero_ps         INTEGER NOT NULL,
    statut            TEXT DEFAULT 'brouillon',
    date_ps           TEXT DEFAULT (strftime('%d/%m/%Y %H:%M','now','localtime')),
    auteur            TEXT,
    destinataires     TEXT,
    sources           TEXT,
    situation_generale TEXT,
    bilan             TEXT,
    moyens_engages    TEXT,
    mesures_prises    TEXT,
    points_attention  TEXT,
    reseaux_sociaux   TEXT,
    medias            TEXT,
    reactions_politiques TEXT,
    created_at        TEXT DEFAULT (strftime('%d/%m/%Y %H:%M','now','localtime')),
    updated_at        TEXT DEFAULT (strftime('%d/%m/%Y %H:%M','now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS contributions (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    ps_id                 INTEGER,
    service               TEXT NOT NULL,
    auteur_contribution   TEXT,
    horodatage            TEXT DEFAULT (strftime('%d/%m/%Y %H:%M','now','localtime')),
    type_contenu          TEXT,
    situation             TEXT,
    bilan_humain          TEXT,
    bilan_materiel        TEXT,
    bilan_environnemental TEXT,
    moyens                TEXT,
    mesures               TEXT,
    points_attention      TEXT,
    reseaux_sociaux       TEXT,
    medias                TEXT,
    reactions             TEXT,
    contenu_brut          TEXT,
    transcription_audio   TEXT,
    validee               INTEGER DEFAULT 0
  );
`;

/**
 * Initialise la base de données sql.js depuis le fichier ou crée une nouvelle.
 * [CF-D1] Cette fonction entière sera remplacée par l'initialisation D1 dans le Worker.
 */
async function initDB() {
  // [CF-R2] Créer le dossier data — inutile avec D1
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('[DB] Impossible de créer le dossier data :', err.message);
    throw err;
  }

  const SQL = await initSqlJs();

  // Chargement de la base existante ou création
  if (fs.existsSync(DB_PATH)) {
    try {
      db = new SQL.Database(fs.readFileSync(DB_PATH));
      console.log(`  → Base existante chargée : ${DB_PATH}`);
    } catch (err) {
      console.error("[DB] Fichier corrompu - nouvelle base creee :", err.message);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
    console.log('  → Nouvelle base créée');
  }

  // Helpers internes
  // [CF-D1] Ces helpers seront remplacés par des appels D1 natifs
  db.saveDB = () => {
    try {
      fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
    } catch (err) {
      console.error('[DB] Erreur écriture disque :', err.message);
    }
  };

  /**
   * Exécute une requête modifiante puis sauvegarde.
   * [CF-D1] → await env.DB.prepare(sql).bind(...params).run()
   */
  db.run2 = (sql, params) => {
    db.run(sql, params);
    db.saveDB();
  };

  /**
   * Retourne toutes les lignes d'une requête SELECT.
   * [CF-D1] → (await env.DB.prepare(sql).bind(...params).all()).results
   */
  db.all = (sql, params) => {
    const stmt = db.prepare(sql);
    if (params) stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  };

  /**
   * Retourne la première ligne d'une requête SELECT.
   * [CF-D1] → await env.DB.prepare(sql).bind(...params).first()
   */
  db.get = (sql, params) => db.all(sql, params)[0] || null;

  // Application du schéma
  db.run(SCHEMA);
  db.saveDB();

  // Données de démonstration (uniquement si la table est vide)
  if (!db.get('SELECT id FROM evenements LIMIT 1')) {
    db.run2(
      'INSERT INTO evenements (libelle, type_evenement, synergi_id, commune, date_debut, niveau, description) VALUES (?,?,?,?,?,?,?)',
      ['Inondations secteur Aix-en-Provence', 'Inondations', '', 'Aix-en-Provence', new Date().toISOString().slice(0, 10), 'Cellule de suivi', 'Événement de démonstration — à supprimer avant mise en production']
    );
    console.log('  → Événement de démonstration créé');
  }

  console.log(`  → SQLite (sql.js) prêt`);
  console.log(`  → Grist : ${GRIST_CONFIG.enabled ? '✅ connecté' : '⚠️  désactivé (mode local)'}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Intégration Grist (optionnelle)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Pousse un enregistrement vers Grist si configuré.
 * [CF-GRIST] Fonctionne tel quel dans Cloudflare Workers (fetch natif).
 */
async function gristPost(table, fields) {
  if (!GRIST_CONFIG.enabled) return null;
  try {
    const url = `${GRIST_CONFIG.serverUrl}/api/docs/${GRIST_CONFIG.docId}/tables/${table}/records`;
    const res = await fetch(url, {
      method  : 'POST',
      headers : {
        Authorization  : `Bearer ${GRIST_CONFIG.apiKey}`,
        'Content-Type' : 'application/json',
      },
      body: JSON.stringify({ records: [{ fields }] }),
    });
    if (!res.ok) {
      console.warn(`[Grist] Réponse inattendue ${res.status} pour ${table}`);
    }
  } catch (err) {
    console.warn('[Grist] Erreur réseau :', err.message);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Middleware utilitaires
// ────────────────────────────────────────────────────────────────────────────

/** Valide que les champs requis sont présents dans req.body */
function requireFields(fields) {
  return (req, res, next) => {
    const missing = fields.filter(f => req.body[f] === undefined || req.body[f] === null || req.body[f] === '');
    if (missing.length) {
      return res.status(400).json({ success: false, error: `Champs requis manquants : ${missing.join(', ')}` });
    }
    next();
  };
}

/** Retourne l'horodatage local français courant */
function nowFR() {
  return new Date().toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

/** Wrapper pour les routes async — capture les exceptions non gérées */
function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ────────────────────────────────────────────────────────────────────────────
// Routes — montées après initialisation DB
// ────────────────────────────────────────────────────────────────────────────

initDB().then(() => {

  // ── Statut ─────────────────────────────────────────────────────────────────
  app.get('/api/status', (req, res) => {
    res.json({
      success              : true,
      version              : '2.0.0',
      horodatage           : nowFR(),
      ps_total             : (db.get('SELECT COUNT(*) as c FROM points_situation') || {}).c || 0,
      contributions_total  : (db.get('SELECT COUNT(*) as c FROM contributions') || {}).c || 0,
      evenements_actifs    : (db.get("SELECT COUNT(*) as c FROM evenements WHERE statut='actif'") || {}).c || 0,
      grist_connecte       : GRIST_CONFIG.enabled,
    });
  });

  // ── Événements ─────────────────────────────────────────────────────────────
  app.get('/api/evenements', (req, res) => {
    const rows = db.all('SELECT * FROM evenements ORDER BY id DESC');
    res.json({ success: true, data: rows });
  });

  app.post('/api/evenements', requireFields(['libelle']), asyncRoute(async (req, res) => {
    const { libelle, type_evenement, synergi_id, date_debut, commune, niveau, description } = req.body;
    db.run2(
      'INSERT INTO evenements (libelle, type_evenement, synergi_id, commune, date_debut, niveau, description) VALUES (?,?,?,?,?,?,?)',
      [libelle, type_evenement || '', synergi_id || '', commune || '', date_debut || '', niveau || '', description || '']
    );
    const row = db.get('SELECT id FROM evenements ORDER BY id DESC LIMIT 1');
    await gristPost('Evenements', { libelle, type_evenement, date_debut, commune });
    res.status(201).json({ success: true, id: row.id });
  }));

  app.patch('/api/evenements/:id', asyncRoute(async (req, res) => {
    const allowed = ['libelle', 'type_evenement', 'synergi_id', 'commune', 'date_debut', 'niveau', 'description', 'statut'];
    const sets = [], vals = [];
    for (const k of allowed) {
      if (req.body[k] !== undefined) { sets.push(`${k}=?`); vals.push(req.body[k]); }
    }
    if (!sets.length) return res.status(400).json({ success: false, error: 'Aucun champ valide à mettre à jour' });
    vals.push(req.params.id);
    db.run2(`UPDATE evenements SET ${sets.join(',')} WHERE id=?`, vals);
    res.json({ success: true });
  }));

  app.delete('/api/evenements/:id', (req, res) => {
    db.run2('DELETE FROM evenements WHERE id=?', [req.params.id]);
    res.json({ success: true });
  });

  // ── Points de situation ────────────────────────────────────────────────────
  app.get('/api/ps', (req, res) => {
    const rows = db.all(`
      SELECT ps.*, e.libelle AS evenement_libelle, e.type_evenement
      FROM   points_situation ps
      LEFT JOIN evenements e ON ps.evenement_id = e.id
      ORDER BY ps.id DESC
    `);
    res.json({ success: true, data: rows });
  });

  app.get('/api/ps/:id', (req, res) => {
    const ps = db.get('SELECT * FROM points_situation WHERE id=?', [req.params.id]);
    if (!ps) return res.status(404).json({ success: false, error: 'PS non trouvé' });
    const contributions = db.all('SELECT * FROM contributions WHERE ps_id=? ORDER BY id ASC', [req.params.id]);
    res.json({ success: true, data: ps, contributions });
  });

  app.post('/api/ps', requireFields(['evenement_id']), (req, res) => {
    const { evenement_id, auteur } = req.body;
    const last = db.get('SELECT MAX(numero_ps) AS n FROM points_situation WHERE evenement_id=?', [evenement_id]);
    const numero_ps = ((last && last.n) || 0) + 1;
    db.run2(
      'INSERT INTO points_situation (evenement_id, numero_ps, auteur, statut) VALUES (?,?,?,?)',
      [evenement_id, numero_ps, auteur || 'COD 13', 'brouillon']
    );
    const row = db.get('SELECT id FROM points_situation ORDER BY id DESC LIMIT 1');
    res.status(201).json({ success: true, id: row.id, numero_ps });
  });

  app.patch('/api/ps/:id', asyncRoute(async (req, res) => {
    const allowed = [
      'statut', 'situation_generale', 'bilan', 'moyens_engages', 'mesures_prises',
      'points_attention', 'reseaux_sociaux', 'medias', 'reactions_politiques',
      'destinataires', 'sources', 'auteur',
    ];
    const sets = [], vals = [];
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        sets.push(`${k}=?`);
        vals.push(typeof req.body[k] === 'object' ? JSON.stringify(req.body[k]) : req.body[k]);
      }
    }
    if (!sets.length) return res.status(400).json({ success: false, error: 'Aucun champ valide' });
    sets.push('updated_at=?');
    vals.push(nowFR());
    vals.push(req.params.id);
    db.run2(`UPDATE points_situation SET ${sets.join(',')} WHERE id=?`, vals);
    res.json({ success: true });
  }));

  app.delete('/api/ps/:id', (req, res) => {
    db.run2('DELETE FROM contributions WHERE ps_id=?', [req.params.id]);
    db.run2('DELETE FROM points_situation WHERE id=?', [req.params.id]);
    res.json({ success: true });
  });

  // ── Génération automatique d'un PS depuis les contributions ───────────────
  app.post('/api/ps/:id/generer', (req, res) => {
    const ps = db.get('SELECT * FROM points_situation WHERE id=?', [req.params.id]);
    if (!ps) return res.status(404).json({ success: false, error: 'PS non trouvé' });

    const contributions = db.all('SELECT * FROM contributions WHERE ps_id=?', [req.params.id]);
    const ev = ps.evenement_id ? db.get('SELECT * FROM evenements WHERE id=?', [ps.evenement_id]) : null;

    /** Agrège un champ depuis les contributions en éliminant les doublons */
    const agreger = (champ) => {
      const vus = new Set(), lignes = [];
      for (const c of contributions) {
        const val = (c[champ] || '').trim();
        if (!val || vus.has(val.toLowerCase())) continue;
        vus.add(val.toLowerCase());
        lignes.push(`• [${c.service}] ${val}`);
      }
      return lignes.join('\n');
    };

    const now   = new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });
    const evLib = ev ? ev.libelle : 'événement en cours';

    const sitSrc = agreger('situation');
    const situationGenerale = sitSrc ||
      `En date du ${now}, le COD des Bouches-du-Rhone est active dans le cadre de l'evenement "${evLib}". La situation est en cours d'evaluation par les services competents.`;

    const bilanObj = {
      humain          : agreger('bilan_humain')          || 'Aucun bilan humain remonté à ce stade.',
      materiel        : agreger('bilan_materiel')        || 'Aucun bilan matériel remonté à ce stade.',
      environnemental : agreger('bilan_environnemental') || 'Sans objet à ce stade.',
    };

    const moyens  = agreger('moyens')           || "En cours d'évaluation.";
    const mesures = agreger('mesures')           || 'Activation du COD. Mise en veille des services.';
    const points  = agreger('points_attention')  || "Aucun point d'attention particulier à ce stade.";
    const rs      = agreger('reseaux_sociaux')   || 'Aucune information notable sur les réseaux sociaux.';
    const med     = agreger('medias')            || 'Aucun contact médias signalé.';
    const react   = agreger('reactions')         || 'Aucune réaction politique recensée.';
    const sources = JSON.stringify([...new Set(contributions.map(c => c.service).filter(Boolean))]);

    db.run2(`
      UPDATE points_situation
      SET situation_generale=?, bilan=?, moyens_engages=?, mesures_prises=?,
          points_attention=?, reseaux_sociaux=?, medias=?, reactions_politiques=?,
          sources=?, updated_at=?
      WHERE id=?
    `, [situationGenerale, JSON.stringify(bilanObj), moyens, mesures, points, rs, med, react, sources, now, req.params.id]);

    const updated = db.get('SELECT * FROM points_situation WHERE id=?', [req.params.id]);
    res.json({ success: true, data: updated });
  });

  // ── Contributions ──────────────────────────────────────────────────────────
  app.get('/api/contributions/:ps_id', (req, res) => {
    const rows = db.all('SELECT * FROM contributions WHERE ps_id=? ORDER BY id ASC', [req.params.ps_id]);
    res.json({ success: true, data: rows });
  });

  app.post('/api/contributions', requireFields(['ps_id', 'service']), asyncRoute(async (req, res) => {
    const {
      ps_id, service, auteur_contribution, type_contenu,
      situation, bilan_humain, bilan_materiel, bilan_environnemental,
      moyens, mesures, points_attention, reseaux_sociaux, medias,
      reactions, contenu_brut, transcription_audio,
    } = req.body;

    db.run2(`
      INSERT INTO contributions
        (ps_id, service, auteur_contribution, type_contenu,
         situation, bilan_humain, bilan_materiel, bilan_environnemental,
         moyens, mesures, points_attention, reseaux_sociaux, medias,
         reactions, contenu_brut, transcription_audio)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      ps_id, service, auteur_contribution || '', type_contenu || 'formulaire',
      situation || '', bilan_humain || '', bilan_materiel || '', bilan_environnemental || '',
      moyens || '', mesures || '', points_attention || '', reseaux_sociaux || '', medias || '',
      reactions || '', contenu_brut || '', transcription_audio || '',
    ]);

    const row = db.get('SELECT id FROM contributions ORDER BY id DESC LIMIT 1');
    await gristPost('Contributions', { ps_id, service, auteur_contribution, situation });
    res.status(201).json({ success: true, id: row.id });
  }));

  app.patch('/api/contributions/:id', (req, res) => {
    const allowed = ['validee', 'situation', 'bilan_humain', 'bilan_materiel', 'bilan_environnemental', 'moyens', 'mesures', 'points_attention', 'reseaux_sociaux', 'medias', 'reactions'];
    const sets = [], vals = [];
    for (const k of allowed) {
      if (req.body[k] !== undefined) { sets.push(`${k}=?`); vals.push(req.body[k]); }
    }
    if (!sets.length) return res.status(400).json({ success: false, error: 'Aucun champ valide' });
    vals.push(req.params.id);
    db.run2(`UPDATE contributions SET ${sets.join(',')} WHERE id=?`, vals);
    res.json({ success: true });
  });

  app.delete('/api/contributions/:id', (req, res) => {
    db.run2('DELETE FROM contributions WHERE id=?', [req.params.id]);
    res.json({ success: true });
  });

  // ── Gestion des erreurs globale ────────────────────────────────────────────
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('[API Error]', err.message || err);
    res.status(500).json({ success: false, error: 'Erreur interne du serveur' });
  });

  // ── Lancement ──────────────────────────────────────────────────────────────
  app.listen(PORT, HOST, () => {
    console.log(`\n🟢 SICOD démarré : http://localhost:${PORT}`);
    console.log(`   Mode : local (sql.js + Express)`);
    console.log(`   Base : ${DB_PATH}`);
    console.log(`   Grist : ${GRIST_CONFIG.enabled ? '✅ connecté' : '⚠️  désactivé'}\n`);
  });

}).catch(err => {
  console.error("Echec initialisation de la base de donnees :", err);
  process.exit(1);
});
