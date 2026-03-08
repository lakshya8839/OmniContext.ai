/**
 * core/securitySanitizer.ts
 * Enhanced security layer to remove PII and secrets from technical content.
 */

export class SecuritySanitizer {
  private static readonly PATTERNS = {
    apiKey: /(?:key|token|auth|password|secret|pwd)["']?\s*[:=]\s*["']?([a-zA-Z0-9-_.]{16,})["']?/gi,
    bearer: /Bearer\s+[a-zA-Z0-9-_.]+/gi,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    basicAuth: /https?:\/\/[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+/gi,
    ipV4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
  }

  static sanitize(text: string): string {
    if (!text) return ""
    
    let sanitized = text
    
    // Mask API Keys and Secrets
    sanitized = sanitized.replace(this.PATTERNS.apiKey, (match, key) => {
      return match.replace(key, "********")
    })

    // Mask Bearer Tokens
    sanitized = sanitized.replace(this.PATTERNS.bearer, "Bearer ********")

    // Mask Emails
    sanitized = sanitized.replace(this.PATTERNS.email, "[EMAIL_REDACTED]")

    // Mask Basic Auth in URLs
    sanitized = sanitized.replace(this.PATTERNS.basicAuth, (match) => {
      const url = new URL(match)
      return `${url.protocol}//[CREDENTIALS_REDACTED]@${url.hostname}`
    })

    return sanitized
  }
}
