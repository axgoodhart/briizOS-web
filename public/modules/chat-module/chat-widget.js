// Chat Widget Module - Native BriizOS Application
class ChatWidget {
  constructor(container, panelId) {
    this.container = container;
    this.panelId = panelId;
    this.messages = [];
    this.input = '';
    this.isLoading = false;
    this.activePair = 0;
    this.progress = 0;
    this.top='auto !!important';
    this.isAnimatingEntry = false;

    // Element references
    this.scrollEl = null;
    this.pairEls = [];
    this.inputEl = null;
    this.sendBtn = null;
    this.settingsContainer = null;

    // Configure marked.js for safe rendering
    if (window.marked) {
      console.log('✅ marked.js loaded successfully');
      window.marked.setOptions({
        breaks: true,        // Convert \n to <br>
        gfm: true,          // GitHub Flavored Markdown
        headerIds: false,   // No IDs on headings (cleaner)
        mangle: false,      // Don't mangle email addresses
        sanitize: false,    // We trust AI output (could enable for user input)
      });
    } else {
      console.warn('⚠️ marked.js not loaded - markdown rendering will fall back to plain text');
    }
  }

  // Helper method to safely render markdown
  renderMarkdown(text) {
    if (!text) return '';
    if (window.marked && typeof window.marked.parse === 'function') {
      try {
        return window.marked.parse(text);
      } catch (error) {
        console.error('Markdown parsing error:', error);
        return this.escapeHtml(text);
      }
    }
    // Fallback: escape HTML and preserve line breaks
    return this.escapeHtml(text).replace(/\n/g, '<br>');
  }

