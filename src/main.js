const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const pdf = require('pdf-parse');

let mainWindow;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0f141b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

function initDb() {
  const dbPath = path.join(app.getPath('userData'), 'papers.db');
  db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS papers (
      id INTEGER PRIMARY KEY,
      path TEXT UNIQUE,
      filename TEXT,
      title TEXT,
      authors TEXT,
      subject TEXT,
      abstract TEXT,
      keywords TEXT,
      summary TEXT,
      methods TEXT,
      contributions TEXT,
      key_points TEXT,
      year TEXT,
      category TEXT,
      journal TEXT,
      tags TEXT,
      notes TEXT,
      extracted_text TEXT,
      embedding TEXT,
      embedding_main TEXT,
      embedding_concept TEXT,
      needs_enrichment INTEGER,
      tag_evidence TEXT,
      file_hash TEXT,
      duplicate_of INTEGER,
      file_mtime INTEGER,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_papers_updated ON papers(updated_at);
    CREATE INDEX IF NOT EXISTS idx_papers_title ON papers(title);

    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY,
      type TEXT,
      path TEXT UNIQUE,
      added_at TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS saved_searches (
      id INTEGER PRIMARY KEY,
      name TEXT,
      filters TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS ignore_rules (
      id INTEGER PRIMARY KEY,
      pattern TEXT UNIQUE,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS paper_versions (
      id INTEGER PRIMARY KEY,
      batch_id TEXT,
      paper_id INTEGER,
      title TEXT,
      authors TEXT,
      subject TEXT,
      abstract TEXT,
      keywords TEXT,
      year TEXT,
      category TEXT,
      journal TEXT,
      tags TEXT,
      notes TEXT,
      summary TEXT,
      methods TEXT,
      contributions TEXT,
      key_points TEXT,
      updated_at TEXT,
      created_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_paper_versions_batch ON paper_versions(batch_id);
  `);

  ensureSchema();
  ensureDefaultSettings();
}

function ensureSchema() {
  const columns = db.prepare("PRAGMA table_info('papers')").all();
  const names = new Set(columns.map(col => col.name));
  const alters = [];

  if (!names.has('keywords')) {
    alters.push('ALTER TABLE papers ADD COLUMN keywords TEXT');
  }
  if (!names.has('embedding')) {
    alters.push('ALTER TABLE papers ADD COLUMN embedding TEXT');
  }
  if (!names.has('embedding_main')) {
    alters.push('ALTER TABLE papers ADD COLUMN embedding_main TEXT');
  }
  if (!names.has('embedding_concept')) {
    alters.push('ALTER TABLE papers ADD COLUMN embedding_concept TEXT');
  }
  if (!names.has('needs_enrichment')) {
    alters.push('ALTER TABLE papers ADD COLUMN needs_enrichment INTEGER');
  }
  if (!names.has('tag_evidence')) {
    alters.push('ALTER TABLE papers ADD COLUMN tag_evidence TEXT');
  }
  if (!names.has('summary')) {
    alters.push('ALTER TABLE papers ADD COLUMN summary TEXT');
  }
  if (!names.has('methods')) {
    alters.push('ALTER TABLE papers ADD COLUMN methods TEXT');
  }
  if (!names.has('contributions')) {
    alters.push('ALTER TABLE papers ADD COLUMN contributions TEXT');
  }
  if (!names.has('key_points')) {
    alters.push('ALTER TABLE papers ADD COLUMN key_points TEXT');
  }
  if (!names.has('file_hash')) {
    alters.push('ALTER TABLE papers ADD COLUMN file_hash TEXT');
  }
  if (!names.has('duplicate_of')) {
    alters.push('ALTER TABLE papers ADD COLUMN duplicate_of INTEGER');
  }

  alters.forEach(statement => {
    db.exec(statement);
  });
}

function ensureDefaultSettings() {
  const defaults = {
    ollama_endpoint: 'http://localhost:11434',
    ollama_model: 'llama3',
    ollama_embed_model: 'nomic-embed-text',
    model_provider: 'ollama',
    model_api_base: '',
    model_api_key: '',
    model_chat_model: '',
    model_embed_model: '',
    local_model_mode: '0',
    translate_enabled: '0'
  };

  for (const [key, value] of Object.entries(defaults)) {
    const existing = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    if (!existing) {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, value);
    }
  }
}

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}

function getModelSettings() {
  const localMode = getSetting('local_model_mode') === '1';
  return {
    provider: localMode ? 'ollama' : (getSetting('model_provider') || 'ollama'),
    apiBase: getSetting('model_api_base') || '',
    apiKey: getSetting('model_api_key') || '',
    chatModel: getSetting('model_chat_model') || '',
    embedModel: getSetting('model_embed_model') || '',
    localMode
  };
}

function extractJson(text) {
  const match = String(text || '').match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('Model response not JSON');
  }
  return JSON.parse(match[0]);
}

function createBatchId() {
  return `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function savePaperVersion(batchId, paper) {
  db.prepare(`
    INSERT INTO paper_versions
    (batch_id, paper_id, title, authors, subject, abstract, keywords, year, category, journal, tags, notes, summary, methods, contributions, key_points, updated_at, created_at)
    VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    batchId,
    paper.id,
    paper.title || '',
    paper.authors || '',
    paper.subject || '',
    paper.abstract || '',
    paper.keywords || '',
    paper.year || '',
    paper.category || '',
    paper.journal || '',
    paper.tags || '',
    paper.notes || '',
    paper.summary || '',
    paper.methods || '',
    paper.contributions || '',
    paper.key_points || '',
    paper.updated_at || '',
    new Date().toISOString()
  );
}

async function callChatCompletion(system, user) {
  const settings = getModelSettings();
  if (settings.provider === 'ollama') {
    const endpoint = getSetting('ollama_endpoint');
    const model = getSetting('ollama_model');
    if (!endpoint || !model) {
      throw new Error('Ollama settings missing');
    }
    const prompt = system ? `${system}\n\n${user}` : user;
    const response = await fetch(`${endpoint.replace(/\/$/, '')}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false })
    });
    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }
    const data = await response.json();
    return data.response || '';
  }

  if (!settings.apiBase || !settings.apiKey || !settings.chatModel) {
    throw new Error('Model API settings missing');
  }
  const base = settings.apiBase.replace(/\/$/, '');
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.chatModel,
      messages: [
        system ? { role: 'system', content: system } : null,
        { role: 'user', content: user }
      ].filter(Boolean),
      temperature: 0.2
    })
  });
  if (!response.ok) {
    throw new Error(`Model API error: ${response.status}`);
  }
  const data = await response.json();
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
}

async function embedTextGeneric(text) {
  const settings = getModelSettings();
  if (settings.provider === 'ollama') {
    return await embedText(text);
  }
  if (!settings.apiBase || !settings.apiKey || !settings.embedModel) {
    throw new Error('Embedding API settings missing');
  }
  const base = settings.apiBase.replace(/\/$/, '');
  const response = await fetch(`${base}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.embedModel,
      input: text
    })
  });
  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`);
  }
  const data = await response.json();
  const embedding = data.data && data.data[0] && data.data[0].embedding;
  if (!embedding) {
    throw new Error('Embedding API response missing embedding');
  }
  return embedding;
}

function normalizeTags(tags) {
  if (!tags) return '[]';
  if (Array.isArray(tags)) return JSON.stringify(tags.map(t => t.trim()).filter(Boolean));
  if (typeof tags === 'string') {
    const parts = tags.split(',').map(t => t.trim()).filter(Boolean);
    return JSON.stringify(parts);
  }
  return '[]';
}

