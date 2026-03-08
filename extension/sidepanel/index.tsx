import { useEffect, useState, useRef } from "react"
import { Storage } from "@plasmohq/storage"
import hljs from "highlight.js"
import icon from "url:../assets/icon.png"
import "highlight.js/styles/github-dark.css"
import "./sidepanel.css"

import { AIOrchestrator } from "../core/aiOrchestrator"
import { SessionContext } from "../storage/sessionContext"
import type { PageContext } from "../core/contextEngine"
import { Overview } from "./views/Overview"
import { AboutView } from "./views/AboutView"
import { VisualView } from "./views/VisualView"

const storage = new Storage({ area: "local" })

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProcessedContext {
  error: string
  framework: string
  language: string
  codeSnippet: string
  pageType: string
  errorType: string
  mainContent: string
  filename: string
}

interface AnalysisResult {
  heading: string
  summary: string
  problem: string
  cause: string
  fix: string
  exampleCode: string
  resources?: { title: string; url: string }[]
}

interface HistoryItem {
  id: string
  timestamp: number
  result: AnalysisResult
  context: ProcessedContext
}

type Status = "idle" | "loading" | "success" | "error"

const BACKEND_URL = "http://localhost:3001"

// ─── Component ────────────────────────────────────────────────────────────────

export default function SidePanel() {
  const [status, setStatus] = useState<Status>("idle")
  const [context, setContext] = useState<ProcessedContext | null>(null)
  const [pageContext, setPageContext] = useState<PageContext | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [activeTab, setActiveTab] = useState<"analysis" | "overview" | "visual" | "history" | "settings" | "about">("overview")
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [extensionEnabled, setExtensionEnabled] = useState(true)

  // Critical for breaking loops and race conditions
  const activeTabIdRef = useRef<number | null>(null)
  const lastWatcherMapRef = useRef<any>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)

  // Set document title
  useEffect(() => {
    document.title = "OmniContext.ai"
  }, [])

  useEffect(() => {
    checkEnabled()

    const urlParams = new URLSearchParams(window.location.search)
    const paramTabId = urlParams.get("tabId")

    const handleTabSwitch = (message: any) => {
      if (message.type === "TAB_SWITCHED") {
        initialize(message.tabId)
      }
    }
    chrome.runtime.onMessage.addListener(handleTabSwitch)

    if (paramTabId) {
      const tid = parseInt(paramTabId)
      initialize(tid)
      setupStorageWatch(tid)
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
        const tid = tabs[0]?.id
        if (tid !== undefined) {
          initialize(tid)
          setupStorageWatch(tid)
        }
      })
    }

    function setupStorageWatch(tabId: number) {
      if (lastWatcherMapRef.current) {
        storage.unwatch(lastWatcherMapRef.current)
      }

      const key = `pendingContext_${tabId}`
      const lastResultKey = `lastResult_${tabId}`
      
      const callbackMap = {
        [key]: async (change: any) => {
          if (change.newValue && activeTabIdRef.current === tabId) {
            const ctx = change.newValue as ProcessedContext
            setContext(ctx)
            await storage.remove(key)
            setActiveTab("analysis")
            await runAnalysis(ctx, tabId)
          }
        },
        [lastResultKey]: (change: any) => {
          if (change.newValue && activeTabIdRef.current === tabId) {
            const { result, context } = change.newValue
            setResult(result)
            setContext(context)
            setStatus(result.error ? "error" : "success")
            if (result.error) setErrorMsg(result.error)
            setActiveTab("analysis")
          }
        }
      }
      
      storage.watch(callbackMap)
      lastWatcherMapRef.current = callbackMap
    }

    return () => {
      chrome.runtime.onMessage.removeListener(handleTabSwitch)
      if (lastWatcherMapRef.current) {
        storage.unwatch(lastWatcherMapRef.current)
      }
    }
  }, [])

  // Auto-save state ONLY if it matches the active tab
  useEffect(() => {
    async function save() {
      const tabId = activeTabIdRef.current
      if (tabId && status !== "idle") {
        storage.set(`tabState_${tabId}`, {
          status,
          context,
          result,
          summary,
          errorMsg,
          activeTab
        })
      }
    }
    save()
  }, [status, context, result, summary, errorMsg, activeTab])

  async function initialize(tabId: number) {
    activeTabIdRef.current = tabId
    const key = `pendingContext_${tabId}`
    const stateKey = `tabState_${tabId}`

    // 0. Restore saved state for this tab
    const savedState: any = await storage.get(stateKey)
    if (savedState) {
      setStatus(savedState.status || "idle")
      setContext(savedState.context || null)
      setResult(savedState.result || null)
      setSummary(savedState.summary || null)
      setErrorMsg(savedState.errorMsg || "")
      setActiveTab(savedState.activeTab || "overview")
    } else {
      setStatus("idle")
      setContext(null)
      setResult(null)
      setSummary(null)
      setErrorMsg("")
      setActiveTab("overview")
    }

    // 1. Detect context REMOTELY from the content script
    try {
      const response = await chrome.tabs.sendMessage(tabId, { type: "GET_CONTEXT" })
      if (activeTabIdRef.current !== tabId) return 

      if (response?.success && response.context) {
        const pCtx = response.context as PageContext
        setPageContext(pCtx)
        await SessionContext.track(pCtx.url, pCtx.title, pCtx.pageType)

        setLoadingSummary(true)
        AIOrchestrator.processContext('summarize', pCtx).then(res => {
          if (activeTabIdRef.current === tabId && res.summary) {
            setSummary(res.summary)
            setLoadingSummary(false)
          }
        })
      }
    } catch (err) {
      console.warn("[SidePanel] Could not reach content script:", err)
      setPageContext(null)
    }

    // 2. Check for pending analysis
    const pending: any = await storage.get(key)
    if (pending && activeTabIdRef.current === tabId) {
      setContext(pending as ProcessedContext)
      await storage.remove(key)
      await runAnalysis(pending as ProcessedContext, tabId)
    }
  }

  async function openPiP() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    const tabId = tabs[0]?.id
    const url = tabId ? `${window.location.href}?tabId=${tabId}` : window.location.href
    window.open(url, '_blank', 'width=380,height=600,top=100,left=100')
  }

  useEffect(() => {
    document.querySelectorAll("pre code").forEach((block) => {
      hljs.highlightElement(block as HTMLElement)
    })
  }, [result])

  async function checkEnabled() {
    const enabled = await storage.get("extension_enabled")
    setExtensionEnabled(!!enabled)
  }

  async function handleToggleExtension() {
    const newVal = !extensionEnabled
    await storage.set("extension_enabled", newVal)
    setExtensionEnabled(newVal)
  }

  async function runAnalysis(ctx: ProcessedContext, tabId?: number) {
    if (!ctx) return
    setStatus("loading")
    setResult(null)
    setErrorMsg("")
    setActiveTab("analysis")

    try {
      const response = await fetch(`${BACKEND_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: ctx.error,
          framework: ctx.framework,
          language: ctx.language,
          codeSnippet: ctx.codeSnippet,
          pageType: ctx.pageType,
          errorType: ctx.errorType,
          mainContent: ctx.mainContent,
          filename: ctx.filename,
        }),
      })

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`)
      }

      const data = await response.json()
      if (activeTabIdRef.current !== tabId) return

      setResult(data)
      setStatus("success")

      if (tabId !== undefined) {
        const state = {
          result: data,
          context: ctx,
          status: "success" as Status,
          activeTab: "analysis" as any,
          summary: summary
        }
        await storage.set(`lastResult_${tabId}`, { result: data, context: ctx, timestamp: Date.now() })
        await storage.set(`tabState_${tabId}`, state)
      }

      const currentHistoryRaw = await storage.get("analysis_history")
      const currentHistory = Array.isArray(currentHistoryRaw) ? currentHistoryRaw : []
      const newItem: HistoryItem = { id: crypto.randomUUID(), timestamp: Date.now(), result: data, context: ctx }
      const updatedHistory = [newItem, ...currentHistory].slice(0, 50)
      setHistory(updatedHistory)
      await storage.set("analysis_history", updatedHistory)
    } catch (err: any) {
      const msg = err.message || "Unknown error"
      if (activeTabIdRef.current !== tabId) return
      setErrorMsg(msg)
      setStatus("error")
      if (tabId !== undefined) {
        storage.set(`tabState_${tabId}`, { status: "error" as Status, errorMsg: msg, activeTab: "analysis" as any, summary })
      }
    }
  }

  async function clearHistory() {
    setHistory([])
    await storage.remove("analysis_history")
  }

  useEffect(() => {
    storage.get("analysis_history").then((val: any) => {
      if (Array.isArray(val)) setHistory(val)
    })
  }, [])

  return (
    <div className="panel-root">
      <header className="panel-header">
        <div className="panel-logo-container">
          <div className="panel-logo">
            <img src={icon} alt="logo" width="20" height="20" style={{ borderRadius: "4px" }} />
            OmniContext.ai
          </div>
          <span className="panel-tagline">Debug smarter, Solve faster</span>
        </div>
        <nav className="panel-tabs">
          <button className={activeTab === "overview" ? "tab active" : "tab"} onClick={() => setActiveTab("overview")}>Overview</button>
          <button className={activeTab === "visual" ? "tab active" : "tab"} onClick={() => setActiveTab("visual")}>Visual</button>
          <button className={activeTab === "analysis" ? "tab active" : "tab"} onClick={() => setActiveTab("analysis")}>Analysis</button>
          <button className={activeTab === "history" ? "tab active" : "tab"} onClick={() => setActiveTab("history")}>History</button>
          <button className={activeTab === "settings" ? "tab active" : "tab"} onClick={() => setActiveTab("settings")}>Settings</button>
        </nav>
        <button className="pip-btn" title="Pop out (Picture-in-Picture)" onClick={openPiP}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><path d="M15 3h6v6" /><path d="M10 14 21 3" />
          </svg>
        </button>
      </header>

      <main className="panel-body">
        {activeTab === "overview" && (
          <Overview 
            context={pageContext} 
            summary={summary} 
            loading={loadingSummary} 
          />
        )}

        {activeTab === "visual" && (
          <VisualView />
        )}

        {activeTab === "settings" && (
          <div className="settings-wrapper">
             <SettingsView enabled={extensionEnabled} onToggle={handleToggleExtension} />
             <div style={{ padding: '0 16px' }}>
               <button className="learn-more-btn" onClick={() => setActiveTab("about")}>
                 Learn more about OmniContext.ai
               </button>
             </div>
          </div>
        )}

        {activeTab === "about" && (
          <AboutView onBack={() => setActiveTab("settings")} />
        )}

        {activeTab === "history" && (
          <HistoryView history={history} onClear={clearHistory} onSelect={async (item) => {
            setResult(item.result)
            setContext(item.context)
            setStatus("success")
            setActiveTab("analysis")

            const tid = activeTabIdRef.current
            if (tid !== null) {
              await storage.set(`lastResult_${tid}`, {
                result: item.result,
                context: item.context,
                timestamp: Date.now()
              })
            }
          }} />
        )}

        {activeTab === "analysis" && (
          <>
            {status === "idle" && <IdleView />}
            {status === "loading" && <LoadingView context={context} />}
            {status === "error" && <ErrorView message={errorMsg} />}
            {status === "success" && result && <ResultView result={result} context={context} />}
          </>
        )}
      </main>
    </div>
  )
}

