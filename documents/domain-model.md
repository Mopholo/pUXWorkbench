# pUXWorkbench — Domain Model

## Purpose

This document defines the core concepts used throughout pUXWorkbench.

These terms should have consistent meanings across:

- TypeScript
- Rust
- Database schemas
- UI
- AI prompts
- Documentation
- Generated artifacts

## Site

A Site represents the web property being analyzed.

```text
Site
├── Pages
├── UI States
├── Components
├── Interactions
├── Transitions
├── Captures
├── Flows
└── Patterns
```

A Site is the root aggregate for captured website information.

## Page

A Page represents a routable or addressable web resource.

Typical identity:

```text
URL
```

Example:

```text
https://example.com/pricing
```

A Page may contain multiple UI States.

A Page must not be treated as equivalent to a UI State.

## UI State

A UI State represents a visually and behaviorally meaningful state of the interface.

Examples:

```text
Home

Home + Login Modal

Home + Mobile Navigation

Pricing + Annual Billing Selected

Product + Expanded FAQ
```

Multiple UI States may share the same URL.

A UI State records enough information to reconstruct and reason about what the user could see and interact with at that moment.

### State provenance and reconstruction

A URL alone is not sufficient to reconstruct a UI State. A derived state may depend on earlier interactions such as opening a menu, expanding a product list, selecting a tab, or navigating through another captured state.

Each capture therefore preserves reconstruction provenance: a base URL plus the ordered interaction steps and source scroll positions required to reproduce the state. Execution from a derived state replays that provenance before resolving the newly selected interaction.

```text
Base State
  ↓ expand products
Derived State
  ↓ Blogger
Target State
```

Provenance is deterministic observed history, not AI-derived interpretation.

Typical properties include:

```text
id
pageId
captureProfileId
url
viewport
scrollPosition
capture
visibleComponents
interactions
```

## Capture Profile

A Capture Profile defines the observation context under which a Site is captured. Authentication is one dimension of a profile, not a separate kind of Site.

Typical profile dimensions include authentication state, account role, entitlement, locale, theme, viewport class, and feature/experiment state.

Examples:

```text
Anonymous / Desktop / en-CA
Authenticated / Free / Desktop / en-CA
Authenticated / Admin / Desktop / en-CA
```

Authentication credentials are not part of the domain model. A user authenticates directly in a visible browser and pUXWorkbench persists reusable browser session state for the profile.

The same Page captured under different Capture Profiles may be compared to derive context differences.

## View State

A UI State may include a View State: scroll position, sticky/floating component configuration, viewport-visible content, and other presentation changes caused by scrolling or anchor navigation. View-state transitions are distinct from structural transitions such as opening a modal.

## Component

A Component represents a visually or functionally distinct portion of a UI State.

Examples:

```text
Header
Hero
Navigation
Login Modal
Pricing Card
Footer
Sidebar
Form
Dropdown
Drawer
```

Components may contain other Components.

Components may appear in multiple UI States.

Repeated Components may later be generalized into Patterns.

## Interaction

An Interaction represents an action available to the user.

Examples:

```text
Click
Select
Toggle
Expand
Open
Close
Submit
Navigate
Scroll
```

An Interaction belongs to a source UI State.

An Interaction may produce a Transition. Interactions carry a safety classification: SAFE, REVIEW, or BLOCKED. REVIEW interactions require explicit user approval; that override is recorded as classifier feedback. BLOCKED interactions represent known unsafe or externally consequential actions.

An Interaction should preserve both semantic information and capture geometry.

Example:

```text
Interaction
├── role: button
├── name: Login
├── action: click
├── bounds
├── normalizedBounds
└── sourceState
```

## Transition

A Transition represents the result of performing an Interaction.

Conceptually:

```text
Source State
     │
 Interaction
     │
     ▼
Target State
```

Example:

```text
Home
  │
  │ click "Login"
  ▼
Home + Login Modal
```

Transitions are classified as navigation, structural, view, or none.

Navigation transitions also record whether the target opened in a new browser page/window and whether the destination is the same host, a related subdomain, or external. This observation is separate from crawl policy: pUXWorkbench may capture the immediate target while later traversal rules determine whether exploration continues.

Visual captures may include Occlusion Regions as semantic evidence about banners, dialogs, drawers, popovers, and other stacked surfaces. Overlay clickability is not inferred from a fixed/sticky rectangle alone: pUXWorkbench records browser-derived hit-test regions for interactions using the rendered page’s actual hit testing. This prevents transparent or oversized containers from falsely blocking interactions while still respecting real occlusion.

Transitions form the behavioral graph of the application.

## Capture

A Capture is recorded evidence of an observed UI State or Component.

Examples include:

```text
Screenshot
DOM snapshot
Element geometry
Accessibility information
CSS information
Viewport
Scroll position
```

Captures are observations rather than interpretations.

## Element Bounds

