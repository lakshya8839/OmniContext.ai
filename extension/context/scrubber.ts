/**
 * context/scrubber.ts
 * Removes sensitive information from text before sending to AI.
 */

export function scrubText(text: string): string {
  if (!text) return ""
  
  // Mask common API key patterns
  const apiKeyPattern = /(?:key|token|auth|password|secret|pwd)["']?\s*[:=]\s*["']?([a-zA-Z0-9-_.]{16,})["']?/gi
  let scrubbed = text.replace(apiKeyPattern, (match, key) => {
    return match.replace(key, "********")
  })

  // Mask potential bearer tokens
  const bearerPattern = /Bearer\s+[a-zA-Z0-9-_.]+/gi
  scrubbed = scrubbed.replace(bearerPattern, "Bearer ********")

  // Mask potential email addresses
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  scrubbed = scrubbed.replace(emailPattern, "[EMAIL]")

  return scrubbed
}