// ─── Sub-views ────────────────────────────────────────────────────────────────

function IdleView() {
  return (
    <div className="idle-view">
      <div className="idle-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><circle cx="12" cy="17" r="0.5" fill="currentColor" />
        </svg>
      </div>
      <h2>Ready to Analyze</h2>
      <p>Navigate to a <strong>GitHub issue</strong> or <strong>Stack Overflow question</strong> and click the <span className="highlight-text">Explain with AI</span> button.</p>
    </div>
  )
}

function LoadingView({ context }: { context: ProcessedContext | null }) {
  return (
    <div className="loading-view">
      <div className="spinner-container">
        <div className="spinner" />
        <div className="spinner-ring" />
      </div>
      <h2>Analyzing…</h2>
      {context && (
        <div className="context-pill-row">
          {context.language !== "Unknown" && <span className="pill">{context.language}</span>}
          {context.framework !== "Unknown" && <span className="pill">{context.framework}</span>}
          <span className="pill">{context.errorType}</span>
        </div>
      )}
      <p className="loading-tip">Running AI reasoning agent on extracted context</p>
    </div>
  )
}

function ErrorView({ message }: { message: string }) {
  return (
    <div className="error-view">
      <div className="error-icon">⚠️</div>
      <h2>Analysis Failed</h2>
      <p className="error-message">{message}</p>
      <div className="error-help">
        <p><strong>Common causes:</strong></p>
        <ul>
          <li>Backend server is not running on port 3001</li>
          <li>Missing or invalid OpenAI API key</li>
          <li>Network connectivity issue</li>
        </ul>
        <p>Start the backend: <code>cd backend && npm start</code></p>
      </div>
    </div>
  )
}

