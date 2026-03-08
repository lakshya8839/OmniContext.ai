/**
 * sidepanel/views/AboutView.tsx
 */
import React from "react"

export function AboutView({ onBack }: { onBack: () => void }) {
  return (
    <div className="about-view">
      <div className="about-header">
        <button className="back-link" onClick={onBack}>← Back to Settings</button>
        <h2>About OmniContext.ai</h2>
      </div>

      <section className="about-section">
        <h3>Mission</h3>
        <p>
          OmniContext.ai is a <strong>Universal AI Context Layer</strong> for developers. 
          Its goal is to reduce context-switching by understanding exactly what you're working 
          on—whether it's a GitHub issue, API documentation, or a Stack Overflow question—and 
          providing instant assistance right where you are.
        </p>
        <p style={{ marginTop: '12px', color: '#a78bfa', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Debug smarter, Solve faster
        </p>
      </section>

      <section className="about-section security-box">
        <h3>🔒 Privacy-First Security</h3>
        <p>
          Your security is our priority. Every piece of data extracted from a page passes through 
          our <strong>local Security Sanitizer</strong> before being processed:
        </p>
        <ul>
          <li><strong>API Keys & Tokens:</strong> Automatically masked locally.</li>
          <li><strong>Credentials:</strong> Basic Auth and Bearer tokens are redacted.</li>
          <li><strong>Sensitive Info:</strong> Emails and IP addresses are scrubbed.</li>
          <li><strong>Domain Control:</strong> Extension activity is automatically disabled on banking and finance sites.</li>
        </ul>
      </section>

      <section className="about-section">
        <h3>How it Works</h3>
        <p>
          The extension uses pattern-based recognition to categorize websites as Documentation, 
          Questions, or Tutorials. It "fuses" your recent session history to understand your 
          entire workflow, providing coherent answers that connect multiple tabs.
        </p>
      </section>

      <div className="about-footer">
        <span>Version 0.2.0 (Premium Architecture)</span>
      </div>
    </div>
  )
}
