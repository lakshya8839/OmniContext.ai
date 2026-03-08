/**
 * sidepanel/views/Overview.tsx
 */
import React from "react"
import type { PageContext } from "../../core/contextEngine"

interface OverviewProps {
  context: PageContext | null
  summary: string | null
  loading: boolean
}

export function Overview({ context, summary, loading }: OverviewProps) {
  if (!context) return null

  return (
    <div className="overview-container">
      <div className="context-banner">
        <span className="context-type">{context.pageType.replace("_", " ")}</span>
        <span className="context-badge">{context.language}</span>
      </div>
      
      <h3>Smart Summary</h3>
      {loading ? (
        <div className="placeholder-text pulse">Generating contextual overview...</div>
      ) : (
        <div className="summary-content">
          {summary || "No summary available for this page."}
        </div>
      )}

      {context.pageType === "CODE_VIEW" && (
        <div className="repo-actions">
          <button className="action-pill">Explain Logic</button>
          <button className="action-pill">Find Bugs</button>
        </div>
      )}
    </div>
  )
}
