# Briiztorm + Zolar AI Setup Guide

## Quick Start

### 1. Add Your Gemini API Key

Edit `/Zolar/ai-integration.js` and replace the placeholder on line 5:
```javascript
this.apiKey = 'YOUR_ACTUAL_GEMINI_API_KEY_HERE';
```

Get a free API key from: https://makersuite.google.com/app/apikey

### 2. Start Zolar Server

```bash
cd /Users/alex/Documents/Cufolio/briizOS/public/apps/briiztorm/Zolar
npm run dev
```

This will start Zolar on http://localhost:3000

### 3. Open Briiztorm

Open `/apps/briiztorm/index.html` directly in your browser, or serve it locally.

The Zolar iframe is already configured to load from localhost:3000.

## Testing the AI Integration

### Basic Commands to Try:

1. **Navigation Commands:**
   - "Navigate to Mars"
   - "Focus on the sun"
   - "Show me Earth"
   - "Reset the camera"

2. **Scene Control:**
   - "Pause the animation"
   - "Speed up the planets"
   - "Slow down time"
   - "Set speed to 5"

3. **Visual Controls:**
   - "Hide the orbits"
   - "Show the moons"
   - "Increase bloom"
   - "Toggle planet labels"

4. **Slash Commands:**
   - `/explore` - Start exploration mode
   - `/focus Jupiter` - Navigate to Jupiter
   - `/create MyProject` - Create a new project planet
   - `/map` - Show system overview
   - `/recent` - Highlight recent files

5. **File System Metaphors:**
   - "Create a new project called WebApp"
   - "Show me my recent files"
   - "What projects do I have?"

## How It Works

1. **Briiztorm Chat** → User types message
2. **AI Integration** → Gemini processes with scene-aware prompt
3. **Command Parser** → Extracts scene commands from AI response
4. **PostMessage** → Sends commands to Zolar iframe
5. **Scene Controller** → Executes Three.js scene changes
6. **Visual Update** → User sees the solar system respond

## Troubleshooting

### AI Not Responding?
- Check browser console for errors
- Verify API key is correctly set
- Check network tab for 403 errors (bad API key)

### Scene Not Responding to Commands?
- Check console for `[AI -> Zolar]` messages
- Verify Zolar is running on localhost:3000
- Check for `ZOLAR_READY` message in console

### Camera Issues?
- Try "Reset camera" command
- Refresh the page
- Check if controls are in correct mode (orbit vs keyboard)

## Next Steps

Once basic AI control is working, you can:

1. **Add File System Integration:**
   - Use Browser File System API
   - Map real folders to planets
   - Show file counts as moon systems

2. **Enhance Visual Representation:**
   - Color code by file type
   - Size planets by project complexity
   - Add particle effects for activity

3. **Add More Commands:**
   - File operations (create, delete, move)
   - Search functionality
   - Git status visualization

4. **Connect to BriizOS:**
   - Load as panel in briizOS
   - Use briizOS chat module
   - Share filesystem access

## Architecture Notes

```
Briiztorm (index.html)
├── Chat Interface
├── AI Integration (ai-integration.js)
└── Zolar iframe
    ├── Three.js Scene (main.js)
    ├── Scene Controller (scene-controller.js)
    └── Message Handler

Communication: PostMessage API
AI: Google Gemini Pro
3D: Three.js with OrbitControls
```