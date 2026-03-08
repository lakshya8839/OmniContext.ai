import React, { useState } from "react"
import { Storage } from "@plasmohq/storage"

const storage = new Storage({ area: "local" })
const BACKEND_URL = "http://localhost:3001"

export function VisualView() {
  const [status, setStatus] = useState<"idle" | "capturing" | "analyzing" | "success" | "error">("idle")
  const [image, setImage] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleVisualAnalysis() {
    setStatus("capturing")
    setError(null)
    setResult(null)

    try {
      // 1. Tell content script to show animation
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) throw new Error("No active tab")

      await chrome.tabs.sendMessage(tab.id, { type: "SHOW_SCAN_ANIMATION" })

      // 2. Capture screen via background
      const response = await chrome.runtime.sendMessage({ type: "CAPTURE_SCREEN" })
      if (!response.success) throw new Error(response.error || "Capture failed")

      setImage(response.dataUrl)
      setStatus("analyzing")

      // 3. Send to backend multimodal endpoint
      const aiResponse = await fetch(`${BACKEND_URL}/analyze-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: response.dataUrl })
      })

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json().catch(() => ({}))
        throw new Error(errorData.error || `AI analysis failed with status ${aiResponse.status}`)
      }
      
      const data = await aiResponse.json()
      setResult(data)
      setStatus("success")
    } catch (err: any) {
      console.error("Visual analysis error:", err)
      setError(err.message)
      setStatus("error")
    }
  }

  return (
    <div className="visual-view">
      <div className="visual-hero">
        <div className="visual-icon-glow">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
        <h2>Visual Context</h2>
        <p>Analyze the whole page visually to extract code, logic, and UI structures.</p>
        
        <button 
          className={`scan-btn ${status === 'capturing' || status === 'analyzing' ? 'busy' : ''}`}
          onClick={handleVisualAnalysis}
          disabled={status === 'capturing' || status === 'analyzing'}
        >
          {status === 'capturing' ? 'Capturing...' : status === 'analyzing' ? 'AI Reasoning...' : 'Start Visual Scan'}
        </button>
      </div>

      {status === "error" && (
        <div className="visual-error">
          <div className="error-header">
            <span>⚠️</span> <strong>Analysis Failed</strong>
          </div>
          <div className="error-body">{error}</div>
        </div>
      )}

      {/* Preview of captured image */}
      {image && (
        <div className="visual-preview-container">
          <h4>Captured Context</h4>
          <div className="visual-preview-frame">
            <img src={image} alt="scan preview" className="scan-preview-img" />
            {(status === 'capturing' || status === 'analyzing') && (
              <div className="scan-loader-overlay">
                <div className="pulse-circle"></div>
                <span>{status === 'capturing' ? 'Capturing...' : 'Analyzing View...'}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {(status === "success" || status === "analyzing") && result && (
        <div className="visual-result">
          <section className="result-section">
            <div className="section-header">
              <span className="section-icon">👁️</span>
              <h3>Observation</h3>
            </div>
            <div className="section-body">
              <p>{result.observation}</p>
            </div>
          </section>

          {result.extractedCode && (
            <section className="result-section">
              <div className="section-header">
                <span className="section-icon">💻</span>
                <h3>Extracted Code</h3>
              </div>
              <div className="section-body">
                <div className="code-block-wrapper">
                  <pre><code>{result.extractedCode}</code></pre>
                </div>
              </div>
            </section>
          )}

          <section className="result-section">
             <div className="section-header">
              <span className="section-icon">💡</span>
              <h3>AI Insights</h3>
            </div>
            <div className="section-body">
              <p>{result.insights}</p>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
