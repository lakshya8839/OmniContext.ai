# OmniContext.ai Architecture

## Modules Overview

- **Core**: Contains the central logic for security, permissions, and AI request orchestration.
  - `securitySanitizer.ts`: Universal PII/token removal.
  - `aiOrchestrator.ts`: Context fusion and AI pipeline management.
  - `permissionManager.ts`: Domain-based access control.
  - `contextEngine.ts`: The main entry point for page analysis.

- **Detection**: Content-aware pattern recognition.
  - `siteDetector.ts`: Categorizes technical websites (Docs, Issues, Blogs).
  - `codeDetector.ts`: Robust, selector-agnostic code block discovery.

- **Services**: External communication.
  - `aiService.ts`: Low-level backend API client.

- **Storage**: State and persistence.
  - `sessionContext.ts`: Tracks developer workflow journey cross-tab.
  - `historyManager.ts`: Manages long-term analysis history.

## Data Flow
1. **User Navigation/Action** triggers `ContextEngine`.
2. `SiteDetector` & `CodeDetector` extract raw content.
3. `SessionContext` updates with the new visit.
4. `AIOrchestrator` fuses current context with session memory.
5. `SecuritySanitizer` cleans all data.
6. `aiService` sends the request to the backend.
