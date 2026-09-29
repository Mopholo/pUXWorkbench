# Site Pattern Studio — Architecture

## Purpose

Site Pattern Studio analyzes existing websites and web applications to understand their:

- Visual layout
- Page structure
- UI states
- Components
- Navigation
- Interaction patterns
- User flows
- Reusable design patterns

The system does not attempt to clone an existing website.

Its purpose is to observe and abstract layout and interaction patterns into reusable models that can be used when designing and generating new applications.

The primary processing pipeline is:

```text
Website
   ↓
Capture
   ↓
Observed Model
   ↓
Derived Model
   ↓
Pattern Model
   ↓
Template Model
   ↓
Generated Project
```

## Architectural Principles

The architecture follows two primary software engineering principles:

1. Single Responsibility Principle
2. Don't Repeat Yourself (DRY)

Modules should have one primary responsibility and one primary reason to change.

Shared knowledge and behavior should have a single authoritative implementation.

DRY does not mean creating large generic utility modules or prematurely abstracting coincidentally similar code.

## Major Layers

```text
┌─────────────────────────────┐
│        Tauri Desktop        │
│       React + TypeScript    │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│     Application Services    │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│       Tauri Commands        │
│           Rust              │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│     Site Analysis Engine    │
│        TypeScript           │
└──────────────┬──────────────┘
               │
       ┌───────┼────────┐
       ▼       ▼        ▼
    Browser  Capture  Discovery
       │       │        │
       └───────┼────────┘
               ▼
       Normalized UI Model
               │
               ▼
        Pattern Analysis
               │
               ▼
       Template Generation
```

## Frontend

The frontend is responsible for presentation and user interaction.

Technology:

- React
- TypeScript
- Zustand
- XYFlow / React Flow

The frontend must not implement crawling, browser automation, filesystem persistence, or pattern-analysis logic.

Feature-specific code belongs under:

```text
src/features/
```

Shared visual components belong under:

```text
src/components/
```

## Tauri Layer

Tauri provides native desktop capabilities including:

- Native application shell
- Filesystem access
- Directory selection
- Process management
- Application configuration
- Communication between the frontend and native capabilities

Rust should be used where native integration provides a clear benefit.

Site-analysis logic should not be moved into Rust merely because the application uses Tauri.

## Site Analysis Engine

The engine is responsible for deterministic website observation.

Major engine areas include:

```text
engine/
├── browser/
├── crawler/
├── capture/
├── discovery/
├── interactions/
├── models/
├── analysis/
└── storage/
```

The engine should remain independent of the React UI.

## Browser Layer

Browser automation will use Playwright.

Responsibilities include:

- Browser lifecycle
- Page rendering
- Viewport management
- JavaScript execution
- DOM inspection
- Interaction execution
- Browser-state observation

Browser lifecycle logic must remain separate from crawling and analysis logic.

## Crawling

Crawlee will provide crawl orchestration.

Responsibilities include:

- URL discovery
- Crawl queues
- Duplicate prevention
- Concurrency
- Retry behavior
- Crawl limits

Crawling should coordinate specialized services rather than implementing their responsibilities directly.

## Capture

Capture services record observable evidence from a website.

Examples include:

- Screenshots
- DOM information
- Element geometry
- Accessibility information
- URLs
- Page metadata
- Interactive controls
- Viewport information
- Scroll state

Captured observations are considered source evidence.

## Interaction Discovery

Interactive controls may include:

- Links
- Buttons
- Tabs
- Menus
- Dropdowns
- Accordions
- Modals
- Drawers
- Forms
- Toggles
- Other actionable controls

Each discovered interaction should preserve semantic identity and geometry.

## State Discovery

A URL is not equivalent to a UI state.

For example:

```text
/
├── Home
├── Home + Menu
├── Home + Login Modal
└── Home + Cookie Dialog
```

The architecture therefore models:

```text
UI State
   ↓
Interaction
   ↓
Transition
   ↓
UI State
```

rather than only:

```text
Page
   ↓
Link
   ↓
Page
```

## Storage

Structured project data will initially use SQLite.

Large binary artifacts such as screenshots will use the filesystem.

Example:

```text
project/
├── project.json
├── site.db
├── captures/
├── crawl/
├── analysis/
└── generated/
```

## Data Layers

Three major categories of data must remain distinct.

### Observed Data

Facts directly captured from the source application.

Examples:

- Screenshot
- DOM
- URL
- CSS
- Element geometry
- ARIA information
- Browser state
- Interactions

Observed data should remain immutable whenever practical.

### Derived Data

Interpretations produced from observed evidence.

Examples:

- Component classifications
- Page classifications
- Interaction patterns
- User flows
- Design-system inference
- Pattern relationships

Derived data may be regenerated without recrawling.

### Generated Data

New artifacts produced from normalized patterns.

Examples:

- Application templates
- Components
- Layouts
- Routes
- Interaction scaffolding

Generated artifacts should derive from normalized models rather than directly copying source-site implementation.

## AI Boundary

Deterministic tools should gather facts whenever possible.

AI should primarily interpret those facts.

Deterministic responsibilities include:

- DOM extraction
- Geometry
- Screenshots
- URLs
- ARIA roles
- Element text
- CSS properties
- Browser events
- State changes

AI responsibilities may include:

- Component classification
- Page-purpose classification
- Pattern recognition
- Flow recognition
- Pattern abstraction
- Design-system interpretation
- Template recommendations

AI should not be used where deterministic extraction can reliably provide the answer.

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

Lower-level modules must not depend on higher-level presentation concerns.

## Core Rule

The normalized UI and pattern models are the center of the system.

Screenshots, DOM data, AI analysis, and generated code are inputs or outputs around those models rather than substitutes for them.