/**
 * content/index.ts
 * Content script injected on GitHub and Stack Overflow pages.
 * Injects the floating "Explain with AI" button and orchestrates analysis.
 */

import type { PlasmoCSConfig } from "plasmo"
import { Storage } from "@plasmohq/storage"
import { ContextEngine } from "../core/contextEngine"
import { PermissionManager } from "../core/permissionManager"
import { AIOrchestrator } from "../core/aiOrchestrator"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true
}

const storage = new Storage({ area: "local" })

init()

async function init() {
  // 1. Check if AI is allowed on this domain (Universal AI Layer)
  const allowed = await PermissionManager.isAllowed(window.location.href)
  if (!allowed) return

  // 2. Only activate if the user has enabled the extension overall
  const enabled = await storage.get("extension_enabled")
  if (enabled === "false") return // storage.get returns string

  // Wait for full DOM then inject button
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupInjection)
  } else {
    setupInjection()
  }
}

function setupInjection() {
  injectFloatingButton()
  
  // GitHub acts as an SPA (single page application) and replaces the body,
  // which might remove our button. Observe DOM changes and re-inject if needed.
  const observer = new MutationObserver(() => {
    if (!document.getElementById("ai-context-layer-host")) {
      injectFloatingButton()
    }
  })
  
  observer.observe(document.body, { childList: true, subtree: true })
}

// ─── Floating button injection ───────────────────────────────────────────────

function injectFloatingButton() {
  // Don't inject if button already exists
  if (document.getElementById("ai-context-layer-host")) return

  const host = document.createElement("div")
  host.id = "ai-context-layer-host"
  Object.assign(host.style, {
    position: "fixed",
    bottom: "28px",
    right: "28px",
    top: "auto",
    left: "auto",
    margin: "0",
    padding: "0",
    zIndex: "2147483647",
    width: "0",
    height: "0",
    overflow: "visible"
  })

  // Use shadow DOM to isolate CSS
  const shadow = host.attachShadow({ mode: "open" })

  const btn = document.createElement("button")
  btn.id = "ai-context-layer-btn"
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/>
    </svg>
    <span>Explain with AI</span>
  `
  
  // Base styles inside shadow DOM
  const style = document.createElement('style')
  style.textContent = `
    #ai-context-layer-btn {
      position: absolute;
      bottom: 0;
      right: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: #fff;
      border: none;
      border-radius: 50px;
      font-size: 14px;
      font-weight: 600;
      font-family: 'Inter', system-ui, sans-serif;
      cursor: pointer;
      box-shadow: 0 4px 24px rgba(99,102,241,0.45), 0 1px 4px rgba(0,0,0,0.2);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      letter-spacing: 0.01em;
      white-space: nowrap;
      outline: none;
    }
    #ai-context-layer-btn:hover {
      transform: translateY(-2px) scale(1.04);
      box-shadow: 0 8px 32px rgba(99,102,241,0.55), 0 2px 8px rgba(0,0,0,0.2);
    }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    #ai-context-layer-btn.analyzing svg {
      animation: spin 1s linear infinite;
    }
  `

  btn.addEventListener("click", handleAnalysis)
  
  shadow.appendChild(style)
  shadow.appendChild(btn)
  
  // Append to document.documentElement to escape body transforms if any
  ;(document.body || document.documentElement).appendChild(host)
}

// ─── Analysis flow ────────────────────────────────────────────────────────────

async function handleAnalysis() {
  // 1. Open the side panel IMMEDIATELY to preserve user gesture context.
  // This must be the very first thing to ensure Chrome honors the gesture.
  chrome.runtime.sendMessage({ type: "OPEN_SIDEPANEL" })

  const host = document.getElementById("ai-context-layer-host")
  if (!host || !host.shadowRoot) return
  
  const btn = host.shadowRoot.getElementById("ai-context-layer-btn") as HTMLButtonElement
  if (!btn) return

  // Show loading state on button
  btn.classList.add("analyzing")
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
    <span>Analyzing…</span>
  `
  // Get tab ID early so we can use it for storage
  const tabs = await chrome.runtime.sendMessage({ type: "GET_TAB_ID" })
  const tabId = tabs?.tabId

  try {
    // 2. Extract context using the Universal Context Engine
    const context = await ContextEngine.detect()

    // 3. Delegate analysis to SidePanel so it can show its own loading state
    // We send START_ANALYSIS which the sidepanel watches for
    await chrome.runtime.sendMessage({ 
      type: "START_ANALYSIS", 
      payload: context 
    })

  } catch (err: any) {
    console.error("[OmniContext.ai] Instruction failed:", err)
    if (tabId) {
      await storage.set(`lastResult_${tabId}`, {
        result: { error: err.message || "Failed to start analysis" },
        context: null,
        timestamp: Date.now()
      })
    }
  } finally {
    // Restore button after a delay
    setTimeout(() => {
      if (!btn) return
      btn.classList.remove("analyzing")
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/>
        </svg>
        <span>Explain with AI</span>
      `
      btn.style.opacity = "1"
      btn.disabled = false
    }, 2000)
  }
}
// ─── Animation listener ───────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SHOW_SCAN_ANIMATION") {
    showScanAnimation()
    sendResponse({ success: true })
  }
  
  if (message.type === "GET_CONTEXT") {
    ContextEngine.detect().then(ctx => {
      sendResponse({ success: true, context: ctx })
    }).catch(err => {
      sendResponse({ success: false, error: err.message })
    })
    return true // Async
  }
})

function showScanAnimation() {
  const overlay = document.createElement("div")
  overlay.id = "omni-scan-overlay"
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    background: "rgba(99, 102, 241, 0.05)",
    zIndex: "9999999",
    pointerEvents: "none",
    overflow: "hidden"
  })

  const scanner = document.createElement("div")
  Object.assign(scanner.style, {
    position: "absolute",
    top: "-100px",
    left: "0",
    width: "100%",
    height: "100px",
    background: "linear-gradient(to bottom, transparent, rgba(99, 102, 241, 0.4), transparent)",
    boxShadow: "0 0 40px rgba(99, 102, 241, 0.6)",
  })

  const style = document.createElement("style")
  style.textContent = `
    @keyframes omni-scan {
      0% { top: -100px; }
      100% { top: 110%; }
    }
  `
  scanner.style.animation = "omni-scan 2s cubic-bezier(0.19, 1, 0.22, 1) forwards"

  overlay.appendChild(scanner)
  document.head.appendChild(style)
  document.body.appendChild(overlay)

  setTimeout(() => {
    overlay.remove()
    style.remove()
  }, 2200)
}