function listTags(tagsJson) {
  if (!tagsJson) return [];
  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function listEmbedding(embeddingJson) {
  if (!embeddingJson) return null;
  try {
    const parsed = JSON.parse(embeddingJson);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function listPoints(pointsJson) {
  if (!pointsJson) return [];
  try {
    const parsed = JSON.parse(pointsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizePoints(points) {
  if (!points) return '[]';
  if (Array.isArray(points)) {
    return JSON.stringify(points.map(p => String(p).trim()).filter(Boolean));
  }
  if (typeof points === 'string') {
    const parts = points.split(/\r?\n/).map(p => p.trim()).filter(Boolean);
    return JSON.stringify(parts);
  }
  return '[]';
}

function parseMetadataFromText(text) {
  if (!text) return { title: '', authors: '', abstract: '', keywords: '' };
  const lines = text
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const isMetaLine = (line) => /摘要|关键词|abstract|keywords|introduction|引言/i.test(line);
  const title = lines.find(line => line.length >= 4 && line.length <= 200 && !isMetaLine(line)) || '';

  let authors = '';
  for (let i = 1; i < Math.min(lines.length, 5); i += 1) {
    const line = lines[i];
    if (isMetaLine(line)) break;
    if (/^(作者|Author)[:：]/i.test(line)) {
      authors = line.replace(/^(作者|Author)[:：]\s*/i, '').trim();
      break;
    }
    if (line.length > 2 && line.length <= 120 && /[,，;；]| and |、/.test(line)) {
      authors = line;
      break;
    }
  }

  let abstract = '';
  const abstractMatch = text.match(/(摘要|Abstract)[:：\\s]+([\\s\\S]*?)(关键词|Keywords|1\\.|I\\.|引言|Introduction)/i);
  if (abstractMatch) {
    abstract = abstractMatch[2].replace(/\s+/g, ' ').trim();
  }

  let keywords = '';
  const keywordMatch = text.match(/(关键词|Keywords)[:：\\s]+([\\s\\S]*?)(\\n|$)/i);
  if (keywordMatch) {
    keywords = keywordMatch[2].replace(/\s+/g, ' ').trim();
  }

  return { title, authors, abstract, keywords };
}

function hashBuffer(buffer) {
  return crypto.createHash('sha1').update(buffer).digest('hex');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function patternToRegex(pattern) {
  const escaped = escapeRegex(pattern).replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
  return new RegExp(`^${escaped}$`, 'i');
}

function isIgnored(filePath, patterns) {
  if (!patterns.length) return false;
  return patterns.some(pattern => {
    const trimmed = pattern.trim();
    if (!trimmed) return false;
    const regex = patternToRegex(trimmed);
    return regex.test(filePath) || regex.test(path.basename(filePath));
  });
}

async function extractPdfData(buffer) {
  try {
    const data = await pdf(buffer, { max: 3 });
    const text = (data.text || '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return { text: text.slice(0, 20000), info: data.info || {} };
  } catch (err) {
    return { text: '', info: {} };
  }
}

function cleanPdfText(rawText) {
  if (!rawText) return '';
  const lines = rawText
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const counts = new Map();
  lines.forEach(line => {
    const key = line.toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const cleaned = lines.filter(line => {
    const key = line.toLowerCase();
    const count = counts.get(key) || 0;
    if (count >= 3 && line.length < 80) return false;
    return true;
  });
  return cleaned.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function detectSectionCoverage(text) {
  const abstractMatch = text.match(/(摘要|Abstract)[:：\s]+([\s\S]*?)(关键词|Keywords|1\.|I\.|引言|Introduction)/i);
  const keywordMatch = text.match(/(关键词|Keywords)[:：\s]+([\s\S]*?)(\n|$)/i);
  const introMatch = text.match(/(引言|Introduction)[:：\s]+([\s\S]*?)(\n\n|1\.|I\.|2\.|II\.|方法|Methods)/i);
  const abstractText = abstractMatch ? abstractMatch[2].replace(/\s+/g, ' ').trim() : '';
  const keywordsText = keywordMatch ? keywordMatch[2].replace(/\s+/g, ' ').trim() : '';
  const introText = introMatch ? introMatch[2].replace(/\s+/g, ' ').trim() : '';
  return {
    abstractText,
    keywordsText,
    introText,
    hasAbstract: abstractText.length >= 200,
    hasKeywords: keywordsText.length >= 4,
    hasIntro: introText.length >= 200
  };
}

async function extractPdfDataDynamic(buffer, options = {}) {
  const maxPages = Number(options.maxPages) || 8;
  let pages = Number(options.startPages) || 3;
  let text = '';
  let info = {};
  let coverage = null;

  while (pages <= maxPages) {
    try {
      const data = await pdf(buffer, { max: pages });
      info = data.info || {};
      text = cleanPdfText(data.text || '');
      coverage = detectSectionCoverage(text);
      if (coverage.hasAbstract && coverage.hasKeywords && coverage.hasIntro) break;
    } catch {
      break;
    }
    if (pages >= maxPages) break;
    pages = Math.min(maxPages, pages + 2);
  }
  const needsOcr = text.length < 800;
  return {
    text: text.slice(0, 40000),
    info,
    pagesUsed: pages,
    coverage: coverage || detectSectionCoverage(text),
    needsOcr
  };
}

function listPdfFiles(dirPath) {
  const results = [];
  const stack = [dirPath];

  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

async function upsertPaperFromFile(filePath) {
  const stat = fs.statSync(filePath);
  const mtime = Math.floor(stat.mtimeMs);
  const existing = db.prepare('SELECT id, title, authors, abstract, keywords, file_mtime, file_hash FROM papers WHERE path = ?').get(filePath);
  const buffer = fs.readFileSync(filePath);
  const fileHash = hashBuffer(buffer);

  if (existing && existing.file_mtime === mtime) {
    if (!existing.file_hash || existing.file_hash !== fileHash) {
      db.prepare('UPDATE papers SET file_hash = ?, updated_at = ? WHERE id = ?')
        .run(fileHash, new Date().toISOString(), existing.id);
    }
    return { id: existing.id, skipped: true };
  }

  const duplicate = db.prepare('SELECT id, extracted_text FROM papers WHERE file_hash = ?').get(fileHash);
  let extracted = '';
  let duplicateOf = null;
  let pdfInfo = {};
  if (duplicate && (!existing || duplicate.id !== existing.id)) {
    extracted = duplicate.extracted_text || '';
    duplicateOf = duplicate.id;
  } else {
    const data = await extractPdfData(buffer);
    extracted = data.text;
    pdfInfo = data.info || {};
  }
  const parsedMeta = parseMetadataFromText(extracted);
  const filename = path.basename(filePath);
  const defaultTitle = filename.replace(/\.[^.]+$/, '');
  const now = new Date().toISOString();

  if (existing) {
    const title = existing.title && existing.title.trim() ? existing.title : (parsedMeta.title || pdfInfo.Title || defaultTitle);
    const authors = existing.authors && existing.authors.trim() ? existing.authors : (pdfInfo.Author || parsedMeta.authors || '');
    const abstract = existing.abstract && existing.abstract.trim() ? existing.abstract : parsedMeta.abstract;
    const keywords = existing.keywords && existing.keywords.trim() ? existing.keywords : (pdfInfo.Keywords || parsedMeta.keywords || '');
    db.prepare(`
      UPDATE papers
      SET filename = ?, title = ?, authors = ?, abstract = ?, keywords = ?, extracted_text = ?, file_hash = ?, duplicate_of = ?, file_mtime = ?, updated_at = ?
      WHERE id = ?
    `).run(filename, title, authors, abstract, keywords, extracted, fileHash, duplicateOf, mtime, now, existing.id);

    return { id: existing.id, skipped: false, created: false };
  }

  const info = {
    path: filePath,
    filename,
    title: parsedMeta.title || pdfInfo.Title || defaultTitle,
    authors: pdfInfo.Author || parsedMeta.authors || '',
    subject: '',
    abstract: parsedMeta.abstract || '',
    keywords: pdfInfo.Keywords || parsedMeta.keywords || '',
    summary: '',
    methods: '',
    contributions: '',
    key_points: '[]',
    year: '',
    category: '',
    journal: '',
    tags: '[]',
    notes: '',
    extracted_text: extracted,
    embedding: null,
    embedding_main: null,
    embedding_concept: null,
    needs_enrichment: 0,
    tag_evidence: '',
    file_hash: fileHash,
    duplicate_of: duplicateOf,
    file_mtime: mtime,
    created_at: now,
    updated_at: now
  };

  const stmt = db.prepare(`
    INSERT INTO papers
    (path, filename, title, authors, subject, abstract, keywords, summary, methods, contributions, key_points, year, category, journal, tags, notes, extracted_text, embedding, embedding_main, embedding_concept, needs_enrichment, tag_evidence, file_hash, duplicate_of, file_mtime, created_at, updated_at)
    VALUES
    (@path, @filename, @title, @authors, @subject, @abstract, @keywords, @summary, @methods, @contributions, @key_points, @year, @category, @journal, @tags, @notes, @extracted_text, @embedding, @embedding_main, @embedding_concept, @needs_enrichment, @tag_evidence, @file_hash, @duplicate_of, @file_mtime, @created_at, @updated_at)
  `);
  const res = stmt.run(info);

  return { id: res.lastInsertRowid, skipped: false, created: true };
}

async function scanSources(onProgress) {
  const sources = db.prepare('SELECT id, type, path FROM sources').all();
  const ignorePatterns = db.prepare('SELECT pattern FROM ignore_rules').all().map(row => row.pattern);
  let updated = 0;
  let added = 0;
  const files = [];

  for (const source of sources) {
    if (!fs.existsSync(source.path)) {
      continue;
    }

    if (source.type === 'folder') {
      files.push(...listPdfFiles(source.path));
    } else {
      files.push(source.path);
    }
  }

  const filtered = files.filter(file => !isIgnored(file, ignorePatterns));
  const total = filtered.length;

  for (let index = 0; index < filtered.length; index += 1) {
    const file = filtered[index];
    if (onProgress) {
      onProgress({
        current: index + 1,
        total,
        path: file
      });
    }
    const result = await upsertPaperFromFile(file);
    if (result.skipped) continue;
    if (result.created) added += 1;
    else updated += 1;
  }

  return { updated, added, total };
}

function listIgnoreRules() {
  return db.prepare('SELECT * FROM ignore_rules ORDER BY created_at DESC').all();
}

function addIgnoreRule(pattern) {
  if (!pattern || !pattern.trim()) return false;
  const now = new Date().toISOString();
  db.prepare('INSERT OR IGNORE INTO ignore_rules (pattern, created_at) VALUES (?, ?)').run(pattern.trim(), now);
  return true;
}

function removeIgnoreRule(id) {
  db.prepare('DELETE FROM ignore_rules WHERE id = ?').run(id);
  return true;
}

function listSavedSearches() {
  return db.prepare('SELECT * FROM saved_searches ORDER BY created_at DESC').all();
}

function addSavedSearch(name, filters) {
  const now = new Date().toISOString();
  db.prepare('INSERT INTO saved_searches (name, filters, created_at) VALUES (?, ?, ?)').run(name, JSON.stringify(filters), now);
  return true;
}

function removeSavedSearch(id) {
  db.prepare('DELETE FROM saved_searches WHERE id = ?').run(id);
  return true;
}

function buildWhere(filters) {
  if (typeof filters === 'string') {
    filters = { query: filters };
  }

  const clauses = [];
  const params = [];
  const metadataOnly = Boolean(filters && filters.metadataOnly);
  const matchAny = Boolean(filters && filters.matchAny);
  const scopeFields = Array.isArray(filters && filters.scopeFields) ? filters.scopeFields : [];
  const scopeColumns = Array.from(new Set(scopeFields
    .map(field => {
      if (field === 'title') return 'title';
      if (field === 'authors') return 'authors';
      if (field === 'subject') return 'subject';
      if (field === 'abstract') return 'abstract';
      if (field === 'keywords') return 'keywords';
      if (field === 'tags') return 'tags';
      if (field === 'journal') return 'journal';
      if (field === 'category') return 'category';
      if (field === 'notes') return metadataOnly ? null : 'notes';
      if (field === 'extracted_text') return metadataOnly ? null : 'extracted_text';
      return null;
    })
    .filter(Boolean)));

  if (filters && filters.query) {
    const like = `%${filters.query}%`;
    if (scopeColumns.length) {
      const scopeClause = scopeColumns.map(column => `${column} LIKE ?`).join(' OR ');
      clauses.push(`(${scopeClause})`);
      scopeColumns.forEach(() => params.push(like));
    } else if (metadataOnly) {
      clauses.push('(title LIKE ? OR authors LIKE ? OR subject LIKE ? OR abstract LIKE ? OR keywords LIKE ? OR tags LIKE ? OR journal LIKE ? OR category LIKE ?)');
      params.push(like, like, like, like, like, like, like, like);
    } else {
      clauses.push('(title LIKE ? OR authors LIKE ? OR subject LIKE ? OR abstract LIKE ? OR keywords LIKE ? OR tags LIKE ? OR notes LIKE ? OR extracted_text LIKE ?)');
      params.push(like, like, like, like, like, like, like, like);
    }
  }

  if (filters && filters.title) {
    clauses.push('title LIKE ?');
    params.push(`%${filters.title}%`);
  }

  if (filters && filters.authors) {
    clauses.push('authors LIKE ?');
    params.push(`%${filters.authors}%`);
  }

  if (filters && filters.subject) {
    clauses.push('subject LIKE ?');
    params.push(`%${filters.subject}%`);
  }

  if (filters && filters.category) {
    clauses.push('category LIKE ?');
    params.push(`%${filters.category}%`);
  }

  if (filters && filters.journal) {
    clauses.push('journal LIKE ?');
    params.push(`%${filters.journal}%`);
  }

  if (filters && filters.abstract) {
    clauses.push('abstract LIKE ?');
    params.push(`%${filters.abstract}%`);
  }

  if (filters && filters.keywords) {
    const like = `%${filters.keywords}%`;
    if (metadataOnly) {
      clauses.push('(keywords LIKE ? OR title LIKE ? OR abstract LIKE ? OR subject LIKE ? OR journal LIKE ? OR category LIKE ?)');
      params.push(like, like, like, like, like, like);
    } else {
      clauses.push('(keywords LIKE ? OR title LIKE ? OR abstract LIKE ? OR subject LIKE ? OR notes LIKE ? OR extracted_text LIKE ?)');
      params.push(like, like, like, like, like, like);
    }
  }

  if (filters && (filters.yearFrom || filters.yearTo)) {
    if (filters.yearFrom && filters.yearTo) {
      clauses.push('(CAST(year AS INTEGER) >= ? AND CAST(year AS INTEGER) <= ?)');
      params.push(Number(filters.yearFrom), Number(filters.yearTo));
    } else if (filters.yearFrom) {
      clauses.push('CAST(year AS INTEGER) >= ?');
      params.push(Number(filters.yearFrom));
    } else if (filters.yearTo) {
      clauses.push('CAST(year AS INTEGER) <= ?');
      params.push(Number(filters.yearTo));
    }
  } else if (filters && filters.year) {
    clauses.push('year LIKE ?');
    params.push(`%${filters.year}%`);
  }

  if (filters && filters.tags) {
    const tagList = String(filters.tags)
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
    tagList.forEach(tag => {
      clauses.push('(tags LIKE ? OR keywords LIKE ?)');
      params.push(`%${tag}%`, `%${tag}%`);
    });
  }

  if (filters && filters.needsEnrichment) {
    clauses.push('needs_enrichment = 1');
  }

  const where = clauses.length ? `WHERE ${clauses.join(matchAny ? ' OR ' : ' AND ')}` : '';
  return { where, params };
}

function resolveSort(sortBy) {
  switch (sortBy) {
    case 'year_desc':
      return 'CAST(year AS INTEGER) DESC';
    case 'year_asc':
      return 'CAST(year AS INTEGER) ASC';
    case 'title_asc':
      return 'title ASC';
    case 'score_desc':
    case 'updated_desc':
    default:
      return 'updated_at DESC';
  }
}

async function listPapers(filters) {
  if (filters && filters.semanticQuery) {
    return await listPapersSemantic(filters);
  }
  const base = `
    SELECT id, title, authors, subject, abstract, keywords, year, category, journal, tags, path, updated_at
    FROM papers
  `;
  const countBase = 'SELECT COUNT(*) as total FROM papers';
  const { where, params } = buildWhere(filters);
  const page = Math.max(1, Number(filters && filters.page) || 1);
  const pageSize = Math.max(1, Number(filters && filters.pageSize) || 20);
  const offset = (page - 1) * pageSize;
  const orderBy = resolveSort(filters && filters.sortBy);

  const stmt = db.prepare(`
    ${base}
    ${where}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `);
  const rows = stmt.all(...params, pageSize, offset).map(row => ({
    ...row,
    tags: listTags(row.tags)
  }));
  const totalRow = db.prepare(`${countBase} ${where}`).get(...params);

  return { items: rows, total: totalRow ? totalRow.total : 0 };
}

async function listPapersSemantic(filters) {
  const baseFilters = { ...(filters || {}) };
  delete baseFilters.semanticQuery;
  delete baseFilters.semanticMinScore;
  delete baseFilters.semanticGenerateMissing;
  delete baseFilters.semanticMaxGenerate;
  const { where, params } = buildWhere(baseFilters);
  const rows = db.prepare(`
    SELECT id, title, authors, subject, abstract, keywords, year, category, journal, tags, path, updated_at, extracted_text, embedding
    FROM papers
    ${where}
  `).all(...params);

  const queryEmbedding = await embedTextGeneric(filters.semanticQuery);
  const minScore = Number(filters.semanticMinScore) || 0;
  const generateMissing = Boolean(filters.semanticGenerateMissing);
  const maxGenerate = Number(filters.semanticMaxGenerate) || 40;
  let generated = 0;

  const scored = [];
  for (const row of rows) {
    let embedding = listEmbedding(row.embedding);
    if (!embedding && generateMissing && generated < maxGenerate) {
      const text = buildEmbeddingText(row);
      if (text) {
        embedding = await embedTextGeneric(text);
        db.prepare('UPDATE papers SET embedding = ?, updated_at = ? WHERE id = ?')
          .run(JSON.stringify(embedding), new Date().toISOString(), row.id);
        generated += 1;
      }
    }
    const score = embedding ? cosineSimilarity(queryEmbedding, embedding) : 0;
    if (score >= minScore) {
      scored.push({
        ...row,
        tags: listTags(row.tags),
        score
      });
    }
  }

  const sortBy = filters.sortBy || 'score_desc';
  scored.sort((a, b) => {
    if (sortBy === 'year_desc') {
      return Number(b.year || 0) - Number(a.year || 0);
    }
    if (sortBy === 'year_asc') {
      return Number(a.year || 0) - Number(b.year || 0);
    }
    if (sortBy === 'title_asc') {
      return String(a.title || '').localeCompare(String(b.title || ''));
    }
    if (sortBy === 'updated_desc') {
      return String(b.updated_at || '').localeCompare(String(a.updated_at || ''));
    }
    return b.score - a.score;
  });

  const page = Math.max(1, Number(filters && filters.page) || 1);
  const pageSize = Math.max(1, Number(filters && filters.pageSize) || 20);
  const offset = (page - 1) * pageSize;
  const items = scored.slice(offset, offset + pageSize);
  return { items, total: scored.length };
}

function buildExtractionInput(cleanText, sections) {
  const parts = [];
  if (sections && sections.abstract_block) parts.push(sections.abstract_block);
  if (sections && sections.keywords_block) parts.push(sections.keywords_block);
  if (sections && sections.intro_block) parts.push(sections.intro_block);
  const merged = parts.length ? parts.join('\n') : cleanText;
  return merged.slice(0, 16000);
}

function buildSummaryInput(cleanText, sections) {
  const parts = [];
  if (sections && sections.abstract_block) parts.push(sections.abstract_block);
  if (sections && sections.intro_block) parts.push(sections.intro_block);
  const merged = parts.length ? parts.join('\n') : cleanText;
  return merged.slice(0, 14000);
}

function collectTagVocabulary() {
  const rows = db.prepare('SELECT tags FROM papers').all();
  const set = new Set();
  rows.forEach(row => {
    listTags(row.tags || '[]').forEach(tag => set.add(tag));
  });
  return Array.from(set);
}

async function extractAllMetadata(payload, onProgress) {
  const ids = payload && Array.isArray(payload.ids) ? payload.ids : null;
  const saveArchive = payload && typeof payload.saveArchive === 'boolean' ? payload.saveArchive : true;
  const papers = ids && ids.length
    ? db.prepare(`SELECT * FROM papers WHERE id IN (${ids.map(() => '?').join(', ')}) ORDER BY id ASC`).all(...ids)
    : db.prepare('SELECT * FROM papers ORDER BY id ASC').all();
  const total = papers.length;
  const batchId = createBatchId();
  let updated = 0;
  let current = 0;
  const tagVocabulary = collectTagVocabulary();

  for (const paper of papers) {
    current += 1;
    if (onProgress) {
      onProgress({ current, total, id: paper.id, title: paper.title || '' });
    }
    let text = paper.extracted_text || '';
    let coverage = null;
    let needsOcr = false;
    if (paper.path && fs.existsSync(paper.path)) {
      try {
        const buffer = fs.readFileSync(paper.path);
        const dynamic = await extractPdfDataDynamic(buffer, { maxPages: 8, startPages: 3 });
        if (dynamic.text) {
          text = dynamic.text;
          coverage = dynamic.coverage;
          needsOcr = dynamic.needsOcr;
        }
      } catch {
        // ignore
      }
    }
    if (!text) continue;
    try {
      if (saveArchive) {
        savePaperVersion(batchId, paper);
      }
      const sections = await llmDetectSections(text.slice(0, 16000));
      const extractionInput = buildExtractionInput(text, sections);
      const meta = await llmExtractMetadataV2(extractionInput, sections);
      const summaryInput = buildSummaryInput(text, sections);
      const summary = await llmSummarizeV2(summaryInput, sections);
      const tags = await llmExtractTagsV2(extractionInput, sections, tagVocabulary);

      const nextTags = tags.tags.map(item => item.name);
      const confidence = meta.confidence || {};
      const lowConfidence = Object.values(confidence).some(value => Number(value) > 0 && Number(value) < 0.5);
      const coverageOk = coverage ? (coverage.hasAbstract && coverage.hasKeywords && coverage.hasIntro) : true;
      const needsEnrichment = Boolean(needsOcr || (meta.missing && meta.missing.length) || lowConfidence || !coverageOk);

      const next = {
        title: meta.title || paper.title || '',
        authors: meta.authors.length ? meta.authors.join(', ') : (paper.authors || ''),
        subject: paper.subject || '',
        abstract: meta.abstract || paper.abstract || '',
        keywords: meta.keywords_raw.length ? meta.keywords_raw.join(', ') : (paper.keywords || ''),
        year: meta.year || paper.year || '',
        category: paper.category || '',
        journal: meta.venue || paper.journal || '',
        tags: nextTags.length ? JSON.stringify(nextTags) : (paper.tags || '[]'),
        summary: summary.summary || paper.summary || '',
        methods: paper.methods || '',
        contributions: summary.contributions.length ? summary.contributions.join('\n') : (paper.contributions || ''),
        key_points: summary.contributions.length ? JSON.stringify(summary.contributions) : (paper.key_points || '[]'),
        extracted_text: text,
        needs_enrichment: needsEnrichment ? 1 : 0,
        tag_evidence: JSON.stringify(tags.tags || [])
      };
      db.prepare(`
        UPDATE papers
        SET title = ?, authors = ?, subject = ?, abstract = ?, keywords = ?, year = ?, category = ?, journal = ?, tags = ?, summary = ?, methods = ?, contributions = ?, key_points = ?, extracted_text = ?, needs_enrichment = ?, tag_evidence = ?, updated_at = ?
        WHERE id = ?
      `).run(
        next.title,
        next.authors,
        next.subject,
        next.abstract,
        next.keywords,
        next.year,
        next.category,
        next.journal,
        next.tags,
        next.summary,
        next.methods,
        next.contributions,
        next.key_points,
        next.extracted_text,
        next.needs_enrichment,
        next.tag_evidence,
        new Date().toISOString(),
        paper.id
      );
      updated += 1;
    } catch (err) {
      continue;
    }
  }

  return { total, updated };
}

function rollbackLastExtraction() {
  const latest = db.prepare('SELECT batch_id FROM paper_versions ORDER BY created_at DESC LIMIT 1').get();
  if (!latest || !latest.batch_id) return { ok: false };
  const rows = db.prepare('SELECT * FROM paper_versions WHERE batch_id = ?').all(latest.batch_id);
  if (!rows.length) return { ok: false };
  rows.forEach(row => {
    db.prepare(`
      UPDATE papers
      SET title = ?, authors = ?, subject = ?, abstract = ?, keywords = ?, year = ?, category = ?, journal = ?, tags = ?, notes = ?, summary = ?, methods = ?, contributions = ?, key_points = ?, updated_at = ?
      WHERE id = ?
    `).run(
      row.title,
      row.authors,
      row.subject,
      row.abstract,
      row.keywords,
      row.year,
      row.category,
      row.journal,
      row.tags,
      row.notes,
      row.summary,
      row.methods,
      row.contributions,
      row.key_points,
      row.updated_at || new Date().toISOString(),
      row.paper_id
    );
  });
  db.prepare('DELETE FROM paper_versions WHERE batch_id = ?').run(latest.batch_id);
  return { ok: true };
}

function getPaper(id) {
  const row = db.prepare('SELECT * FROM papers WHERE id = ?').get(id);
  if (!row) return null;
  return { ...row, tags: listTags(row.tags), key_points: listPoints(row.key_points) };
}

function upsertPaper(paper) {
  const now = new Date().toISOString();
  const existing = paper.id
    ? db.prepare('SELECT path, filename, file_mtime, embedding, embedding_main, embedding_concept, needs_enrichment, tag_evidence, file_hash, duplicate_of FROM papers WHERE id = ?').get(paper.id)
    : null;
  const rawPath = typeof paper.path === 'string' ? paper.path.trim() : '';
  const nextPath = rawPath ? rawPath : (existing ? existing.path : null);
  const rawFilename = typeof paper.filename === 'string' ? paper.filename.trim() : '';
  const nextFilename = rawFilename
    ? rawFilename
    : (rawPath ? path.basename(rawPath) : (existing ? existing.filename : ''));
  const nextMtime = Number.isFinite(paper.file_mtime) ? paper.file_mtime : (existing ? existing.file_mtime : null);
  const payload = {
    path: nextPath,
    filename: nextFilename,
    title: paper.title || '',
    authors: paper.authors || '',
    subject: paper.subject || '',
    abstract: paper.abstract || '',
    keywords: paper.keywords || '',
    summary: paper.summary || '',
    methods: paper.methods || '',
    contributions: paper.contributions || '',
    key_points: normalizePoints(paper.key_points),
    year: paper.year || '',
    category: paper.category || '',
    journal: paper.journal || '',
    tags: normalizeTags(paper.tags),
    notes: paper.notes || '',
    extracted_text: paper.extracted_text || '',
    embedding: paper.embedding || (existing ? existing.embedding : null),
    embedding_main: paper.embedding_main || (existing ? existing.embedding_main : null),
    embedding_concept: paper.embedding_concept || (existing ? existing.embedding_concept : null),
    needs_enrichment: typeof paper.needs_enrichment === 'number' ? paper.needs_enrichment : (existing ? existing.needs_enrichment : 0),
    tag_evidence: paper.tag_evidence || (existing ? existing.tag_evidence : ''),
    file_hash: paper.file_hash || (existing ? existing.file_hash : null),
    duplicate_of: typeof paper.duplicate_of === 'number' ? paper.duplicate_of : (existing ? existing.duplicate_of : null),
    file_mtime: nextMtime,
    updated_at: now
  };

  if (paper.id) {
    db.prepare(`
      UPDATE papers
      SET path = @path,
          filename = @filename,
          title = @title,
          authors = @authors,
          subject = @subject,
          abstract = @abstract,
          keywords = @keywords,
          summary = @summary,
          methods = @methods,
          contributions = @contributions,
          key_points = @key_points,
          year = @year,
          category = @category,
          journal = @journal,
          tags = @tags,
          notes = @notes,
          extracted_text = @extracted_text,
          embedding = @embedding,
          embedding_main = @embedding_main,
          embedding_concept = @embedding_concept,
          needs_enrichment = @needs_enrichment,
          tag_evidence = @tag_evidence,
          file_hash = @file_hash,
          duplicate_of = @duplicate_of,
          file_mtime = @file_mtime,
          updated_at = @updated_at
      WHERE id = @id
    `).run({ ...payload, id: paper.id });

    return paper.id;
  }

  const insertPayload = {
    ...payload,
    created_at: now
  };

  const res = db.prepare(`
    INSERT INTO papers
    (path, filename, title, authors, subject, abstract, keywords, summary, methods, contributions, key_points, year, category, journal, tags, notes, extracted_text, embedding, embedding_main, embedding_concept, needs_enrichment, tag_evidence, file_hash, duplicate_of, file_mtime, created_at, updated_at)
    VALUES
    (@path, @filename, @title, @authors, @subject, @abstract, @keywords, @summary, @methods, @contributions, @key_points, @year, @category, @journal, @tags, @notes, @extracted_text, @embedding, @embedding_main, @embedding_concept, @needs_enrichment, @tag_evidence, @file_hash, @duplicate_of, @file_mtime, @created_at, @updated_at)
  `).run(insertPayload);

  return res.lastInsertRowid;
}

function deletePaper(id) {
  db.prepare('DELETE FROM papers WHERE id = ?').run(id);
}

async function llmRank(query, items) {
  const system = 'You are a scholarly search assistant. Return JSON only.';
  const user = `Rank the papers by relevance to the query.\n\nQuery: ${query}\n\nPapers:\n${JSON.stringify(items)}\n\nReturn JSON only with the shape: {"ordered_ids":[1,2],"notes":{"1":"why","2":"why"}}`;
  const raw = await callChatCompletion(system, user);
  return extractJson(raw);
}

async function llmTranslateFields(fields) {
  const payload = {};
  Object.entries(fields || {}).forEach(([key, value]) => {
    if (typeof value === 'string' && value.trim()) {
      payload[key] = value.trim();
    }
  });
  if (!Object.keys(payload).length) {
    return {};
  }
  const system = 'You are a translation engine. Translate any non-Chinese text to Simplified Chinese. Preserve proper nouns and citations. If the text is already Chinese, keep it unchanged. Return JSON only with the same keys.';
  const user = `Input JSON:\n${JSON.stringify(payload)}\n\nReturn JSON only.`;
  const parsed = extractJson(await callChatCompletion(system, user));
  const result = {};
  Object.keys(payload).forEach(key => {
    const translated = parsed && typeof parsed[key] === 'string' ? parsed[key].trim() : '';
    result[key] = translated || payload[key];
  });
  return result;
}

async function llmExtractMetadata(text) {
  const system = 'You are a research metadata extractor. Return JSON only.';
  const user = `Extract metadata from the following paper text. Return JSON only with keys: title, authors, year, journal, category, subject, abstract, keywords, tags.\n\nRules:\n- abstract should be 2-5 sentences if present.\n- keywords and tags must be lists of short phrases.\n- If uncertain, use empty string or empty list.\n\nText:\n${text}\n`;
  const parsed = extractJson(await callChatCompletion(system, user));
  return {
    title: String(parsed.title || '').trim(),
    authors: String(parsed.authors || '').trim(),
    year: String(parsed.year || '').trim(),
    journal: String(parsed.journal || '').trim(),
    category: String(parsed.category || '').trim(),
    subject: String(parsed.subject || '').trim(),
    abstract: String(parsed.abstract || '').trim(),
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map(k => String(k).trim()).filter(Boolean) : [],
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(t => String(t).trim()).filter(Boolean) : []
  };
}

async function llmSummarize(paper) {
  const text = buildEmbeddingText(paper);
  if (!text) throw new Error('No text to summarize');
  const system = 'You are a research assistant. Return JSON only.';
  const user = `Summarize the paper for a research assistant. Return JSON only with keys: summary, methods, contributions, key_points.\n\nsummary: 3-5 sentences.\nmethods: 2-4 sentences.\ncontributions: 2-4 sentences.\nkey_points: list of short bullet points.\n\nText:\n${text}\n`;
  const parsed = extractJson(await callChatCompletion(system, user));
  return {
    summary: String(parsed.summary || '').trim(),
    methods: String(parsed.methods || '').trim(),
    contributions: String(parsed.contributions || '').trim(),
    key_points: Array.isArray(parsed.key_points) ? parsed.key_points.map(p => String(p).trim()).filter(Boolean) : []
  };
}

async function llmExpandRecallQuery(query, profile) {
  const system = 'You are a query expansion assistant. Return JSON only.';
  const user = `Generate multi-query expansions for recall. Output JSON only with keys: rewrites, related_terms, excludes.\n\nRules:\n- rewrites: 3-6 paraphrases, include Chinese/English/abbreviations when relevant.\n- related_terms: 6-20 related concepts, methods, synonyms.\n- excludes: terms the user wants to exclude if mentioned.\n\nUser query:\n${query}\n\nRecall profile: ${profile}\n`;
  const parsed = extractJson(await callChatCompletion(system, user));
  return {
    rewrites: Array.isArray(parsed.rewrites) ? parsed.rewrites.map(v => String(v).trim()).filter(Boolean) : [],
    related_terms: Array.isArray(parsed.related_terms) ? parsed.related_terms.map(v => String(v).trim()).filter(Boolean) : [],
    excludes: Array.isArray(parsed.excludes) ? parsed.excludes.map(v => String(v).trim()).filter(Boolean) : []
  };
}

async function llmDetectSections(text) {
  const system = 'You are a section locator. Return JSON only.';
  const user = `Locate paper sections. Return JSON only with keys: title_block, authors_block, abstract_block, keywords_block, intro_block, found.\n\nfound should be an object with boolean fields: title, authors, abstract, keywords, intro.\n\nText:\n${text}\n`;
  const parsed = extractJson(await callChatCompletion(system, user));
  return {
    title_block: String(parsed.title_block || '').trim(),
    authors_block: String(parsed.authors_block || '').trim(),
    abstract_block: String(parsed.abstract_block || '').trim(),
    keywords_block: String(parsed.keywords_block || '').trim(),
    intro_block: String(parsed.intro_block || '').trim(),
    found: typeof parsed.found === 'object' && parsed.found
      ? {
        title: Boolean(parsed.found.title),
        authors: Boolean(parsed.found.authors),
        abstract: Boolean(parsed.found.abstract),
        keywords: Boolean(parsed.found.keywords),
        intro: Boolean(parsed.found.intro)
      }
      : { title: false, authors: false, abstract: false, keywords: false, intro: false }
  };
}

async function llmExtractMetadataV2(text, sections) {
  const system = 'You are a research metadata extractor. Return JSON only.';
  const user = `Extract metadata from the provided text. Return JSON only with keys: title, authors, year, venue, doi, abstract, keywords_raw, confidence, missing.\n\nRules:\n- authors should be a list of names.\n- year can be number or null.\n- venue is journal/conference if known.\n- keywords_raw is a list of phrases.\n- confidence is an object with fields: title, authors, year, venue, abstract, keywords.\n- missing is a list of missing fields.\n\nSections:\n${JSON.stringify(sections)}\n\nText:\n${text}\n`;
  const parsed = extractJson(await callChatCompletion(system, user));
  return {
    title: String(parsed.title || '').trim(),
    authors: Array.isArray(parsed.authors) ? parsed.authors.map(v => String(v).trim()).filter(Boolean) : [],
    year: parsed.year ? String(parsed.year).trim() : '',
    venue: String(parsed.venue || '').trim(),
    doi: String(parsed.doi || '').trim(),
    abstract: String(parsed.abstract || '').trim(),
    keywords_raw: Array.isArray(parsed.keywords_raw) ? parsed.keywords_raw.map(v => String(v).trim()).filter(Boolean) : [],
    confidence: typeof parsed.confidence === 'object' && parsed.confidence
      ? parsed.confidence
      : {},
    missing: Array.isArray(parsed.missing) ? parsed.missing.map(v => String(v).trim()).filter(Boolean) : []
  };
}

async function llmSummarizeV2(text, sections) {
  const system = 'You are a research assistant. Return JSON only.';
  const user = `Summarize the paper. Return JSON only with keys: contributions, summary, coverage_gaps.\n\nRules:\n- contributions: 5-10 short sentences.\n- summary: 4-6 sentences.\n- coverage_gaps: list possible missing points.\n\nSections:\n${JSON.stringify(sections)}\n\nText:\n${text}\n`;
  const parsed = extractJson(await callChatCompletion(system, user));
  return {
    contributions: Array.isArray(parsed.contributions) ? parsed.contributions.map(v => String(v).trim()).filter(Boolean) : [],
    summary: String(parsed.summary || '').trim(),
    coverage_gaps: Array.isArray(parsed.coverage_gaps) ? parsed.coverage_gaps.map(v => String(v).trim()).filter(Boolean) : []
  };
}

async function llmExtractTagsV2(text, sections, tagVocabulary) {
  const system = 'You are a keyphrase/tagging assistant. Return JSON only.';
  const user = `Generate tags and keyphrases. Return JSON only with keys: candidate_keyphrases, tags, new_tag_suggestions.\n\nRules:\n- candidate_keyphrases: 20-40 items.\n- tags: list of objects {name, type, confidence, evidence}.\n- evidence should be a short quote from text.\n- Use provided vocabulary when possible.\n\nVocabulary:\n${JSON.stringify(tagVocabulary)}\n\nSections:\n${JSON.stringify(sections)}\n\nText:\n${text}\n`;
  const parsed = extractJson(await callChatCompletion(system, user));
  const tags = Array.isArray(parsed.tags) ? parsed.tags.map(item => ({
    name: String(item.name || '').trim(),
    type: String(item.type || '').trim(),
    confidence: Number(item.confidence) || 0,
    evidence: String(item.evidence || '').trim()
  })).filter(item => item.name) : [];
  return {
    candidate_keyphrases: Array.isArray(parsed.candidate_keyphrases) ? parsed.candidate_keyphrases.map(v => String(v).trim()).filter(Boolean) : [],
    tags,
    new_tag_suggestions: Array.isArray(parsed.new_tag_suggestions) ? parsed.new_tag_suggestions.map(v => String(v).trim()).filter(Boolean) : []
  };
}

async function embedText(text) {
  const endpoint = getSetting('ollama_endpoint');
  const model = getSetting('ollama_embed_model');
  if (!endpoint || !model) {
    throw new Error('Ollama embed settings missing');
  }

  const response = await fetch(`${endpoint.replace(/\/$/, '')}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: text })
  });

  if (!response.ok) {
    throw new Error(`Ollama embed error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.embedding) {
    throw new Error('Ollama embed response missing embedding');
  }

  return data.embedding;
}

async function parseModelQuery(query) {
  const system = 'You are a search assistant for a local paper library. Return JSON only.';
  const user = `Parse the user request into structured filters for searching papers. Return JSON only with keys: semanticQuery, title, authors, subject, tags, keywords, category, journal, yearFrom, yearTo.\n\nRules:\n- semanticQuery should capture the intent in natural language for semantic search.\n- If user asks for AI-related papers even if not in title, include that in semanticQuery and keywords/tags.\n- Use empty string for unknown fields.\n\nUser request:\n${query}`;
  const parsed = extractJson(await callChatCompletion(system, user));
  return {
    semanticQuery: String(parsed.semanticQuery || '').trim(),
    title: String(parsed.title || '').trim(),
    authors: String(parsed.authors || '').trim(),
    subject: String(parsed.subject || '').trim(),
    tags: String(parsed.tags || '').trim(),
    keywords: String(parsed.keywords || '').trim(),
    category: String(parsed.category || '').trim(),
    journal: String(parsed.journal || '').trim(),
    yearFrom: String(parsed.yearFrom || '').trim(),
    yearTo: String(parsed.yearTo || '').trim()
  };
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCsv(rows) {
  const header = [
    'title',
    'authors',
    'year',
    'category',
    'journal',
    'subject',
    'keywords',
    'tags',
    'summary',
    'methods',
    'contributions',
    'abstract',
    'path'
  ];
  const lines = [header.join(',')];
  rows.forEach(row => {
    const tags = listTags(row.tags).join('; ');
    const line = [
      row.title,
      row.authors,
      row.year,
      row.category,
      row.journal,
      row.subject,
      row.keywords,
      tags,
      row.summary,
      row.methods,
      row.contributions,
      row.abstract,
      row.path
    ].map(csvEscape).join(',');
    lines.push(line);
  });
  return lines.join('\n');
}

function selectPapersByIds(ids) {
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(', ');
  return db.prepare(`SELECT * FROM papers WHERE id IN (${placeholders})`).all(...ids);
}

async function exportBulk(format, ids) {
  const rows = selectPapersByIds(ids);
  if (!rows.length) return false;
  let content = '';
  let extension = 'txt';

  if (format === 'bibtex') {
    content = rows.map(formatBibTeX).join('\n');
    extension = 'bib';
  } else if (format === 'apa') {
    content = rows.map(formatAPA).join('\n');
    extension = 'txt';
  } else if (format === 'mla') {
    content = rows.map(formatMLA).join('\n');
    extension = 'txt';
  } else if (format === 'ieee') {
    content = rows.map(formatIEEE).join('\n');
    extension = 'txt';
  } else if (format === 'ris') {
    content = rows.map(formatRIS).join('\n\n');
    extension = 'ris';
  } else if (format === 'csv') {
    content = buildCsv(rows);
    extension = 'csv';
  } else {
    throw new Error('Unknown export format');
  }

  const result = await dialog.showSaveDialog({
    defaultPath: `papers.${extension}`,
    filters: [{ name: 'Export', extensions: [extension] }]
  });
  if (result.canceled || !result.filePath) return false;
  fs.writeFileSync(result.filePath, content);
  return true;
}

async function exportClassifiedFolders(payload) {
  const dimension = payload && payload.dimension ? payload.dimension : 'year';
  const labels = payload && Array.isArray(payload.labels) ? payload.labels : [];
  if (!labels.length) return { ok: false };
  const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
  if (result.canceled || !result.filePaths.length) return { ok: false };
  const baseDir = result.filePaths[0];

  labels.forEach(label => {
    const folderName = sanitizeFolderName(label);
    const targetDir = path.join(baseDir, folderName);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    const papers = selectPapersByDimension(dimension, label);
    papers.forEach(paper => {
      if (!paper.path || !fs.existsSync(paper.path)) return;
      const filename = path.basename(paper.path);
      let destPath = path.join(targetDir, filename);
      if (fs.existsSync(destPath)) {
        const ext = path.extname(filename);
        const base = path.basename(filename, ext);
        let index = 1;
        while (fs.existsSync(destPath)) {
          destPath = path.join(targetDir, `${base}_${index}${ext}`);
          index += 1;
        }
      }
      fs.copyFileSync(paper.path, destPath);
    });
  });
  return { ok: true };
}

async function exportPdfFiles(ids) {
  const rows = selectPapersByIds(ids || []);
  if (!rows.length) return { ok: false };
  const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
  if (result.canceled || !result.filePaths.length) return { ok: false };
  const baseDir = result.filePaths[0];
  rows.forEach(paper => {
    if (!paper.path || !fs.existsSync(paper.path)) return;
    const filename = path.basename(paper.path);
    let destPath = path.join(baseDir, filename);
    if (fs.existsSync(destPath)) {
      const ext = path.extname(filename);
      const base = path.basename(filename, ext);
      let index = 1;
      while (fs.existsSync(destPath)) {
        destPath = path.join(baseDir, `${base}_${index}${ext}`);
        index += 1;
      }
    }
    fs.copyFileSync(paper.path, destPath);
  });
  return { ok: true };
}

function buildEmbeddingText(paper) {
  const parts = [paper.title, paper.authors, paper.subject, paper.abstract, paper.extracted_text].filter(Boolean);
  return parts.join('\n').slice(0, 12000);
}

function buildMainEmbeddingText(paper) {
  const parts = [paper.title, paper.abstract].filter(Boolean);
  return parts.join('\n').slice(0, 8000);
}

function buildConceptEmbeddingText(paper) {
  const tags = listTags(paper.tags || '[]');
  const parts = [
    tags.join(', '),
    paper.keywords,
    paper.summary,
    paper.subject,
    paper.methods
  ].filter(Boolean);
  return parts.join('\n').slice(0, 8000);
}

function tokenizeQuery(query) {
  return String(query || '')
    .toLowerCase()
    .split(/[\s,;，；/|]+/)
    .map(t => t.trim())
    .filter(Boolean);
}

function findSnippet(text, term) {
  if (!text || !term) return '';
  const lower = text.toLowerCase();
  const idx = lower.indexOf(term.toLowerCase());
  if (idx === -1) return '';
  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + term.length + 30);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i];
    const bv = b[i];
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom ? dot / denom : 0;
}

function addTagsToPapers(ids, tags) {
  const tagList = tags
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);

  if (!tagList.length) return 0;
  const now = new Date().toISOString();
  let updated = 0;

  ids.forEach(id => {
    const row = db.prepare('SELECT tags FROM papers WHERE id = ?').get(id);
    if (!row) return;
    const existing = listTags(row.tags);
    const merged = Array.from(new Set([...existing, ...tagList]));
    db.prepare('UPDATE papers SET tags = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(merged), now, id);
    updated += 1;
  });

  return updated;
}

function formatBibTeX(paper) {
  const author = paper.authors || 'Unknown';
  const year = paper.year || 'n.d.';
  const title = paper.title || 'Untitled';
  const journal = paper.journal || '';
  const key = `${author.split(',')[0].replace(/\s+/g, '')}${year}`.replace(/[^a-zA-Z0-9]/g, '') || `paper${paper.id}`;
  return `@article{${key},\n  title={${title}},\n  author={${author}},\n  journal={${journal}},\n  year={${year}}\n}\n`;
}

function formatAPA(paper) {
  const author = paper.authors || 'Unknown';
  const year = paper.year || 'n.d.';
  const title = paper.title || 'Untitled';
  const journal = paper.journal || '';
  return `${author} (${year}). ${title}. ${journal}.`;
}

function formatMLA(paper) {
  const author = paper.authors || 'Unknown';
  const year = paper.year || 'n.d.';
  const title = paper.title || 'Untitled';
  const journal = paper.journal || '';
  return `${author}. "${title}." ${journal}, ${year}.`;
}

function formatIEEE(paper) {
  const author = paper.authors || 'Unknown';
  const year = paper.year || 'n.d.';
  const title = paper.title || 'Untitled';
  const journal = paper.journal || '';
  return `${author}, "${title}," ${journal}, ${year}.`;
}

function formatRIS(paper) {
  const authors = (paper.authors || '').split(/[,;，；]/).map(a => a.trim()).filter(Boolean);
  const tags = listTags(paper.tags || '[]');
  const lines = [
    'TY  - JOUR',
    `TI  - ${paper.title || 'Untitled'}`,
    `JO  - ${paper.journal || ''}`,
    `PY  - ${paper.year || ''}`
  ];
  authors.forEach(author => lines.push(`AU  - ${author}`));
  tags.forEach(tag => lines.push(`KW  - ${tag}`));
  if (paper.abstract) lines.push(`AB  - ${paper.abstract}`);
  lines.push('ER  - ');
  return lines.join('\n');
}

function sanitizeFolderName(name) {
  return String(name || 'Uncategorized').replace(/[\\/:*?"<>|]/g, '_').trim() || 'Uncategorized';
}

function incrementMap(map, key) {
  if (!key) return;
  const next = map.get(key) || 0;
  map.set(key, next + 1);
}

function computeStats(dimension) {
  const rows = db.prepare('SELECT year, authors, subject, tags, category, journal FROM papers').all();
  const map = new Map();
  rows.forEach(row => {
    if (dimension === 'year') {
      incrementMap(map, row.year || '未知');
      return;
    }
    if (dimension === 'authors') {
      const parts = String(row.authors || '').split(/[,;，；]/).map(v => v.trim()).filter(Boolean);
      if (!parts.length) incrementMap(map, '未知');
      parts.forEach(part => incrementMap(map, part));
      return;
    }
    if (dimension === 'subject') {
      incrementMap(map, row.subject || '未知');
      return;
    }
    if (dimension === 'tags') {
      const tags = listTags(row.tags);
      if (!tags.length) incrementMap(map, '未标记');
      tags.forEach(tag => incrementMap(map, tag));
      return;
    }
    if (dimension === 'category') {
      incrementMap(map, row.category || '未知');
      return;
    }
    if (dimension === 'journal') {
      incrementMap(map, row.journal || '未知');
      return;
    }
  });
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function selectPapersByDimension(dimension, label) {
  if (dimension === 'year') {
    if (label === '未知') {
      return db.prepare('SELECT * FROM papers WHERE year IS NULL OR TRIM(year) = ""').all();
    }
    return db.prepare('SELECT * FROM papers WHERE year = ?').all(label);
  }
  if (dimension === 'authors') {
    if (label === '未知') {
      return db.prepare('SELECT * FROM papers WHERE authors IS NULL OR TRIM(authors) = ""').all();
    }
    return db.prepare('SELECT * FROM papers WHERE authors LIKE ?').all(`%${label}%`);
  }
  if (dimension === 'subject') {
    if (label === '未知') {
      return db.prepare('SELECT * FROM papers WHERE subject IS NULL OR TRIM(subject) = ""').all();
    }
    return db.prepare('SELECT * FROM papers WHERE subject LIKE ?').all(`%${label}%`);
  }
  if (dimension === 'tags') {
    if (label === '未标记') {
      return db.prepare('SELECT * FROM papers WHERE tags IS NULL OR TRIM(tags) = "" OR tags = "[]"').all();
    }
    return db.prepare('SELECT * FROM papers WHERE tags LIKE ?').all(`%${label}%`);
  }
  if (dimension === 'category') {
    if (label === '未知') {
      return db.prepare('SELECT * FROM papers WHERE category IS NULL OR TRIM(category) = ""').all();
    }
    return db.prepare('SELECT * FROM papers WHERE category LIKE ?').all(`%${label}%`);
  }
  if (dimension === 'journal') {
    if (label === '未知') {
      return db.prepare('SELECT * FROM papers WHERE journal IS NULL OR TRIM(journal) = ""').all();
    }
    return db.prepare('SELECT * FROM papers WHERE journal LIKE ?').all(`%${label}%`);
  }
  return [];
}

async function collectPapersByFilters(filters) {
  if (filters && filters.semanticQuery) {
    const baseFilters = { ...(filters || {}) };
    delete baseFilters.semanticQuery;
    delete baseFilters.semanticMinScore;
    delete baseFilters.semanticGenerateMissing;
    delete baseFilters.semanticMaxGenerate;
    const { where, params } = buildWhere(baseFilters);
    const rows = db.prepare(`
      SELECT id, title, authors, subject, abstract, keywords, year, category, journal, tags, path, updated_at, extracted_text, embedding
      FROM papers
      ${where}
    `).all(...params);

    const queryEmbedding = await embedTextGeneric(filters.semanticQuery);
    const minScore = Number(filters.semanticMinScore) || 0;
    const generateMissing = Boolean(filters.semanticGenerateMissing);
    const maxGenerate = Number(filters.semanticMaxGenerate) || 40;
    let generated = 0;
    const scored = [];
    for (const row of rows) {
      let embedding = listEmbedding(row.embedding);
      if (!embedding && generateMissing && generated < maxGenerate) {
        const text = buildEmbeddingText(row);
        if (text) {
          embedding = await embedTextGeneric(text);
          db.prepare('UPDATE papers SET embedding = ?, updated_at = ? WHERE id = ?')
            .run(JSON.stringify(embedding), new Date().toISOString(), row.id);
          generated += 1;
        }
      }
      const score = embedding ? cosineSimilarity(queryEmbedding, embedding) : 0;
      if (score >= minScore) {
        scored.push({ ...row, score });
      }
    }
    const sortBy = filters.sortBy || 'score_desc';
    scored.sort((a, b) => {
      if (sortBy === 'year_desc') return Number(b.year || 0) - Number(a.year || 0);
      if (sortBy === 'year_asc') return Number(a.year || 0) - Number(b.year || 0);
      if (sortBy === 'title_asc') return String(a.title || '').localeCompare(String(b.title || ''));
      if (sortBy === 'updated_desc') return String(b.updated_at || '').localeCompare(String(a.updated_at || ''));
      return (b.score || 0) - (a.score || 0);
    });
    return scored;
  }

  const base = `
    SELECT id, title, authors, subject, abstract, keywords, year, category, journal, tags, path, updated_at
    FROM papers
  `;
  const { where, params } = buildWhere(filters);
  const orderBy = resolveSort(filters && filters.sortBy);
  return db.prepare(`${base} ${where} ORDER BY ${orderBy}`).all(...params).map(row => ({
    ...row,
    tags: listTags(row.tags)
  }));
}

function getRecallProfile(profile) {
  if (profile === 'loose') {
    return { topK: 600, rewrites: 6, relatedTerms: 20, minScore: 0.2, maxGenerate: 120, weights: { bm25: 0.25, cos_main: 0.35, cos_concept: 0.35, tag_boost: 0.2 } };
  }
  if (profile === 'strict') {
    return { topK: 150, rewrites: 3, relatedTerms: 6, minScore: 0.45, maxGenerate: 60, weights: { bm25: 0.35, cos_main: 0.25, cos_concept: 0.2, tag_boost: 0.25 } };
  }
  return { topK: 300, rewrites: 5, relatedTerms: 12, minScore: 0.3, maxGenerate: 90, weights: { bm25: 0.3, cos_main: 0.3, cos_concept: 0.25, tag_boost: 0.2 } };
}

function computeLexicalScore(paper, terms) {
  const fields = [
    { key: 'title', weight: 3, text: paper.title || '' },
    { key: 'abstract', weight: 2, text: paper.abstract || '' },
    { key: 'keywords', weight: 2, text: paper.keywords || '' },
    { key: 'notes', weight: 1, text: paper.notes || '' },
    { key: 'extracted_text', weight: 1, text: paper.extracted_text || '' }
  ];
  let score = 0;
  let reason = null;
  for (const term of terms) {
    for (const field of fields) {
      const haystack = field.text.toLowerCase();
      if (haystack.includes(term)) {
        score += field.weight;
        if (!reason) {
          reason = {
            field: field.key,
            match: term,
            snippet: findSnippet(field.text, term)
          };
        }
        break;
      }
    }
  }
  return { score, reason };
}

function computeTagScore(tags, terms) {
  const lowered = tags.map(tag => String(tag).toLowerCase());
  let score = 0;
  const matches = [];
  terms.forEach(term => {
    const hit = lowered.find(tag => tag.includes(term));
    if (hit) {
      score += 1;
      matches.push(hit);
    }
  });
  return { score, matches };
}

function addReason(meta, reason) {
  if (!reason || !reason.match) return;
  const exists = meta.reasons.some(item => item.field === reason.field && item.match === reason.match);
  if (exists) return;
  meta.reasons.push(reason);
}

async function aiRecallSearch(payload) {
  const query = String(payload.query || '').trim();
  const filters = payload.filters || {};
  const profile = payload.profile || 'balanced';
  const page = Math.max(1, Number(payload.page) || 1);
  const pageSize = Math.max(1, Number(payload.pageSize) || 20);
  const rrfK = 60;
  const recallProfile = getRecallProfile(profile);
  if (typeof payload.minScoreOverride === 'number' && Number.isFinite(payload.minScoreOverride)) {
    recallProfile.minScore = Math.max(0, Math.min(1, payload.minScoreOverride));
  }
  if (!query) {
    return { query: '', mode: 'ai_recall', recall_profile: profile, total: 0, page, pageSize, candidates: [], items: [] };
  }
  let expansion = { rewrites: [], related_terms: [], excludes: [] };
  const semanticEnabled = payload.semanticEnabled !== false;

  try {
    expansion = await llmExpandRecallQuery(query, profile);
  } catch {
    expansion = { rewrites: [], related_terms: [], excludes: [] };
  }

  const rewriteQueries = [query, ...expansion.rewrites]
    .map(item => String(item || '').trim())
    .filter(Boolean);
  const uniqueQueries = Array.from(new Set(rewriteQueries)).slice(0, recallProfile.rewrites);
  const relatedTerms = expansion.related_terms.slice(0, recallProfile.relatedTerms);
  const excludeTerms = expansion.excludes.map(item => item.toLowerCase());

  const baseFilters = { ...filters };
  delete baseFilters.query;
  delete baseFilters.semanticQuery;
  delete baseFilters.semanticMinScore;
  delete baseFilters.semanticGenerateMissing;
  delete baseFilters.semanticMaxGenerate;
  const { where, params } = buildWhere(baseFilters);
  const rows = db.prepare(`
    SELECT id, title, authors, subject, abstract, keywords, year, category, journal, tags, notes, summary, methods, extracted_text, embedding_main, embedding_concept, updated_at
    FROM papers
    ${where}
  `).all(...params);

  const filteredRows = rows.filter(row => {
    if (!excludeTerms.length) return true;
    const haystack = [
      row.title, row.abstract, row.keywords, row.notes, row.summary,
      ...listTags(row.tags || '[]')
    ].filter(Boolean).join(' ').toLowerCase();
    return !excludeTerms.some(term => haystack.includes(term));
  });

  const metaMap = new Map();
  const rrfMap = new Map();
  const embeddingMainCache = new Map();
  const embeddingConceptCache = new Map();
  let generatedMain = 0;
  let generatedConcept = 0;

  const getMeta = (id) => {
    if (!metaMap.has(id)) {
      metaMap.set(id, { rrf: 0, bm25: 0, cos_main: 0, cos_concept: 0, tag_boost: 0, reasons: [] });
    }
    return metaMap.get(id);
  };

  const applyRrf = (list) => {
    list.forEach((item, index) => {
      const rank = index + 1;
      const score = 1 / (rrfK + rank);
      rrfMap.set(item.id, (rrfMap.get(item.id) || 0) + score);
    });
  };

  for (const q of uniqueQueries) {
    const termSet = new Set();
    tokenizeQuery(q).forEach(term => termSet.add(term));
    relatedTerms.forEach(term => termSet.add(String(term).toLowerCase()));
    const terms = Array.from(termSet).filter(term => term.length >= 2);

    const lexicalScores = filteredRows.map(row => {
      const { score, reason } = computeLexicalScore(row, terms);
      return { id: row.id, score, reason };
    }).filter(item => item.score > 0);
    lexicalScores.sort((a, b) => b.score - a.score);
    const lexicalTop = lexicalScores.slice(0, recallProfile.topK);
    const maxLex = lexicalTop[0] ? lexicalTop[0].score : 1;
    applyRrf(lexicalTop);
    lexicalTop.forEach(item => {
      const meta = getMeta(item.id);
      meta.bm25 = Math.max(meta.bm25, item.score / maxLex);
      addReason(meta, item.reason);
    });

    const tagScores = filteredRows.map(row => {
      const tags = listTags(row.tags || '[]');
      const { score, matches } = computeTagScore(tags, terms);
      return { id: row.id, score, matches };
    }).filter(item => item.score > 0);
    tagScores.sort((a, b) => b.score - a.score);
    const tagTop = tagScores.slice(0, recallProfile.topK);
    const maxTag = tagTop[0] ? tagTop[0].score : 1;
    applyRrf(tagTop);
    tagTop.forEach(item => {
      const meta = getMeta(item.id);
      meta.tag_boost = Math.max(meta.tag_boost, item.score / maxTag);
      if (item.matches.length) {
        addReason(meta, { field: 'tags', match: item.matches[0], snippet: item.matches[0] });
      }
    });

    let queryEmbeddingMain = null;
    let queryEmbeddingConcept = null;
    if (semanticEnabled) {
      try {
        queryEmbeddingMain = await embedTextGeneric(q);
        queryEmbeddingConcept = await embedTextGeneric([q, relatedTerms.join(' ')].filter(Boolean).join('\n'));
      } catch {
        queryEmbeddingMain = null;
        queryEmbeddingConcept = null;
      }
    }

    if (queryEmbeddingMain) {
      const semanticMain = [];
      for (const row of filteredRows) {
        let embedding = embeddingMainCache.get(row.id) || listEmbedding(row.embedding_main);
        if (!embedding && generatedMain < recallProfile.maxGenerate) {
          const text = buildMainEmbeddingText(row);
          if (text) {
            embedding = await embedTextGeneric(text);
            db.prepare('UPDATE papers SET embedding_main = ?, updated_at = ? WHERE id = ?')
              .run(JSON.stringify(embedding), new Date().toISOString(), row.id);
            generatedMain += 1;
          }
        }
        if (embedding) {
          embeddingMainCache.set(row.id, embedding);
          const score = cosineSimilarity(queryEmbeddingMain, embedding);
          if (score >= recallProfile.minScore) {
            semanticMain.push({ id: row.id, score });
          }
        }
      }
      semanticMain.sort((a, b) => b.score - a.score);
      const mainTop = semanticMain.slice(0, recallProfile.topK);
      const maxMain = mainTop[0] ? mainTop[0].score : 1;
      applyRrf(mainTop);
      mainTop.forEach(item => {
        const meta = getMeta(item.id);
        meta.cos_main = Math.max(meta.cos_main, item.score / maxMain);
      });
    }

    if (queryEmbeddingConcept) {
      const semanticConcept = [];
      for (const row of filteredRows) {
        let embedding = embeddingConceptCache.get(row.id) || listEmbedding(row.embedding_concept);
        if (!embedding && generatedConcept < recallProfile.maxGenerate) {
          const text = buildConceptEmbeddingText(row);
          if (text) {
            embedding = await embedTextGeneric(text);
            db.prepare('UPDATE papers SET embedding_concept = ?, updated_at = ? WHERE id = ?')
              .run(JSON.stringify(embedding), new Date().toISOString(), row.id);
            generatedConcept += 1;
          }
        }
        if (embedding) {
          embeddingConceptCache.set(row.id, embedding);
          const score = cosineSimilarity(queryEmbeddingConcept, embedding);
          if (score >= recallProfile.minScore) {
            semanticConcept.push({ id: row.id, score });
          }
        }
      }
      semanticConcept.sort((a, b) => b.score - a.score);
      const conceptTop = semanticConcept.slice(0, recallProfile.topK);
      const maxConcept = conceptTop[0] ? conceptTop[0].score : 1;
      applyRrf(conceptTop);
      conceptTop.forEach(item => {
        const meta = getMeta(item.id);
        meta.cos_concept = Math.max(meta.cos_concept, item.score / maxConcept);
      });
    }
  }

  const scored = filteredRows.map(row => {
    const meta = getMeta(row.id);
    meta.rrf = rrfMap.get(row.id) || 0;
    const score = meta.rrf
      + meta.bm25 * recallProfile.weights.bm25
      + meta.cos_main * recallProfile.weights.cos_main
      + meta.cos_concept * recallProfile.weights.cos_concept
      + meta.tag_boost * recallProfile.weights.tag_boost;
    return {
      ...row,
      tags: listTags(row.tags || '[]'),
      score,
      breakdown: {
        rrf: meta.rrf,
        bm25: meta.bm25,
        cos_main: meta.cos_main,
        cos_concept: meta.cos_concept,
        tag_boost: meta.tag_boost
      },
      reasons: meta.reasons.slice(0, 3)
    };
  }).filter(item => item.score > 0);

  scored.sort((a, b) => b.score - a.score);
  const total = scored.length;
  const offset = (page - 1) * pageSize;
  const items = scored.slice(offset, offset + pageSize);
  return {
    query,
    mode: 'ai_recall',
    recall_profile: profile,
    total,
    page,
    pageSize,
    candidates: items.map(item => ({
      paper_id: item.id,
      score: item.score,
      breakdown: item.breakdown,
      reasons: item.reasons
    })),
    items
  };
}

async function exportByFilter(payload) {
  const filters = payload && payload.filters ? payload.filters : {};
  const format = payload && payload.format ? payload.format : 'csv';
  const rows = await collectPapersByFilters(filters);
  if (!rows.length) return { ok: false };

  if (format === 'csv') {
    const result = await dialog.showSaveDialog({
      defaultPath: 'model_results.csv',
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    });
    if (result.canceled || !result.filePath) return { ok: false };
    fs.writeFileSync(result.filePath, buildCsv(rows));
    return { ok: true };
  }
  if (format === 'pdf') {
    const ids = rows.map(row => row.id);
    return await exportPdfFiles(ids);
  }
  return { ok: false };
}

async function summarizeBatch(ids) {
  const list = selectPapersByIds(ids || []);
  let updated = 0;
  for (const paper of list) {
    try {
      const summary = await llmSummarize(paper);
      db.prepare('UPDATE papers SET summary = ?, methods = ?, contributions = ?, key_points = ?, updated_at = ? WHERE id = ?')
        .run(summary.summary, summary.methods, summary.contributions, JSON.stringify(summary.key_points), new Date().toISOString(), paper.id);
      updated += 1;
    } catch {
      continue;
    }
  }
  return { ok: true, updated };
}

async function pingOllama() {
  const endpoint = getSetting('ollama_endpoint');
  if (!endpoint) throw new Error('Ollama settings missing');
  const response = await fetch(`${endpoint.replace(/\/$/, '')}/api/tags`, { method: 'GET' });
  if (!response.ok) {
    return { ok: false, models: [] };
  }
  let models = [];
  try {
    const data = await response.json();
    if (data && Array.isArray(data.models)) {
      models = data.models
        .map(item => String(item.name || '').trim())
        .filter(Boolean);
    }
  } catch {
    models = [];
  }
  return { ok: true, models };
}

app.whenReady().then(() => {
  initDb();
  Menu.setApplicationMenu(null);
  createWindow();

  ipcMain.handle('get-settings', () => ({
    ollama_endpoint: getSetting('ollama_endpoint'),
    ollama_model: getSetting('ollama_model'),
    ollama_embed_model: getSetting('ollama_embed_model'),
    model_provider: getSetting('model_provider'),
    model_api_base: getSetting('model_api_base'),
    model_api_key: getSetting('model_api_key'),
    model_chat_model: getSetting('model_chat_model'),
    model_embed_model: getSetting('model_embed_model'),
    local_model_mode: getSetting('local_model_mode') === '1',
    translate_enabled: getSetting('translate_enabled') === '1'
  }));

  ipcMain.handle('set-settings', (_, settings) => {
    if (typeof settings.ollama_endpoint === 'string') setSetting('ollama_endpoint', settings.ollama_endpoint);
    if (typeof settings.ollama_model === 'string') setSetting('ollama_model', settings.ollama_model);
    if (typeof settings.ollama_embed_model === 'string') setSetting('ollama_embed_model', settings.ollama_embed_model);
    if (typeof settings.model_provider === 'string') setSetting('model_provider', settings.model_provider);
    if (typeof settings.model_api_base === 'string') setSetting('model_api_base', settings.model_api_base);
    if (typeof settings.model_api_key === 'string') setSetting('model_api_key', settings.model_api_key);
    if (typeof settings.model_chat_model === 'string') setSetting('model_chat_model', settings.model_chat_model);
    if (typeof settings.model_embed_model === 'string') setSetting('model_embed_model', settings.model_embed_model);
    if (typeof settings.local_model_mode === 'boolean') {
      setSetting('local_model_mode', settings.local_model_mode ? '1' : '0');
    }
    if (typeof settings.local_model_mode === 'string') {
      setSetting('local_model_mode', settings.local_model_mode === '1' ? '1' : '0');
    }
    if (typeof settings.translate_enabled === 'boolean') {
      setSetting('translate_enabled', settings.translate_enabled ? '1' : '0');
    }
    if (typeof settings.translate_enabled === 'string') {
      setSetting('translate_enabled', settings.translate_enabled === '1' ? '1' : '0');
    }
    return true;
  });

  ipcMain.handle('list-sources', () => db.prepare('SELECT * FROM sources ORDER BY added_at DESC').all());

  ipcMain.handle('add-source', (_, source) => {
    const now = new Date().toISOString();
    db.prepare('INSERT OR IGNORE INTO sources (type, path, added_at) VALUES (?, ?, ?)').run(source.type, source.path, now);
    return true;
  });

  ipcMain.handle('remove-source', (_, id) => {
    db.prepare('DELETE FROM sources WHERE id = ?').run(id);
    return true;
  });

  ipcMain.handle('pick-source', async (_, type) => {
    const options = type === 'folder'
      ? { properties: ['openDirectory'] }
      : { properties: ['openFile', 'multiSelections'], filters: [{ name: 'PDF', extensions: ['pdf'] }] };

    const result = await dialog.showOpenDialog(options);
    if (result.canceled) return [];
    return result.filePaths;
  });

  ipcMain.handle('scan-sources', async () => await scanSources((progress) => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('scan-progress', progress);
    }
  }));

  ipcMain.handle('list-papers', async (_, filters) => await listPapers(filters));
  ipcMain.handle('ai-recall-search', async (_, payload) => await aiRecallSearch(payload || {}));

  ipcMain.handle('get-paper', (_, id) => getPaper(id));

  ipcMain.handle('upsert-paper', (_, paper) => upsertPaper(paper));

  ipcMain.handle('delete-paper', (_, id) => deletePaper(id));

  ipcMain.handle('open-file', (_, filePath) => shell.openPath(filePath));
  ipcMain.handle('open-folder', (_, filePath) => shell.showItemInFolder(filePath));

  ipcMain.handle('llm-rank', async (_, payload) => await llmRank(payload.query, payload.items));
  ipcMain.handle('ollama-ping', async () => await pingOllama());
  ipcMain.handle('model-parse-query', async (_, payload) => {
    const filters = await parseModelQuery(payload.query || '');
    return { filters, semanticQuery: filters.semanticQuery };
  });
  ipcMain.handle('translate-paper', async (_, payload) => {
    return await llmTranslateFields(payload && payload.fields ? payload.fields : {});
  });
  ipcMain.handle('get-stats', (_, payload) => {
    const dimension = payload && payload.dimension ? payload.dimension : 'year';
    return { items: computeStats(dimension) };
  });
  ipcMain.handle('export-classified', async (_, payload) => await exportClassifiedFolders(payload));
  ipcMain.handle('extract-all-metadata', async (_, payload) => await extractAllMetadata(payload, (progress) => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('extract-progress', progress);
    }
  }));
  ipcMain.handle('rollback-extract', () => rollbackLastExtraction());

  ipcMain.handle('ollama-extract-metadata', async (_, payload) => {
    const paper = getPaper(payload.id);
    if (!paper || !paper.extracted_text) {
      throw new Error('No extracted text available');
    }
    return await llmExtractMetadata(paper.extracted_text);
  });

  ipcMain.handle('ollama-summarize', async (_, payload) => {
    const paper = getPaper(payload.id);
    if (!paper) throw new Error('Paper not found');
    const summary = await llmSummarize(paper);
    db.prepare('UPDATE papers SET summary = ?, methods = ?, contributions = ?, key_points = ?, updated_at = ? WHERE id = ?')
      .run(summary.summary, summary.methods, summary.contributions, JSON.stringify(summary.key_points), new Date().toISOString(), paper.id);
    return summary;
  });

  ipcMain.handle('bulk-tag', (_, payload) => addTagsToPapers(payload.ids || [], payload.tags || ''));

  ipcMain.handle('bulk-export', async (_, payload) => await exportBulk(payload.format, payload.ids || []));
  ipcMain.handle('export-pdf', async (_, payload) => await exportPdfFiles(payload.ids || []));
  ipcMain.handle('export-by-filter', async (_, payload) => await exportByFilter(payload));
  ipcMain.handle('summarize-batch', async (_, payload) => await summarizeBatch(payload.ids || []));

  ipcMain.handle('export-citation', async (_, payload) => {
    const paper = getPaper(payload.id);
    if (!paper) {
      throw new Error('Paper not found');
    }
    const format = payload.format;
    let content = '';
    let extension = 'txt';
    if (format === 'bibtex') {
      content = formatBibTeX(paper);
      extension = 'bib';
    } else if (format === 'apa') {
      content = formatAPA(paper);
      extension = 'txt';
    } else if (format === 'mla') {
      content = formatMLA(paper);
      extension = 'txt';
    } else if (format === 'ieee') {
      content = formatIEEE(paper);
      extension = 'txt';
    } else if (format === 'ris') {
      content = formatRIS(paper);
      extension = 'ris';
    } else {
      throw new Error('Unknown export format');
    }
    const result = await dialog.showSaveDialog({
      defaultPath: `${paper.title || 'citation'}.${extension}`,
      filters: [{ name: 'Citation', extensions: [extension] }]
    });
    if (result.canceled || !result.filePath) return false;
    fs.writeFileSync(result.filePath, content);
    return true;
  });

  ipcMain.handle('find-similar', async (_, payload) => {
    const paper = getPaper(payload.id);
    if (!paper) throw new Error('Paper not found');

    let targetEmbedding = listEmbedding(paper.embedding);
    if (!targetEmbedding) {
      const text = buildEmbeddingText(paper);
      if (!text) throw new Error('No text to embed');
      targetEmbedding = await embedTextGeneric(text);
      db.prepare('UPDATE papers SET embedding = ?, updated_at = ? WHERE id = ?')
        .run(JSON.stringify(targetEmbedding), new Date().toISOString(), paper.id);
    }

    const candidates = db.prepare('SELECT id, title, authors, year, subject, abstract, extracted_text, embedding FROM papers WHERE id != ?').all(paper.id);
    let generated = 0;

    if (payload.generateMissing) {
      for (const candidate of candidates) {
        if (candidate.embedding) continue;
        if (generated >= (payload.maxGenerate || 20)) break;
        const text = buildEmbeddingText(candidate);
        if (!text) continue;
        const embedding = await embedTextGeneric(text);
        candidate.embedding = JSON.stringify(embedding);
        db.prepare('UPDATE papers SET embedding = ?, updated_at = ? WHERE id = ?')
          .run(candidate.embedding, new Date().toISOString(), candidate.id);
        generated += 1;
      }
    }
    const ranked = candidates
      .map(item => {
        const embedding = listEmbedding(item.embedding);
        const score = cosineSimilarity(targetEmbedding, embedding || []);
        return { id: item.id, title: item.title, authors: item.authors, year: item.year, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, payload.limit || 5);

    return ranked;
  });

  ipcMain.handle('ensure-embedding', async (_, payload) => {
    const paper = getPaper(payload.id);
    if (!paper) throw new Error('Paper not found');
    const text = buildEmbeddingText(paper);
    if (!text) throw new Error('No text to embed');
    const embedding = await embedTextGeneric(text);
    db.prepare('UPDATE papers SET embedding = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(embedding), new Date().toISOString(), paper.id);
    return true;
  });

  ipcMain.handle('list-ignore-rules', () => listIgnoreRules());
  ipcMain.handle('add-ignore-rule', (_, pattern) => addIgnoreRule(pattern));
  ipcMain.handle('remove-ignore-rule', (_, id) => removeIgnoreRule(id));

  ipcMain.handle('list-saved-searches', () => listSavedSearches());
  ipcMain.handle('add-saved-search', (_, payload) => addSavedSearch(payload.name, payload.filters));
  ipcMain.handle('remove-saved-search', (_, id) => removeSavedSearch(id));
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
