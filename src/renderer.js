const state = {
  query: '',
  sources: [],
  settings: {},
  filters: {},
  savedSearches: [],
  ignoreRules: [],
  views: {
    library: { papers: [], selectedId: null, selectedIds: new Set(), page: 1, pageSize: 20, total: 0, sortBy: 'updated_desc' },
    search: { papers: [], selectedId: null, selectedIds: new Set(), page: 1, pageSize: 20, total: 0, sortBy: 'updated_desc' }
  },
  currentPage: 'library',
  modelFilters: {},
  searchMode: 'basic',
  searchScopes: new Set(['all']),
  recallStrength: 'balanced',
  intentChips: [],
  intentDetailsOpen: false,
  aiMeta: new Map(),
  unsavedIds: new Set(),
  statsDimension: 'year',
  statsSelected: new Set(),
  translateEnabled: false,
  translationCache: new Map(),
  translationQueue: [],
  translationQueueSet: new Set(),
  translationScopeKey: '',
  translationScopeIds: new Set(),
  translationManualIds: new Set(),
  translationBusy: false,
  translationProgress: { total: 0, done: 0 }
};

const elements = {
  paperList: document.querySelector('[data-paper-list]'),
  searchInput: document.querySelector('[data-search]'),
  globalSearch: document.querySelector('[data-global-search]'),
  searchSubmit: document.querySelector('[data-search-submit]'),
  scopeRow: document.querySelector('[data-scope-row]'),
  advancedToggle: document.querySelector('[data-advanced-toggle]'),
  advancedPanel: document.querySelector('[data-advanced-panel]'),
  bulkTags: document.querySelector('[data-bulk-tags]'),
  bulkApply: document.querySelector('[data-bulk-apply]'),
  bulkBar: document.querySelector('[data-bulk-bar]'),
  exportToggle: document.querySelector('[data-export-toggle]'),
  exportMenu: document.querySelector('[data-export-menu]'),
  bulkSummarize: document.querySelector('[data-bulk-summarize]'),
  bulkExportBibtex: document.querySelector('[data-bulk-export-bibtex]'),
  bulkExportApa: document.querySelector('[data-bulk-export-apa]'),
  bulkExportCsv: document.querySelector('[data-bulk-export-csv]'),
  bulkExportPdf: document.querySelector('[data-bulk-export-pdf]'),
  bulkExportRis: document.querySelector('[data-bulk-export-ris]'),
  bulkExportMla: document.querySelector('[data-bulk-export-mla]'),
  bulkExportIeee: document.querySelector('[data-bulk-export-ieee]'),
  selectedCount: document.querySelector('[data-selected-count]'),
  totalCount: document.querySelector('[data-total-count]'),
  pageInfo: document.querySelector('[data-page-info]'),
  pagePrev: document.querySelector('[data-page-prev]'),
  pageNext: document.querySelector('[data-page-next]'),
  pageSize: document.querySelector('[data-page-size]'),
  filterTags: document.querySelector('[data-filter-tags]'),
  filterTitle: document.querySelector('[data-filter-title]'),
  filterAuthors: document.querySelector('[data-filter-authors]'),
  filterSubject: document.querySelector('[data-filter-subject]'),
  filterCategory: document.querySelector('[data-filter-category]'),
  filterJournal: document.querySelector('[data-filter-journal]'),
  filterKeywords: document.querySelector('[data-filter-keywords]'),
  filterAbstract: document.querySelector('[data-filter-abstract]'),
  filterYearFrom: document.querySelector('[data-filter-year-from]'),
  filterYearTo: document.querySelector('[data-filter-year-to]'),
  filterNeedsEnrichment: document.querySelector('[data-filter-needs-enrichment]'),
  filterClear: document.querySelector('[data-filter-clear]'),
  filterSaveName: document.querySelector('[data-filter-save-name]'),
  filterSave: document.querySelector('[data-filter-save]'),
  detailPanel: document.querySelector('[data-detail]'),
  sourcesList: document.querySelector('[data-sources]'),
  savedSearches: document.querySelector('[data-saved-searches]'),
  ignoreList: document.querySelector('[data-ignore-list]'),
  ignorePattern: document.querySelector('[data-ignore-pattern]'),
  addIgnoreBtn: document.querySelector('[data-add-ignore]'),
  statusText: document.querySelector('[data-status]'),
  addPaperBtn: document.querySelector('[data-add-paper]'),
  scanBtn: document.querySelector('[data-scan]'),
  extractAllBtn: document.querySelector('[data-extract-all]'),
  rollbackExtractBtn: document.querySelector('[data-rollback-extract]'),
  extractSelected: document.querySelector('[data-extract-selected]'),
  extractSave: document.querySelector('[data-extract-save]'),
  addFolderBtn: document.querySelector('[data-add-folder]'),
  addFileBtn: document.querySelector('[data-add-file]'),
  navButtons: document.querySelectorAll('[data-nav]'),
  navPanel: document.querySelector('[data-nav-panel]'),
  navToggle: document.querySelector('[data-nav-toggle]'),
  settingsSave: document.querySelector('[data-settings-save]'),
  settingsEndpoint: document.querySelector('[data-settings-endpoint]'),
  settingsModel: document.querySelector('[data-settings-model]'),
  settingsEmbedModel: document.querySelector('[data-settings-embed-model]'),
  settingsTest: document.querySelector('[data-settings-test]'),
  settingsStatus: document.querySelector('[data-settings-status]'),
  llmRankBtn: document.querySelector('[data-llm-rank]'),
  progress: document.querySelector('[data-progress]'),
  progressFill: document.querySelector('[data-progress-fill]'),
  progressText: document.querySelector('[data-progress-text]'),
  resultsPanel: document.querySelector('[data-results-panel]'),
  resultsHosts: document.querySelectorAll('[data-results-host]'),
  searchModeButtons: document.querySelectorAll('[data-search-mode]'),
  searchModePanels: document.querySelectorAll('[data-search-panel]'),
  recallStrength: document.querySelector('[data-recall-strength]'),
  intentChips: document.querySelector('[data-intent-chips]'),
  intentDetailToggle: document.querySelector('[data-intent-detail-toggle]'),
  modelQuery: document.querySelector('[data-model-query]'),
  modelAnalyze: document.querySelector('[data-model-analyze]'),
  modelApply: document.querySelector('[data-model-apply]'),
  modelConditions: document.querySelector('[data-model-conditions]'),
  modelMatchAny: document.querySelector('[data-model-match-any]'),
  modelSemantic: document.querySelector('[data-model-semantic]'),
  modelTitle: document.querySelector('[data-model-title]'),
  modelAuthors: document.querySelector('[data-model-authors]'),
  modelSubject: document.querySelector('[data-model-subject]'),
  modelTags: document.querySelector('[data-model-tags]'),
  modelKeywords: document.querySelector('[data-model-keywords]'),
  modelCategory: document.querySelector('[data-model-category]'),
  modelJournal: document.querySelector('[data-model-journal]'),
  modelYearFrom: document.querySelector('[data-model-year-from]'),
  modelYearTo: document.querySelector('[data-model-year-to]'),
  recallMinScore: document.querySelector('[data-recall-min-score]'),
  semanticEnabled: document.querySelector('[data-semantic-enabled]'),
  sortBy: document.querySelector('[data-sort-by]'),
  selectAllBtn: document.querySelector('[data-select-all]'),
  modelProvider: document.querySelector('[data-model-provider]'),
  localModelMode: document.querySelector('[data-local-model-mode]'),
  modelBase: document.querySelector('[data-model-base]'),
  modelKey: document.querySelector('[data-model-key]'),
  modelChat: document.querySelector('[data-model-chat]'),
  modelEmbed: document.querySelector('[data-model-embed]'),
  modelPresets: document.querySelectorAll('[data-model-preset]'),
  modelSave: document.querySelector('[data-model-save]'),
  statsDimension: document.querySelector('[data-stats-dimension]'),
  statsList: document.querySelector('[data-stats-list]'),
  statsSelectAll: document.querySelector('[data-stats-select-all]'),
  statsView: document.querySelector('[data-stats-view]'),
  statsExport: document.querySelector('[data-stats-export]'),
  translateToggle: document.querySelector('[data-translate-enabled]'),
  translateRefresh: document.querySelector('[data-translate-refresh]'),
  translateProgress: document.querySelector('[data-translate-progress]'),
  translateProgressFill: document.querySelector('[data-translate-progress-fill]'),
  translateProgressText: document.querySelector('[data-translate-progress-text]')
};

const pages = document.querySelectorAll('[data-page]');

function getView(pageId) {
  return state.views[pageId] || state.views.library;
}

function saveStateToView(pageId) {
  const view = getView(pageId);
  view.papers = state.papers;
  view.selectedId = state.selectedId;
  view.selectedIds = state.selectedIds;
  view.page = state.page;
  view.pageSize = state.pageSize;
  view.total = state.total;
  view.sortBy = state.sortBy;
}

function loadViewFromState(pageId) {
  const view = getView(pageId);
  state.papers = view.papers;
  state.selectedId = view.selectedId;
  state.selectedIds = view.selectedIds;
  state.page = view.page;
  state.pageSize = view.pageSize;
  state.total = view.total;
  state.sortBy = view.sortBy;
  if (elements.sortBy) elements.sortBy.value = state.sortBy;
  if (elements.pageSize) elements.pageSize.value = String(state.pageSize);
}

function setStatus(message) {
  elements.statusText.textContent = message || '';
}

