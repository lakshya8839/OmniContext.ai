/**
 * tabs/welcome.tsx
 * Onboarding welcome page opened automatically on first extension install.
 * Saves extension_enabled flag to storage when user clicks "Enable".
 */

import { useEffect, useState } from "react"
import { Storage } from "@plasmohq/storage"
import icon from "url:../assets/icon.png"
import "./welcome.css"

const storage = new Storage({ area: "local" })

export default function WelcomePage() {
  const [status, setStatus] = useState<"idle" | "enabled" | "dismissed">("idle")

  useEffect(() => {
    document.title = "OmniContext.ai"
  }, [])

  async function handleEnable() {
    await storage.set("extension_enabled", true)
    setStatus("enabled")
  }

  function handleDismiss() {
    setStatus("dismissed")
  }

  return (
    <div className="welcome-root">
      {/* Background blobs */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />

      <div className="welcome-card">
        {/* Logo */}
        <div className="logo-ring">
          <img src={icon} alt="logo" width="40" height="40" style={{ borderRadius: "8px" }} />
        </div>

        <h1 className="welcome-title">OmniContext.ai</h1>
        <p className="welcome-subtitle">Your AI-powered developer debugging assistant</p>

        <ul className="feature-list">
          <li>
            <span className="feature-icon">🔍</span>
            <span>Detects errors and code context on GitHub & Stack Overflow</span>
          </li>
          <li>
            <span className="feature-icon">🤖</span>
            <span>Sends context to an AI agent that explains root causes</span>
          </li>
          <li>
            <span className="feature-icon">🔧</span>
            <span>Suggests fixes and improved code examples instantly</span>
          </li>
          <li>
            <span className="feature-icon">🔒</span>
            <span>Never analyzes a page without your explicit click — privacy first</span>
          </li>
        </ul>

        <p className="privacy-note">
          OmniContext.ai will only analyze pages <strong>when you click "Explain with AI"</strong>. No data is sent automatically.
        </p>

        {status === "idle" && (
          <div className="button-row">
            <button className="btn-primary" onClick={handleEnable}>
              Enable OmniContext.ai
            </button>
            <button className="btn-secondary" onClick={handleDismiss}>
              Not Now
            </button>
          </div>
        )}

        {status === "enabled" && (
          <div className="success-banner">
            <span className="success-icon">✅</span>
            <div>
              <strong>Extension enabled!</strong>
              <p>Visit any GitHub issue or Stack Overflow question and click the purple button to start analyzing.</p>
            </div>
          </div>
        )}

        {status === "dismissed" && (
          <div className="dismissed-banner">
            <p>No worries! You can enable it anytime from the extension popup.</p>
          </div>
        )}
      </div>

      <footer className="welcome-footer">
        Built with Plasmo · React · OpenAI
      </footer>
    </div>
  )
}
