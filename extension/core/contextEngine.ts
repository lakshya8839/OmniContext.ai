/**
 * core/contextEngine.ts
 * Universal context extraction engine.
 */

import { SiteDetector, type TechnicalContextType } from "../detection/siteDetector"
import { CodeDetector, type CodeBlock } from "../detection/codeDetector"

export interface PageContext {
  pageType: TechnicalContextType
  title: string
  url: string
  language: string
  mainContent: string
  codeBlocks: CodeBlock[]
  codeSnippet: string
  filename: string
  error?: string
  errorType: string
}

export class ContextEngine {
  static async detect(): Promise<PageContext> {
    const pageType = SiteDetector.detect()
    const codeBlocks = CodeDetector.findBlocks()
    
    // Select the primary code snippet
    const codeSnippet = codeBlocks[0]?.content || ""
    const language = codeBlocks[0]?.language || "Unknown"

    return {
      pageType,
      title: document.title,
      url: window.location.href,
      language,
      mainContent: this.extractMainContent(),
      codeBlocks,
      codeSnippet,
      filename: this.extractFilename(),
      errorType: this.detectErrorType(pageType),
      error: this.extractError(pageType)
    }
  }

  private static detectErrorType(type: TechnicalContextType): string {
    if (type === "QUESTION") return "Bug Report"
    const text = document.body.innerText.toLowerCase()
    if (text.includes("error") || text.includes("exception") || text.includes("fail")) return "Technical Issue"
    return "None"
  }

  private static extractError(type: TechnicalContextType): string {
    if (type === "QUESTION") {
      const title = document.querySelector(".js-issue-title, #question-header")?.textContent?.trim() || ""
      return title
    }
    return ""
  }

  private static extractFilename(): string {
    // GitHub: "repo/file.py at main · user/repo"
    // Generic: usually the first part of title or h1
    const title = document.title
    const parts = title.split(" ")
    for (const part of parts) {
      if (part.includes(".") && part.length > 3) return part
    }
    return "Unknown File"
  }

  private static extractMainContent(): string {
    const pageType = SiteDetector.detect()
    
    if (pageType === "REPO_HOME") {
      const readme = document.querySelector("#readme article")?.textContent?.trim() || ""
      const files = Array.from(document.querySelectorAll(".Box-row, [role='row'].react-directory-row"))
        .map(row => (row as HTMLElement).innerText.split("\n")[0].trim())
        .filter(name => name && !name.includes(".."))
        .join(", ")
      
      return `REPOSIORY FILES: ${files}\n\nREADME CONTENT:\n${readme.substring(0, 3000)}`
    }

    const main = document.querySelector("article, main, #content, .post-text, .s-prose, .markdown-body")
    return (main?.textContent || document.body.innerText).trim().substring(0, 5000)
  }
}
