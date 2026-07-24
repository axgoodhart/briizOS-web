class ChatAPI {
  constructor() {
    this.enableTools = true; // Enable tool calling by default
    this.buffer = ''; // Buffer for detecting JSON tool calls
  }

  // API keys are entered and stored through the AI Settings modal.
  ensureApiKey(provider) {
    const settingsProvider = provider === 'openai' ? 'chatgpt' : provider;
    const providerLabels = {
      gemini: 'Google Gemini',
      claude: 'Anthropic',
      chatgpt: 'OpenAI',
    };

    if (!providerLabels[settingsProvider]) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    const key = window.settingsManager?.getApiKey(settingsProvider);
    if (!key) {
      throw new Error(`Add your ${providerLabels[settingsProvider]} API key in AI Settings before sending a message.`);
    }

    return key;
  }

  // Inject system prompt with tool definitions
  injectSystemPrompt(messages, customPrompt = null) {
    const hasSystem = messages.some(m => m.role === 'system');
    if (hasSystem) return messages;

    // Always start with the base tool-enabled prompt
    let systemContent = '';
    if (this.enableTools && window.systemPrompt) {
      systemContent = window.systemPrompt.getSystemPrompt();
    }

    // Append custom prompt (doesn't replace — tools stay available)
    if (customPrompt && customPrompt.trim()) {
      systemContent += `\n\n# User Custom Instructions\n\n${customPrompt.trim()}`;
    }

    if (!systemContent) return messages;

    return [{ role: 'system', content: systemContent }, ...messages];
  }

  // Parse text for JSON tool calls
  parseForToolCalls(text) {
    const results = [];
    this.buffer += text;

    // Look for JSON blocks with tool calls
    const jsonRegex = /```json\s*(\{[^`]*\})\s*```/g;
    let match;

    // Valid tool names to prevent false positives
    const validTools = [
      // Original tools
      'getScheduleSummary', 'searchNotes', 'findScheduleConflicts', 'lookupOnline',
      'openPanel', 'startTimer', 'tilePanels',
      'createPrioritizedTaskList',
      'createSingleCalendarEvent', 'updateCalendarEvent', 'createRecurringCalendarEvent',
      'createThoughtStream',
      // Phase 1: Core AI Tool Expansion
      'createNotePanel', 'setPanelColor', 'updateNoteContent', 'movePanel', 'resizePanel', 'setPanelTitle',
      // Phase 2: Advanced Panel Operations
      'duplicatePanel', 'deletePanel', 'minimizePanel', 'restorePanel',
      // Phase 3: Workspace Organization
      'groupPanelsByType', 'stackPanelsVertically', 'focusMode', 'closeAllPanels', 'minimizeAllPanels',
      // Phase 4: Task Management
      'completeTask'
    ];

    while ((match = jsonRegex.exec(this.buffer)) !== null) {
      try {
        const jsonStr = match[1];
        const parsed = JSON.parse(jsonStr);

        // Strict validation: must have tool and params, tool must be valid
        if (parsed.tool &&
            typeof parsed.tool === 'string' &&
            validTools.includes(parsed.tool) &&
            parsed.params &&
            typeof parsed.params === 'object') {

          console.log('Valid tool call detected:', parsed.tool);

          results.push({
            type: 'tool_call',
            tool: parsed.tool,
            params: parsed.params
          });

          // Remove the JSON block from buffer
          this.buffer = this.buffer.replace(match[0], '');
        } else {
          console.log('Invalid tool call ignored:', parsed);
        }
      } catch (e) {
        // Not valid JSON, continue
        console.debug('JSON parse error:', e);
      }
    }

    // Flush text that's unlikely to contain a JSON block
    if (this.buffer.length > 500 && !this.buffer.includes('```json')) {
      const textToYield = this.buffer;
      this.buffer = '';
      results.push({ type: 'text', content: textToYield });
    }

    return results;
  }

  // Flush remaining buffer
  flushBuffer() {
    const results = [];
    if (this.buffer) {
      results.push({ type: 'text', content: this.buffer });
      this.buffer = '';
    }
    return results;
  }

  // ===== GEMINI DIRECT API =====
  async *streamGemini(messages, model, apiKey, params = {}) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : (msg.role === 'system' ? 'user' : msg.role),
      parts: [{ text: msg.content }],
    }));

    const requestBody = {
      contents,
      generationConfig: {
        temperature: params.temperature ?? 1.0,
        topP: params.top_p ?? 1.0,
        maxOutputTokens: params.max_tokens ?? 1024,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!res.body) throw new Error('No response body from Gemini');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                if (this.enableTools) {
                  // Parse for tool calls
                  const parsed = this.parseForToolCalls(text);
                  for (const item of parsed) {
                    if (item.type === 'tool_call') {
                      yield item;
                    } else if (item.type === 'text') {
                      yield item.content;
                    }
                  }
                } else {
                  yield text;
                }
              }
            } catch (_) { /* ignore parse errors */ }
          }
        }
      }
    } finally {
      try { reader.releaseLock(); } catch (_) {}
    }
  }

  // ===== CLAUDE DIRECT API =====
  async *streamClaude(messages, model, apiKey, params = {}) {
    const url = 'https://api.anthropic.com/v1/messages';

    const claudeMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
    const systemMessage = messages.find(m => m.role === 'system')?.content;

    const requestBody = {
      model,
      max_tokens: params.max_tokens ?? 4096,
      temperature: params.temperature ?? 1.0,
      top_p: params.top_p ?? 1.0,
      messages: claudeMessages,
      stream: true,
    };

    if (systemMessage) {
      requestBody.system = systemMessage;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.body) throw new Error('No response body from Claude');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'content_block_delta' && data?.delta?.text) {
                const text = data.delta.text;
                if (this.enableTools) {
                  // Parse for tool calls
                  const parsed = this.parseForToolCalls(text);
                  for (const item of parsed) {
                    if (item.type === 'tool_call') {
                      yield item;
                    } else if (item.type === 'text') {
                      yield item.content;
                    }
                  }
                } else {
                  yield text;
                }
              }
            } catch (_) { /* ignore parse errors */ }
          }
        }
      }
    } finally {
      try { reader.releaseLock(); } catch (_) {}
    }
  }

  // ===== OPENAI DIRECT API =====
  async *streamOpenAI(messages, model, apiKey, params = {}) {
    const url = 'https://api.openai.com/v1/chat/completions';

    const requestBody = {
      model,
      messages,
      stream: true,
      temperature: params.temperature ?? 1.0,
      top_p: params.top_p ?? 1.0,
      max_tokens: params.max_tokens ?? 1024,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.body) throw new Error('No response body from OpenAI');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              if (this.enableTools) {
                // Parse for tool calls
                const parsedItems = this.parseForToolCalls(content);
                for (const item of parsedItems) {
                  if (item.type === 'tool_call') {
                    yield item;
                  } else if (item.type === 'text') {
                    yield item.content;
                  }
                }
              } else {
                yield content;
              }
            }
          } catch (_) { /* ignore parse errors */ }
        }
      }
    } finally {
      try { reader.releaseLock(); } catch (_) {}
    }
  }

  // ===== MAIN STREAMING ENTRYPOINT =====
  async *streamChat(messages, provider = 'gemini', model = 'gemini-2.5-flash', params = null) {
    // Get settings from SettingsManager if available and params not explicitly provided
    let effectiveProvider = provider;
    let effectiveModel = model;
    let effectiveParams = params;
    let customPrompt = null;

    if (window.settingsManager && !params) {
      const settings = window.settingsManager.getAllSettings();
      effectiveProvider = settings.provider || provider;
      effectiveModel = settings.model || model;
      effectiveParams = settings.params || {
        temperature: 1.0,
        top_p: 1.0,
        max_tokens: 1024
      };
      customPrompt = settings.prompt;
    } else if (!effectiveParams) {
      // Default params if no settings manager and no explicit params
      effectiveParams = {
        temperature: 1.0,
        top_p: 1.0,
        max_tokens: 1024
      };
    }

    // Allow global overrides
    effectiveProvider = (window.CHAT_API_PROVIDER || effectiveProvider);
    effectiveModel = (window.CHAT_API_MODEL || effectiveModel);

    // Reset buffer for new stream
    this.buffer = '';

    // Inject system prompt (custom or tool-enabled)
    const messagesWithSystem = this.injectSystemPrompt(messages, customPrompt);

    // LOG: Full message payload being sent
    console.group(`🤖 AI Request to ${effectiveProvider} (${effectiveModel})`);
    console.log('📤 Messages being sent:', messagesWithSystem);
    console.log('📋 System prompt length:', messagesWithSystem.find(m => m.role === 'system')?.content.length || 0, 'chars');
    console.log('💬 User messages:', messagesWithSystem.filter(m => m.role === 'user').length);
    console.log('🔧 Tools enabled:', this.enableTools);
    console.log('⚙️  Parameters:', effectiveParams);
    console.groupEnd();

    const apiKey = this.ensureApiKey(effectiveProvider);
    switch (effectiveProvider) {
      case 'gemini':
        yield* this.streamGemini(messagesWithSystem, effectiveModel, apiKey, effectiveParams);
        break;
      case 'claude':
        yield* this.streamClaude(messagesWithSystem, effectiveModel, apiKey, effectiveParams);
        break;
      case 'openai':
      case 'chatgpt':
        yield* this.streamOpenAI(messagesWithSystem, effectiveModel, apiKey, effectiveParams);
        break;
      default:
        throw new Error(`Unknown provider: ${effectiveProvider}`);
    }

    // Flush any remaining buffer at the end
    const remaining = this.flushBuffer();
    for (const item of remaining) {
      if (item.type === 'text') {
        yield item.content;
      } else if (item.type === 'tool_call') {
        yield item;
      }
    }

    // LOG: Stream complete
    console.log('✅ AI stream completed');
  }
}

// Export for use in chat widget
window.ChatAPI = ChatAPI;