function setPage(pageId) {
  const previous = state.currentPage;
  saveStateToView(previous);
  state.currentPage = pageId;
  loadViewFromState(pageId);
  pages.forEach(page => {
    page.classList.toggle('is-active', page.getAttribute('data-page') === pageId);
  });
  elements.navButtons.forEach(btn => {
    btn.classList.toggle('is-active', btn.getAttribute('data-nav') === pageId);
  });
  if (elements.navPanel) elements.navPanel.classList.remove('open');
  mountResults(pageId);
  if (pageId === 'library' || pageId === 'search') {
    if (pageId === 'library') {
      state.aiMeta = new Map();
    }
    renderPapers();
    updateSelectedCount();
    updatePager();
    if (state.selectedId) {
      window.paperdesk.getPaper(state.selectedId)
        .then(detail => renderDetail(detail))
        .catch(() => renderDetail(null));
    } else {
      renderDetail(null);
    }
    if (pageId === 'library' && previous !== 'library') {
      refreshPapers();
    }
  }
  if (pageId === 'stats') {
    loadStats(state.statsDimension);
  }
}

function mountResults(pageId) {
  if (!elements.resultsPanel) return;
  const host = document.querySelector(`[data-results-host="${pageId}"]`);
  if (!host) return;
  host.appendChild(elements.resultsPanel);
  elements.resultsPanel.classList.add('results-mounted');
}

function renderStatsList(items) {
  if (!elements.statsList) return;
  elements.statsList.innerHTML = '';
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = '暂无统计数据';
    elements.statsList.appendChild(empty);
    return;
  }
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'stats-item';
    const encoded = encodeURIComponent(item.label);
    row.innerHTML = `
      <label>
        <input type="checkbox" data-stats-item="${encoded}" ${state.statsSelected.has(item.label) ? 'checked' : ''} />
        <span>${escapeHtml(item.label)}</span>
      </label>
      <span class="stats-count">${item.count}</span>
    `;
    elements.statsList.appendChild(row);
  });
  elements.statsList.querySelectorAll('[data-stats-item]').forEach(box => {
    box.addEventListener('change', () => {
      const raw = box.getAttribute('data-stats-item');
      const label = decodeURIComponent(raw);
      if (box.checked) {
        state.statsSelected.add(label);
      } else {
        state.statsSelected.delete(label);
      }
    });
  });
}

async function loadStats(dimension) {
  if (!elements.statsList) return;
  state.statsDimension = dimension;
  state.statsSelected = new Set();
  try {
    const result = await window.paperdesk.getStats({ dimension });
    renderStatsList(result.items || []);
  } catch {
    renderStatsList([]);
  }
}

function setSearchMode(mode) {
  state.searchMode = mode;
  elements.searchModeButtons.forEach(btn => {
    btn.classList.toggle('is-active', btn.getAttribute('data-search-mode') === mode);
  });
  elements.searchModePanels.forEach(panel => {
    const active = panel.getAttribute('data-search-panel') === mode;
    panel.classList.toggle('is-active', active);
    panel.querySelectorAll('input, select, button, textarea').forEach(el => {
      if (!el.hasAttribute('data-allow-always')) {
        el.disabled = !active;
      }
    });
  });
  if (elements.searchSubmit) elements.searchSubmit.disabled = mode !== 'basic';
  if (elements.llmRankBtn) elements.llmRankBtn.disabled = mode !== 'basic';
}

function readModelFilters() {
  return {
    semanticQuery: elements.modelSemantic.value.trim(),
    title: elements.modelTitle.value.trim(),
    authors: elements.modelAuthors.value.trim(),
    subject: elements.modelSubject.value.trim(),
    tags: elements.modelTags.value.trim(),
    keywords: elements.modelKeywords.value.trim(),
    category: elements.modelCategory.value.trim(),
    journal: elements.modelJournal.value.trim(),
    yearFrom: elements.modelYearFrom.value.trim(),
    yearTo: elements.modelYearTo.value.trim(),
    matchAny: elements.modelMatchAny ? elements.modelMatchAny.checked : false
  };
}

function applyModelFilters(filters) {
  const next = filters || {};
  elements.modelSemantic.value = next.semanticQuery || '';
  elements.modelTitle.value = next.title || '';
  elements.modelAuthors.value = next.authors || '';
  elements.modelSubject.value = next.subject || '';
  elements.modelTags.value = next.tags || '';
  elements.modelKeywords.value = next.keywords || '';
  elements.modelCategory.value = next.category || '';
  elements.modelJournal.value = next.journal || '';
  elements.modelYearFrom.value = next.yearFrom || '';
  elements.modelYearTo.value = next.yearTo || '';
  if (elements.modelMatchAny) elements.modelMatchAny.checked = Boolean(next.matchAny);
  if (elements.recallMinScore) elements.recallMinScore.value = '';
  renderIntentChips(next);
}

function mergeFilters(base, model) {
  const merged = { ...base };
  const modelFilters = model || {};
  Object.entries(modelFilters).forEach(([key, value]) => {
    if (key === 'semanticQuery') return;
    if (!value) return;
    if (merged[key]) {
      if (key === 'tags' || key === 'keywords') {
        merged[key] = `${merged[key]}, ${value}`;
      } else {
        merged[key] = value;
      }
    } else {
      merged[key] = value;
    }
  });
  return merged;
}

function resolveScopedQuery(query) {
  const scopes = Array.from(state.searchScopes).filter(Boolean);
  if (!query) return { query: '', scopeFields: [] };
  const scoped = scopes.filter(scope => scope && scope !== 'all');
  if (!scoped.length || scopes.includes('all')) {
    return { query, scopeFields: [] };
  }
  return { query, scopeFields: scoped };
}

function getRecallPreset(strength) {
  const presets = {
    loose: { minScore: 0.2, maxGenerate: 80 },
    balanced: { minScore: 0.35, maxGenerate: 50 },
    strict: { minScore: 0.5, maxGenerate: 30 }
  };
  return presets[strength] || presets.balanced;
}

function buildIntentChips(filters) {
  const chips = [];
  if (filters.semanticQuery) chips.push({ key: 'semanticQuery', label: `意图：${filters.semanticQuery}` });
  if (filters.title) chips.push({ key: 'title', label: `标题：${filters.title}` });
  if (filters.authors) chips.push({ key: 'authors', label: `作者：${filters.authors}` });
  if (filters.subject) chips.push({ key: 'subject', label: `方向：${filters.subject}` });
  if (filters.tags) chips.push({ key: 'tags', label: `标签：${filters.tags}` });
  if (filters.keywords) chips.push({ key: 'keywords', label: `关键词：${filters.keywords}` });
  if (filters.category) chips.push({ key: 'category', label: `类别：${filters.category}` });
  if (filters.journal) chips.push({ key: 'journal', label: `期刊：${filters.journal}` });
  if (filters.yearFrom || filters.yearTo) {
    if (filters.yearFrom && filters.yearTo) {
      chips.push({ key: 'year', label: `年份：${filters.yearFrom}-${filters.yearTo}` });
    } else if (filters.yearFrom) {
      chips.push({ key: 'year', label: `年份 >= ${filters.yearFrom}` });
    } else {
      chips.push({ key: 'year', label: `年份 <= ${filters.yearTo}` });
    }
  }
  return chips;
}

function renderIntentChips(filters) {
  if (!elements.intentChips) return;
  const chips = buildIntentChips(filters || {});
  state.intentChips = chips;
  elements.intentChips.innerHTML = '';
  if (!chips.length) {
    elements.intentChips.innerHTML = '<div class="empty">尚未解析意图</div>';
    return;
  }
  chips.forEach(chip => {
    const item = document.createElement('button');
    item.className = 'chip chip-solid';
    item.setAttribute('data-chip', chip.key);
    item.innerHTML = `${escapeHtml(chip.label)}<span class="chip-close">×</span>`;
    item.addEventListener('click', () => {
      if (chip.key === 'year') {
        elements.modelYearFrom.value = '';
        elements.modelYearTo.value = '';
      } else if (chip.key === 'semanticQuery') {
        elements.modelSemantic.value = '';
      } else if (elements[`model${chip.key.charAt(0).toUpperCase()}${chip.key.slice(1)}`]) {
        elements[`model${chip.key.charAt(0).toUpperCase()}${chip.key.slice(1)}`].value = '';
      }
      state.modelFilters = readModelFilters();
      renderIntentChips(state.modelFilters);
    });
    elements.intentChips.appendChild(item);
  });
}

