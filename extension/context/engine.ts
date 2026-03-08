/**
 * context/engine.ts
 * Next-gen context engine for OmniContext.ai
 */

import { scrubText } from "./scrubber"

export type PageContextType = "GITHUB_ISSUE" | "GITHUB_REPO" | "GITHUB_PR" | "STACKOVERFLOW" | "DOCS" | "CODE" | "UNKNOWN"

export interface PageContext {
  type: PageContextType
  title: string
  url: string
  language: string
  framework: string
  mainContent: string
  codeSnippet: string
  metadata: Record<string, any>
}

export class ContextEngine {
  static async detect(): Promise<PageContext> {
    const url = window.location.href
    const title = document.title
    
    let context: PageContext = {
      type: "UNKNOWN",
      title,
      url,
      language: "Unknown",
      framework: "Unknown",
      mainContent: "",
      codeSnippet: "",
      metadata: {}
    }

    if (url.includes("github.com")) {
      context = await this.extractGitHub(context)
    } else if (url.includes("stackoverflow.com")) {
      context = await this.extractStackOverflow(context)
    } else if (this.isLikelyDocs()) {
      context = await this.extractDocs(context)
    } else {
      context = await this.extractGeneric(context)
    }

    // Security: Scrub sensitive data
    context.mainContent = scrubText(context.mainContent.substring(0, 5000))
    context.codeSnippet = scrubText(context.codeSnippet.substring(0, 3000))

    return context
  }

  private static async extractGitHub(ctx: PageContext): Promise<PageContext> {
    const url = ctx.url
    if (url.includes("/issues/")) ctx.type = "GITHUB_ISSUE"
    else if (url.includes("/pull/")) ctx.type = "GITHUB_PR"
    else if (url.split("/").length <= 5) ctx.type = "GITHUB_REPO"
    else ctx.type = "CODE"

    const body = document.querySelector(".markdown-body, .comment-body, [data-testid='issue-body']")
    ctx.mainContent = body?.textContent?.trim() || document.body.innerText

    const codeBlocks = Array.from(document.querySelectorAll("pre, .blob-code"))
    ctx.codeSnippet = codeBlocks.slice(0, 3).map(b => b.textContent?.trim()).join("\n\n---\n\n")

    return ctx
  }

  private static async extractStackOverflow(ctx: PageContext): Promise<PageContext> {
    ctx.type = "STACKOVERFLOW"
    const body = document.querySelector(".question .s-prose")
    const answer = document.querySelector(".accepted-answer .s-prose")
    ctx.mainContent = (body?.textContent?.trim() || "") + "\n\n" + (answer?.textContent?.trim() || "")
    
    const code = document.querySelector(".question pre code")
    ctx.codeSnippet = code?.textContent?.trim() || ""
    
    return ctx
  }

  private static isLikelyDocs(): boolean {
    const keywords = ["docs.", "documentation", "/docs/", "guide", "reference", "api-reference"]
    return keywords.some(k => window.location.href.toLowerCase().includes(k)) || 
           !!document.querySelector("nav, .sidebar") && !!document.querySelector("article, main")
  }

  private static async extractDocs(ctx: PageContext): Promise<PageContext> {
    ctx.type = "DOCS"
    const article = document.querySelector("article, main, .content, #content")
    ctx.mainContent = article?.textContent?.trim() || document.body.innerText
    return ctx
  }

  private static async extractGeneric(ctx: PageContext): Promise<PageContext> {
    const hasCode = !!document.querySelector("pre, code")
    if (hasCode) ctx.type = "CODE"
    ctx.mainContent = document.body.innerText
    return ctx
  }
}
