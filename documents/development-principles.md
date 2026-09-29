# Site Pattern Studio — Development Principles

## Single Responsibility Principle

Every module should have one primary responsibility and one primary reason to change.

Examples:

```text
ScreenshotCapture
    → captures screenshots

InteractionDiscovery
    → discovers interactive elements

InteractionExecutor
    → executes interactions

SiteRepository
    → persists site information

BrowserManager
    → manages browser lifecycle
```

Avoid modules that combine unrelated responsibilities.

UI components must not implement crawler, storage, browser-automation, or domain logic.

Orchestrators coordinate services. They should not absorb the implementations of those services.

## DRY — Don't Repeat Yourself

Knowledge and behavior should have a single authoritative implementation.

If multiple parts of the application require the same domain rule, that rule should normally live in a shared domain module.

DRY does not mean eliminating every repeated line of code.

Do not create abstractions merely because two pieces of code currently look similar.

Prefer:

```text
clear duplication
```

over:

```text
incorrect abstraction
```

until the common responsibility is understood.

## Avoid Generic Dumping Grounds

Do not create large files such as:

```text
utils.ts
helpers.ts
common.ts
misc.ts
```

containing unrelated functionality.

Prefer focused modules:

```text
utils/
├── urls.ts
├── coordinates.ts
├── filesystem.ts
└── identifiers.ts
```

Domain-specific utilities should remain with their domain whenever practical.

## Separation of Concerns

Maintain clear boundaries between:

```text
Presentation
Application orchestration
Domain logic
Infrastructure
Persistence
Browser automation
AI interpretation
Generation
```

Do not allow implementation convenience to erase these boundaries.

## Dependency Direction

Preferred dependency direction:

```text
UI
 ↓
Application
 ↓
Domain
 ↓
Infrastructure
```

Domain models should not depend upon React, Tauri UI components, Playwright, Crawlee, SQLite, or a specific AI provider.

## Observed Data Is Evidence

Information directly captured from a website is evidence.

Examples:

```text
Screenshots
DOM
CSS
Geometry
ARIA information
URLs
Browser events
```

Observed evidence should remain unchanged whenever practical.

If interpretation changes, regenerate derived information rather than rewriting the original observation.

## Derived Data Is Replaceable

AI classifications, pattern recognition, flow interpretation, and design-system inference are derived information.

Derived information should be reproducible from stored observations.

Changing models or analysis algorithms should not require recrawling a website unless additional observations are required.

## Generated Artifacts Are Outputs

Generated templates and projects are outputs.

Generation should consume normalized models.

Avoid directly transforming scraped HTML/CSS into final generated application code.

Preferred:

```text
Observation
     ↓
Normalization
     ↓
Pattern
     ↓
Template
     ↓
Generation
```

## Deterministic Before AI

If information can be reliably obtained deterministically, use deterministic tooling.

Examples:

```text
Element geometry      → browser
ARIA role             → browser
URL                    → browser
CSS value              → browser
DOM structure          → browser
Screenshot             → browser
```

Use AI primarily for interpretation:

```text
"What kind of component is this?"

"What purpose does this page serve?"

"Are these components examples of the same pattern?"

"What user flow does this sequence represent?"
```

This reduces cost, improves reproducibility, and preserves objective source evidence.

## Explicit Contracts

Communication between architectural layers should use explicit typed contracts.

Prefer:

```typescript
interface Interaction {
  id: string;
  role: string;
  name?: string;
}
```

over loosely structured objects.

Runtime boundaries should be validated where appropriate using schemas such as Zod.

## Small Files With Meaningful Boundaries

File size alone does not determine good architecture.

Do not split code simply to satisfy arbitrary line-count limits.

Split modules when responsibilities differ.

A 300-line cohesive parser may be preferable to six tightly coupled 50-line files.

Conversely, a 100-line file containing four unrelated responsibilities should be separated.

## Composition Over Large Modules

Prefer composing focused services:

```text
CrawlSite
   │
   ├── BrowserManager
   ├── URLDiscovery
   ├── ScreenshotCapture
   ├── InteractionDiscovery
   └── SiteRepository
```

rather than implementing everything inside `CrawlSite`.

## Test Domain Behavior Independently

Core domain logic should be testable without:

- Starting Tauri
- Rendering React
- Opening a browser
- Connecting to an AI provider

Infrastructure-dependent tests should be separate integration tests.

## Preserve Framework Independence

Core domain concepts should not depend on the current frontend or generation framework.

For example:

```text
Pattern
```

should not inherently mean:

```text
React component
```

A Pattern could eventually generate React, Next.js, Vue, static HTML, or another target.

## Prefer Explicitness

Favor code that clearly communicates domain intent over clever abstractions.

Names such as:

```text
discoverInteractions()
captureUIState()
normalizeElementBounds()
recordTransition()
```

are preferable to generic names such as:

```text
process()
handle()
execute()
manage()
```

when a more specific name is available.

## Architecture Is Allowed to Evolve

These principles are constraints, not a frozen implementation.

New requirements may reveal better boundaries.

When architecture changes:

1. Update the implementation.
2. Update the relevant architecture documentation.
3. Update domain terminology if necessary.
4. Update tests.
5. Avoid maintaining obsolete abstractions solely for backward compatibility during early development.

The documentation and implementation should describe the same system.