function updateProgress(current, total, filePath) {
  if (!total) {
    elements.progressFill.style.width = '0%';
    elements.progressText.textContent = '等待扫描';
    return;
  }
  const percent = Math.min(100, Math.round((current / total) * 100));
  elements.progressFill.style.width = `${percent}%`;
  const name = filePath ? filePath.split(/\\|\//).pop() : '';
  elements.progressText.textContent = `正在读取 ${current}/${total} ${name}`;
}

function updateProgressText(message) {
  if (!message) return;
  elements.progressText.textContent = message;
}

function updateSelectedCount() {
  elements.selectedCount.textContent = String(state.selectedIds.size);
  if (elements.bulkBar) {
    elements.bulkBar.classList.toggle('is-visible', state.selectedIds.size > 0);
  }
}

function updatePager() {
  const totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
  state.page = Math.min(state.page, totalPages);
  elements.totalCount.textContent = String(state.total);
  elements.pageInfo.textContent = `第 ${state.page} / ${totalPages} 页`;
  elements.pagePrev.disabled = state.page <= 1;
  elements.pageNext.disabled = state.page >= totalPages;
  elements.pageSize.value = String(state.pageSize);
}

const LIST_TRANSLATE_FIELDS = ['title', 'authors', 'category', 'journal'];
const DETAIL_TRANSLATE_FIELDS = [
  'title',
  'authors',
  'subject',
  'keywords',
  'category',
  'journal',
  'tags',
  'abstract',
  'summary',
  'methods',
  'contributions',
  'notes'
];

function resetTranslateProgress() {
  state.translationProgress = { total: 0, done: 0 };
  state.translationQueue = [];
  state.translationQueueSet = new Set();
  updateTranslateProgress();
}

function updateTranslateProgress() {
  if (!elements.translateProgress || !elements.translateProgressFill || !elements.translateProgressText) return;
  const total = state.translationProgress.total;
  const done = state.translationProgress.done;
  const show = (state.translateEnabled || state.translationManualIds.size > 0) && total > 0;
  elements.translateProgress.classList.toggle('is-hidden', !show);
  elements.translateProgressText.textContent = `翻译进度：${done}/${total}`;
  const percent = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
  elements.translateProgressFill.style.width = `${percent}%`;
}

function buildTranslationSource(paper, fields) {
  const source = {};
  fields.forEach(field => {
    const raw = paper[field];
    if (Array.isArray(raw)) {
      const joined = raw.map(item => String(item).trim()).filter(Boolean).join(', ');
      if (joined) source[field] = joined;
      return;
    }
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (value) source[field] = value;
  });
  return source;
}

function applyTranslations(paper, fields, forceTranslate = false) {
  if ((!state.translateEnabled && !forceTranslate) || !paper) return paper;
  const entry = state.translationCache.get(paper.id);
  if (!entry) return paper;
  const next = { ...paper };
  fields.forEach(field => {
    const raw = paper[field];
    const current = Array.isArray(raw)
      ? raw.map(item => String(item).trim()).filter(Boolean).join(', ')
      : (typeof raw === 'string' ? raw.trim() : '');
    if (current && entry.source[field] === current && entry.translated[field]) {
      next[field] = entry.translated[field];
    }
  });
  return next;
}

function getTranslatedValue(paper, field, fallback, forceTranslate = false) {
  if ((!state.translateEnabled && !forceTranslate) || !paper) return fallback;
  const entry = state.translationCache.get(paper.id);
  if (!entry) return fallback;
  const source = entry.source[field];
  const translated = entry.translated[field];
  if (!source || !translated) return fallback;
  if (Array.isArray(fallback)) {
    const joined = fallback.map(item => String(item).trim()).filter(Boolean).join(', ');
    return source === joined ? translated : fallback;
  }
  if (typeof fallback === 'string') {
    return source === fallback.trim() ? translated : fallback;
  }
  return fallback;
}

function isTranslationActiveForPaper(paperId) {
  return state.translateEnabled || state.translationManualIds.has(paperId);
}

function canTranslatePaperId(paperId) {
  return state.translateEnabled
    ? state.translationScopeIds.has(paperId)
    : state.translationManualIds.has(paperId);
}

function getPaperTranslationProgress(paper, fields) {
  if (!paper || !paper.id) return null;
  const source = buildTranslationSource(paper, fields);
  const sourceKeys = Object.keys(source);
  if (!sourceKeys.length) return null;
  const entry = state.translationCache.get(paper.id);
  let done = 0;
  sourceKeys.forEach(field => {
    if (entry && entry.source[field] === source[field] && entry.translated[field]) {
      done += 1;
    }
  });
  return { done, total: sourceKeys.length };
}

function paperNeedsTranslation(paper, fields) {
  const source = buildTranslationSource(paper, fields);
  const sourceKeys = Object.keys(source);
  if (!sourceKeys.length) return false;
  const entry = state.translationCache.get(paper.id);
  if (!entry) return true;
  return sourceKeys.some(field => entry.source[field] !== source[field]);
}

function enqueuePaperTranslation(paper, fields) {
  if (!paper || !paper.id) return;
  if (!canTranslatePaperId(paper.id)) return;
  if (!paperNeedsTranslation(paper, fields)) return;
  if (state.translationQueueSet.has(paper.id)) return;
  state.translationQueue.push(paper.id);
  state.translationQueueSet.add(paper.id);
  state.translationProgress.total += 1;
  updateTranslateProgress();
}

async function processTranslationQueue(fields) {
  if (state.translationBusy) return;
  state.translationBusy = true;
  try {
    while (state.translationQueue.length) {
      const paperId = state.translationQueue.shift();
      state.translationQueueSet.delete(paperId);
      if (!canTranslatePaperId(paperId)) {
        state.translationProgress.done += 1;
        updateTranslateProgress();
        continue;
      }
      let paper = state.papers.find(item => item.id === paperId);
      if (!paper || state.translationManualIds.has(paperId)) {
        try {
          const detail = await window.paperdesk.getPaper(paperId);
          if (detail) paper = detail;
        } catch {
          paper = paper || null;
        }
      }
      if (!paper) {
        state.translationProgress.done += 1;
        updateTranslateProgress();
        continue;
      }
      const source = buildTranslationSource(paper, fields);
      const sourceKeys = Object.keys(source);
      if (!sourceKeys.length) {
        state.translationProgress.done += 1;
        updateTranslateProgress();
        continue;
      }
      try {
        const result = await window.paperdesk.translatePaper({ fields: source });
        if (!isTranslationActiveForPaper(paperId)) {
          state.translationProgress.done += 1;
          updateTranslateProgress();
          continue;
        }
        const next = { source: {}, translated: {} };
        sourceKeys.forEach(field => {
          next.source[field] = source[field];
          const translated = result && typeof result[field] === 'string' ? result[field].trim() : '';
          next.translated[field] = translated || source[field];
        });
        state.translationCache.set(paperId, next);
      } catch {
        // Ignore translation errors to avoid blocking UI.
      }
      state.translationProgress.done += 1;
      updateTranslateProgress();
      renderPapers();
      if (state.selectedId === paperId) {
        const detail = await window.paperdesk.getPaper(paperId);
        renderDetail(detail);
      }
    }
  } finally {
    state.translationBusy = false;
  }
}

function renderSources() {
  elements.sourcesList.innerHTML = '';
  if (!state.sources.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = '暂无来源，请添加文件夹或 PDF。';
    elements.sourcesList.appendChild(empty);
    return;
  }

  state.sources.forEach(source => {
    const item = document.createElement('div');
    item.className = 'source-item';
    item.innerHTML = `
      <div class="source-meta">
        <div class="source-title">${source.type === 'folder' ? '文件夹' : '文件'}</div>
        <div class="source-path">${source.path}</div>
      </div>
      <button class="ghost" data-remove-source="${source.id}">移除</button>
    `;
    elements.sourcesList.appendChild(item);
  });

  elements.sourcesList.querySelectorAll('[data-remove-source]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.getAttribute('data-remove-source'));
      await window.paperdesk.removeSource(id);
      await loadSources();
    });
  });
}

function renderSavedSearches() {
  if (!elements.savedSearches) return;
  elements.savedSearches.innerHTML = '';
  if (!state.savedSearches.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = '暂无保存的检索。';
    elements.savedSearches.appendChild(empty);
    return;
  }

  state.savedSearches.forEach(search => {
    const item = document.createElement('div');
    item.className = 'saved-search-item';
    item.innerHTML = `
      <button class="ghost" data-apply-search="${search.id}">${search.name}</button>
      <button class="ghost" data-remove-search="${search.id}">删除</button>
    `;
    elements.savedSearches.appendChild(item);
  });

  elements.savedSearches.querySelectorAll('[data-apply-search]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-apply-search'));
      const search = state.savedSearches.find(item => item.id === id);
      if (!search) return;
      let filters = {};
      try {
        filters = JSON.parse(search.filters || '{}');
      } catch {
        filters = {};
      }
      applyFilters(filters);
      refreshPapers();
    });
  });

  elements.savedSearches.querySelectorAll('[data-remove-search]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.getAttribute('data-remove-search'));
      await window.paperdesk.removeSavedSearch(id);
      await loadSavedSearches();
    });
  });
}

async function loadSavedSearches() {
  if (!elements.savedSearches) return;
  state.savedSearches = await window.paperdesk.listSavedSearches();
  renderSavedSearches();
}

function renderIgnoreRules() {
  elements.ignoreList.innerHTML = '';
  if (!state.ignoreRules.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = '暂无忽略规则。';
    elements.ignoreList.appendChild(empty);
    return;
  }

  state.ignoreRules.forEach(rule => {
    const item = document.createElement('div');
    item.className = 'ignore-item';
    item.innerHTML = `
      <div class="ignore-pattern">${rule.pattern}</div>
      <button class="ghost" data-remove-ignore="${rule.id}">删除</button>
    `;
    elements.ignoreList.appendChild(item);
  });

  elements.ignoreList.querySelectorAll('[data-remove-ignore]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.getAttribute('data-remove-ignore'));
      await window.paperdesk.removeIgnoreRule(id);
      await loadIgnoreRules();
    });
  });
}

async function loadIgnoreRules() {
  state.ignoreRules = await window.paperdesk.listIgnoreRules();
  renderIgnoreRules();
}

async function saveCurrentSearch(name) {
  if (!name) {
    alert('请输入检索名称。');
    return;
  }
  const filters = collectFilters();
  await window.paperdesk.addSavedSearch({ name, filters });
  if (elements.filterSaveName) elements.filterSaveName.value = '';
  await loadSavedSearches();
}

async function addIgnoreRule() {
  const pattern = elements.ignorePattern.value.trim();
  if (!pattern) {
    alert('请输入忽略规则。');
    return;
  }
  await window.paperdesk.addIgnoreRule(pattern);
  elements.ignorePattern.value = '';
  await loadIgnoreRules();
}

