/**
 * detection/codeDetector.ts
 * Robust code block discovery using DOM patterns and heuristics.
 */

export interface CodeBlock {
  language: string
  content: string
  lineCount: number
}

export class CodeDetector {
  static findBlocks(): CodeBlock[] {
    const blocks: CodeBlock[] = []
    
    // 1. Specialized check for GitHub blob views
    // Includes support for new React-based views (.react-file-line-contents)
    const blobLines = document.querySelectorAll(".blob-code-inner, .blob-code, .react-file-line-contents, .react-line-contents, [data-testid='code-cell']")
    
    if (blobLines.length > 0) {
      const fullCode = Array.from(blobLines)
        .map(line => {
          // Exclude any nested elements that might contain UI text (e.g. blame buttons)
          const clone = line.cloneNode(true) as HTMLElement
          clone.querySelectorAll(".blob-num, .blob-interaction-bar").forEach(e => e.remove())
          return clone.textContent || ""
        })
        .join("\n")
        .substring(0, 15000) // Slightly higher limit for full files
        
      if (fullCode.trim().length > 5) {
        blocks.push({
          language: this.guessLanguage(blobLines[0], fullCode),
          content: fullCode,
          lineCount: blobLines.length
        })
        return blocks
      }
    }

    // 2. Generic Scan - Refined to avoid UI buttons
    const selectors = ["pre code", "pre", ".highlight pre", ".syntax-highlight"]
    const elements = document.querySelectorAll(selectors.join(", "))

    elements.forEach(el => {
      // Security: Avoid extracting from buttons or tooltips that might have 'code' in the class
      if (el.matches("button, a, .tooltipped")) return
      if (el.closest("button, a, .dropdown-menu")) return

      const text = el.textContent?.trim() || ""
      if (text.length < 30) return // Skip tiny fragments
      
      blocks.push({
        language: this.guessLanguage(el, text),
        content: text.substring(0, 5000),
        lineCount: text.split("\n").length
      })
    })

    return blocks.slice(0, 5) // Return top 5 blocks
  }

  private static guessLanguage(el: Element, text: string): string {
    // 1. Check classes (e.g., language-js, hljs-python)
    const classList = Array.from(el.classList).join(" ")
    const langMatch = classList.match(/language-([a-z]+)/i) || classList.match(/hljs-([a-z]+)/i)
    if (langMatch) return langMatch[1]

    // 2. Simple Heuristics
    if (text.includes("import ") && text.includes("from '")) return "javascript/typescript"
    if (text.includes("def ") && text.includes(":")) return "python"
    if (text.includes("class ") && text.includes("public static void")) return "java"
    if (text.includes("func ") && text.includes("package ")) return "go"
    
    return "Unknown"
  }
}
