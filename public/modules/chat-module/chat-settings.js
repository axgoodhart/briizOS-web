// Chat Settings Manager - Manages AI provider settings for briizOS

class SettingsManager {
  constructor() {
    this.STORAGE_KEY = 'briizos.chatSettings.v1';
    this.HISTORY_KEY = 'briizos.chatHistory.v1';
    this.API_KEYS_STORAGE_KEY = 'briizos.aiApiKeys.v1';

    this.DEFAULT_MODELS = {
      chatgpt: ['gpt-4.1', 'gpt-4o', 'gpt-4o-mini', 'o3-mini-high', 'o3-mini', 'gpt-3.5-turbo'],
      gemini: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
      claude: [
        'claude-sonnet-4-5-20250929',
        'claude-opus-4-1-20250805',
        'claude-opus-4-20250514',
        'claude-sonnet-4-20250514',
        'claude-3-7-sonnet-20250219',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-5-sonnet-20240620',
        'claude-3-haiku-20240307',
        'claude-3-opus-20240229'
      ]
    };

    this.state = this.loadState();
    this.apiKeys = this.loadApiKeys();
    this.listeners = new Set();
    this.historyListeners = new Set();

    // UI elements (will be set when panel is rendered)
    this.elements = {};

  }

  // API keys are kept separately so they are not copied into settings history.
  loadApiKeys() {
    const emptyKeys = {
      chatgpt: '',
      gemini: '',
      claude: ''
    };

    try {
      const raw = localStorage.getItem(this.API_KEYS_STORAGE_KEY);
      if (!raw) return emptyKeys;

      const savedKeys = JSON.parse(raw);
      return Object.assign(emptyKeys, savedKeys);
    } catch (e) {
      console.warn('Failed to load AI API keys', e);
      return emptyKeys;
    }
  }

  saveApiKeys() {
    try {
      localStorage.setItem(this.API_KEYS_STORAGE_KEY, JSON.stringify(this.apiKeys));
    } catch (e) {
      console.error('Failed to save AI API keys', e);
    }
  }

  // ============ State Management ============

  defaultProviderState(provider) {
    return {
      model: this.DEFAULT_MODELS[provider][0],
      prompt: '',
      params: {
        top_p: 1.0,
        temperature: 1.0,
        max_tokens: 1024
      },
      customModels: []
    };
  }

  defaultState() {
    return {
      provider: 'gemini',
      providers: {
        chatgpt: this.defaultProviderState('chatgpt'),
        gemini: this.defaultProviderState('gemini'),
        claude: this.defaultProviderState('claude')
      }
    };
  }

  loadState() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return this.defaultState();

      const parsed = JSON.parse(raw);
      const base = this.defaultState();
      const merged = Object.assign({}, base, parsed);

      // Ensure structure
      for (const p of ['chatgpt', 'gemini', 'claude']) {
        merged.providers[p] = Object.assign({}, base.providers[p], merged.providers?.[p] || {});
        merged.providers[p].params = Object.assign({}, base.providers[p].params, merged.providers[p].params || {});
        merged.providers[p].customModels = Array.isArray(merged.providers[p].customModels) ? merged.providers[p].customModels : [];
      }

      if (!['chatgpt', 'gemini', 'claude'].includes(merged.provider)) {
        merged.provider = 'gemini';
      }