function renderPapers() {
  elements.paperList.innerHTML = '';

  if (!state.papers.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = '未找到论文。';
    elements.paperList.appendChild(empty);
    return;
  }

  state.papers.forEach(paper => {
    const item = document.createElement('button');
    item.className = 'paper-card';
    if (paper.id === state.selectedId) item.classList.add('active');

    const displayPaper = applyTranslations(paper, LIST_TRANSLATE_FIELDS);
    const tags = (paper.tags || []).slice(0, 3).map(t => `<span class="tag">${t}</span>`).join('');
    const aiMeta = state.aiMeta.get(paper.id);
    const translateProgress = state.translateEnabled ? getPaperTranslationProgress(paper, DETAIL_TRANSLATE_FIELDS) : null;
    const translatePercent = translateProgress
      ? Math.min(100, Math.round((translateProgress.done / translateProgress.total) * 100))
      : 0;
    const translateMarkup = translateProgress ? `
      <div class="paper-translate">
        <div class="paper-translate-bar"><span style="width: ${translatePercent}%"></span></div>
        <div class="paper-translate-text">翻译进度 ${translateProgress.done}/${translateProgress.total}</div>
      </div>
    ` : '';
    const reasons = aiMeta && aiMeta.reasons && aiMeta.reasons.length
      ? aiMeta.reasons.map(reason => `
        <div class="reason-item">
          <span class="reason-field">${escapeHtml(reason.field || '')}</span>
          <span class="reason-match">${escapeHtml(reason.match || '')}</span>
          ${reason.snippet ? `<span class="reason-snippet">${escapeHtml(reason.snippet)}</span>` : ''}
        </div>
      `).join('')
      : '';

    item.innerHTML = `
      <div class="paper-select">
        <input type="checkbox" data-select-id="${paper.id}" ${state.selectedIds.has(paper.id) ? 'checked' : ''} />
      </div>
      <div class="paper-title">${displayPaper.title || '未命名'}</div>
      <div class="paper-meta">${displayPaper.authors || '未知作者'} - ${paper.year || '年份未知'} - ${displayPaper.category || '未分类'}</div>
      <div class="paper-tags">${tags}</div>
      ${reasons ? `<div class="paper-reasons">${reasons}</div>` : ''}
      ${translateMarkup}
    `;

    if (state.unsavedIds.has(paper.id)) {
      const titleEl = item.querySelector('.paper-title');
      if (titleEl) {
        const badge = document.createElement('span');
        badge.className = 'unsaved-badge';
        badge.textContent = '未保存';
        titleEl.appendChild(badge);
      }
    }

    item.addEventListener('click', () => selectPaper(paper.id));
    elements.paperList.appendChild(item);
  });

  elements.paperList.querySelectorAll('[data-select-id]').forEach(box => {
    box.addEventListener('click', event => {
      event.stopPropagation();
    });
    box.addEventListener('change', () => {
      const id = Number(box.getAttribute('data-select-id'));
      if (box.checked) {
        state.selectedIds.add(id);
      } else {
        state.selectedIds.delete(id);
      }
      updateSelectedCount();
    });
  });
  updateSelectedCount();
  if (state.translateEnabled) {
    const scopeKey = state.papers.map(paper => paper.id).join(',');
    if (scopeKey !== state.translationScopeKey) {
      state.translationScopeKey = scopeKey;
      resetTranslateProgress();
    }
    state.translationScopeIds = new Set(state.papers.map(paper => paper.id));
    state.papers.forEach(paper => {
      enqueuePaperTranslation(paper, DETAIL_TRANSLATE_FIELDS);
    });
    processTranslationQueue(DETAIL_TRANSLATE_FIELDS);
  } else if (elements.translateProgress && state.translationManualIds.size === 0) {
    elements.translateProgress.classList.add('is-hidden');
  }
}

