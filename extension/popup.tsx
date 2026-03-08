/**
 * popup.tsx
 * Minimal extension popup UI shown when user clicks the toolbar icon.
 * Lets users quickly enable/disable the extension and open settings.
 */

import { useEffect, useState } from "react"
import { Storage } from "@plasmohq/storage"
import icon from "url:./assets/icon.png"

const storage = new Storage({ area: "local" })

export default function Popup() {
  const [enabled, setEnabled] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    storage.get("extension_enabled").then((val) => {
      setEnabled(!!val)
      setLoaded(true)
    })
  }, [])

  async function toggleEnabled() {
    const next = !enabled
    await storage.set("extension_enabled", next)
    setEnabled(next)
  }

  if (!loaded) return null

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={styles.logo}>
          <img src={icon} alt="logo" width="18" height="18" style={{ borderRadius: "3px" }} />
          OmniContext.ai
        </div>
      </div>

      <div style={styles.body}>
        <div style={styles.row}>
          <div style={styles.info}>
            <strong style={styles.label}>{enabled ? "Active" : "Inactive"}</strong>
            <span style={styles.hint}>GitHub · Stack Overflow</span>
          </div>
          <button
            onClick={toggleEnabled}
            style={{ ...styles.toggle, background: enabled ? "#6366f1" : "#334155" }}
            aria-label="Toggle extension"
          >
            <span style={{ ...styles.thumb, left: enabled ? "21px" : "3px" }} />
          </button>
        </div>

        <p style={styles.note}>
          {enabled
            ? '✅ Click "Explain with AI" on any supported page.'
            : '⭕ Enable to see the "Explain with AI" button on supported pages.'}
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: "280px",
    background: "#0d0d14",
    color: "#e2e8f0",
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: "13px",
    borderRadius: "0",
    overflow: "hidden",
  },
  header: {
    padding: "14px 16px",
    borderBottom: "1px solid rgba(99,102,241,0.15)",
    background: "rgba(10,10,20,0.95)",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: 700,
    fontSize: "0.9rem",
    background: "linear-gradient(135deg, #6366f1, #a78bfa)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  body: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
  info: { display: "flex", flexDirection: "column", gap: "2px" },
  label: { fontSize: "0.88rem", color: "#e2e8f0" },
  hint: { fontSize: "0.74rem", color: "#64748b" },
  toggle: {
    width: "42px", height: "22px",
    border: "none",
    borderRadius: "11px",
    cursor: "pointer",
    position: "relative",
    transition: "background 0.3s",
    flexShrink: 0,
  },
  thumb: {
    position: "absolute",
    top: "2px",
    width: "18px", height: "18px",
    background: "#fff",
    borderRadius: "50%",
    transition: "left 0.3s",
    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
  },
  note: { fontSize: "0.78rem", color: "#64748b", lineHeight: 1.5 },
}
