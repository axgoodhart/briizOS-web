/**
 * BriizOS External Panel SDK v1.0.0
 *
 * Include this in external apps to communicate with briizOS and AI
 *
 * Usage:
 * ```html
 * <script src="../briizos-external-sdk.js"></script>
 * <script>
 *   briizOS.init('My App', ['ai-integration', 'data-persistence']).then(() => {
 *     console.log('Connected to briizOS!');
 *   });
 * </script>
 * ```
 */

class BriizOSSDK {
  constructor() {
    this.panelId = null;
    this.ready = false;
    this.messageHandlers = new Map();
    this.eventHandlers = new Map();
    this.pendingRequests = new Map();
    this.requestId = 0;
    this.setupMessageListener();
  }

  // ===== INITIALIZATION =====

  setupMessageListener() {
    window.addEventListener('message', (event) => {
      // Only handle messages from briizOS
      if (!event.data || event.data.source !== 'briizOS') return;

      const { type, data, requestId } = event.data;

      // Handle init
      if (type === 'briizOS.init') {
        this.panelId = event.data.panelId;
        this.capabilities = event.data.capabilities;
        this.ready = true;
        this.triggerEvent('ready', event.data);
        return;
      }

      // Handle request responses
      if (requestId && this.pendingRequests.has(requestId)) {
        const { resolve, reject } = this.pendingRequests.get(requestId);
        this.pendingRequests.delete(requestId);

        if (type.endsWith('.error')) {
          reject(new Error(data.error || 'Request failed'));
        } else {
          resolve(data);
        }
        return;
      }

      // Route to specific handlers
      if (this.messageHandlers.has(type)) {
        this.messageHandlers.get(type).forEach(handler => handler(data));
      }
    });
  }

  /**
   * Initialize the SDK
   * @param {string} appName - Name of your application
   * @param {string[]} capabilities - Capabilities your app uses
   * @returns {Promise<void>}
   */
  init(appName, capabilities = []) {
    if (this.ready) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.once('ready', () => {
        this.sendMessage('briizOS.ready', {
          appName,
          capabilities,
          version: '1.0.0'
        });
        resolve();
      });
    });
  }

  // ===== AI INTEGRATION =====

  /**
   * Ask AI assistant a question
   * @param {string} query - Question for the AI
   * @param {object} context - Additional context
   * @returns {Promise<string>} AI response
   */
  async askAI(query, context = {}) {
    const requestId = this.generateRequestId();
    this.sendMessage('briizOS.ai.query', { query, context }, requestId);

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('AI query timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Request AI to perform an action in briizOS
   * @param {string} action - Action/tool name
   * @param {object} params - Action parameters
   * @returns {Promise<object>} Action result
   */
  async requestAIAction(action, params = {}) {
    const requestId = this.generateRequestId();
    this.sendMessage('briizOS.ai.action', { action, params }, requestId);

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      // Timeout after 60 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('AI action timeout'));
        }
      }, 60000);
    });
  }

  /**
   * Subscribe to AI/briizOS events
   * @param {string} eventType - Event type to subscribe to
   * @param {function} callback - Event handler
   */
  subscribeToAI(eventType, callback) {
    this.sendMessage('briizOS.ai.subscribe', { eventType });
    this.on('briizOS.ai.event', (data) => {
      if (data.eventType === eventType) {
        callback(data);
      }
    });
  }

  /**
   * Get current briizOS context
   * @returns {Promise<object>} Context data
   */
  async getBriizOSContext() {
    const requestId = this.generateRequestId();
    this.sendMessage('briizOS.ai.context', {}, requestId);

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Context request timeout'));
        }
      }, 5000);
    });
  }

  // ===== DATA PERSISTENCE =====

  /**
   * Save data to briizOS persistence
   * @param {object} data - Data to save
   * @returns {Promise<boolean>} Success status
   */
  async saveData(data) {
    const requestId = this.generateRequestId();
    this.sendMessage('briizOS.data.save', data, requestId);

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Save timeout'));
        }
      }, 5000);
    });
  }

  /**
   * Load data from briizOS persistence
   * @returns {Promise<object>} Saved data
   */
  async loadData() {
    const requestId = this.generateRequestId();
    this.sendMessage('briizOS.data.load', {}, requestId);

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Load timeout'));
        }
      }, 5000);
    });
  }

  // ===== UI CONTROLS =====

  /**
   * Show a notification in briizOS
   * @param {string} message - Notification message
   * @param {number} duration - Duration in ms
   */
  notify(message, duration = 3000) {
    this.sendMessage('briizOS.notification', { message, duration });
  }

  /**
   * Request panel resize
   * @param {number} width - New width
   * @param {number} height - New height
   */
  resize(width, height) {
    this.sendMessage('briizOS.resize', { width, height });
  }

  /**
   * Set panel color
   * @param {number} hue - Hue (0-360)
   * @param {number} saturation - Saturation (0-100)
   * @param {number} lightness - Lightness (0-100)
   */
  setColor(hue, saturation, lightness) {
    this.sendMessage('briizOS.setColor', { hue, saturation, lightness });
  }

  // ===== MESSAGING HELPERS =====

  generateRequestId() {
    return `req_${this.requestId++}_${Date.now()}`;
  }

  sendMessage(type, data = {}, requestId = null) {
    if (!this.panelId && type !== 'briizOS.ready') {
      console.warn('SDK not initialized. Call init() first.');
      return;
    }

    const message = {
      source: 'external-app',
      panelId: this.panelId,
      type,
      data
    };

    if (requestId) {
      message.requestId = requestId;
    }

    window.parent.postMessage(message, '*');
  }

  on(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type).add(handler);
  }

  off(type, handler) {
    if (this.messageHandlers.has(type)) {
      this.messageHandlers.get(type).delete(handler);
    }
  }

  once(type, handler) {
    const wrappedHandler = (data) => {
      handler(data);
      this.off(type, wrappedHandler);
    };
    this.on(type, wrappedHandler);
  }

  triggerEvent(eventName, data) {
    if (this.eventHandlers.has(eventName)) {
      this.eventHandlers.get(eventName).forEach(handler => handler(data));
    }
  }
}

// Auto-initialize
if (typeof window !== 'undefined') {
  window.briizOS = new BriizOSSDK();
}