function renderDetail(paper) {
  if (!paper) {
    elements.detailPanel.innerHTML = '<div class="empty">请选择论文查看详情。</div>';
    return;
  }

  const translationActive = isTranslationActiveForPaper(paper.id);
  const displayPaper = applyTranslations(paper, DETAIL_TRANSLATE_FIELDS, translationActive);
  const tagsString = (paper.tags || []).join(', ');
  const displayTagsString = getTranslatedValue(paper, 'tags', tagsString, translationActive);
  let tagEvidenceText = '';
  if (paper.tag_evidence) {
    try {
      const parsed = JSON.parse(paper.tag_evidence);
      if (Array.isArray(parsed)) {
        tagEvidenceText = parsed.map(item => `${item.name || ''}: ${item.evidence || ''}`.trim()).filter(Boolean).join('\n');
      }
    } catch {
      tagEvidenceText = '';
    }
  }
  const canAutoFill = Boolean(paper.id && paper.extracted_text);
  const canExport = Boolean(paper.id);
  const canSimilar = Boolean(paper.id);
  const editDisabled = state.translateEnabled ? 'readonly' : '';
  const saveDisabled = state.translateEnabled ? 'disabled' : '';
  const translateAction = !state.translateEnabled
    ? `<button class="ghost" data-translate-current>${translationActive ? '还原原文' : '翻译当前论文'}</button>`
    : '';
  const aiMeta = state.aiMeta.get(paper.id);
  const aiPanel = aiMeta ? `
    <div class="ai-panel">
      <div class="ai-title">命中理由</div>
      <div class="ai-reasons">
        ${(aiMeta.reasons || []).map(reason => `
          <div class="reason-item">
            <span class="reason-field">${escapeHtml(reason.field || '')}</span>
            <span class="reason-match">${escapeHtml(reason.match || '')}</span>
            ${reason.snippet ? `<span class="reason-snippet">${escapeHtml(reason.snippet)}</span>` : ''}
          </div>
        `).join('')}
      </div>
      <div class="ai-breakdown">
        <div>rrf: ${(aiMeta.breakdown && aiMeta.breakdown.rrf || 0).toFixed(3)}</div>
        <div>bm25: ${(aiMeta.breakdown && aiMeta.breakdown.bm25 || 0).toFixed(3)}</div>
        <div>cos_main: ${(aiMeta.breakdown && aiMeta.breakdown.cos_main || 0).toFixed(3)}</div>
        <div>cos_concept: ${(aiMeta.breakdown && aiMeta.breakdown.cos_concept || 0).toFixed(3)}</div>
        <div>tag_boost: ${(aiMeta.breakdown && aiMeta.breakdown.tag_boost || 0).toFixed(3)}</div>
      </div>
    </div>
  ` : '';

  elements.detailPanel.innerHTML = `
    <div class="detail-header">
      <div>
        <div class="detail-title">${displayPaper.title || '未命名'}</div>
        <div class="detail-sub">${paper.path || '手动录入'}</div>
      </div>
      <div class="detail-actions">
        <button class="ghost" data-auto-fill ${canAutoFill ? '' : 'disabled'}>智能填充</button>
        <button class="ghost" data-auto-fill-save ${canAutoFill ? '' : 'disabled'}>智能填充并保存</button>
        ${translateAction}
        ${paper.path ? '<button class="ghost" data-open-file>打开文件</button>' : ''}
        ${paper.path ? '<button class="ghost" data-open-folder>打开文件夹</button>' : ''}
        <button class="ghost" data-export-bibtex ${canExport ? '' : 'disabled'}>导出 BibTeX</button>
        <button class="ghost" data-export-apa ${canExport ? '' : 'disabled'}>导出 APA</button>
        <button class="ghost" data-export-mla ${canExport ? '' : 'disabled'}>导出 MLA</button>
        <button class="ghost" data-export-ieee ${canExport ? '' : 'disabled'}>导出 IEEE</button>
        <button class="ghost" data-export-ris ${canExport ? '' : 'disabled'}>导出 RIS</button>
        <button class="ghost" data-delete>删除</button>
      </div>
    </div>
    ${aiPanel}
    <div class="detail-grid">
      <label>标题<input data-field="title" value="${escapeHtml(displayPaper.title || '')}" ${editDisabled} /></label>
      <label>作者<input data-field="authors" value="${escapeHtml(displayPaper.authors || '')}" ${editDisabled} /></label>
      <label>研究方向<input data-field="subject" value="${escapeHtml(displayPaper.subject || '')}" ${editDisabled} /></label>
      <label>关键词<input data-field="keywords" value="${escapeHtml(displayPaper.keywords || '')}" placeholder="关键词1, 关键词2" ${editDisabled} /></label>
      <label>年份<input data-field="year" value="${escapeHtml(paper.year || '')}" ${editDisabled} /></label>
      <label>类别<input data-field="category" value="${escapeHtml(displayPaper.category || '')}" ${editDisabled} /></label>
      <label>期刊<input data-field="journal" value="${escapeHtml(displayPaper.journal || '')}" ${editDisabled} /></label>
      <label>标签<input data-field="tags" value="${escapeHtml(displayTagsString)}" placeholder="标签1, 标签2" ${editDisabled} /></label>
    </div>
    ${tagEvidenceText ? `<label class="full">标签证据<textarea readonly>${escapeHtml(tagEvidenceText)}</textarea></label>` : ''}
    <label class="full">摘要<textarea data-field="abstract" ${editDisabled}>${escapeHtml(displayPaper.abstract || '')}</textarea></label>
    <label class="full">备注<textarea data-field="notes" ${editDisabled}>${escapeHtml(displayPaper.notes || '')}</textarea></label>
    <label class="full">提取文本<textarea readonly>${escapeHtml(paper.extracted_text || '')}</textarea></label>
    <div class="tag-quick">
      <div class="tag-quick-title">快速标签</div>
      <div class="tag-quick-row">
        <input type="text" placeholder="输入标签，逗号分隔" data-quick-tags />
        <button class="ghost" data-quick-apply>添加到标签</button>
      </div>
    </div>
    <div class="summary">
      <div class="summary-header">
        <div class="summary-title">智能总结</div>
        <button class="ghost" data-generate-summary ${canAutoFill ? '' : 'disabled'}>生成总结</button>
      </div>
      <label class="full">摘要概述<textarea data-field="summary" ${editDisabled}>${escapeHtml(displayPaper.summary || '')}</textarea></label>
      <label class="full">研究方法<textarea data-field="methods" ${editDisabled}>${escapeHtml(displayPaper.methods || '')}</textarea></label>
      <label class="full">核心贡献<textarea data-field="contributions" ${editDisabled}>${escapeHtml(displayPaper.contributions || '')}</textarea></label>
      <label class="full">要点清单<textarea data-field="key_points" ${editDisabled}>${escapeHtml((paper.key_points || []).join('\n'))}</textarea></label>
    </div>
    <div class="similar">
      <div class="similar-header">
        <div class="similar-title">相似论文</div>
        <button class="ghost" data-find-similar ${canSimilar ? '' : 'disabled'}>查找相似</button>
      </div>
      <div class="similar-list" data-similar-list>运行相似度以查看推荐。</div>
    </div>
    <div class="detail-footer">
      <button class="primary" data-save ${saveDisabled}>保存</button>
      <span class="detail-hint">更新时间：${paper.updated_at || '-'}</span>
    </div>
  `;

  if (state.translateEnabled) {
    enqueuePaperTranslation(paper, DETAIL_TRANSLATE_FIELDS);
    processTranslationQueue(DETAIL_TRANSLATE_FIELDS);
  }

  const openBtn = elements.detailPanel.querySelector('[data-open-file]');
  if (openBtn) {
    openBtn.addEventListener('click', () => window.paperdesk.openFile(paper.path));
  }
  const openFolderBtn = elements.detailPanel.querySelector('[data-open-folder]');
  if (openFolderBtn) {
    openFolderBtn.addEventListener('click', () => window.paperdesk.openFolder(paper.path));
  }

  elements.detailPanel.querySelector('[data-delete]').addEventListener('click', async () => {
    if (!confirm('确认删除该论文条目？')) return;
    await window.paperdesk.deletePaper(paper.id);
    state.selectedId = null;
    state.selectedIds.delete(paper.id);
    updateSelectedCount();
    await refreshPapers();
    renderDetail(null);
  });

  const quickApply = elements.detailPanel.querySelector('[data-quick-apply]');
  const quickInput = elements.detailPanel.querySelector('[data-quick-tags]');
  if (quickApply && quickInput) {
    quickApply.addEventListener('click', () => {
      const value = quickInput.value.trim();
      if (!value) return;
      const tagInput = elements.detailPanel.querySelector('[data-field="tags"]');
      const existing = (tagInput.value || '').split(',').map(t => t.trim()).filter(Boolean);
      const incoming = value.split(',').map(t => t.trim()).filter(Boolean);
      const merged = Array.from(new Set([...existing, ...incoming]));
      tagInput.value = merged.join(', ');
      quickInput.value = '';
    });
  }

  const syncListFromDetail = () => {
    const titleInput = elements.detailPanel.querySelector('[data-field="title"]');
    const authorsInput = elements.detailPanel.querySelector('[data-field="authors"]');
    const yearInput = elements.detailPanel.querySelector('[data-field="year"]');
    const categoryInput = elements.detailPanel.querySelector('[data-field="category"]');
    const title = titleInput ? titleInput.value.trim() : '';
    const authors = authorsInput ? authorsInput.value.trim() : '';
    const year = yearInput ? yearInput.value.trim() : '';
    const category = categoryInput ? categoryInput.value.trim() : '';
    const target = state.papers.find(item => item.id === paper.id);
    if (target) {
      if (title) target.title = title;
      if (authors) target.authors = authors;
      if (year) target.year = year;
      if (category) target.category = category;
      state.unsavedIds.add(paper.id);
      renderPapers();
    }
  };

  const applyExtractedFields = (result) => {
    const titleInput = elements.detailPanel.querySelector('[data-field="title"]');
    const authorsInput = elements.detailPanel.querySelector('[data-field="authors"]');
    const subjectInput = elements.detailPanel.querySelector('[data-field="subject"]');
    const keywordsInput = elements.detailPanel.querySelector('[data-field="keywords"]');
    const yearInput = elements.detailPanel.querySelector('[data-field="year"]');
    const categoryInput = elements.detailPanel.querySelector('[data-field="category"]');
    const journalInput = elements.detailPanel.querySelector('[data-field="journal"]');
    const tagsInput = elements.detailPanel.querySelector('[data-field="tags"]');
    const abstractInput = elements.detailPanel.querySelector('[data-field="abstract"]');

    if (titleInput && !titleInput.value.trim()) titleInput.value = result.title || '';
    if (authorsInput && !authorsInput.value.trim()) authorsInput.value = result.authors || '';
    if (subjectInput && !subjectInput.value.trim()) subjectInput.value = result.subject || '';
    if (keywordsInput && !keywordsInput.value.trim()) keywordsInput.value = (result.keywords || []).join(', ');
    if (yearInput && !yearInput.value.trim()) yearInput.value = result.year || '';
    if (categoryInput && !categoryInput.value.trim()) categoryInput.value = result.category || '';
    if (journalInput && !journalInput.value.trim()) journalInput.value = result.journal || '';
    if (tagsInput && !tagsInput.value.trim()) tagsInput.value = (result.tags || []).join(', ');
    if (abstractInput && !abstractInput.value.trim()) abstractInput.value = result.abstract || '';
    syncListFromDetail();
  };

  const saveDetailFields = async () => {
    if (state.translateEnabled) {
      alert('请关闭翻译后再保存。');
      return;
    }
    const fields = elements.detailPanel.querySelectorAll('[data-field]');
    const updates = { id: paper.id, path: paper.path, filename: paper.filename };
    fields.forEach(field => {
      updates[field.getAttribute('data-field')] = field.value;
    });
    updates.extracted_text = paper.extracted_text || '';
    await window.paperdesk.upsertPaper(updates);
    state.translationCache.delete(paper.id);
    await refreshPapers();
    state.unsavedIds.delete(paper.id);
    renderPapers();
  };

  const translateButton = elements.detailPanel.querySelector('[data-translate-current]');
  if (translateButton) {
    translateButton.addEventListener('click', async () => {
      if (state.translationManualIds.has(paper.id)) {
        state.translationManualIds.delete(paper.id);
        resetTranslateProgress();
        updateTranslateProgress();
        renderDetail(paper);
        return;
      }
      state.translationManualIds.add(paper.id);
      resetTranslateProgress();
      enqueuePaperTranslation(paper, DETAIL_TRANSLATE_FIELDS);
      processTranslationQueue(DETAIL_TRANSLATE_FIELDS);
      updateTranslateProgress();
      renderDetail(paper);
    });
  }

  elements.detailPanel.querySelector('[data-auto-fill]').addEventListener('click', async () => {
    setStatus('正在请求 Ollama 生成元数据...');
    try {
      const result = await window.paperdesk.ollamaExtract({ id: paper.id });
      applyExtractedFields(result);
      setStatus('已生成建议内容，请核对后保存。');
    } catch (err) {
      setStatus('元数据生成失败，请检查 Ollama 设置。');
    }
  });

  elements.detailPanel.querySelector('[data-auto-fill-save]').addEventListener('click', async () => {
    setStatus('正在请求 Ollama 生成元数据...');
    try {
      const result = await window.paperdesk.ollamaExtract({ id: paper.id });
      applyExtractedFields(result);
      await saveDetailFields();
      setStatus('智能填充并已保存');
    } catch (err) {
      setStatus('元数据生成失败，请检查 Ollama 设置。');
    }
  });

  elements.detailPanel.querySelector('[data-generate-summary]').addEventListener('click', async () => {
    const summaryInput = elements.detailPanel.querySelector('[data-field="summary"]');
    const methodsInput = elements.detailPanel.querySelector('[data-field="methods"]');
    const contributionsInput = elements.detailPanel.querySelector('[data-field="contributions"]');
    const pointsInput = elements.detailPanel.querySelector('[data-field="key_points"]');
    const hasExisting = [summaryInput, methodsInput, contributionsInput, pointsInput]
      .some(input => input && input.value.trim());
    if (hasExisting && !confirm('已有总结内容，是否覆盖？')) return;

    setStatus('正在请求 Ollama 生成总结...');
    try {
      const result = await window.paperdesk.ollamaSummarize({ id: paper.id });
      if (summaryInput) summaryInput.value = result.summary || '';
      if (methodsInput) methodsInput.value = result.methods || '';
      if (contributionsInput) contributionsInput.value = result.contributions || '';
      if (pointsInput) pointsInput.value = (result.key_points || []).join('\n');
      setStatus('总结已生成，请核对后保存。');
    } catch (err) {
      setStatus('总结生成失败，请检查 Ollama 设置。');
    }
  });

  elements.detailPanel.querySelector('[data-export-bibtex]').addEventListener('click', async () => {
    await window.paperdesk.exportCitation({ id: paper.id, format: 'bibtex' });
  });

  elements.detailPanel.querySelector('[data-export-apa]').addEventListener('click', async () => {
    await window.paperdesk.exportCitation({ id: paper.id, format: 'apa' });
  });

  elements.detailPanel.querySelector('[data-export-mla]').addEventListener('click', async () => {
    await window.paperdesk.exportCitation({ id: paper.id, format: 'mla' });
  });

  elements.detailPanel.querySelector('[data-export-ieee]').addEventListener('click', async () => {
    await window.paperdesk.exportCitation({ id: paper.id, format: 'ieee' });
  });

  elements.detailPanel.querySelector('[data-export-ris]').addEventListener('click', async () => {
    await window.paperdesk.exportCitation({ id: paper.id, format: 'ris' });
  });

  elements.detailPanel.querySelector('[data-find-similar]').addEventListener('click', async () => {
    const list = elements.detailPanel.querySelector('[data-similar-list]');
    list.textContent = '正在查找相似论文...';
    try {
      const result = await window.paperdesk.findSimilar({ id: paper.id, limit: 6, generateMissing: true, maxGenerate: 20 });
      if (!result.length) {
        list.textContent = '未找到相似论文（可能缺少向量）。';
        return;
      }
      list.innerHTML = result.map(item => `
        <button class="similar-item" data-similar-id="${item.id}">
          <div>${item.title || '未命名'}</div>
          <div class="similar-meta">${item.authors || '未知作者'} - ${item.year || '年份未知'} - ${item.score.toFixed(2)}</div>
        </button>
      `).join('');
      list.querySelectorAll('[data-similar-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.getAttribute('data-similar-id'));
          selectPaper(id);
        });
      });
    } catch (err) {
      list.textContent = '相似度计算失败，请检查向量模型设置。';
    }
  });

  elements.detailPanel.querySelector('[data-save]').addEventListener('click', saveDetailFields);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function loadSources() {
  state.sources = await window.paperdesk.listSources();
  renderSources();
}

