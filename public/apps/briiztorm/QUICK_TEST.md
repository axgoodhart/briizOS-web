# Quick Test - Using Existing Chat Module

## Setup (Simple)

1. Start Zolar:
```bash
cd Zolar
npm run dev
```

2. Open briiztorm/index.html in browser

3. Check console for: `✨ Using existing ChatAPI from chat-module`

## Test Commands

Type these in the chat:
- "Navigate to Mars"
- "Speed up the animation"
- "Focus on the sun"

## What's Actually Happening

- Using the **existing** working ChatAPI from modules/chat-module/chat-api.js
- It already has the API keys hardcoded and working
- We're just adding Zolar control on top

## If It Doesn't Work

Check console for:
1. Is ChatAPI loaded?
2. Is GEMINI_API_KEY defined? (should be from chat-api.js)
3. Are messages being sent to Zolar iframe?

## The Point

Stop recreating what already works. The chat-module already talks to Gemini successfully. We're just using it and adding scene control parsing.