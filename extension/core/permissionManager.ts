/**
 * core/permissionManager.ts
 * Manages domain-based permissions for AI Context Layer activity.
 */

import { Storage } from "@plasmohq/storage"

const storage = new Storage({ area: "local" })

export class PermissionManager {
  private static readonly DEFAULT_BLOCKED = [
    "bank", "paypal", "stripe", "checkout", "finance", "login", "signin", "signup"
  ]

  static async isAllowed(url: string): Promise<boolean> {
    try {
      const domain = new URL(url).hostname.toLowerCase()
      
      // 1. Check user explicit blocklist
      const blocklist = await storage.get<string[]>("blocked_domains") || []
      if (blocklist.some(d => domain.includes(d.toLowerCase()))) return false

      // 2. Check default sensitive patterns
      if (this.DEFAULT_BLOCKED.some(p => domain.includes(p))) return false

      // 3. Check user explicit whitelist (if they opted for whitelist-only mode)
      const whitelistOnly = await storage.get<boolean>("whitelist_only_mode") || false
      if (whitelistOnly) {
        const whitelist = await storage.get<string[]>("allowed_domains") || []
        return whitelist.some(d => domain.includes(d.toLowerCase()))
      }

      return true
    } catch {
      return false
    }
  }

  static async blockDomain(domain: string) {
    const list = await storage.get<string[]>("blocked_domains") || []
    if (!list.includes(domain)) {
      await storage.set("blocked_domains", [...list, domain])
    }
  }

  static async allowDomain(domain: string) {
    const list = await storage.get<string[]>("allowed_domains") || []
    if (!list.includes(domain)) {
      await storage.set("allowed_domains", [...list, domain])
    }
  }
}