async function refreshPapers() {
  const isSearchPage = state.currentPage === 'search';
  const filters = isSearchPage ? collectFilters() : {};
  const payload = { ...filters, page: state.page, pageSize: state.pageSize, sortBy: state.sortBy };
  let result = null;
  state.aiMeta = new Map();
  if (isSearchPage && state.searchMode === 'ai') {
    const minScoreOverride = elements.recallMinScore ? Number(elements.recallMinScore.value) : NaN;
    result = await window.paperdesk.aiRecallSearch({
      query: state.query || elements.modelQuery.value.trim(),
      profile: state.recallStrength,
      filters: state.modelFilters || {},
      semanticEnabled: elements.semanticEnabled ? elements.semanticEnabled.checked : true,
      minScoreOverride: Number.isFinite(minScoreOverride) ? minScoreOverride : null,
      page: state.page,
      pageSize: state.pageSize
    });
  } else {
    result = await window.paperdesk.listPapers(payload);
  }
  const items = result && result.items ? result.items : [];
  state.papers = items;
  state.total = result && result.total ? result.total : 0;
  if (state.searchMode === 'ai') {
    items.forEach(item => {
      state.aiMeta.set(item.id, {
        reasons: item.reasons || [],
        breakdown: item.breakdown || {}
      });
    });
  }
  const validIds = new Set(state.papers.map(paper => paper.id));
  state.selectedIds.forEach(id => {
    if (!validIds.has(id)) state.selectedIds.delete(id);
  });
  updateSelectedCount();
  updatePager();
  renderPapers();
  if (state.selectedId) {
    const detail = await window.paperdesk.getPaper(state.selectedId);
    renderDetail(detail);
  }
  saveStateToView(state.currentPage);
}

async function selectPaper(id) {
  state.selectedId = id;
  const paper = await window.paperdesk.getPaper(id);
  renderPapers();
  renderDetail(paper);
}

async function initSettings() {
  state.settings = await window.paperdesk.getSettings();
  elements.settingsEndpoint.value = state.settings.ollama_endpoint || '';
  elements.settingsModel.value = state.settings.ollama_model || '';
  elements.settingsEmbedModel.value = state.settings.ollama_embed_model || '';
  elements.settingsStatus.textContent = '未连接';
  elements.modelProvider.value = state.settings.model_provider || 'ollama';
  elements.modelBase.value = state.settings.model_api_base || '';
  elements.modelKey.value = state.settings.model_api_key || '';
  elements.modelChat.value = state.settings.model_chat_model || '';
  elements.modelEmbed.value = state.settings.model_embed_model || '';
  if (elements.localModelMode) {
    elements.localModelMode.checked = Boolean(state.settings.local_model_mode);
  }
  state.translateEnabled = Boolean(state.settings.translate_enabled);
  if (elements.translateToggle) {
    elements.translateToggle.checked = state.translateEnabled;
  }
  resetTranslateProgress();
  updateModelModeUI();
}

async function saveSettings() {
  const payload = {
    ollama_endpoint: elements.settingsEndpoint.value.trim(),
    ollama_model: elements.settingsModel.value.trim(),
    ollama_embed_model: elements.settingsEmbedModel.value.trim(),
    translate_enabled: elements.translateToggle ? elements.translateToggle.checked : state.translateEnabled
  };
  await window.paperdesk.setSettings(payload);
  setStatus('设置已保存');
}

function updateModelModeUI() {
  if (!elements.localModelMode) return;
  const localMode = elements.localModelMode.checked;
  const controls = [elements.modelProvider, elements.modelBase, elements.modelKey, elements.modelChat, elements.modelEmbed];
  controls.forEach(control => {
    if (!control) return;
    control.disabled = localMode;
  });
  elements.modelPresets.forEach(btn => {
    btn.disabled = localMode;
  });
  if (localMode && elements.modelProvider) {
    elements.modelProvider.value = 'ollama';
  }
}

function applyPreset(provider) {
  const presets = {
    siliconflow: {
      base: 'https://api.siliconflow.cn/v1',
      chat: 'deepseek-ai/DeepSeek-V3',
      embed: 'BAAI/bge-large-zh-v1.5'
    },
    dashscope: {
      base: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      chat: 'qwen-plus',
      embed: 'text-embedding-v3'
    },
    deepseek: {
      base: 'https://api.deepseek.com/v1',
      chat: 'deepseek-chat',
      embed: 'text-embedding-3-small'
    },
    zhipu: {
      base: 'https://open.bigmodel.cn/api/paas/v4',
      chat: 'glm-4-plus',
      embed: 'embedding-2'
    },
    openai_compat: {
      base: 'https://api.openai.com/v1',
      chat: 'gpt-4o-mini',
      embed: 'text-embedding-3-small'
    }
  };
  const preset = presets[provider];
  if (!preset) return;
  elements.modelProvider.value = provider;
  elements.modelBase.value = preset.base;
  elements.modelChat.value = preset.chat;
  elements.modelEmbed.value = preset.embed;
}

async function saveModelSettings() {
  const localMode = elements.localModelMode ? elements.localModelMode.checked : false;
  const payload = {
    model_provider: localMode ? 'ollama' : elements.modelProvider.value,
    model_api_base: elements.modelBase.value.trim(),
    model_api_key: elements.modelKey.value.trim(),
    model_chat_model: elements.modelChat.value.trim(),
    model_embed_model: elements.modelEmbed.value.trim(),
    local_model_mode: localMode
  };
  await window.paperdesk.setSettings(payload);
  setStatus('API 配置已保存');
}

async function testOllamaConnection() {
  elements.settingsStatus.textContent = '连接中...';
  try {
    const result = await window.paperdesk.ollamaPing();
    if (result.ok) {
      const count = Array.isArray(result.models) ? result.models.length : 0;
      elements.settingsStatus.textContent = count ? `已连接（发现 ${count} 个模型）` : '已连接';
    } else {
      elements.settingsStatus.textContent = '连接失败';
    }
  } catch {
    elements.settingsStatus.textContent = '连接失败';
  }
}

async function handleAddSource(type) {
  const paths = await window.paperdesk.pickSource(type);
  if (!paths.length) return;

  for (const sourcePath of paths) {
    await window.paperdesk.addSource({ type, path: sourcePath });
  }

  await loadSources();
  await runScan();
}

async function runScan() {
  setStatus('正在扫描来源...');
  updateProgress(0, 0);
  const result = await window.paperdesk.scanSources();
  await refreshPapers();
  setStatus(`扫描完成，更新 ${result.updated} 条。`);
  updateProgress(result.total || 0, result.total || 0);
}

async function runExtractAll() {
  setStatus('正在提取元数据...');
  updateProgress(0, 0);
  try {
    const onlySelected = elements.extractSelected && elements.extractSelected.checked;
    const saveArchive = !elements.extractSave || elements.extractSave.checked;
    const ids = onlySelected ? Array.from(state.selectedIds) : null;
    if (onlySelected && !ids.length) {
      alert('请先选择论文');
      setStatus('请选择需要提取的论文');
      return;
    }
    const result = await window.paperdesk.extractAllMetadata({ ids, saveArchive });
    await refreshPapers();
    setStatus(`元数据提取完成，更新了 ${result.updated} 条。`);
    updateProgress(result.total || 0, result.total || 0);
  } catch (err) {
    setStatus('元数据提取失败，请检查模型配置');
  }
}

async function rollbackExtract() {
  if (!confirm('确认回档上次提取？')) return;
  try {
    const result = await window.paperdesk.rollbackExtract();
    await refreshPapers();
    setStatus(result.ok ? '已回档上次提取' : '没有可回档的提取记录');
  } catch (err) {
    setStatus('回档失败');
  }
}

async function addManualPaper() {
  state.selectedId = null;
  renderPapers();
  renderDetail({
    id: null,
    title: '',
    authors: '',
    subject: '',
    keywords: '',
    year: '',
    category: '',
    journal: '',
    tags: [],
    abstract: '',
    notes: '',
    summary: '',
    methods: '',
    contributions: '',
    key_points: [],
    extracted_text: '',
    path: '',
    filename: ''
  });
}

async function runLlmRank() {
  if (!state.query) {
    alert('请先输入检索关键词。');
    return;
  }

  const items = state.papers.slice(0, 40).map(p => ({
    id: p.id,
    title: p.title,
    authors: p.authors,
    year: p.year,
    abstract: p.abstract,
    tags: p.tags,
    keywords: p.keywords,
    subject: p.subject
  }));

  setStatus('正在请求 Ollama 排序...');
  try {
    const result = await window.paperdesk.llmRank({ query: state.query, items });
    const order = result.ordered_ids || [];
    const notes = result.notes || {};
    const map = new Map(state.papers.map(p => [p.id, p]));
    const ranked = [];

    order.forEach(id => {
      if (map.has(id)) {
        ranked.push({ ...map.get(id), llmNote: notes[id] || '' });
        map.delete(id);
      }
    });

    for (const leftover of map.values()) {
      ranked.push(leftover);
    }

    state.papers = ranked;
    renderPapers();
    if (state.selectedId) {
      const detail = await window.paperdesk.getPaper(state.selectedId);
      renderDetail(detail);
    }
    setStatus('已应用 LLM 排序。');
  } catch (err) {
    setStatus('LLM 排序失败，请检查设置。');
  }
}

