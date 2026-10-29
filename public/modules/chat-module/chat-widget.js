
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
    this.hasInteracted = false;

    // Element references
    this.scrollEl = null;
    this.pairEls = [];
    this.inputEl = null;
    this.sendBtn = null;
    this.configBtn = null;
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

    // Load message history
    this.loadMessages();

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

  // Save messages to localStorage with metadata
  saveMessages() {
    try {
      const historyKey = `briizos.chatHistory.${this.panelId}`;
      const data = {
        messages: this.messages,
        timestamp: Date.now(),
        flagged: false,
        preview: this.messages.length > 0 ? this.messages[0].content.substring(0, 100) : ''
      };
      localStorage.setItem(historyKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  }

  // Load messages from localStorage
  loadMessages() {
    try {
      const historyKey = `briizos.chatHistory.${this.panelId}`;
      const saved = localStorage.getItem(historyKey);
      if (saved) {
        const data = JSON.parse(saved);

        // Auto-cleanup: delete if older than 7 days and not flagged
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        if (data.timestamp < sevenDaysAgo && !data.flagged) {
          localStorage.removeItem(historyKey);
          return;
        }

        this.messages = data.messages || [];
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      this.messages = [];
    }
  }

  // Flag conversation to prevent auto-cleanup
  flagConversation(flagged = true) {
    try {
      const historyKey = `briizos.chatHistory.${this.panelId}`;
      const saved = localStorage.getItem(historyKey);
      if (saved) {
        const data = JSON.parse(saved);
        data.flagged = flagged;
        localStorage.setItem(historyKey, JSON.stringify(data));
      }
    } catch (error) {
      console.error('Failed to flag conversation:', error);
    }
  }

  render() {

    const pairs = this.getPairs();

    this.container.innerHTML = `

      <div class="cw-root" id = "aichat">

      <!-- Remote AI workspace (row flex: task list + detail viewer) -->
      <div class="cw-remote-workspace" data-remoteworkspace="${this.panelId}" style="display: none;">
        <!-- Left: Task list -->
        <div class="cw-remote-organizer" data-remoteorg="${this.panelId}">
          <div class="cw-remote-org-header">
            <svg viewBox="0 0 24 24" fill="currentColor" class="cw-remote-org-icon"><path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H15A2,2 0 0,1 17,9V15A2,2 0 0,1 15,17H9A2,2 0 0,1 7,15V9A2,2 0 0,1 9,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M12,4A1,1 0 0,0 11,5A1,1 0 0,0 12,6A1,1 0 0,0 13,5A1,1 0 0,0 12,4M9,9V15H15V9H9M11,11H13V13H11V11Z"/></svg>
            <span>Remote Tasks</span>
          </div>
          <ul class="cw-remote-org-list" data-remoteorglist="${this.panelId}"></ul>
        </div>
        <!-- Right: Task detail viewer -->
        <div class="cw-remote-detail" data-remotedetail="${this.panelId}">
          <div class="cw-remote-detail-empty">Select a task to view details</div>
        </div>
      </div>

      <!-- Conversation area wrapper (contains collapse button, scroll panel, and nav) -->
      <div class="cw-conversation-area ${pairs.length === 0 ? 'no-messages' : ''} ${!this.hasInteracted ? 'hidden-until-interaction' : ''}" data-conversation-area="${this.panelId}">

        <!-- Collapse button -->
        <button class="cw-collapse-btn" data-collapse="${this.panelId}" title="Collapse chat" aria-label="Collapse chat">􀁸</button>

        <!-- Scrollable conversation area -->
        ${pairs.length > 0 ? `
        <div class="cw-scroll" data-scroll="${this.panelId}">
          <div class="cw-list">
            ${pairs.map((pair, idx) => `
              <div class="cw-pair" data-pair="${idx}">
                <!-- User message (sticky header) -->
                <div class="cw-header">
                  <div class="cw-user-bubble bb-bubble-user message-clickable" data-message-index="${idx * 2}" data-message-role="user">
                    <div class="cw-user-label">You</div>
                    <div class="cw-user-text">${this.escapeHtml(pair.user.content)}</div>
                  </div>
                </div>

                <!-- Assistant response (body) -->
                <div class="cw-body">
                  <div class="cw-assistant-bubble bb-bubble-assistant message-clickable" data-message-index="${idx * 2 + 1}" data-message-role="assistant">
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
      </div>

        <!-- Bottom input (normal mode) -->

        <div class="cw-input" data-inputbar="${this.panelId}">

                  <button class="cw-config" data-config="${this.panelId}" title="Configuration">
            <i class="fas fa-cog"></i>
          </button>

          <textarea
            class="cw-textarea"
            placeholder="Ask anything..."
            data-input="${this.panelId}"
          >${this.input}</textarea>
          <button class="cw-remoteai-btn" data-remoteai="${this.panelId}" title="Remote AI">
            <img src="./assets/img/chatmoduleicon.png" alt="Remote AI" class="cw-remoteai-icon" />
          </button>
          <button class="cw-send" data-send="${this.panelId}" ${this.isLoading ? 'disabled' : ''}>
            ${this.isLoading ? '...' : '          <i class="fas fa-paper-plane"></i>'}
          </button>
        </div>

        <!-- Bottom input (remote AI mode) -->
        <div class="cw-remote-bar" data-remotebar="${this.panelId}" style="display: none;">
          <div class="cw-remote-status">
            <svg class="cw-remote-wifi" viewBox="0 0 24 24" fill="currentColor"><path d="M12,21L15.6,16.2C14.6,15.45 13.35,15 12,15C10.65,15 9.4,15.45 8.4,16.2L12,21M12,3C7.95,3 4.21,4.34 1.2,6.6L3,9C5.5,7.12 8.62,6 12,6C15.38,6 18.5,7.12 21,9L22.8,6.6C19.79,4.34 16.05,3 12,3M12,9C9.3,9 6.81,9.89 4.8,11.4L6.6,13.8C8.1,12.67 9.97,12 12,12C14.03,12 15.9,12.67 17.4,13.8L19.2,11.4C17.19,9.89 14.7,9 12,9Z"/></svg>
            <div class="cw-remote-status-text">
              <div>Status: Inactive</div>
              <div class="cw-remote-signal">Last Signal: --</div>
            </div>
          </div>
          <div class="cw-remote-input-section">
            <input type="text" class="cw-remote-input" data-remoteinput="${this.panelId}" placeholder="Ask your computer" />
          </div>
          <div class="cw-remote-actions">
            <svg class="cw-remote-send-icon" viewBox="0 0 24 24" fill="currentColor" data-remotesend="${this.panelId}"><path d="M2,21L23,12L2,3V10L17,12L2,14V21Z"/></svg>
            <button class="cw-remoteai-btn cw-remote-back-btn" data-remoteback="${this.panelId}" title="Back to chat">
              <img src="./assets/img/chatmoduleicon.png" alt="Remote AI" class="cw-remoteai-icon" />
            </button>
          </div>
        </div>

        <!-- Settings Panel Container -->
        <div class="cw-settings-container" data-settings-container="${this.panelId}" style="display: none;"></div>
      </div>
    `;

    // Update element references
    this.conversationArea = this.container.querySelector(`[data-conversation-area="${this.panelId}"]`);
    this.scrollEl = this.container.querySelector(`[data-scroll="${this.panelId}"]`);
    this.pairEls = Array.from(this.container.querySelectorAll('[data-pair]'));
    this.inputEl = this.container.querySelector(`[data-input="${this.panelId}"]`);
    this.sendBtn = this.container.querySelector(`[data-send="${this.panelId}"]`);
    this.configBtn = this.container.querySelector(`[data-config="${this.panelId}"]`);
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
        // Show conversation area on first input
        if (!this.hasInteracted && this.conversationArea) {
          this.hasInteracted = true;
          this.conversationArea.classList.remove('hidden-until-interaction');
        }
      });

      this.inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          this.handleSend();
        }
      });

 

      // Show conversation area on focus
      this.inputEl.addEventListener('focus', () => {
        this.inputEl.classList.add('focus');
        if (!this.hasInteracted && this.conversationArea) {
          this.hasInteracted = true;
          this.conversationArea.classList.remove('hidden-until-interaction');
        }
        // Expand on focus if collapsed
        if (this.conversationArea && this.conversationArea.classList.contains('collapsed')) {
          this.expandChat();
        }
        if (this.conversationArea && this.conversationArea.classList.contains('hidden-until-interaction')) {
          this.conversationArea.classList.remove('hidden-until-interaction');
        }
        //filter parent window to darken background
        parent.filterParentWindow();
      });
    }
    // Hide conversation area on blur but not if the mouse is over the input, cw-scroll / cw-list, cw-send, or collapse
    if (this.inputEl) {
      this.inputEl.addEventListener('blur', () => {
      
        this.inputEl.classList.remove('focus');
        setTimeout(() => {
          if(this.inputEl.classList.contains('focus')) return; 
          this.conversationArea.classList.add('hidden-until-interaction');
        }, 2000)
      });
    }

    

    // Collapse button
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => {
        this.toggleCollapse();
      });
    }

    // Send button with hold-to-open settings
    if (this.sendBtn) {

      this.sendBtn.addEventListener('mouseup', (e) => {

          // Normal click - send message
          this.handleSend();
        
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


      this.configBtn.addEventListener('mousedown', (e) => {
        this.showSettings();
      });
      this.configBtn.addEventListener('touchstart', (e) => {
        this.showSettings();
      });


      
    }

    // Remote AI button - toggle to remote mode
    const remoteAiBtn = this.container.querySelector(`[data-remoteai="${this.panelId}"]`);
    if (remoteAiBtn) {
      remoteAiBtn.addEventListener('click', () => this.enterRemoteMode());
    }

    // Remote back button - toggle back to normal mode
    const remoteBackBtn = this.container.querySelector(`[data-remoteback="${this.panelId}"]`);
    if (remoteBackBtn) {
      remoteBackBtn.addEventListener('click', () => this.exitRemoteMode());
    }

    // Remote send button
    const remoteSendBtn = this.container.querySelector(`[data-remotesend="${this.panelId}"]`);
    if (remoteSendBtn) {
      remoteSendBtn.addEventListener('click', () => this.handleRemoteSend());
    }

    // Remote input enter key
    const remoteInput = this.container.querySelector(`[data-remoteinput="${this.panelId}"]`);
    if (remoteInput) {
      remoteInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleRemoteSend();
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

    // Message click handlers for copy/edit
    const messageBubbles = this.container.querySelectorAll('.message-clickable');
    messageBubbles.forEach(bubble => {
      bubble.addEventListener('click', (e) => {
        // Don't show tooltip if clicking on links or buttons within the message
        if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;

        const messageIndex = parseInt(bubble.dataset.messageIndex);
        const messageRole = bubble.dataset.messageRole;
        this.showMessageTooltip(bubble, messageIndex, messageRole);
      });
    });
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

  showMessageTooltip(bubble, messageIndex, messageRole) {
    // Remove any existing tooltip
    const existingTooltip = document.querySelector('.message-tooltip');
    if (existingTooltip) existingTooltip.remove();

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'message-tooltip';
    tooltip.innerHTML = `
      <button class="tooltip-btn" data-action="copy">Copy</button>
      ${messageRole === 'user' ? '<button class="tooltip-btn" data-action="edit">Edit</button>' : ''}
    `;

    // Position tooltip below the bubble
    document.body.appendChild(tooltip);
    const bubbleRect = bubble.getBoundingClientRect();
    tooltip.style.position = 'absolute';
    tooltip.style.top = (bubbleRect.bottom + 5) + 'px';
    tooltip.style.left = bubbleRect.left + 'px';
    tooltip.style.zIndex = '10000';

    // Handle tooltip actions
    tooltip.querySelector('[data-action="copy"]').addEventListener('click', () => {
      this.copyMessage(messageIndex);
      tooltip.remove();
    });

    const editBtn = tooltip.querySelector('[data-action="edit"]');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        this.editMessage(messageIndex);
        tooltip.remove();
      });
    }

    // Close tooltip when clicking outside
    setTimeout(() => {
      const closeHandler = (e) => {
        if (!tooltip.contains(e.target)) {
          tooltip.remove();
          document.removeEventListener('click', closeHandler);
        }
      };
      document.addEventListener('click', closeHandler);
    }, 100);
  }

  async copyMessage(messageIndex) {
    const message = this.messages[messageIndex];
    if (!message) return;

    try {
      await navigator.clipboard.writeText(message.content);
      console.log('Message copied to clipboard');
      // Could add a visual feedback here
    } catch (error) {
      console.error('Failed to copy message:', error);
      // Fallback: create a temporary textarea
      const textarea = document.createElement('textarea');
      textarea.value = message.content;
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }

  async editMessage(messageIndex) {
    const message = this.messages[messageIndex];
    if (!message || message.role !== 'user') return;

    // Truncate conversation to this point
    this.messages = this.messages.slice(0, messageIndex);

    // Set the message content as input
    this.input = message.content;

    // Re-render and re-send
    this.render();
    if (this.inputEl) {
      this.inputEl.focus();
    }

    // Optionally auto-send after a brief delay (or let user modify first)
    // For now, just populate the input so user can edit and send manually
  }

  async handleSend() {
    if (!this.input.trim() || this.isLoading) return;

    const provider = this.settingsManager?.getCurrentProvider();
    if (this.settingsManager && !this.settingsManager.getApiKey(provider)) {
      this.showSettings();
      this.settingsManager.elements.apiKeyInput?.focus();
      return;
    }

    const userMessage = this.input.trim();
    this.input = '';
    this.isLoading = true;

    // Mark as interacted when sending a message
    this.hasInteracted = true;

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
      // Save message history after conversation update
      this.saveMessages();
    }
  }

  async streamChat(prompt) {
    try {
      // Use the ChatAPI module
      if (!window.ChatAPI) {
        throw new Error('ChatAPI not loaded');
      }

      const api = new ChatAPI();

      // Build messages to send (without the empty assistant placeholder)
      const messagesToSend = this.messages.slice(0, -1);

      const streamGenerator = api.streamChat(
        messagesToSend,
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

              fullResponse += `\n\nSorry, that action failed: ${error.message}`;
              this.messages[this.messages.length - 1].content = fullResponse;
              const lastAssistantText = this.container.querySelector('.cw-pair:last-child .cw-assistant-text');
              if (lastAssistantText) {
                lastAssistantText.innerHTML = this.renderMarkdown(fullResponse);
                this.scrollToBottom();
              }

              // Show a suggestion bubble the user can send or dismiss
              this.showSuggestionBubble(`"${chunk.tool}" failed: ${error.message} — can you try another way?`);
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

    // Update dot position (vertical track)
    const dot = this.container.querySelector('.cw-dot');
    const track = this.container.querySelector('.cw-track');
    if (dot && track) {
      const trackHeight = track.offsetHeight;
      dot.style.top = `${this.progress * trackHeight}px`;
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


  // Show a suggestion bubble with send/delete controls.
  // If the user sends it, it becomes a normal user message and triggers a response.
  // If the user deletes it, it disappears with no side effects.
  showSuggestionBubble(text) {
    const scrollEl = this.container.querySelector(`[data-scroll="${this.panelId}"]`);
    if (!scrollEl) return;

    const listEl = scrollEl.querySelector('.cw-list');
    if (!listEl) return;

    // Build the bubble
    const bubble = document.createElement('div');
    bubble.className = 'cw-suggestion-bubble';
    bubble.innerHTML = `
      <div class="cw-suggestion-text">${this.escapeHtml(text)}</div>
      <div class="cw-suggestion-actions">
        <button class="cw-suggestion-send" title="Send">Send</button>
        <button class="cw-suggestion-delete" title="Dismiss">Dismiss</button>
      </div>
    `;

    listEl.appendChild(bubble);
    this.scrollToBottom();

    // Send: treat as a normal user message
    bubble.querySelector('.cw-suggestion-send').addEventListener('click', () => {
      bubble.remove();
      this.input = text;
      this.handleSend();
    });

    // Delete: just remove
    bubble.querySelector('.cw-suggestion-delete').addEventListener('click', () => {
      bubble.remove();
    });
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
    if (!this.conversationArea) return;
    this.conversationArea.classList.add('collapsed');
    // Store collapse state
    sessionStorage.setItem(`cw-collapsed-${this.panelId}`, 'true');
  }

  expandChat() {
    if (!this.conversationArea) return;
    this.conversationArea.classList.remove('collapsed');
    // Clear collapse state
    sessionStorage.removeItem(`cw-collapsed-${this.panelId}`);
    this.scrollToBottom();
  }

  // Remote AI mode
  enterRemoteMode() {
    const inputBar = this.container.querySelector(`[data-inputbar="${this.panelId}"]`);
    const remoteBar = this.container.querySelector(`[data-remotebar="${this.panelId}"]`);
    const workspace = this.container.querySelector(`[data-remoteworkspace="${this.panelId}"]`);
    if (inputBar && remoteBar) {
      inputBar.style.display = 'none';
      remoteBar.style.display = 'flex';
      if (workspace) {
        workspace.style.display = 'flex';
        this.renderRemoteOrganizer();
      }
      // Hide normal conversation area
      if (this.conversationArea) this.conversationArea.style.display = 'none';
      const remoteInput = this.container.querySelector(`[data-remoteinput="${this.panelId}"]`);
      if (remoteInput) remoteInput.focus();
    }
  }

  exitRemoteMode() {
    const inputBar = this.container.querySelector(`[data-inputbar="${this.panelId}"]`);
    const remoteBar = this.container.querySelector(`[data-remotebar="${this.panelId}"]`);
    const workspace = this.container.querySelector(`[data-remoteworkspace="${this.panelId}"]`);
    if (inputBar && remoteBar) {
      remoteBar.style.display = 'none';
      inputBar.style.display = 'grid';
      if (workspace) workspace.style.display = 'none';
      // Restore normal conversation area
      if (this.conversationArea) this.conversationArea.style.display = '';
      if (this.inputEl) this.inputEl.focus();
    }
  }

  renderRemoteOrganizer() {
    const listEl = this.container.querySelector(`[data-remoteorglist="${this.panelId}"]`);
    if (!listEl) return;

    // Read tasks from Firestore-synced state (always up to date via onSnapshot)
    const tasks = (window.briizPersistence?.state?.tasks || [])
      .filter(t => t.type === 'jobPanel')
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); // newest on top

    if (tasks.length === 0) {
      listEl.innerHTML = '<li class="cw-remote-org-empty">No remote tasks yet</li>';
      return;
    }

    const selectedId = this._selectedTaskId;

    listEl.innerHTML = tasks.map(t => {
      const displayId = (t.id || '').replace('tasks-', '');
      const preview = t.title
        ? (t.title.length > 50 ? t.title.substring(0, 50) + '...' : t.title)
        : 'Untitled task';
      const isComplete = t.status === 'complete';
      const isRunning = t.status === 'running';
      const statusClass = isComplete ? 'green' : (isRunning ? 'pink' : 'grey');
      const isSelected = selectedId === t.id;
      const badgeHtml = isComplete
        ? '<span class="cw-remote-badge complete">COMPLETE</span>'
        : isRunning
          ? '<span class="cw-remote-badge running">RUNNING</span>'
          : '<span class="cw-remote-badge queued">QUEUED</span>';
      return `
        <li class="cw-remote-org-item ${isSelected ? 'active' : ''}" data-task-id="${t.id}">
          <div class="cw-remote-org-light ${statusClass}"></div>
          <div class="cw-remote-org-text">
            <div class="cw-remote-org-preview">${this.escapeHtml(preview)}</div>
          </div>
          <div class="cw-remote-org-meta">
            ${badgeHtml}
          </div>
        </li>
      `;
    }).join('');

    // Click to select/deselect task and show/hide detail viewer
    listEl.querySelectorAll('.cw-remote-org-item').forEach(item => {
      item.addEventListener('click', () => {
        const taskId = item.dataset.taskId;
        const detailEl = this.container.querySelector(`[data-remotedetail="${this.panelId}"]`);

        if (this._selectedTaskId === taskId) {
          // Deselect — animate out then clear
          if (detailEl) detailEl.classList.add('closing');
          setTimeout(() => {
            this._selectedTaskId = null;
            this.renderRemoteOrganizer();
            if (detailEl) {
              detailEl.classList.remove('closing');
              detailEl.innerHTML = '<div class="cw-remote-detail-empty">Select a task to view details</div>';
            }
          }, 200);
        } else {
          // Select new task — if switching, animate out then in
          if (this._selectedTaskId && detailEl) {
            detailEl.classList.add('closing');
            setTimeout(() => {
              detailEl.classList.remove('closing');
              this._selectedTaskId = taskId;
              this.renderRemoteOrganizer();
              this.renderRemoteDetail(taskId);
            }, 150);
          } else {
            this._selectedTaskId = taskId;
            this.renderRemoteOrganizer();
            this.renderRemoteDetail(taskId);
          }
        }
      });
    });
  }

  renderRemoteDetail(taskId) {
    const detailEl = this.container.querySelector(`[data-remotedetail="${this.panelId}"]`);
    if (!detailEl) return;

    const task = (window.briizPersistence?.state?.tasks || []).find(t => t.id === taskId);
    if (!task) {
      detailEl.innerHTML = '<div class="cw-remote-detail-empty">Task not found</div>';
      return;
    }

    const displayId = (task.id || '').replace('tasks-', '');
    const actions = task.actions || [];
    const isRunning = task.status === 'running';

    const actionsHtml = actions.length > 0
      ? `<ol class="cw-remote-detail-actions-list">${actions.map(a => {
          const label = a.title || a.text || a.name || 'Untitled step';
          return `<li>${this.escapeHtml(label)}</li>`;
        }).join('')}</ol>`
      : '<span class="cw-remote-detail-none">No actions yet</span>';

    const statusHtml = actions.length > 0
      ? `<ol class="cw-remote-detail-status-list">${actions.map(a => {
          const stepStatus = a.completed ? 'Done' : (a.status || 'Pending');
          const stepClass = a.completed ? 'done' : (a.status === 'running' ? 'running' : 'pending');
          return `<li class="cw-remote-step-${stepClass}">${this.escapeHtml(stepStatus)}</li>`;
        }).join('')}</ol>`
      : '<span class="cw-remote-detail-none">--</span>';

    detailEl.innerHTML = `
      <div class="cw-remote-detail-header">Task ID #${this.escapeHtml(displayId)}</div>
      <div class="cw-remote-detail-grid">
        <div class="cw-remote-detail-label">User:</div>
        <div class="cw-remote-detail-value">${this.escapeHtml(task.title || 'Untitled')}</div>

        <div class="cw-remote-detail-label">Actions:</div>
        <div class="cw-remote-detail-value">${actionsHtml}</div>

        <div class="cw-remote-detail-label">Status:</div>
        <div class="cw-remote-detail-value">${statusHtml}</div>
      </div>

      <!-- Task log -->
      <div class="cw-remote-detail-log-section">
        <div class="cw-remote-detail-log-header">Task Log</div>
        <div class="cw-remote-detail-log" data-remotelog="${this.panelId}">
          ${this.renderTaskLog(task)}
        </div>
      </div>

      ${isRunning ? `
        <div class="cw-remote-detail-respond">
          <button class="cw-remote-respond-btn" data-remoterespond="${this.panelId}">RESPOND</button>
        </div>
      ` : ''}
    `;

    // Respond button handler
    const respondBtn = detailEl.querySelector(`[data-remoterespond="${this.panelId}"]`);
    if (respondBtn) {
      respondBtn.addEventListener('click', () => {
        this.showRespondInput(taskId);
      });
    }
  }

  renderTaskLog(task) {
    const log = task.taskLog || [];
    if (log.length === 0) {
      return '<div class="cw-remote-log-empty">No activity yet</div>';
    }

    return log.map(entry => {
      const time = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const typeClass = entry.type || 'status';

      return `
        <div class="cw-remote-log-entry cw-remote-log-${typeClass}">
          <span class="cw-remote-log-time">${time}</span>
          <span class="cw-remote-log-msg">${this.escapeHtml(entry.message || '')}</span>
        </div>`;
    }).join('');
  }

  showRespondInput(taskId) {
    const detailEl = this.container.querySelector(`[data-remotedetail="${this.panelId}"]`);
    const respondContainer = detailEl?.querySelector('.cw-remote-detail-respond');
    if (!respondContainer) return;

    respondContainer.innerHTML = `
      <textarea class="cw-remote-respond-input" data-respondinput="${this.panelId}" placeholder="Type your response..."></textarea>
      <div class="cw-remote-respond-actions">
        <button class="cw-remote-respond-send" data-respondsend="${this.panelId}">SEND</button>
        <button class="cw-remote-respond-cancel" data-respondcancel="${this.panelId}">CANCEL</button>
      </div>
    `;

    const input = respondContainer.querySelector(`[data-respondinput="${this.panelId}"]`);
    if (input) input.focus();

    const sendBtn = respondContainer.querySelector(`[data-respondsend="${this.panelId}"]`);
    const cancelBtn = respondContainer.querySelector(`[data-respondcancel="${this.panelId}"]`);

    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        const text = input?.value?.trim();
        if (text) {
          // TODO: Phase 2 — write response to Firestore for Local to pick up
          console.log('[RemoteAI] Response sent for task:', taskId, text);
        }
        this.renderRemoteDetail(taskId);
      });
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.renderRemoteDetail(taskId);
      });
    }
  }

  async toggleJobPanel(taskId) {
    // Find existing panel for this task
    const panelData = window.panelManager?.panels?.find(p => p.taskId === taskId);

    if (panelData) {
      // Panel exists in DOM — toggle visibility
      const panelEl = document.querySelector(`[data-panel-id="${panelData.id}"]`);
      if (panelEl) {
        panelEl.style.display = panelEl.style.display === 'none' ? '' : 'none';
      }
    } else {
      // Panel not in DOM — create it from the Firestore task data
      const task = (window.briizPersistence?.state?.tasks || []).find(t => t.id === taskId);
      if (task && window.panelManager) {
        const displayId = taskId.replace('tasks-', '');
        await window.panelManager.createNewPanel('jobPanel', `Task ID #${displayId}`, {
          source: 'api',
          jobMessage: task.title || '',
          taskId: taskId
        });
      }
    }
  }

  async handleRemoteSend() {
    const remoteInput = this.container.querySelector(`[data-remoteinput="${this.panelId}"]`);
    if (!remoteInput || !remoteInput.value.trim()) return;
    const message = remoteInput.value.trim();
    remoteInput.value = '';

    const taskId = `tasks-${Date.now()}`;

    // Create the jobPanel via panelManager
    if (window.panelManager) {
      const displayId = taskId.replace('tasks-', '');
      await window.panelManager.createNewPanel('jobPanel', `Task ID #${displayId}`, {
        source: 'api',
        jobMessage: message,
        taskId: taskId
      });
    }

    // Save to Firestore tasks bucket (via adapter per SyncContract §7)
    if (window.briizPersistence) {
      window.briizPersistence.saveTask({
        id: taskId,
        type: 'jobPanel',
        title: message,
        status: 'active',
        completed: false,
        automated: true,
        createdAt: Date.now(),
        actions: [],
        taskLog: [{ timestamp: Date.now(), type: 'status', message: 'Task sent from Web' }]
      });
    }

    console.log('[RemoteAI] Job created:', taskId, message);

    // Select the new task and refresh
    this._selectedTaskId = taskId;
    this.renderRemoteOrganizer();
    this.renderRemoteDetail(taskId);
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
