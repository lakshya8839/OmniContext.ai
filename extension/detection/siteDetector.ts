/**
 * detection/siteDetector.ts
 * Pattern-based technical site detection.
 */

export type TechnicalContextType = "QUESTION" | "DOCS" | "TUTORIAL" | "CODE_VIEW" | "REPO_HOME" | "UNKNOWN"

export class SiteDetector {
  static detect(): TechnicalContextType {
    const text = document.body.innerText.toLowerCase()
    const url = window.location.href.toLowerCase()

    // 1. Repo Home patterns (GitHub specific)
    // github.com/user/repo or github.com/user/repo/tree/branch
    const githubRepoHomeRegex = /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9._-]+(\/tree\/[a-zA-Z0-9._\-\/]+)?\/?$/i
    if (githubRepoHomeRegex.test(window.location.href) && !url.includes("/blob/")) {
      if (document.querySelector(".repository-content")) return "REPO_HOME"
    }

    // 2. Code View patterns
    if (url.includes("/blob/") || url.includes("/src/") || !!document.querySelector(".blob-code, .line-numbers")) {
      return "CODE_VIEW"
    }

    // 2. Question patterns
    const questionKeywords = ["question", "asked", "problem", "how to", "why does", "error in"]
    if (questionKeywords.some(k => text.includes(k) && url.includes(k))) return "QUESTION"
    if (!!document.querySelector(".question, #question, .issue-body")) return "QUESTION"

    // 3. Documentation patterns
    const docsKeywords = ["documentation", "api reference", "guide", "usage", "parameters", "installation"]
    if (docsKeywords.some(k => url.includes(k) || text.includes(k))) return "DOCS"
    if (!!document.querySelector("nav, .sidebar") && !!document.querySelector("article, main")) return "DOCS"

    // 4. Tutorial patterns
    const tutorialKeywords = ["tutorial", "step-by-step", "lesson", "how to build", "learning"]
    if (tutorialKeywords.some(k => url.includes(k) || text.includes(k))) return "TUTORIAL"

    return "UNKNOWN"
  }
}
