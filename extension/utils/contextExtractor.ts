/**
 * utils/contextExtractor.ts
 * Extracts relevant developer context from supported web pages.
 * Supports GitHub and Stack Overflow.
 */

export interface ExtractedContext {
  pageType: string
  pageTitle: string
  url: string
  error: string
  language: string
  framework: string
  codeSnippet: string
  rawText: string
}

/**
 * Main entry point – detects the current page type and calls the
 * appropriate extractor.
 */
export function extractContext(): ExtractedContext {
  const url = window.location.href
  const pageTitle = document.title

  if (url.includes("github.com")) {
    return extractGitHubContext(url, pageTitle)
  } else if (url.includes("stackoverflow.com")) {
    return extractStackOverflowContext(url, pageTitle)
  }

  return buildEmptyContext(pageTitle, url, "Unknown")
}

// ─── GitHub extractor ───────────────────────────────────────────────────────

function extractGitHubContext(url: string, pageTitle: string): ExtractedContext {
  let pageType = "GitHub Page"
  if (url.includes("/issues/")) pageType = "GitHub Issue"
  else if (url.includes("/pull/")) pageType = "GitHub Pull Request"
  else if (url.includes("/blob/")) pageType = "GitHub File View"

  // Extract the programming language from the language badge
  const langBadge =
    document.querySelector('[data-hovercard-type="language"]') ||
    document.querySelector(".repository-lang-stats-graph") ||
    document.querySelector('[class*="color-fg-default"][class*="d-inline"]')

  const language = langBadge?.textContent?.trim() || detectLanguageFromExtension(url) || "Unknown"

  // Extract all code blocks on the page
  const codeBlocks = Array.from(
    document.querySelectorAll("pre, .blob-code, .highlight pre, .js-file-line-container")
  )
  const codeSnippet = codeBlocks
    .slice(0, 3) // take at most 3 blocks to avoid prompt overload
    .map((el) => el.textContent?.trim() || "")
    .filter(Boolean)
    .join("\n\n---\n\n")
    .substring(0, 2000)

  // Extract error-like content from issue body / comments
  const issueBody =
    document.querySelector(".markdown-body, .comment-body, [data-testid='issue-body']")
  const rawText = issueBody?.textContent?.trim() || document.body.innerText.substring(0, 3000)
  const error = extractErrorMessage(rawText)
  const framework = detectFramework(rawText + " " + codeSnippet)

  return { pageType, pageTitle, url, error, language, framework, codeSnippet, rawText: rawText.substring(0, 3000) }
}

// ─── Stack Overflow extractor ────────────────────────────────────────────────