      return merged;
    } catch (e) {
      console.warn('Failed to load settings, using defaults', e);
      return this.defaultState();
    }
  }

  saveState() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }

  // ============ Public API ============

  getCurrentProvider() {
    return this.state.provider;
  }

  setProvider(provider) {
    if (['chatgpt', 'gemini', 'claude'].includes(provider)) {
      this.state.provider = provider;
      this.saveState();
    }
  }

  getProviderSettings(provider = null) {
    const p = provider || this.state.provider;
    return this.state.providers[p];
  }

  getApiKey(provider = null) {
    const requestedProvider = provider || this.state.provider;
    const p = requestedProvider === 'openai' ? 'chatgpt' : requestedProvider;
    return this.apiKeys[p] || '';
  }

  setApiKey(provider, apiKey) {
    const p = provider === 'openai' ? 'chatgpt' : provider;
    if (!Object.prototype.hasOwnProperty.call(this.apiKeys, p)) return;

    this.apiKeys[p] = apiKey.trim();
    this.saveApiKeys();
  }

  getAllSettings() {
    return {
      provider: this.state.provider,
      ...this.state.providers[this.state.provider]
    };
  }

  updateProviderSettings(provider, updates) {
    if (this.state.providers[provider]) {
      Object.assign(this.state.providers[provider], updates);
      this.saveState();
    }
  }

  updateCurrentModel(model) {
    const provider = this.state.provider;
    this.state.providers[provider].model = model;
    this.saveState();
  }

  updateCurrentParams(params) {
    const provider = this.state.provider;
    Object.assign(this.state.providers[provider].params, params);
    this.saveState();
  }

  updateCurrentPrompt(prompt) {
    const provider = this.state.provider;
    this.state.providers[provider].prompt = prompt;
    this.saveState();
  }

  addCustomModel(provider, modelName) {
    if (!this.state.providers[provider].customModels.includes(modelName) &&
        !this.DEFAULT_MODELS[provider].includes(modelName)) {
      this.state.providers[provider].customModels.push(modelName);
      this.saveState();
      return true;
    }
    return false;
  }

  getAllModels(provider) {
    const builtins = this.DEFAULT_MODELS[provider] || [];
    const customs = this.state.providers[provider].customModels || [];
    return [...builtins, ...customs];
  }

  // ============ Event System ============

  onSettingsChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    const event = new CustomEvent('briizos-settings-update', { detail: this.getAllSettings() });
    window.dispatchEvent(event);

    this.listeners.forEach(cb => {
      try {
        cb(this.getAllSettings());
      } catch (e) {
        console.error('Settings listener error:', e);
      }
    });
  }

  // ============ History Management ============

  loadHistory() {
    try {
      const raw = localStorage.getItem(this.HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Failed to load history, starting empty', e);
      return [];
    }
  }

  saveHistory(history) {
    try {
      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
      this.notifyHistoryListeners();
    } catch (e) {
      console.error('Failed to save history', e);
    }
  }

  saveSnapshot(label = null) {
    const history = this.loadHistory();
    const timestamp = Date.now();
    const snapshot = {
      id: `snap_${timestamp}`,
      label: label || `Snapshot ${new Date(timestamp).toLocaleString()}`,
      timestamp,
      provider: this.state.provider,
      settings: JSON.parse(JSON.stringify(this.state.providers[this.state.provider]))
    };

    history.unshift(snapshot);

    // Keep only last 50 snapshots
    if (history.length > 50) {
      history.splice(50);
    }

    this.saveHistory(history);
    return snapshot;
  }

  loadSnapshot(id) {
    const history = this.loadHistory();
    const snapshot = history.find(s => s.id === id);

    if (snapshot) {
      this.state.provider = snapshot.provider;
      this.state.providers[snapshot.provider] = JSON.parse(JSON.stringify(snapshot.settings));
      this.saveState();
      return true;
    }

    return false;
  }

  deleteSnapshot(id) {
    let history = this.loadHistory();
    history = history.filter(s => s.id !== id);
    this.saveHistory(history);
  }

  clearHistory() {
    this.saveHistory([]);
  }

  onHistoryChange(callback) {
    this.historyListeners.add(callback);
    return () => this.historyListeners.delete(callback);
  }

  notifyHistoryListeners() {
    this.historyListeners.forEach(cb => {
      try {
        cb(this.loadHistory());
      } catch (e) {
        console.error('History listener error:', e);
      }
    });
  }

  // ============ UI Rendering ============

  renderSettingsPanel(container) {
    const panelHTML = `
      <div class="chat-settings-root" id="chatSettingsRoot">
                  <button class="cs-history-btn" id="csHistoryBtn">⟲</button>

        <div class="chat-settings-panel">
          <div class="cs-header-row">
            <span class="cs-logo">AI Settings</span>
            <button class="cs-close-btn" id="csCloseBtn">✕</button>
          </div>

          <div class="cs-model-row">
            <span class="cs-label-model">Model</span>
            <div class="cs-model-select" id="csModelSelect">
              <span class="cs-selected-model" id="csSelectedModel">${this.state.providers[this.state.provider].model}</span>
              <span class="cs-arrow">▾</span>
              <div class="cs-dropdown" id="csModelDropdown"></div>
            </div>
            <div class="cs-custom-model" id="csCustomModelRow" hidden>
              <input id="csCustomModelInput" placeholder="Enter custom model id" />
              <button id="csAddCustomModelBtn">Add</button>
            </div>
          </div>

          <div class="cs-api-key-row">
            <label for="csApiKeyInput">API Key</label>
            <div class="cs-api-key-control">
              <input id="csApiKeyInput" type="password" autocomplete="off" spellcheck="false" placeholder="Enter API key for this provider" />
              <button id="csApiKeyToggle" type="button">Show</button>
            </div>
            <div class="cs-api-key-status" id="csApiKeyStatus"></div>
          </div>

          <div class="cs-slider-row">
            <div class="cs-slider-group">
              <label for="csTopP">Top P</label>
              <input id="csTopP" type="range" min="0" max="1" step="0.01" value="${this.state.providers[this.state.provider].params.top_p}" />
              <span class="cs-slider-value" id="csTopPValue">${this.formatValue(this.state.providers[this.state.provider].params.top_p, 'top_p')}</span>
            </div>

            <div class="cs-slider-group">
              <label for="csTemperature">Temp</label>
              <input id="csTemperature" type="range" min="0" max="2" step="0.01" value="${this.state.providers[this.state.provider].params.temperature}" />
              <span class="cs-slider-value" id="csTemperatureValue">${this.formatValue(this.state.providers[this.state.provider].params.temperature, 'temperature')}</span>
            </div>

            <div class="cs-slider-group">
              <label for="csMaxTokens">Max Tokens</label>
              <input id="csMaxTokens" type="range" min="256" max="40000" step="100" value="${this.state.providers[this.state.provider].params.max_tokens}" />
              <span class="cs-slider-value" id="csMaxTokensValue">${this.state.providers[this.state.provider].params.max_tokens}</span>
            </div>

            <div class="cs-prompt-group">
              <label for="csPromptText">Prompt</label>
              <textarea id="csPromptText" placeholder="Write your system prompt…">${this.state.providers[this.state.provider].prompt || ''}</textarea>
              <div class="cs-prompt-meta" id="csPromptMeta">${(this.state.providers[this.state.provider].prompt || '').length} chars</div>
            </div>
          </div>
        </div>

        <nav class="cs-bottom-nav">
          <div class="cs-nav-pill chatgpt ${this.state.provider === 'chatgpt' ? 'active' : ''}" data-provider="chatgpt">
            <span>❁</span>
          </div>
          <div class="cs-nav-pill gemini ${this.state.provider === 'gemini' ? 'active' : ''}" data-provider="gemini">
            <span>✦</span>
          </div>
          <div class="cs-nav-pill claude ${this.state.provider === 'claude' ? 'active' : ''}" data-provider="claude">
            <span>✴︎</span>
          </div>
        </nav>

        <!-- History Panel -->
        <aside class="cs-history-panel" id="csHistoryPanel" style="display: none;">
          <header class="cs-history-header">
            <h2>Settings History</h2>
            <div class="cs-history-actions">
              <button id="csSaveSnapshotBtn" class="cs-hist-btn primary">Save Snapshot</button>
              <button id="csClearHistoryBtn" class="cs-hist-btn danger">Clear All</button>
              <button id="csCloseHistoryBtn" class="cs-hist-btn ghost">✕</button>
            </div>
          </header>
          <div class="cs-history-toolbar">
            <div class="cs-history-filters" id="csHistoryFilters">
              <button class="cs-chip active" data-filter="all">All</button>
              <button class="cs-chip" data-filter="chatgpt">ChatGPT</button>
              <button class="cs-chip" data-filter="gemini">Gemini</button>
              <button class="cs-chip" data-filter="claude">Claude</button>
            </div>
            <input id="csHistorySearch" class="cs-history-search" placeholder="Search..." />
          </div>
          <div class="cs-history-list" id="csHistoryList"></div>
        </aside>
      </div>
    `;

    container.innerHTML = panelHTML;
    this.cacheElements();
    this.attachEventListeners();
    this.renderModelDropdown(this.state.provider);
    this.updateApiKeyUI();
  }

  cacheElements() {
    this.elements = {
      root: document.getElementById('chatSettingsRoot'),
      closeBtn: document.getElementById('csCloseBtn'),
      selectedModel: document.getElementById('csSelectedModel'),
      modelSelect: document.getElementById('csModelSelect'),
      modelDropdown: document.getElementById('csModelDropdown'),
      customModelRow: document.getElementById('csCustomModelRow'),
      customModelInput: document.getElementById('csCustomModelInput'),
      addCustomModelBtn: document.getElementById('csAddCustomModelBtn'),
      apiKeyInput: document.getElementById('csApiKeyInput'),
      apiKeyToggle: document.getElementById('csApiKeyToggle'),
      apiKeyStatus: document.getElementById('csApiKeyStatus'),
      topP: document.getElementById('csTopP'),
      topPValue: document.getElementById('csTopPValue'),
      temperature: document.getElementById('csTemperature'),
      temperatureValue: document.getElementById('csTemperatureValue'),
      maxTokens: document.getElementById('csMaxTokens'),
      maxTokensValue: document.getElementById('csMaxTokensValue'),
      promptText: document.getElementById('csPromptText'),
      promptMeta: document.getElementById('csPromptMeta'),
      navPills: Array.from(document.querySelectorAll('.cs-nav-pill[data-provider]')),
      historyBtn: document.getElementById('csHistoryBtn'),
      historyPanel: document.getElementById('csHistoryPanel'),
      historyList: document.getElementById('csHistoryList'),
      saveSnapshotBtn: document.getElementById('csSaveSnapshotBtn'),
      clearHistoryBtn: document.getElementById('csClearHistoryBtn'),
      closeHistoryBtn: document.getElementById('csCloseHistoryBtn'),
      historySearch: document.getElementById('csHistorySearch'),
      historyFilters: document.getElementById('csHistoryFilters')
    };
  }

  attachEventListeners() {
    const els = this.elements;

    // Close button
    if (els.closeBtn) {
      els.closeBtn.addEventListener('click', () => this.hide());
    }

    // Model selection
    if (els.modelSelect) {
      els.modelSelect.addEventListener('click', () => this.toggleModelDropdown());
    }

    document.addEventListener('click', (e) => {
      if (els.modelSelect && !els.modelSelect.contains(e.target)) {
        this.closeModelDropdown();
      }
    });

    // Custom model
    if (els.addCustomModelBtn) {
      els.addCustomModelBtn.addEventListener('click', () => this.handleAddCustomModel());
    }

    if (els.customModelInput) {
      els.customModelInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleAddCustomModel();
        } else if (e.key === 'Escape') {
          els.customModelRow.hidden = true;
        }
      });
    }

    // Provider tabs
    els.navPills.forEach(pill => {
      pill.addEventListener('click', () => this.switchProvider(pill.dataset.provider));
    });

    // API key
    if (els.apiKeyInput) {
      els.apiKeyInput.addEventListener('input', () => {
        this.setApiKey(this.state.provider, els.apiKeyInput.value);
        this.updateApiKeyStatus(Boolean(els.apiKeyInput.value.trim()));
      });
    }

    if (els.apiKeyToggle) {
      els.apiKeyToggle.addEventListener('click', () => {
        const shouldShow = els.apiKeyInput.type === 'password';
        els.apiKeyInput.type = shouldShow ? 'text' : 'password';
        els.apiKeyToggle.textContent = shouldShow ? 'Hide' : 'Show';
      });
    }

    // Sliders
    if (els.topP) {
      els.topP.addEventListener('input', () => {
        const v = parseFloat(els.topP.value);
        els.topPValue.textContent = this.formatValue(v, 'top_p');
        this.updateCurrentParams({ top_p: v });
      });
    }

    if (els.temperature) {
      els.temperature.addEventListener('input', () => {
        const v = parseFloat(els.temperature.value);
        els.temperatureValue.textContent = this.formatValue(v, 'temperature');
        this.updateCurrentParams({ temperature: v });
      });
    }

    if (els.maxTokens) {
      els.maxTokens.addEventListener('input', () => {
        const v = parseInt(els.maxTokens.value, 10);
        els.maxTokensValue.textContent = v;
        this.updateCurrentParams({ max_tokens: v });
      });
    }

    // Prompt
    if (els.promptText) {
      els.promptText.addEventListener('input', () => {
        this.updateCurrentPrompt(els.promptText.value);
        els.promptMeta.textContent = `${els.promptText.value.length} chars`;
      });
    }

    // History
    if (els.historyBtn) {
      els.historyBtn.addEventListener('click', () => this.toggleHistory());
    }

    if (els.closeHistoryBtn) {
      els.closeHistoryBtn.addEventListener('click', () => this.hideHistory());
    }

    if (els.saveSnapshotBtn) {
      els.saveSnapshotBtn.addEventListener('click', () => this.handleSaveSnapshot());
    }

    if (els.clearHistoryBtn) {
      els.clearHistoryBtn.addEventListener('click', () => this.handleClearHistory());
    }

    if (els.historySearch) {
      els.historySearch.addEventListener('input', () => this.renderHistoryList());
    }

    if (els.historyFilters) {
      els.historyFilters.addEventListener('click', (e) => {
        if (e.target.classList.contains('cs-chip')) {
          els.historyFilters.querySelectorAll('.cs-chip').forEach(c => c.classList.remove('active'));
          e.target.classList.add('active');
          this.renderHistoryList();
        }
      });
    }
  }

  // ============ UI Helpers ============

  formatValue(value, key) {
    if (key === 'max_tokens') return String(Math.round(value));
    return Number(value).toFixed(2);
  }

  toggleModelDropdown() {
    if (this.elements.modelSelect.classList.contains('open')) {
      this.closeModelDropdown();
    } else {
      this.openModelDropdown();
    }
  }

  openModelDropdown() {
    this.elements.modelSelect.classList.add('open');
    this.renderModelDropdown(this.state.provider);
  }

  closeModelDropdown() {
    this.elements.modelSelect.classList.remove('open');
  }

  renderModelDropdown(provider) {
    const models = this.getAllModels(provider);
    const selected = this.state.providers[provider].model;

    this.elements.modelDropdown.innerHTML = '';

    models.forEach(m => {
      const item = document.createElement('div');
      item.className = 'cs-model-option' + (m === selected ? ' active' : '');
      item.textContent = m;
      item.addEventListener('click', () => this.selectModel(m));
      this.elements.modelDropdown.appendChild(item);
    });

    const sep = document.createElement('div');
    sep.style.cssText = 'margin:6px 0; height:1px; background:#153045;';
    this.elements.modelDropdown.appendChild(sep);

    const custom = document.createElement('div');
    custom.className = 'cs-model-option';
    custom.textContent = 'Custom…';
    custom.addEventListener('click', () => this.showCustomModelEntry());
    this.elements.modelDropdown.appendChild(custom);
  }

  selectModel(model) {
    this.updateCurrentModel(model);
    this.elements.selectedModel.textContent = model;
    this.renderModelDropdown(this.state.provider);
    this.closeModelDropdown();
  }

  showCustomModelEntry() {
    this.elements.customModelRow.hidden = false;
    this.elements.customModelInput.value = '';
    this.elements.customModelInput.focus();
    this.closeModelDropdown();
  }

  handleAddCustomModel() {
    const name = (this.elements.customModelInput.value || '').trim();
    if (!name) return;

    const provider = this.state.provider;
    if (this.addCustomModel(provider, name)) {
      this.elements.customModelRow.hidden = true;
      this.selectModel(name);
    }
  }

  switchProvider(provider) {
    this.setProvider(provider);
    this.updateUI();
  }

  updateApiKeyStatus(hasKey) {
    if (!this.elements.apiKeyStatus) return;

    this.elements.apiKeyStatus.textContent = hasKey ? 'Saved locally' : 'Required before sending';
    this.elements.apiKeyStatus.classList.toggle('is-missing', !hasKey);
  }

  updateApiKeyUI() {
    if (!this.elements.apiKeyInput) return;

    const apiKey = this.getApiKey(this.state.provider);
    this.elements.apiKeyInput.value = apiKey;
    this.elements.apiKeyInput.type = 'password';
    this.elements.apiKeyToggle.textContent = 'Show';
    this.updateApiKeyStatus(Boolean(apiKey));
  }

  updateUI() {
    const provider = this.state.provider;
    const settings = this.state.providers[provider];

    // Update model display
    this.elements.selectedModel.textContent = settings.model;

    // Update sliders
    this.elements.topP.value = settings.params.top_p;
    this.elements.topPValue.textContent = this.formatValue(settings.params.top_p, 'top_p');
    this.elements.temperature.value = settings.params.temperature;
    this.elements.temperatureValue.textContent = this.formatValue(settings.params.temperature, 'temperature');
    this.elements.maxTokens.value = settings.params.max_tokens;
    this.elements.maxTokensValue.textContent = settings.params.max_tokens;

    // Update prompt
    this.elements.promptText.value = settings.prompt || '';
    this.elements.promptMeta.textContent = `${(settings.prompt || '').length} chars`;

    // Update provider API key
    this.updateApiKeyUI();

    // Update active pill
    this.elements.navPills.forEach(p => {
      p.classList.toggle('active', p.dataset.provider === provider);
    });

    this.elements.customModelRow.hidden = true;
  }

  // History UI
  toggleHistory() {
    const isVisible = this.elements.historyPanel.style.display !== 'none';
    if (isVisible) {
      this.hideHistory();
    } else {
      this.showHistory();
    }
  }

  showHistory() {
    this.elements.historyPanel.style.display = 'flex';
    this.renderHistoryList();
  }

  hideHistory() {
    this.elements.historyPanel.style.display = 'none';
  }

  renderHistoryList() {
    const history = this.loadHistory();
    const searchTerm = (this.elements.historySearch.value || '').toLowerCase();
    const activeFilter = this.elements.historyFilters.querySelector('.cs-chip.active')?.dataset.filter || 'all';

    let filtered = history;

    if (activeFilter !== 'all') {
      filtered = filtered.filter(s => s.provider === activeFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.label.toLowerCase().includes(searchTerm) ||
        s.provider.toLowerCase().includes(searchTerm) ||
        s.settings.model.toLowerCase().includes(searchTerm)
      );
    }

    if (filtered.length === 0) {
      this.elements.historyList.innerHTML = '<div class="cs-history-empty">No snapshots found</div>';
      return;
    }

    this.elements.historyList.innerHTML = filtered.map(snapshot => `
      <div class="cs-history-card">
        <div class="cs-hc-row">
          <div class="cs-hc-main">
            <div class="cs-hc-label">${this.escapeHtml(snapshot.label)}</div>
            <div class="cs-hc-sub">${snapshot.provider} • ${snapshot.settings.model} • ${new Date(snapshot.timestamp).toLocaleString()}</div>
          </div>
          <div class="cs-hc-actions">
            <button class="cs-hist-btn ghost" onclick="window.settingsManager.loadSnapshot('${snapshot.id}'); window.settingsManager.hideHistory();">Load</button>
            <button class="cs-hist-btn danger" onclick="window.settingsManager.deleteSnapshot('${snapshot.id}'); window.settingsManager.renderHistoryList();">Delete</button>
          </div>
        </div>
        <div class="cs-hc-params">temp: ${snapshot.settings.params.temperature} • top_p: ${snapshot.settings.params.top_p} • tokens: ${snapshot.settings.params.max_tokens}</div>
      </div>
    `).join('');
  }

  handleSaveSnapshot() {
    const label = prompt('Enter a label for this snapshot:');
    if (label !== null) {
      this.saveSnapshot(label || undefined);
      this.renderHistoryList();
    }
  }

  handleClearHistory() {
    if (confirm('Are you sure you want to clear all history?')) {
      this.clearHistory();
      this.renderHistoryList();
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  show() {
    if (this.elements.root) {
      this.elements.root.style.display = 'flex';
      this.elements.root.classList.add('visible');
    }
  }

  hide() {
    if (this.elements.root) {
      this.elements.root.style.display = 'none';
      this.elements.root.classList.remove('visible');

      // Emit event so ChatWidget can react
      const event = new CustomEvent('briizos-settings-closed');
      window.dispatchEvent(event);
    }
  }
}

// Create singleton instance
window.settingsManager = window.settingsManager || new SettingsManager();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SettingsManager;
}