function initEvents() {
  elements.searchInput.addEventListener('input', async (event) => {
    state.query = event.target.value.trim();
    if (elements.globalSearch) elements.globalSearch.value = state.query;
    if (elements.modelQuery) elements.modelQuery.value = state.query;
    if (state.searchMode !== 'basic') return;
    state.page = 1;
    await refreshPapers();
  });

  elements.searchInput.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
      state.query = event.target.value.trim();
      if (elements.globalSearch) elements.globalSearch.value = state.query;
      if (elements.modelQuery) elements.modelQuery.value = state.query;
      state.page = 1;
      await refreshPapers();
    }
  });

  if (elements.globalSearch) {
    elements.globalSearch.addEventListener('keydown', async (event) => {
      if (event.key !== 'Enter') return;
      state.query = elements.globalSearch.value.trim();
      elements.searchInput.value = state.query;
      if (elements.modelQuery) elements.modelQuery.value = state.query;
      setSearchMode('basic');
      setPage('search');
      state.page = 1;
      await refreshPapers();
    });
  }

  if (elements.searchSubmit) {
    elements.searchSubmit.addEventListener('click', async () => {
      state.query = elements.searchInput.value.trim();
      if (elements.globalSearch) elements.globalSearch.value = state.query;
      if (elements.modelQuery) elements.modelQuery.value = state.query;
      state.page = 1;
      await refreshPapers();
    });
  }

  if (elements.modelQuery) {
    elements.modelQuery.addEventListener('input', () => {
      const value = elements.modelQuery.value.trim();
      elements.searchInput.value = value;
      state.query = value;
      if (elements.globalSearch) elements.globalSearch.value = value;
    });
  }

  const filterInputs = [
    elements.filterTitle,
    elements.filterTags,
    elements.filterAuthors,
    elements.filterSubject,
    elements.filterCategory,
    elements.filterJournal,
    elements.filterKeywords,
    elements.filterAbstract,
    elements.filterYearFrom,
    elements.filterYearTo
  ];

  filterInputs.forEach(input => {
    input.addEventListener('input', async () => {
      state.page = 1;
      await refreshPapers();
    });
  });

  if (elements.filterNeedsEnrichment) {
    elements.filterNeedsEnrichment.addEventListener('change', async () => {
      state.page = 1;
      await refreshPapers();
    });
  }

  elements.filterClear.addEventListener('click', async () => {
    filterInputs.forEach(input => {
      input.value = '';
    });
    if (elements.filterNeedsEnrichment) elements.filterNeedsEnrichment.checked = false;
    state.page = 1;
    await refreshPapers();
  });

  if (elements.advancedToggle && elements.advancedPanel) {
    elements.advancedToggle.addEventListener('click', () => {
      elements.advancedPanel.classList.toggle('is-open');
    });
  }

  if (elements.scopeRow) {
    elements.scopeRow.querySelectorAll('[data-scope]').forEach(btn => {
      btn.addEventListener('click', () => {
        const scope = btn.getAttribute('data-scope');
        if (!scope) return;
        if (scope === 'all') {
          state.searchScopes = new Set(['all']);
        } else {
          const next = new Set(state.searchScopes);
          if (next.has('all')) next.delete('all');
          if (next.has(scope)) {
            next.delete(scope);
          } else {
            next.add(scope);
          }
          if (!next.size) next.add('all');
          state.searchScopes = next;
        }
        elements.scopeRow.querySelectorAll('[data-scope]').forEach(item => {
          const key = item.getAttribute('data-scope');
          item.classList.toggle('is-active', state.searchScopes.has(key));
        });
      });
    });
  }

  if (elements.filterSave && elements.filterSaveName) {
    elements.filterSave.addEventListener('click', async () => {
      await saveCurrentSearch(elements.filterSaveName.value.trim());
    });
  }

  elements.addIgnoreBtn.addEventListener('click', addIgnoreRule);

  elements.addPaperBtn.addEventListener('click', addManualPaper);
  elements.scanBtn.addEventListener('click', runScan);
  elements.extractAllBtn.addEventListener('click', runExtractAll);
  elements.rollbackExtractBtn.addEventListener('click', rollbackExtract);
  elements.addFolderBtn.addEventListener('click', () => handleAddSource('folder'));
  elements.addFileBtn.addEventListener('click', () => handleAddSource('file'));
  elements.settingsSave.addEventListener('click', saveSettings);
  elements.modelSave.addEventListener('click', saveModelSettings);
  elements.settingsTest.addEventListener('click', testOllamaConnection);
  if (elements.localModelMode) {
    elements.localModelMode.addEventListener('change', () => {
      updateModelModeUI();
    });
  }
  if (elements.translateToggle) {
    elements.translateToggle.addEventListener('change', async () => {
      state.translateEnabled = elements.translateToggle.checked;
      await window.paperdesk.setSettings({ translate_enabled: state.translateEnabled });
      resetTranslateProgress();
      state.translationScopeKey = '';
      renderPapers();
      if (state.selectedId) {
        const detail = await window.paperdesk.getPaper(state.selectedId);
        renderDetail(detail);
      }
    });
  }
  if (elements.translateRefresh) {
    elements.translateRefresh.addEventListener('click', async () => {
      if (!state.translateEnabled) {
        alert('请先开启翻译功能。');
        return;
      }
      state.papers.forEach(paper => state.translationCache.delete(paper.id));
      resetTranslateProgress();
      state.translationScopeKey = '';
      renderPapers();
    });
  }
  elements.llmRankBtn.addEventListener('click', runLlmRank);
  elements.navButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const page = btn.getAttribute('data-nav');
      setPage(page);
      if (page === 'settings') {
        await initSettings();
      }
    });
  });
  if (elements.navToggle) {
    elements.navToggle.addEventListener('click', () => {
      if (elements.navPanel) elements.navPanel.classList.toggle('open');
    });
  }

  elements.modelAnalyze.addEventListener('click', async () => {
    const query = elements.modelQuery.value.trim();
    if (!query) return;
    setStatus('模型正在解析条件...');
    try {
      const result = await window.paperdesk.modelParseQuery({ query });
      const filters = result.filters || {};
      if (result.semanticQuery) filters.semanticQuery = result.semanticQuery;
      applyModelFilters(filters);
      state.modelFilters = filters;
      if (filters.semanticQuery) elements.semanticEnabled.checked = true;
      state.intentDetailsOpen = false;
      if (elements.modelConditions) {
        elements.modelConditions.classList.remove('is-open');
      }
      setStatus('已生成模型检索条件');
    } catch (err) {
      setStatus('模型解析失败，请检查 API 配置');
    }
  });

  elements.modelApply.addEventListener('click', async () => {
    setSearchMode('ai');
    state.modelFilters = readModelFilters();
    state.page = 1;
    await refreshPapers();
    setPage('search');
  });

  if (elements.recallStrength) {
    elements.recallStrength.querySelectorAll('[data-strength]').forEach(btn => {
      btn.addEventListener('click', () => {
        const strength = btn.getAttribute('data-strength');
        if (!strength) return;
        state.recallStrength = strength;
        elements.recallStrength.querySelectorAll('[data-strength]').forEach(item => {
          item.classList.toggle('is-active', item.getAttribute('data-strength') === strength);
        });
      });
    });
  }

  if (elements.intentDetailToggle && elements.modelConditions) {
    elements.intentDetailToggle.addEventListener('click', () => {
      state.intentDetailsOpen = !state.intentDetailsOpen;
      elements.modelConditions.classList.toggle('is-open', state.intentDetailsOpen);
    });
  }

  elements.sortBy.addEventListener('change', async () => {
    state.sortBy = elements.sortBy.value;
    state.page = 1;
    await refreshPapers();
  });

  elements.modelPresets.forEach(btn => {
    btn.addEventListener('click', () => {
      const provider = btn.getAttribute('data-model-preset');
      applyPreset(provider);
    });
  });

  if (elements.selectAllBtn) {
    elements.selectAllBtn.addEventListener('click', () => {
      if (!state.papers.length) return;
      state.papers.forEach(paper => {
        state.selectedIds.add(paper.id);
      });
      updateSelectedCount();
      renderPapers();
    });
  }

  if (elements.statsDimension) {
    elements.statsDimension.addEventListener('change', () => {
      loadStats(elements.statsDimension.value);
    });
  }

  if (elements.statsSelectAll) {
    elements.statsSelectAll.addEventListener('click', () => {
      const boxes = elements.statsList ? elements.statsList.querySelectorAll('[data-stats-item]') : [];
      boxes.forEach(box => {
        box.checked = true;
        const raw = box.getAttribute('data-stats-item');
        state.statsSelected.add(decodeURIComponent(raw));
      });
    });
  }

  if (elements.statsView) {
    elements.statsView.addEventListener('click', async () => {
      const selected = Array.from(state.statsSelected);
      if (!selected.length) {
        alert('请选择一个分类项');
        return;
      }
      if (selected.length > 1) {
        alert('多选仅用于导出，请选择单项查看结果');
        return;
      }
      const label = selected[0];
      const filters = {};
      if (state.statsDimension === 'year') {
        filters.yearFrom = label;
        filters.yearTo = label;
      } else if (state.statsDimension === 'authors') {
        filters.authors = label;
      } else if (state.statsDimension === 'subject') {
        filters.subject = label;
      } else if (state.statsDimension === 'tags') {
        filters.tags = label;
      } else if (state.statsDimension === 'category') {
        filters.category = label;
      } else if (state.statsDimension === 'journal') {
        filters.journal = label;
      }
      setSearchMode('basic');
      applyFilters(filters);
      setPage('search');
      await refreshPapers();
    });
  }

  if (elements.statsExport) {
    elements.statsExport.addEventListener('click', async () => {
      const selected = Array.from(state.statsSelected);
      if (!selected.length) {
        alert('请选择要导出的分类项');
        return;
      }
      try {
        const result = await window.paperdesk.exportClassified({
          dimension: state.statsDimension,
          labels: selected
        });
        if (result && result.ok) {
          setStatus('分类导出完成');
        } else {
          setStatus('导出取消或未生成文件');
        }
      } catch {
        setStatus('分类导出失败');
      }
    });
  }

  elements.searchModeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-search-mode');
      setSearchMode(mode);
      state.page = 1;
      refreshPapers();
    });
  });
  elements.pagePrev.addEventListener('click', async () => {
    if (state.page > 1) {
      state.page -= 1;
      await refreshPapers();
    }
  });
  elements.pageNext.addEventListener('click', async () => {
    const totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
    if (state.page < totalPages) {
      state.page += 1;
      await refreshPapers();
    }
  });
  elements.pageSize.addEventListener('change', async () => {
    state.pageSize = Number(elements.pageSize.value) || 20;
    state.page = 1;
    await refreshPapers();
  });
  elements.bulkApply.addEventListener('click', async () => {
    const tags = elements.bulkTags.value.trim();
    if (!tags) return;
    const ids = Array.from(state.selectedIds);
    if (!ids.length) {
      alert('请先选择论文。');
      return;
    }
    await window.paperdesk.bulkTag({ ids, tags });
    elements.bulkTags.value = '';
    await refreshPapers();
  });

  if (elements.bulkSummarize) {
    elements.bulkSummarize.addEventListener('click', async () => {
      const ids = Array.from(state.selectedIds);
      if (!ids.length) {
        alert('请先选择论文');
        return;
      }
      setStatus('正在批量生成总结...');
      const result = await window.paperdesk.summarizeBatch({ ids });
      setStatus(`批量总结完成，更新 ${result.updated} 条。`);
      await refreshPapers();
    });
  }

  const handleBulkExport = async (format) => {
    const ids = Array.from(state.selectedIds);
    if (!ids.length) {
      alert('请先选择论文。');
      return;
    }
    await window.paperdesk.bulkExport({ ids, format });
    if (elements.exportMenu) elements.exportMenu.classList.remove('is-open');
  };

  if (elements.exportToggle && elements.exportMenu) {
    elements.exportToggle.addEventListener('click', (event) => {
      event.stopPropagation();
      elements.exportMenu.classList.toggle('is-open');
    });
    document.addEventListener('click', () => {
      elements.exportMenu.classList.remove('is-open');
    });
  }

  elements.bulkExportBibtex.addEventListener('click', () => handleBulkExport('bibtex'));
  elements.bulkExportApa.addEventListener('click', () => handleBulkExport('apa'));
  elements.bulkExportCsv.addEventListener('click', () => handleBulkExport('csv'));
  if (elements.bulkExportPdf) {
    elements.bulkExportPdf.addEventListener('click', async () => {
      const ids = Array.from(state.selectedIds);
      if (!ids.length) {
        alert('请先选择论文');
        return;
      }
      await window.paperdesk.exportPdf({ ids });
    });
  }
  if (elements.bulkExportRis) elements.bulkExportRis.addEventListener('click', () => handleBulkExport('ris'));
  if (elements.bulkExportMla) elements.bulkExportMla.addEventListener('click', () => handleBulkExport('mla'));
  if (elements.bulkExportIeee) elements.bulkExportIeee.addEventListener('click', () => handleBulkExport('ieee'));

  window.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      elements.searchInput.focus();
    }
    if (event.ctrlKey && event.key.toLowerCase() === 's') {
      event.preventDefault();
      const saveBtn = elements.detailPanel.querySelector('[data-save]');
      if (saveBtn) saveBtn.click();
    }
    if (event.ctrlKey && event.key.toLowerCase() === 'n') {
      event.preventDefault();
      addManualPaper();
    }
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (elements.filterSaveName) elements.filterSaveName.focus();
    }
  });
}

