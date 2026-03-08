/**
 * core/aiOrchestrator.ts
 * Orchestrates AI requests, manages prompts, and handles context fusion.
 */

import { SecuritySanitizer } from "./securitySanitizer"
import { callAI, type AIResponse } from "../services/aiService"
import { Storage } from "@plasmohq/storage"

const storage = new Storage({ area: "local" })

export interface OrchestrationResult extends AIResponse {
  sanitized: boolean
}

export class AIOrchestrator {
  static async processContext(type: 'analyze' | 'summarize', context: any): Promise<OrchestrationResult> {
    // 1. Fuse with session memory if available
    const sessionMemory = await storage.get<any[]>("session_context") || []
    const fusedContext = {
      ...context,
      workflowHistory: sessionMemory.slice(-3).map(m => m.url)
    }

    // 2. Sanitize inputs
    const sanitizedContent = SecuritySanitizer.sanitize(context.mainContent || "")
    const sanitizedCode = SecuritySanitizer.sanitize(context.codeSnippet || "")

    // 3. Call Service
    const payload = {
      ...fusedContext,
      pageType: context.pageType, // Map 'pageType' to backend 'pageType'
      mainContent: sanitizedContent,
      codeSnippet: sanitizedCode
    }

    const response = await callAI(type, payload)

    return {
      ...response,
      sanitized: true
    }
  }
}