Interactive elements should preserve original capture geometry:

```text
x
y
width
height
```

and normalized geometry:

```text
xRatio
yRatio
widthRatio
heightRatio
```

Normalized geometry allows interactive overlays to remain aligned when screenshots are displayed at different sizes.

## Viewport

A Viewport describes the browser dimensions used when observing a state.

Example:

```text
width: 1440
height: 900
deviceScaleFactor: 1
```

Viewport information belongs to the observation and must not be inferred later.

## Flow

A Flow represents a meaningful sequence of states and interactions.

Examples:

```text
Authentication Flow

Signup Flow

Password Recovery Flow

Checkout Flow

Onboarding Flow
```

Example:

```text
Home
 ↓ Login
Login Modal
 ↓ Forgot Password
Password Recovery
 ↓ Submit
Confirmation
```

Flows are derived from the underlying state/transition graph.

## Pattern

A Pattern is a generalized reusable design or interaction structure derived from one or more observations.

Examples:

```text
Centered Authentication Modal

Three-Tier Pricing Layout

Sidebar Application Navigation

Progressive Signup

Mobile Drawer Navigation
```

Patterns should abstract implementation details that are specific to the observed website.

A Pattern should describe:

```text
Purpose
Structure
Relationships
Behavior
Interaction model
Layout characteristics
Variants
```

rather than reproduce branded implementation details.

## Design System

A Design System is a derived representation of recurring visual rules.

Potential properties include:

```text
Typography hierarchy
Spacing system
Border-radius tendencies
Layout widths
Grid behavior
Color roles
Button hierarchy
Form conventions
Component relationships
Responsive behavior
```

The Design System is interpreted from observed evidence.

## Template

A Template is a reusable specification for creating a new implementation.

A Template may reference:

```text
Patterns
Components
Flows
Layout rules
Design-system rules
Interaction behavior
```

Templates should contain generalized structures rather than copied source implementation.

## Generated Project

A Generated Project is a new software project created using one or more Templates.

The generated implementation may target frameworks such as:

```text
Next.js
React
Vite
```

Framework support should remain separate from the Pattern Model.

## Core Relationships

```text
SITE
 │
 ├── PAGE
 │     │
 │     └── UI STATE
 │            │
 │            ├── COMPONENT
 │            │
 │            └── INTERACTION
 │                    │
 │                    ▼
 │                TRANSITION
 │                    │
 │                    ▼
 │                 UI STATE
 │
 ├── CAPTURE
 │
 ├── FLOW
 │
 ├── DESIGN SYSTEM
 │
 └── PATTERN
          │
          ▼
       TEMPLATE
          │
          ▼
   GENERATED PROJECT
```

## Fundamental Distinctions

The following distinctions must remain explicit throughout the implementation.

```text
Page ≠ UI State

Component ≠ Pattern

Interaction ≠ Transition

Capture ≠ Analysis

Observed Data ≠ Derived Data

Pattern ≠ Template

Template ≠ Generated Project
```

These distinctions are part of the architecture and should not be collapsed merely for implementation convenience.

## Selection controls

Selection controls include native HTML `select` elements and custom/ARIA combobox, listbox, menu-trigger, and option patterns. Opening a selection control is a safe state-revealing interaction. Individual choices remain distinct interactions because choosing a locale, device, variant, or account can change route, content, or application state. Native browser/OS popup pixels are not guaranteed to exist in a page screenshot, so semantic discovery of the control and its choices is authoritative evidence even when the popup itself is outside the captured page surface.

## State Graph and Navigation History

A UI State may have zero, one, or many incoming Transitions. The graph is therefore authoritative for parentage/reachability; `parentStateId` remains legacy capture provenance and must not be interpreted as the complete graph relationship.

A captured Transition binds a source State, an Interaction, and a target State. When that binding is known, the screenshot interaction can navigate to the stored target without executing the original site again.

Navigation History is distinct from the State Graph. It records the user's local Back/Forward viewing path as State ID references and does not own State data or remove graph branches when history changes. Consecutive identical State IDs are collapsed, but non-consecutive revisits are retained because they describe a meaningful testing path.

State identity is deterministic from stable observed structure (URL, title, viewport/document geometry, scroll position, and interaction signature), not screenshot bytes. Screenshot pixels remain evidence and change signals, but volatile rendering differences must not manufacture duplicate graph nodes. A transition is unique by source State plus semantic Interaction identity. A transition may target its own source State; this is a self-edge, not a new State.

### Known interaction edge

Within a source State, an Interaction is considered known when its stable semantic identity resolves to an existing Transition whose target State is present in the graph. Volatile discovery evidence such as generated CSS selectors and pixel bounds is not part of the primary semantic identity when stronger attributes (href, accessible name/text, stable locator attributes) exist. A known self-edge is still a captured Transition and is traversed locally; it does not create a duplicate State or consecutive duplicate Navigation History entry.