async function init() {
  await loadSources();
  await loadSavedSearches();
  await loadIgnoreRules();
  if (elements.sortBy) {
    const value = elements.sortBy.value;
    state.views.library.sortBy = value;
    state.views.search.sortBy = value;
  }
  loadViewFromState(state.currentPage);
  await refreshPapers();
  renderDetail(null);
  initEvents();
  setPage(state.currentPage);
  if (elements.searchModeButtons.length) {
    setSearchMode('basic');
  }
  renderIntentChips(state.modelFilters);
  if (elements.modelConditions) {
    elements.modelConditions.classList.remove('is-open');
  }
  if (elements.scopeRow) {
    elements.scopeRow.querySelectorAll('[data-scope]').forEach(item => {
      const key = item.getAttribute('data-scope');
      item.classList.toggle('is-active', state.searchScopes.has(key));
    });
  }
  if (elements.statsDimension) {
    elements.statsDimension.value = state.statsDimension;
  }
  if (window.paperdesk.onScanProgress) {
    window.paperdesk.onScanProgress((data) => {
      updateProgress(data.current, data.total, data.path);
    });
  }
  if (window.paperdesk.onExtractProgress) {
    window.paperdesk.onExtractProgress((data) => {
      updateProgress(data.current, data.total);
      updateProgressText(`元数据提取 ${data.current}/${data.total}`);
    });
  }
}

window.addEventListener('DOMContentLoaded', init);

function collectFilters() {
  const scoped = state.searchMode === 'basic' ? resolveScopedQuery(state.query || '') : { query: '', scopeFields: [] };
  const base = {
    query: state.searchMode === 'basic' ? scoped.query : '',
    scopeFields: state.searchMode === 'basic' ? scoped.scopeFields : [],
    title: state.searchMode === 'basic' ? elements.filterTitle.value.trim() : '',
    tags: state.searchMode === 'basic' ? elements.filterTags.value.trim() : '',
    authors: state.searchMode === 'basic' ? elements.filterAuthors.value.trim() : '',
    subject: state.searchMode === 'basic' ? elements.filterSubject.value.trim() : '',
    category: state.searchMode === 'basic' ? elements.filterCategory.value.trim() : '',
    journal: state.searchMode === 'basic' ? elements.filterJournal.value.trim() : '',
    keywords: state.searchMode === 'basic' ? elements.filterKeywords.value.trim() : '',
    abstract: state.searchMode === 'basic' ? elements.filterAbstract.value.trim() : '',
    yearFrom: state.searchMode === 'basic' ? elements.filterYearFrom.value.trim() : '',
    yearTo: state.searchMode === 'basic' ? elements.filterYearTo.value.trim() : '',
    needsEnrichment: state.searchMode === 'basic' && elements.filterNeedsEnrichment ? elements.filterNeedsEnrichment.checked : false,
    sortBy: state.sortBy
  };
  const merged = state.searchMode === 'ai' ? mergeFilters(base, state.modelFilters) : base;
  if (state.searchMode === 'ai') {
    merged.metadataOnly = true;
    if (merged.sortBy === 'updated_desc') {
      merged.sortBy = 'score_desc';
    }
  }
  if (state.searchMode === 'ai' && elements.semanticEnabled.checked && elements.modelSemantic.value.trim()) {
    const preset = getRecallPreset(state.recallStrength);
    merged.semanticQuery = elements.modelSemantic.value.trim();
    merged.semanticMinScore = preset.minScore;
    merged.semanticGenerateMissing = true;
    merged.semanticMaxGenerate = preset.maxGenerate;
  }
  return merged;
}

function applyFilters(filters) {
  const next = filters || {};
  state.query = next.query || '';
  state.page = 1;
  elements.searchInput.value = state.query;
  if (elements.globalSearch) elements.globalSearch.value = state.query;
  if (elements.modelQuery) elements.modelQuery.value = state.query;
  if (Array.isArray(next.scopeFields) && next.scopeFields.length) {
    state.searchScopes = new Set(next.scopeFields);
  } else {
    state.searchScopes = new Set(['all']);
  }
  if (elements.scopeRow) {
    elements.scopeRow.querySelectorAll('[data-scope]').forEach(item => {
      const key = item.getAttribute('data-scope');
      item.classList.toggle('is-active', state.searchScopes.has(key));
    });
  }
  elements.filterTitle.value = next.title || '';
  elements.filterTags.value = next.tags || '';
  elements.filterAuthors.value = next.authors || '';
  elements.filterSubject.value = next.subject || '';
  elements.filterCategory.value = next.category || '';
  elements.filterJournal.value = next.journal || '';
  elements.filterKeywords.value = next.keywords || '';
  elements.filterAbstract.value = next.abstract || '';
  elements.filterYearFrom.value = next.yearFrom || '';
  elements.filterYearTo.value = next.yearTo || '';
  if (elements.filterNeedsEnrichment) {
    elements.filterNeedsEnrichment.checked = Boolean(next.needsEnrichment);
  }
  elements.semanticEnabled.checked = Boolean(next.semanticQuery);
  if (next.semanticQuery) {
    setSearchMode('ai');
  } else {
    setSearchMode('basic');
  }
  state.sortBy = next.sortBy || state.sortBy;
  if (elements.sortBy) elements.sortBy.value = state.sortBy;
  const modelFilters = {
    semanticQuery: next.semanticQuery || '',
    title: next.title || '',
    authors: next.modelAuthors || next.authors || '',
    subject: next.modelSubject || next.subject || '',
    tags: next.modelTags || next.tags || '',
    keywords: next.modelKeywords || next.keywords || '',
    category: next.modelCategory || next.category || '',
    journal: next.modelJournal || next.journal || '',
    yearFrom: next.yearFrom || '',
    yearTo: next.yearTo || '',
    matchAny: Boolean(next.matchAny)
  };
  applyModelFilters(modelFilters);
  state.modelFilters = readModelFilters();
}
