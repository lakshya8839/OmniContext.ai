/**
 * backend/server.js
 * Express API server for OmniContext.ai.
 * Exposes POST /analyze which calls the Google Gemini API and returns a structured fix.
 * (Forced update to reload environment variables)
 */

require("dotenv").config()

const express = require("express")
const cors = require("cors")
const { GoogleGenerativeAI } = require("@google/generative-ai")

const app = express()
const PORT = process.env.PORT || 3001

// ─── Middlewares ──────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: "*", // Chrome extensions call from chrome-extension:// scheme
    methods: ["POST", "GET"],
    allowedHeaders: ["Content-Type"],
  })
)
app.use(express.json({ limit: "10mb" }))

// ─── Gemini client ────────────────────────────────────────────────────────────

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

/**
 * POST /summarize
 * Body: { context }
 * Returns: { summary, keyPoints }
 */
app.post("/summarize", async (req, res) => {
  const { context } = req.body
  if (!context) return res.status(400).json({ error: "Context is required" })

  const prompt = `You are an expert developer assistant. 
Analyze the following context from a ${context.type} page:
${context.mainContent}

Provide a concise 3-sentence summary of the page and 3 key technical points as a JSON object:
{
  "summary": "...",
  "keyPoints": ["...", "...", "..."]
}`

  try {
    const model = ai.getGenerativeModel({ model: "gemma-3-27b-it" })
    const result = await model.generateContent(prompt)
    const raw = result.response.text()
    const clean = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim()
    return res.json(JSON.parse(clean))
  } catch (err) {
    console.error("[OmniContext.ai] Summarize error:", err)
    res.status(500).json({ error: "Summarization failed" })
  }
})


/**
 * POST /analyze
 * Body: { error, framework, language, codeSnippet, pageType?, errorType? }
 * Returns: { problem, cause, fix, exampleCode, resources }
 */