function ResultView({ result, context }: { result: AnalysisResult; context: ProcessedContext | null }) {
  const [copiedFix, setCopiedFix] = useState(false)
  
  const isDoc = context?.pageType === "DOCS" || context?.pageType === "TUTORIAL"
  const isBug = !!context?.error || (context?.errorType && context.errorType !== "None")

  function copyCode() {
    navigator.clipboard.writeText(result.exampleCode)
    setCopiedFix(true)
    setTimeout(() => setCopiedFix(false), 2000)
  }

  return (
    <div className="result-view">
      <div className="result-intro">
        <h2 className="result-heading">{result.heading}</h2>
        <p className="result-summary">{result.summary}</p>
      </div>

      <div className="result-divider" />

      {context && (
        <div className="context-pill-row">
          <span className="pill pill-page">{context.pageType}</span>
          {context.language !== "Unknown" && <span className="pill">{context.language}</span>}
          {context.framework !== "Unknown" && <span className="pill">{context.framework}</span>}
        </div>
      )}

      {!isDoc && (
        <>
          <section className="result-section">
            <div className="section-header">
              <span className="section-icon">{isBug ? "🔴" : "📘"}</span>
              <h3>{isBug ? "Problem Detected" : "Code Purpose"}</h3>
            </div>
            <div className="section-body">
              <p>{result.problem}</p>
            </div>
          </section>

          <section className="result-section">
            <div className="section-header">
              <span className="section-icon">{isBug ? "🔍" : "⚙️"}</span>
              <h3>{isBug ? "Root Cause" : "Logic Breakdown"}</h3>
            </div>
            <div className="section-body">
              <p>{result.cause}</p>
            </div>
          </section>

          <section className="result-section">
            <div className="section-header">
              <span className="section-icon">{isBug ? "🔧" : "💡"}</span>
              <h3>{isBug ? "Suggested Fix" : "Implementation Patterns"}</h3>
            </div>
            <div className="section-body">
              <p>{result.fix}</p>
            </div>
          </section>
        </>
      )}

      {result.exampleCode && (
        <section className="result-section">
          <div className="section-header">
            <span className="section-icon">💻</span>
            <h3>{isBug ? "Corrected Code" : "Usage Example"}</h3>
            <button className="copy-btn" onClick={copyCode}>
              {copiedFix ? "✅ Copied" : "Copy"}
            </button>
          </div>
          <div className="code-block-wrapper">
            <pre><code>{result.exampleCode}</code></pre>
          </div>
        </section>
      )}

      {result.resources && result.resources.length > 0 && (
        <section className="result-section">
          <div className="section-header">
            <span className="section-icon">🔗</span>
            <h3>Related Resources</h3>
          </div>
          <div className="section-body resource-list">
            {result.resources.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="resource-link">
                {r.title}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15,3 21,3 21,9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function HistoryView({ history, onSelect, onClear }: { history: HistoryItem[]; onSelect: (item: HistoryItem) => void; onClear: () => void }) {
  return (
    <div className="history-view">
      <div className="history-header">
        <h2>Your History</h2>
        {history.length > 0 && (
          <button className="clear-btn" onClick={onClear}>Clear All</button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="history-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" />
          </svg>
          <p>No history yet. Your analyses will appear here.</p>
        </div>
      ) : (
        <div className="history-list">
          {history.map((item) => (
            <div key={item.id} className="history-item" onClick={() => onSelect(item)}>
              <div className="history-item-meta">
                <span className="history-item-tag">{item.context.pageType}</span>
                <span className="history-item-time">{new Date(item.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="history-item-title">{item.result.heading || item.result.problem}</div>
              <div className="history-item-footer">
                {item.context.language !== "Unknown" && <span>{item.context.language}</span>}
                {item.context.framework !== "Unknown" && <span> • {item.context.framework}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SettingsView({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div className="settings-view">
      <h2>Settings</h2>
      <div className="setting-row">
        <div className="setting-info">
          <strong>Extension Active</strong>
          <span>Show "Explain with AI" button on GitHub and Stack Overflow</span>
        </div>
        <button className={`toggle ${enabled ? "on" : "off"}`} onClick={onToggle} aria-label="toggle extension">
          <span className="toggle-thumb" />
        </button>
      </div>
      <div className="setting-note">
        <p>⚡ Backend endpoint: <code>http://localhost:3001</code></p>
        <p>🔐 Your API key is stored only on the server — never in the extension.</p>
      </div>
    </div>
  )
}
