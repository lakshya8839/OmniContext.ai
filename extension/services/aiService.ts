/**
 * services/aiService.ts
 * Low-level API client for the backend AI services.
 */

const BACKEND_URL = "http://localhost:3001"

export interface AIResponse {
  problem?: string
  cause?: string
  fix?: string
  exampleCode?: string
  summary?: string
  keyPoints?: string[]
  toolsOutput?: any
  error?: string
}

export async function callAI(type: 'analyze' | 'summarize' | 'tool', payload: any): Promise<AIResponse> {
  const endpoint = type
  
  try {
    const response = await fetch(`${BACKEND_URL}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`AI Service error: ${response.status}`)
    }

    return await response.json()
  } catch (err: any) {
    console.error(`[OmniContext.ai] AI call failed (${type}):`, err)
    return { error: err.message }
  }
}
