# AI Context Layer

> AI-powered Chrome extension that helps developers debug faster on GitHub and Stack Overflow.

![AI Context Layer Banner](https://img.shields.io/badge/AI%20Context%20Layer-Chrome%20Extension-6366f1?style=for-the-badge)

---

## Overview

**AI Context Layer** is a Chrome extension that:

1. Detects when a developer is on a supported page (GitHub Issues, Stack Overflow questions)
2. Shows an **"Explain with AI"** floating button
3. On click, extracts error messages, code snippets, and framework context from the page
4. Sends the context to a local backend that calls OpenAI
5. Displays a structured explanation and fix in a **side panel**

---

## Project Structure

```
omnicontext/
├── extension/               # Plasmo extension (React + TypeScript)
│   ├── background/index.ts  # Service worker – install event, side panel
│   ├── content/index.ts     # Content script – floating button injection
│   ├── sidepanel/           # Main side panel UI
│   │   ├── index.tsx
│   │   └── sidepanel.css
│   ├── tabs/                # Welcome / onboarding page
│   │   ├── welcome.tsx
│   │   └── welcome.css
│   ├── utils/
│   │   ├── contextExtractor.ts  # DOM extraction
│   │   └── contextProcessor.ts  # Context classification & cleanup
│   ├── popup.tsx            # Toolbar popup toggle
│   ├── package.json
│   └── tsconfig.json
│
└── backend/                 # Node.js + Express API
    ├── server.js            # POST /analyze endpoint
    ├── package.json
    └── .env.example
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- An [OpenAI API key](https://platform.openai.com/account/api-keys)
- Google Chrome (or Chromium-based browser)

---

### 1. Set Up the Backend

```bash
cd backend
npm install

# Copy the env template and add your API key
copy .env.example .env
# Edit .env and set: OPENAI_API_KEY=sk-...

npm start
```

The server starts at **http://localhost:3001**.  
Verify it's running: `http://localhost:3001/health`

---

### 2. Set Up the Extension

```bash
cd extension
npm install
npm run dev        # starts Plasmo in dev mode with hot reload
```

After running `npm run dev`, Plasmo outputs the built extension to:

```
extension/build/chrome-mv3-dev/
```

---

### 3. Load the Extension in Chrome

1. Open **chrome://extensions**
2. Enable **Developer Mode** (top right)
3. Click **Load Unpacked**
4. Select the folder: `extension/build/chrome-mv3-dev`

The extension installs and automatically opens the **Welcome page**.

---

### 4. Enable the Extension

- On the Welcome page, click **"Enable AI Context Layer"**
- Or click the extension toolbar icon to toggle it on

---

## Usage

1. Navigate to a **GitHub Issue** (e.g., `github.com/vercel/next.js/issues/12345`)  
   or a **Stack Overflow question**
2. Click the purple **"Explain with AI"** button in the bottom-right corner
3. The side panel opens with:
   - 🔴 **Problem Detected**
   - 🔍 **Root Cause**
   - 🔧 **Suggested Fix**
   - 💻 **Example Code**
   - 🔗 **Related Resources**

---

## Configuration

| Setting | Location | Default |
|---|---|---|
| OpenAI API Key | `backend/.env` | — |
| Backend Port | `backend/.env` → `PORT` | `3001` |
| AI Model | `backend/server.js` | `gpt-4o-mini` |
| Supported Sites | `extension/content/index.ts` | GitHub, Stack Overflow |

---

## Security & Privacy

- ✅ **No automatic analysis** – the extension never sends data without an explicit click
- ✅ **API key stays on the server** – the extension never touches your OpenAI key
- ✅ **No external tracking** – no analytics or telemetry

---

## Build for Production

```bash
cd extension
npm run build
# Output: extension/build/chrome-mv3-prod/
```

Load the `chrome-mv3-prod` folder as unpacked for a production build.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Extension framework | [Plasmo](https://docs.plasmo.com/) |
| UI | React 18 + TypeScript |
| Syntax highlighting | highlight.js |
| Backend | Node.js + Express |
| AI | OpenAI `gpt-4o-mini` |
| Storage | `@plasmohq/storage` (Chrome sync storage) |
"# OmniContext.ai" 
