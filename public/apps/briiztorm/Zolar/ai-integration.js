// AI Integration for Briiztorm - Real Gemini API with Three.js Scene Control

class BriiztormAI {
  constructor() {
    // You'll need to add your Gemini API key here or get it from environment
    this.apiKey = 'AIzaSyCvJBsFTCF9aSvjI10XeL8sxGXzFWdf-9I'; // Replace with actual key
    this.model = 'gemini-pro';

    // Track conversation history
    this.conversationHistory = [];

    // System prompt that teaches the AI about scene control
    this.systemPrompt = `You are the AI navigator for Briiztorm, a 3D solar system file explorer. You can control a Three.js space scene and help users navigate their files represented as celestial objects.

You have access to these scene control commands (send via sendToZolar function):

CAMERA CONTROLS:
- FOLLOW_SUN: Focus camera on the sun
- SET_SPEED: Change animation speed (0-10)
- TOGGLE_PAUSE: Pause/resume animations
- RESET_VIEW: Reset camera to default position
- SET_CONTROL_MODE: Switch between 'orbit' and 'keyboard' modes

VISUAL CONTROLS:
- SET_BLOOM: Adjust bloom intensity (0-2)
- TOGGLE_ORBITS: Show/hide orbital paths
- TOGGLE_MOONS: Show/hide moons
- TOGGLE_PLANET_LABELS: Show/hide planet name labels
- TOGGLE_MOON_LABELS: Show/hide moon name labels

NAVIGATION:
- NAVIGATE_TO_PLANET: Focus on a specific planet {planet: "Mars"}
- CAMERA_RELATIVE_MOVE: Move camera {movement: {forward, strafe, up}, rotation: {x, y}}

SCENE MANIPULATION:
- CREATE_CELESTIAL_BODY: Add new object {type: "planet", name: "ProjectName", size: 1-10, distance: 10-100}
- UPDATE_CELESTIAL_BODY: Modify existing object
- REMOVE_CELESTIAL_BODY: Delete object

FILE METAPHOR:
- Sun = Home/Root directory
- Planets = Major projects or folders
- Moons = Subfolders or important files
- Asteroids = Individual files
- Comets = Recently accessed files
- Distance from sun = Last modified (closer = more recent)
- Size = Project complexity or importance
- Color/texture = File type or project category

When users ask about files or projects, translate them into celestial metaphors.
When users want to navigate, use the appropriate scene commands.
Be creative and poetic in your descriptions, embracing the space theme.

Available slash commands:
/explore - Start exploring the file system
/focus [planet] - Navigate to a specific celestial body
/create [name] - Create a new project planet
/map - Show overview of all projects
/recent - Show recently accessed files as comets`;
  }

  async sendMessage(message, onChunk) {
    try {
      // Build message history with system prompt
      const messages = [
        { role: 'system', content: this.systemPrompt },
        ...this.conversationHistory,
        { role: 'user', content: message }
      ];

      // Convert to Gemini format
      const contents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : (msg.role === 'system' ? 'user' : msg.role),
        parts: [{ text: msg.content }],
      }));

      // Prepare the request (matching chat-module format)
      const requestBody = {
        contents,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      };

      // Use SSE endpoint like chat-module
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                fullResponse += text;
                if (onChunk) onChunk(text);
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }

      // Add to conversation history
      this.conversationHistory.push(
        { role: 'user', content: message },
        { role: 'assistant', content: fullResponse }
      );

      // Keep history manageable
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      // Parse for scene commands
      this.parseAndExecuteCommands(fullResponse);

      return fullResponse;
    } catch (error) {
      console.error('AI Error:', error);
      return `Sorry, I encountered an error: ${error.message}. Please check the console for details.`;
    }
  }

  parseAndExecuteCommands(text) {
    // Look for command patterns in the AI response
    const commandPatterns = [
      // Direct commands
      { pattern: /NAVIGATE_TO_PLANET:\s*(\w+)/gi, action: (match) => {
        this.sendToZolar('NAVIGATE_TO_PLANET', { planet: match[1] });
      }},
      { pattern: /SET_SPEED:\s*([\d.]+)/gi, action: (match) => {
        this.sendToZolar('SET_SPEED', { speed: parseFloat(match[1]) });
      }},
      { pattern: /CREATE_CELESTIAL_BODY:\s*(\{[^}]+\})/gi, action: (match) => {
        try {
          const params = JSON.parse(match[1]);
          this.sendToZolar('CREATE_CELESTIAL_BODY', params);
        } catch (e) {
          console.error('Failed to parse celestial body params:', e);
        }
      }},
      // Natural language patterns
      { pattern: /(?:navigate|go|fly|travel)\s+to\s+(\w+)/gi, action: (match) => {
        this.sendToZolar('NAVIGATE_TO_PLANET', { planet: match[1] });
      }},
      { pattern: /(?:focus|look|center)\s+(?:on\s+)?(?:the\s+)?sun/gi, action: () => {
        this.sendToZolar('FOLLOW_SUN');
      }},
      { pattern: /(?:pause|stop)\s+(?:the\s+)?(?:animation|movement)/gi, action: () => {
        this.sendToZolar('TOGGLE_PAUSE');
      }},
      { pattern: /(?:speed|velocity)\s+(?:up|increase|faster)/gi, action: () => {
        this.sendToZolar('INCREASE_SPEED');
      }},
      { pattern: /(?:speed|velocity)\s+(?:down|decrease|slower)/gi, action: () => {
        this.sendToZolar('DECREASE_SPEED');
      }}
    ];

    for (const { pattern, action } of commandPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        action(match);
      }
    }
  }

  sendToZolar(type, payload = {}) {
    // Get reference to Zolar iframe and send command
    const zolarIframe = document.querySelector('#zolar-panel iframe');
    if (zolarIframe && zolarIframe.contentWindow) {
      zolarIframe.contentWindow.postMessage({ type, payload }, '*');
      console.log('[AI -> Zolar]', type, payload);
    } else {
      console.warn('Zolar iframe not found');
    }
  }

  // Handle slash commands
  processSlashCommand(command) {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    switch (cmd) {
      case '/explore':
        this.sendToZolar('START_EXPLORATION_MODE');
        return "Initiating exploration mode. Your file system is materializing as celestial bodies...";

      case '/focus':
        if (args) {
          this.sendToZolar('NAVIGATE_TO_PLANET', { planet: args });
          return `Navigating to ${args}...`;
        }
        return "Please specify a celestial body to focus on.";

      case '/create':
        if (args) {
          this.sendToZolar('CREATE_CELESTIAL_BODY', {
            type: 'planet',
            name: args,
            size: 5 + Math.random() * 5,
            distance: 30 + Math.random() * 70
          });
          return `Creating new project planet: ${args}`;
        }
        return "Please provide a name for the new project.";

      case '/map':
        this.sendToZolar('SHOW_SYSTEM_MAP');
        return "Displaying solar system map overview...";

      case '/recent':
        this.sendToZolar('HIGHLIGHT_RECENT');
        return "Highlighting recently accessed files as glowing comets...";

      default:
        return null;
    }
  }

  // Clear conversation history
  resetConversation() {
    this.conversationHistory = [];
  }
}

// Export for use in briiztorm
if (typeof window !== 'undefined') {
  window.BriiztormAI = BriiztormAI;
}