# Universal Context Engine

## Concept
The Context Engine moves away from domain-specific selectors to **Pattern Detection**.

## Detection Strategies
- **Technical Context**: Identified by keywords (e.g., "how to fix", "api reference") and structure (e.g., presence of monospace blocks).
- **Code Discovery**: Scans for standard tags (`pre`, `code`) and heuristic patterns (e.g., `import`, `public static void`).

## Context Fusion
The engine doesn't just look at the current page. It pulls from the `SessionHistory` to understand if a user is following a workflow (e.g., Error Log -> StackOverflow -> GitHub).