  // Helper method to escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  updateSettingsFromManager() {
    if (this.settingsManager) {
      const settings = this.settingsManager.getAllSettings();
      this.providerId = settings.provider;
      this.model = settings.model;
    }
  }

  init() {
    // Get settings from SettingsManager
    this.settingsManager = window.settingsManager;
    this.updateSettingsFromManager();

    // Listen for settings changes
    if (this.settingsManager) {
      this.settingsUnsubscribe = this.settingsManager.onSettingsChange(() => {
        this.updateSettingsFromManager();
      });
    }

    // Listen for settings panel close
    this.settingsCloseHandler = () => {
      if (this.settingsContainer) {
        this.settingsContainer.style.display = 'none';
      }
    };
    window.addEventListener('briizos-settings-closed', this.settingsCloseHandler);

    this.render();
    this.attachEventListeners();
    this.scrollToBottom();

    // Only restore collapsed state if there are messages and it was previously set
    const pairs = this.getPairs();
    if (pairs.length > 0 && sessionStorage.getItem(`cw-collapsed-${this.panelId}`) === 'true') {
      setTimeout(() => {
        this.collapseChat();
      }, 100);
    }
  }

  render() {

    const pairs = this.getPairs();

    this.container.innerHTML = `

      <div class="cw-root" id = "aichat">

      <!-- Collapse button (outside scroll element so it stays visible) -->
        ${pairs.length > 0 ? `
        <button class="cw-collapse-btn" data-collapse="${this.panelId}" title="Collapse chat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
        ` : ''}

      <!-- Scrollable conversation area (only show if messages exist) -->
        ${pairs.length > 0 ? `
        <div class="cw-scroll" data-scroll="${this.panelId}">
          <div class="cw-list">
            ${pairs.map((pair, idx) => `
              <div class="cw-pair" data-pair="${idx}">
                <!-- User message (sticky header) -->
                <div class="cw-header">
                  <div class="cw-user-bubble bb-bubble-user">
                    <div class="cw-user-label">You</div>
                    <div class="cw-user-text">${this.escapeHtml(pair.user.content)}</div>
                  </div>
                </div>

                <!-- Assistant response (body) -->
                <div class="cw-body">
                  <div class="cw-assistant-bubble bb-bubble-assistant">
                    <div class="cw-assistant-label">AI</div>
                    <div class="cw-assistant-text">
                      ${pair.assistant ?
                        (pair.assistant.content ? this.renderMarkdown(pair.assistant.content) : '<span class="cw-thinking">Thinking...</span>') :
                        '<span class="cw-spinner"></span> <span class="cw-thinking">Thinking...</span>'
                      }
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Side navigator -->
        ${pairs.length > 1 ? `
          <div class="cw-nav">
            <button class="cw-nav-btn" data-action="up">↑</button>
            <div class="cw-track">
              <div class="cw-track-line"></div>
              <div class="cw-dot" style="top: ${this.progress * 100}%"></div>
            </div>
            <button class="cw-nav-btn" data-action="down">↓</button>
          </div>
        ` : ''}

        <!-- Bottom input -->
        <div class="cw-input">
          <textarea
            class="cw-textarea"
            placeholder="Ask anything..."
            data-input="${this.panelId}"
          >${this.input}</textarea>
          <button class="cw-send" data-send="${this.panelId}" ${this.isLoading ? 'disabled' : ''}>
            ${this.isLoading ? '...' : '          <i class="fas fa-paper-plane"></i>'}
          </button>
        </div>

        <!-- Settings Panel Container -->
        <div class="cw-settings-container" data-settings-container="${this.panelId}" style="display: none;"></div>
      </div>
    `;

    // Update element references
    this.scrollEl = this.container.querySelector(`[data-scroll="${this.panelId}"]`);
    this.pairEls = Array.from(this.container.querySelectorAll('[data-pair]'));
    this.inputEl = this.container.querySelector(`[data-input="${this.panelId}"]`);
    this.sendBtn = this.container.querySelector(`[data-send="${this.panelId}"]`);
    this.settingsContainer = this.container.querySelector(`[data-settings-container="${this.panelId}"]`);

    // Re-bind event listeners after re-render
    this.attachEventListeners();
  }

  attachEventListeners() {
    // Input handling
    if (this.inputEl) {
      this.inputEl.addEventListener('input', (e) => {
        this.input = e.target.value;
        this.adjustTextareaHeight();
      });

      this.inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          this.handleSend();
        }
      });

      // Expand on focus if collapsed
      this.inputEl.addEventListener('focus', () => {
        if (this.scrollEl && this.scrollEl.classList.contains('collapsed')) {
          this.expandChat();
        }
      });
    }

    // Collapse button
    const collapseBtn = this.container.querySelector(`[data-collapse="${this.panelId}"]`);
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => {
        this.toggleCollapse();
      });
    }

    // Send button with hold-to-open settings
    if (this.sendBtn) {
      let holdTimer = null;
      let holdStarted = false;

      this.sendBtn.addEventListener('mousedown', (e) => {
        holdStarted = false;
        holdTimer = setTimeout(() => {
          holdStarted = true;
          this.showSettings();
        }, 1000); // 1 second hold
      });

      this.sendBtn.addEventListener('mouseup', (e) => {
        clearTimeout(holdTimer);
        if (!holdStarted) {
          // Normal click - send message
          this.handleSend();
        }
      });

      this.sendBtn.addEventListener('mouseleave', () => {
        clearTimeout(holdTimer);
      });

      // Touch support for mobile
      this.sendBtn.addEventListener('touchstart', (e) => {
        holdStarted = false;
        holdTimer = setTimeout(() => {
          holdStarted = true;
          this.showSettings();
        }, 1000);
      });

      this.sendBtn.addEventListener('touchend', (e) => {
        clearTimeout(holdTimer);
        if (!holdStarted) {
          this.handleSend();
        }
      });
    }

    // Scroll tracking
    if (this.scrollEl) {
      this.scrollEl.addEventListener('scroll', () => this.handleScroll());
    }

    // Navigation buttons
    const upBtn = this.container.querySelector('[data-action="up"]');
    const downBtn = this.container.querySelector('[data-action="down"]');
    if (upBtn) upBtn.addEventListener('click', () => this.navigatePair(-1));
    if (downBtn) downBtn.addEventListener('click', () => this.navigatePair(1));
  }

  toggleSettings() {
    if (!this.settingsContainer || !this.settingsManager) return;

    const isVisible = this.settingsContainer.style.display !== 'none';

    if (isVisible) {
      this.hideSettings();
    } else {
      this.showSettings();
    }
  }

  showSettings() {
    if (!this.settingsContainer || !this.settingsManager) return;

    // Render settings panel if not already rendered
    if (!this.settingsContainer.hasChildNodes()) {
      this.settingsManager.renderSettingsPanel(this.settingsContainer);
    }

    this.settingsContainer.style.display = 'flex';
    this.settingsManager.show();
  }

  hideSettings() {
    if (!this.settingsContainer || !this.settingsManager) return;

    this.settingsContainer.style.display = 'none';
    this.settingsManager.hide();
  }

  getPairs() {
    const pairs = [];
    for (let i = 0; i < this.messages.length; i++) {
      if (this.messages[i].role === 'user') {
        pairs.push({
          user: this.messages[i],
          assistant: this.messages[i + 1]?.role === 'assistant' ? this.messages[i + 1] : null
        });
      }
    }
    return pairs;
  }

  async handleSend() {
    if (!this.input.trim() || this.isLoading) return;

    const userMessage = this.input.trim();
    this.input = '';
    this.isLoading = true;

    // Check if this is the first message
    const isFirstMessage = this.messages.length === 0;

    // Add user message
    this.messages.push({ role: 'user', content: userMessage });

    // Add placeholder assistant message
    this.messages.push({ role: 'assistant', content: '' });

    this.render();

    // Re-focus the textarea after render
    if (this.inputEl) {
      this.inputEl.focus();
    }

    // If this was the first message, add entrance animation
    if (isFirstMessage) {
      this.isAnimatingEntry = true;
      // The scroll element was just created by render()
      const scrollElement = this.container.querySelector(`[data-scroll="${this.panelId}"]`);
      if (scrollElement) {
        // Add initial-hidden class right away
        scrollElement.classList.add('initial-hidden');

        // Next frame, remove it to trigger animation
        requestAnimationFrame(() => {
          scrollElement.classList.remove('initial-hidden');
          this.scrollToBottom();

          // Clear the flag after animation completes
          setTimeout(() => {
            this.isAnimatingEntry = false;
          }, 500); // Match the CSS transition duration
        });
      }
    } else {
      this.scrollToBottom();
    }

    try {
      // Call the streaming API
      await this.streamChat(userMessage);
    } catch (error) {
      console.error('Chat error:', error);
      this.messages[this.messages.length - 1].content = 'Sorry, I encountered an error. Please try again.';
      this.render();
    } finally {
      this.isLoading = false;
      // Update send button state without full re-render
      if (this.sendBtn) {
        this.sendBtn.disabled = false;
        this.sendBtn.innerHTML = '          <i class="fas fa-paper-plane"></i>';
      }
    }
  }

  async streamChat(prompt) {
    try {
      // Use the ChatAPI module
      if (!window.ChatAPI) {
        throw new Error('ChatAPI not loaded');
      }

      const api = new ChatAPI();
      const streamGenerator = api.streamChat(
        this.messages.slice(0, -1), // Don't send the empty assistant message
        this.providerId,
        this.model
      );

      let fullResponse = '';
      const toolCalls = [];

      // Process async generator
      if (streamGenerator && streamGenerator[Symbol.asyncIterator]) {
        for await (const chunk of streamGenerator) {
          // Check if chunk is a tool call
          if (typeof chunk === 'object' && chunk.type === 'tool_call') {
            console.group('🔧 Tool Call Detected');
            console.log('Tool:', chunk.tool);
            console.log('Parameters:', chunk.params);
            console.groupEnd();

            toolCalls.push(chunk);

            // Execute the tool
            try {
              if (window.briizTools) {
                console.log('⏳ Executing tool:', chunk.tool);
                const result = await window.briizTools.execute(chunk.tool, chunk.params);

                console.group('✅ Tool Execution Result');
                console.log('Result:', result);
                console.groupEnd();

                // Add tool result to conversation
                const resultText = result.summary || result.message || JSON.stringify(result);
                fullResponse += `\n\n[Tool executed: ${chunk.tool}]\n${resultText}`;

                // Update display
                this.messages[this.messages.length - 1].content = fullResponse;
                const lastAssistantText = this.container.querySelector('.cw-pair:last-child .cw-assistant-text');
                if (lastAssistantText) {
                  lastAssistantText.innerHTML = this.renderMarkdown(fullResponse);
                  this.scrollToBottom();
                }
              }
            } catch (error) {
              console.group('❌ Tool Execution Error');
              console.error('Error:', error);
              console.log('Tool:', chunk.tool);
              console.log('Params:', chunk.params);
              console.groupEnd();

              fullResponse += `\n\n[Error: ${error.message}]`;
              this.messages[this.messages.length - 1].content = fullResponse;
              const lastAssistantText = this.container.querySelector('.cw-pair:last-child .cw-assistant-text');
              if (lastAssistantText) {
                lastAssistantText.innerHTML = this.renderMarkdown(fullResponse);
                this.scrollToBottom();
              }
            }
          } else {
            // Regular text chunk
            fullResponse += chunk;

            // Update the last message
            this.messages[this.messages.length - 1].content = fullResponse;

            // Update just the text content without full re-render
            const lastAssistantText = this.container.querySelector('.cw-pair:last-child .cw-assistant-text');
            if (lastAssistantText) {
              lastAssistantText.innerHTML = this.renderMarkdown(fullResponse);
              this.scrollToBottom();
            }
          }
        }
      }
      // Handle ReadableStream (for compatibility)
      else if (streamGenerator && streamGenerator.getReader) {
        const reader = streamGenerator.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullResponse += chunk;

          // Update the last message
          this.messages[this.messages.length - 1].content = fullResponse;

          // Update just the text content without full re-render
          const lastAssistantText = this.container.querySelector('.cw-pair:last-child .cw-assistant-text');
          if (lastAssistantText) {
            lastAssistantText.innerHTML = this.renderMarkdown(fullResponse);
            this.scrollToBottom();
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      throw error;
    }
  }

  handleScroll() {
    if (!this.scrollEl) return;

    const { scrollTop, scrollHeight, clientHeight } = this.scrollEl;
    const maxScroll = scrollHeight - clientHeight;
    this.progress = maxScroll > 0 ? scrollTop / maxScroll : 0;

    // Update dot position (now horizontal)
    const dot = this.container.querySelector('.cw-dot');
    const track = this.container.querySelector('.cw-track');
    if (dot && track) {
      const trackWidth = track.offsetWidth;
      dot.style.left = `${this.progress * trackWidth}px`;
    }

    // Find active pair
    let bestIdx = 0;
    let bestDist = Number.POSITIVE_INFINITY;

    this.pairEls.forEach((el, idx) => {
      const rect = el.getBoundingClientRect();
      const scrollRect = this.scrollEl.getBoundingClientRect();
      const dist = Math.abs(rect.top - scrollRect.top);

      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
      }
    });

    this.activePair = bestIdx;
  }

  navigatePair(direction) {
    const pairs = this.getPairs();
    const newIndex = Math.max(0, Math.min(pairs.length - 1, this.activePair + direction));
    this.jumpTo(newIndex);
  }

  jumpTo(index) {
    const targetEl = this.pairEls[index];
    if (!targetEl || !this.scrollEl) return;

    const targetRect = targetEl.getBoundingClientRect();
    const scrollRect = this.scrollEl.getBoundingClientRect();
    const delta = targetRect.top - scrollRect.top;

    this.scrollEl.scrollTo({
      top: this.scrollEl.scrollTop + delta,
      behavior: 'smooth'
    });
  }

  scrollToBottom() {
    if (this.scrollEl) {
      this.scrollEl.scrollTo({
        top: this.scrollEl.scrollHeight,
        behavior: 'smooth'
      });
    }
  }


  adjustTextareaHeight() {
    if (!this.inputEl) return;
    this.inputEl.style.height = '64px';
    const scrollHeight = this.inputEl.scrollHeight;
    const maxHeight = this.container.clientHeight * 0.34; // 34% of panel height
    this.inputEl.style.height = Math.min(scrollHeight, maxHeight) + 'px';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  toggleCollapse() {
    if (this.scrollEl && this.scrollEl.classList.contains('collapsed')) {
      this.expandChat();
    } else {
      this.collapseChat();
    }
  }

  collapseChat() {
    if (!this.scrollEl) return;
    this.scrollEl.classList.add('collapsed');
    const collapseBtn = this.container.querySelector(`[data-collapse="${this.panelId}"]`);
    if (collapseBtn) {
      collapseBtn.classList.add('collapsed');
    }
    // Store collapse state
    sessionStorage.setItem(`cw-collapsed-${this.panelId}`, 'true');
  }

  expandChat() {
    if (!this.scrollEl) return;
    this.scrollEl.classList.remove('collapsed');
    const collapseBtn = this.container.querySelector(`[data-collapse="${this.panelId}"]`);
    if (collapseBtn) {
      collapseBtn.classList.remove('collapsed');
    }
    // Clear collapse state
    sessionStorage.removeItem(`cw-collapsed-${this.panelId}`);
    this.scrollToBottom();
  }

  // Lifecycle methods
  onResize() {
    // Handle panel resize if needed
    this.adjustTextareaHeight();
  }

  cleanup() {
    // Unsubscribe from settings changes
    if (this.settingsUnsubscribe) {
      this.settingsUnsubscribe();
    }

    // Remove settings close event listener
    if (this.settingsCloseHandler) {
      window.removeEventListener('briizos-settings-closed', this.settingsCloseHandler);
    }

    // Clean up any resources
    this.container.innerHTML = '';
  }
}

// Export for use in briizOS
window.ChatWidget = ChatWidget;

