/**
 * storage/sessionContext.ts
 * Tracks developer workflow history for Context Fusion.
 */

import { Storage } from "@plasmohq/storage"

const storage = new Storage({ area: "local" })

export interface SessionEntry {
  url: string
  title: string
  type: string
  timestamp: number
}

export class SessionContext {
  private static readonly MAX_ENTRIES = 10

  static async track(url: string, title: string, type: string) {
    const history = await storage.get<SessionEntry[]>("session_history") || []
    
    // Avoid duplicate pulses for the same URL
    if (history[0]?.url === url) return

    const newEntry: SessionEntry = {
      url,
      title,
      type,
      timestamp: Date.now()
    }

    const updated = [newEntry, ...history].slice(0, this.MAX_ENTRIES)
    await storage.set("session_history", updated)
  }

  static async getHistory(): Promise<SessionEntry[]> {
    return await storage.get<SessionEntry[]>("session_history") || []
  }

  static async clear() {
    await storage.remove("session_history")
  }
}
