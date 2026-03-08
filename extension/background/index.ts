/**
 * background/index.ts
 * Background service worker for AI Context Layer extension.
 * Handles install events, welcome page, and side panel setup.
 */

import { Storage } from "@plasmohq/storage"

const storage = new Storage({ area: "local" })

// 1. Disable global side panel by default
chrome.sidePanel.setOptions({
  enabled: false
}).catch(console.error)

// Enable side panel specifically for the active tab on command
chrome.commands.onCommand.addListener((command) => {
  if (command === "_execute_side_panel") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (tabId) {
        chrome.sidePanel.setOptions({
          tabId,
          path: "sidepanel.html",
          enabled: true
        }).then(() => {
          chrome.sidePanel.open({ tabId }).catch(console.error)
        })
      }
    })
  }
})

// ... (onInstalled listener remains same)

// Allow side panel to open on action click, but it will only open for ENABLED tabs
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error)

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // ... (START_ANALYSIS handler remains same)

  // OPEN_SIDEPANEL: Enable and then open for this specific tab
  if (message.type === "OPEN_SIDEPANEL") {
    const tabId = sender.tab?.id
    if (tabId) {
      chrome.sidePanel.setOptions({
        tabId,
        path: "sidepanel.html",
        enabled: true
      }).then(() => {
        chrome.sidePanel.open({ tabId }).catch((err) => {
          console.error("[OmniContext.ai] Failed to open side panel:", err)
        })
      })
    }
    sendResponse({ success: true })
  }

  if (message.type === "GET_TAB_ID") {
    sendResponse({ tabId: sender.tab?.id })
  }

  if (message.type === "CAPTURE_SCREEN") {
    // Use WINDOW_ID_CURRENT if no specific window is found
    const windowId = sender.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT
    chrome.tabs.captureVisibleTab(windowId, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message })
      } else {
        sendResponse({ success: true, dataUrl })
      }
    })
    return true // Keep channel open for async response
  }
})

// Notify sidepanel when active tab changes so it can restore state
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.runtime.sendMessage({ 
    type: "TAB_SWITCHED", 
    tabId: activeInfo.tabId 
  }).catch(() => {}) // Ignore if sidepanel is not open
})

// Cleanup tab-specific storage when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  storage.remove(`pendingContext_${tabId}`).catch(() => {})
  storage.remove(`lastResult_${tabId}`).catch(() => {})
  storage.remove(`tabState_${tabId}`).catch(() => {})
})