app.post("/analyze", async (req, res) => {
  const { error, framework, language, codeSnippet, pageType, mainContent } = req.body

  const isDoc = pageType === "DOCS" || pageType === "TUTORIAL" || pageType === "CODE_VIEW"

  // Basic validation - check if we have enough to work with
  if (!error && !codeSnippet && !mainContent) {
    return res.status(400).json({
      error: "No context content extracted to analyze.",
    })
  }

  if (pageType === "REPO_HOME") {
    systemPrompt = `You are an expert software architect.
Analyze the repository's file structure and README content to provide an architectural overview.
Return valid JSON only:
{
  "heading": "Professional title (e.g., 'Project Architecture: [Name]')",
  "summary": "High-level summary of the codebase's purpose and tech stack (2-3 sentences)",
  "problem": "Main architectural approach or primary goal of the project",
  "cause": "Key implementation details and repository organization (3-5 sentences)",
  "fix": "Notable architectural patterns or potential codebase improvements",
  "exampleCode": "Representative implementation pattern snippet or structure diagram",
  "resources": [{ "title": "Main Repository", "url": "..." }]
}`
    userPrompt = `Repository Context:\n${mainContent}\nPerform an architectural report.`
  } else if (pageType === "CODE_VIEW") {
    systemPrompt = `You are an expert code reviewer and architect.
Analyze the source code provided and provide a technical breakdown.
Return valid JSON only:
{
  "heading": "Clear, descriptive title for the analysis",
  "summary": "High-level summary of what this file does (2-3 sentences)",
  "problem": "Main purpose or core logic of this file",
  "cause": "Architectural overview and implementation details (3-5 sentences)",
  "fix": "Key technical takeaways or interesting patterns used",
  "exampleCode": "A concise usage example or summary snippet",
  "resources": [{ "title": "Reference", "url": "..." }]
}`
    userPrompt = `File: ${req.body.filename || "Unknown"}\nLanguage: ${language}\nCode:\n${codeSnippet}\nPerform a deep code analysis.`
  } else if (isDoc) {
    systemPrompt = `You are an expert developer assistant. 
Analyze the documentation provided and explain it briefly.
Provide a professional heading (e.g., "React 'useEffect' Hook Overview") and a concise summary.
Return valid JSON only:
{
  "heading": "Descriptive, professional title of the topic",
  "summary": "Brief, high-level summary of the documentation (MAX 3 sentences)",
  "exampleCode": "Practical code example illustrating the concept",
  "resources": [{ "title": "Documentation", "url": "..." }]
}`
    userPrompt = `Context Type: ${pageType}\nContent: ${mainContent || codeSnippet}\nSummarize this documentation professionally.`
  } else {
    systemPrompt = `You are an expert software engineer specializing in debugging.
Analyze the developer's error and provide a fix.
{
  "heading": "Clear title for the bug fix (e.g., 'Fixing Null Pointer in User Auth')",
  "summary": "Brief summary of the issue and the solution (2-3 sentences)",
  "problem": "One sentence describing the exact bug detected",
  "cause": "Root cause explanation (2-4 sentences)",
  "fix": "Step-by-step fix (2-6 sentences)",
  "exampleCode": "Corrected and optimized code snippet",
  "resources": [{ "title": "...", "url": "..." }]
}`
    userPrompt = `Page: ${pageType}\nError: ${error || "General Issue"}\nLanguage: ${language}\nCode: ${codeSnippet}\nReturn the structured fix.`
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemma-3-27b-it" })
    const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`)
    const rawContent = result.response.text() || "{}"

    let parsed
    try {
      let cleanJson = rawContent.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      parsed = JSON.parse(cleanJson)
    } catch {
      parsed = { 
        heading: "Analysis Completed",
        summary: "We've analyzed the page content and extracted the key points below.",
        problem: "Analysis details extracted", 
        cause: rawContent.substring(0, 500), 
        fix: "Check the overview for more details.", 
        exampleCode: "", 
        resources: [] 
      }
    }

    return res.json(parsed)
  } catch (err) {
    console.error("[OmniContext.ai] AI error:", err)
    return res.status(500).json({ error: "AI analysis failed" })
  }
})

/**
 * POST /analyze-image
 * Multimodal Analysis (Screenshots)
 */
app.post("/analyze-image", async (req, res) => {
  const { image } = req.body
  if (!image) return res.status(400).json({ error: "Image is required" })

  // Strip prefix from dataURL
  const base64Data = image.split(",")[1]
  console.log(`[Visual] Received image analysis request. Size: ${(base64Data.length / 1024 / 1024).toFixed(2)} MB`)

  const prompt = `You are a high-precision OCR and code analysis engine. 
  Analyze this developer screenshot and extract ALL visible code snippets accurately.
  
  Expected JSON format:
  {
    "observation": "Detailed description of what is visible on the screen",
    "extractedCode": "The full source code extracted from the image (preserve formatting)",
    "insights": "Specific technical advice or observations about the code or tools visible"
  }
  
  IMPORTANT: Return ONLY the JSON object. Do not include markdown formatting or extra text.`

  try {
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" }) // Switched to 1.5-flash for maximum stability
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: "image/png"
        }
      }
    ])
    const raw = result.response.text()
    console.log("[Visual] Raw AI Response:", raw)
    
    // Attempt to extract JSON using a more robust regex
    let cleanJson = ""
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      cleanJson = jsonMatch[0]
    } else {
      cleanJson = raw.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim()
    }

    try {
      return res.json(JSON.parse(cleanJson))
    } catch (parseErr) {
      console.error("[Visual] JSON Parse Error:", parseErr, "Raw was:", raw)
      return res.status(422).json({ 
        error: "AI returned invalid format", 
        details: raw.substring(0, 200),
        raw: raw 
      })
    }
  } catch (err) {
    console.error("[Visual] Generation Error:", err)
    return res.status(500).json({ 
      error: "AI Generation Failed", 
      details: err.message 
    })
  }
})

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀  OmniContext.ai backend running on http://localhost:${PORT}`)
  console.log(`   Health check: http://localhost:${PORT}/health`)
  console.log(`   POST /analyze ready\n`)

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your-gemini-api-key-here") {
    console.warn("⚠️  WARNING: GEMINI_API_KEY is not set. Add your Google Gemini API key to backend/.env.\n")
  }
})