function extractStackOverflowContext(url: string, pageTitle: string): ExtractedContext {
  const pageType = "Stack Overflow Question"

  // Tags tell us language and framework
  const tags = Array.from(document.querySelectorAll(".post-tag, [rel='tag']"))
    .map((el) => el.textContent?.trim() || "")
    .filter(Boolean)

  const language = detectLanguageFromTags(tags) || "Unknown"
  const framework = detectFrameworkFromTags(tags) || detectFramework(document.body.innerText.substring(0, 2000))

  // Question body + accepted answer
  const questionBody = document.querySelector(".question .post-text, .question .s-prose")
  const acceptedAnswer = document.querySelector(".accepted-answer .post-text, .accepted-answer .s-prose")
  const rawText =
    (questionBody?.textContent?.trim() || "") +
    "\n\n" +
    (acceptedAnswer?.textContent?.trim() || "")

  // Code blocks inside the question
  const codeBlocks = Array.from(
    document.querySelectorAll(".question pre code, .question .s-prose pre code")
  )
  const codeSnippet = codeBlocks
    .slice(0, 3)
    .map((el) => el.textContent?.trim() || "")
    .filter(Boolean)
    .join("\n\n---\n\n")
    .substring(0, 2000)

  const error = extractErrorMessage(rawText)

  return { pageType, pageTitle, url, error, language, framework, codeSnippet, rawText: rawText.substring(0, 3000) }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Attempt to pull an error message from a block of text.
 * Looks for common error patterns.
 */
function extractErrorMessage(text: string): string {
  const errorPatterns = [
    /Error[:\s][^\n]{10,200}/gi,
    /Exception[:\s][^\n]{10,200}/gi,
    /failed[:\s][^\n]{10,200}/gi,
    /cannot[^\n]{10,200}/gi,
    /TypeError[^\n]{10,200}/gi,
    /SyntaxError[^\n]{10,200}/gi,
    /ReferenceError[^\n]{10,200}/gi,
    /Uncaught[^\n]{10,200}/gi,
    /ENOENT[^\n]{10,200}/gi,
    /ECONNREFUSED[^\n]{10,200}/gi,
    /hydration[^\n]{10,200}/gi,
  ]

  for (const pattern of errorPatterns) {
    const match = text.match(pattern)
    if (match && match[0]) {
      return match[0].trim().substring(0, 300)
    }
  }

  // Fallback: first meaningful sentence
  return text.split(/[.\n]/).find((s) => s.trim().length > 20)?.trim().substring(0, 300) || "No specific error detected"
}

/** Detect framework from combined text */ 
function detectFramework(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes("next.js") || lower.includes("nextjs")) return "Next.js"
  if (lower.includes("react")) return "React"
  if (lower.includes("vue")) return "Vue.js"
  if (lower.includes("angular")) return "Angular"
  if (lower.includes("svelte")) return "Svelte"
  if (lower.includes("django")) return "Django"
  if (lower.includes("flask")) return "Flask"
  if (lower.includes("express")) return "Express.js"
  if (lower.includes("laravel")) return "Laravel"
  if (lower.includes("spring")) return "Spring"
  return "Unknown"
}

/** Detect primary language from Stack Overflow tags */
function detectLanguageFromTags(tags: string[]): string {
  const langMap: Record<string, string> = {
    javascript: "JavaScript", typescript: "TypeScript", python: "Python",
    java: "Java", "c#": "C#", cpp: "C++", go: "Go", rust: "Rust",
    php: "PHP", ruby: "Ruby", swift: "Swift", kotlin: "Kotlin",
  }
  for (const tag of tags) {
    const mapped = langMap[tag.toLowerCase()]
    if (mapped) return mapped
  }
  return ""
}

/** Detect framework from SO tags */
function detectFrameworkFromTags(tags: string[]): string {
  const fwMap: Record<string, string> = {
    "next.js": "Next.js", nextjs: "Next.js", react: "React", "react.js": "React",
    vue: "Vue.js", "vue.js": "Vue.js", angular: "Angular", svelte: "Svelte",
    django: "Django", flask: "Flask", express: "Express.js", laravel: "Laravel",
    spring: "Spring", "asp.net": "ASP.NET",
  }
  for (const tag of tags) {
    const mapped = fwMap[tag.toLowerCase()]
    if (mapped) return mapped
  }
  return ""
}

/** Guess language from GitHub file extension in URL */
function detectLanguageFromExtension(url: string): string {
  const extMap: Record<string, string> = {
    ts: "TypeScript", tsx: "TypeScript", js: "JavaScript", jsx: "JavaScript",
    py: "Python", java: "Java", cs: "C#", go: "Go", rs: "Rust",
    php: "PHP", rb: "Ruby", swift: "Swift", kt: "Kotlin", cpp: "C++", c: "C",
  }
  const match = url.match(/\.([a-zA-Z]+)(?:\?|#|$)/)
  if (match) return extMap[match[1].toLowerCase()] || ""
  return ""
}

function buildEmptyContext(pageTitle: string, url: string, pageType: string): ExtractedContext {
  return { pageType, pageTitle, url, error: "", language: "", framework: "", codeSnippet: "", rawText: "" }
}
