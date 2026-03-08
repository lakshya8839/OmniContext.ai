/**
 * utils/contextProcessor.ts
 * Cleans and structures extracted context before sending to the backend.
 * Classifies error types and trims data to safe token limits.
 */

import type { ExtractedContext } from "./contextExtractor"

export interface ProcessedContext {
  pageType: string
  pageTitle: string
  url: string
  errorType: string
  error: string
  language: string
  framework: string
  codeSnippet: string
}

// Maximum character limits to avoid exceeding token budgets
const MAX_CODE_LENGTH = 1500
const MAX_ERROR_LENGTH = 300

/**
 * Transform a raw ExtractedContext into a ProcessedContext
 * ready to be sent to the /analyze backend endpoint.
 */
export function processContext(raw: ExtractedContext): ProcessedContext {
  const errorType = classifyError(raw.error || raw.rawText)

  return {
    pageType: raw.pageType,
    pageTitle: truncate(raw.pageTitle, 120),
    url: raw.url,
    errorType,
    error: truncate(raw.error, MAX_ERROR_LENGTH),
    language: raw.language || "Unknown",
    framework: raw.framework || "Unknown",
    codeSnippet: truncate(raw.codeSnippet, MAX_CODE_LENGTH),
  }
}

/**
 * Classify the category of error based on known patterns.
 * Returns a human-readable error type string.
 */
function classifyError(text: string): string {
  const lower = text.toLowerCase()

  if (lower.includes("hydration") || lower.includes("server render")) return "Hydration Mismatch"
  if (lower.includes("typeerror") || lower.includes("cannot read prop")) return "TypeError"
  if (lower.includes("referenceerror")) return "ReferenceError"
  if (lower.includes("syntaxerror")) return "SyntaxError"
  if (lower.includes("uncaught")) return "Uncaught Runtime Error"
  if (lower.includes("enoent") || lower.includes("no such file")) return "File Not Found"
  if (lower.includes("econnrefused") || lower.includes("network") || lower.includes("fetch failed")) return "Network Error"
  if (lower.includes("cors")) return "CORS Error"
  if (lower.includes("403") || lower.includes("401") || lower.includes("unauthorized")) return "Authentication / Authorization Error"
  if (lower.includes("404")) return "Not Found Error"
  if (lower.includes("500") || lower.includes("internal server")) return "Server Error"
  if (lower.includes("memory") || lower.includes("heap out")) return "Memory Error"
  if (lower.includes("timeout")) return "Timeout Error"
  if (lower.includes("import") || lower.includes("module not found")) return "Module Import Error"
  if (lower.includes("null") || lower.includes("undefined")) return "Null / Undefined Error"

  return "General Error"
}

function truncate(text: string, maxLength: number): string {
  if (!text) return ""
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + "..."
}
