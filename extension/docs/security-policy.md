# Security & Privacy Policy

## Data Sanitization
All content extracted from the DOM is processed by the `SecuritySanitizer` before being sent to the AI backend.

### Redacted Information:
- **API Keys & Secrets**: Patterns matching common key formats are masked.
- **Auth Tokens**: Bearer tokens and Basic Auth credentials in URLs are removed.
- **Personal Info**: Emails and IPv4 addresses are masked.

## Domain Activity
The `PermissionManager` enforces strict boundaries:
- **Auto-Block**: Financial, banking, and login pages are automatically excluded from analysis.
- **Manual Control**: Users can whitelist or blacklist specific domains via the Settings tab.

## Local Processing
Filtering occurs **locally** in the extension's background context. Raw, unsanitized data never leaves the user's machine.
