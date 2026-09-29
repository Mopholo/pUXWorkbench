# pUXWorkbench — Milestones

## Purpose

This document defines the incremental development roadmap for pUXWorkbench.

Each milestone should produce a demonstrable, testable capability.

Milestones should favor vertical slices over building large amounts of disconnected infrastructure.

A milestone is complete only when its acceptance criteria are satisfied.

---

# Milestone 0 — Application Foundation

## Goal

Establish a clean Tauri + React + TypeScript application with architectural boundaries in place before implementing site analysis.

## Deliverables

- Tauri 2 application
- React
- TypeScript
- Vite
- Zustand
- Zod
- XYFlow
- Project directory structure
- Architecture documentation
- Domain model
- Development principles
- Milestone roadmap

## Project Structure

```text id="8o06md"
src/
├── app/
├── components/
├── features/
├── hooks/
├── services/
├── types/
└── utils/

src-tauri/
└── src/
    ├── commands/
    ├── services/
    ├── models/
    └── state/

engine/
├── browser/
├── crawler/
├── capture/
├── discovery/
├── interactions/
├── models/
├── analysis/
└── storage/

shared/
├── models/
└── schemas/

documents/
├── architecture.md
├── domain-model.md
├── development-principles.md
└── milestones.md

tests/
```

## Acceptance Criteria

- Application builds successfully.
- `npm run tauri dev` launches the desktop application.
- React ↔ Tauri communication is verified.
- Architectural directories exist.
- Core documentation exists.
- No crawler or AI implementation is required.

---

# Milestone 1 — Single Page Capture

## Goal

Capture one real webpage and display it inside pUXWorkbench.

This is the first end-to-end vertical slice.

## Pipeline

```text id="v0yp1q"
URL
 ↓
Launch Browser
 ↓
Load Page
 ↓
Capture Page
 ↓
Store Capture
 ↓
Display in Tauri
```

## Deliverables

### Browser Management

Introduce Playwright.

Create a dedicated browser lifecycle service responsible for:

- Starting browser
- Creating browser context
- Creating page
- Setting viewport
- Navigating
- Closing browser resources

### Page Capture

Capture:

- URL
- Page title
- Viewport dimensions
- Document dimensions
- Screenshot
- Basic page metadata

### Viewer

Create a basic screenshot viewer in the Tauri application.

The viewer should:

- Fit screenshot to available width
- Preserve aspect ratio
- Allow vertical scrolling
- Respond correctly to window resizing

## Initial Capture Size

Desktop:

```text id="zrd7q4"
1440px wide
```

Page height should remain native/full-page height.

## Acceptance Criteria

Given a URL, pUXWorkbench can:

1. Open the website.
2. Render the page.
3. Capture a full-page screenshot.
4. Store the capture.
5. Display the screenshot.
6. Resize the application without distorting the screenshot.

---

# Milestone 2 — Interaction Discovery

## Goal

Discover interactive elements on the captured page and display their interactive regions over the screenshot.

## Discover

Initially recognize:

- Links
- Buttons
- Inputs
- Select controls
- Tabs
- Common ARIA interactive roles

## Interaction Data

Each interaction should contain:

```text id="46is9r"
ID
Element type
ARIA role
Accessible name
Visible text
Original bounds
Normalized bounds
Source state
```

Where available:

```text id="l9axgx"
href
target
disabled state
DOM locator information
```

## Overlay Viewer

Display transparent interactive regions over the screenshot.

Optional development mode should visibly outline detected regions.

Example:

```text id="fdkmgp"
┌───────────────────────────────────────┐
│ Logo     Products Pricing   [Login]  │
│                              ↑        │
│                           hit region  │
│                                       │
│             Welcome                   │
│                                       │
│          [ Get Started ]              │
│                 ↑                     │
│              hit region               │
└───────────────────────────────────────┘
```

## Scaling

Overlay positions must be calculated from normalized coordinates.

They must remain aligned when the viewer changes size.

## Acceptance Criteria

- Interactive elements are discovered.
- Geometry corresponds to the captured screenshot.
- Overlays remain aligned while resizing.
- Clicking an overlay identifies the correct interaction.
- Viewer does not depend on fixed display dimensions.

---

# Milestone 3 — UI State Capture

## Goal

Execute safe interactions and detect UI changes that do not necessarily produce URL navigation.

Example:

```text id="c06q85"
HOME
  │
  │ Login
  ▼
HOME + LOGIN MODAL
```

## State Detection

Detect meaningful changes using deterministic signals including:

- URL changes
- DOM changes
- Visible element changes
- Modal appearance
- Drawer appearance
- Navigation changes
- Significant visual changes

## State Capture

Each discovered UI State should preserve:

```text id="zds9cn"
Page
URL
Viewport
Scroll position
Screenshot
Visible components
Available interactions
Parent state
Triggering interaction
```

## Acceptance Criteria

Given:

```text id="j7s49l"
Home
```

and a button that opens a modal without changing the URL:

pUXWorkbench can produce:

```text id="cdh61s"
State A
Home

State B
Home + Modal

Transition
State A --click Login--> State B
```

Both states must be independently viewable.

---

# Milestone 4 — Interactive State Navigation

## Goal

Make captured screenshots behave as a navigable reconstruction of the observed interaction graph.

## Behavior

From:

```text id="zqqx44"
Home Screenshot
```

click:

```text id="fpph2r"
Login
```

and display:

```text id="93g1mh"
Home + Login Modal
```

Click:

```text id="u3dhz6"
Forgot Password
```

and display:

```text id="bd1ih7"
Password Recovery
```

## Navigation

Support:

- Forward state navigation
- Back navigation
- State history
- Interaction highlighting
- Current-state identification

## Acceptance Criteria

A user can navigate captured states by clicking the same visual controls that produced those states in the original application.

The reconstructed experience does not require the original website to remain open.

---

# Milestone 5 — Site Crawl

## Goal

Expand from a single page/state into controlled site exploration.

Introduce Crawlee for crawl orchestration.

## Responsibilities

Support:

- Internal URL discovery
- Crawl queue
- Duplicate URL detection
- Crawl limits
- Retry behavior
- Domain boundaries
- Page limits
- Depth limits

## Safety

Do not blindly execute every discovered interaction.

Initial interaction categories:

```text id="8pjnvq"
SAFE
├── Navigation
├── Tabs
├── Menus
├── Accordions
├── Modals
└── Drawers

RESTRICTED
├── Forms
├── Authentication
├── Search
└── Upload

PROHIBITED
├── Purchases
├── Payments
├── Delete operations
├── Account modifications
└── Other destructive actions
```

## Acceptance Criteria

Given a starting URL and crawl limits, pUXWorkbench can discover and capture multiple pages without leaving the permitted site boundary or executing prohibited actions.

---

# Milestone 6 — Visual Site Graph

## Goal

Represent the captured website as an interactive visual graph.

Use XYFlow.

## Graph Model

```text id="whhklj"
UI State
   │
Interaction
   │
   ▼
UI State
```

Graph nodes may represent:

- Pages
- UI States
- Significant component states

Graph edges represent transitions.

## Node Information

Nodes should provide:

- Screenshot thumbnail
- State name
- Page/URL
- State type

## Interaction

Selecting a node opens its captured state in the screenshot viewer.

Selecting an edge shows the interaction that produced the transition.

## Acceptance Criteria

Users can visually explore:

```text id="tb1hqe"
Home
 ├── Products
 ├── Pricing
 └── Login
       ↓
   Login Modal
       ↓
   Forgot Password
```

and move between the graph and screenshot navigator.

---

# Milestone 7 — Component Recognition

## Goal

Identify meaningful visual components within captured states.

## Initial Component Types

Examples:

- Header
- Navigation
- Hero
- Sidebar
- Footer
- Modal
- Drawer
- Form
- Card
- Pricing section
- CTA
- Tabs
- Accordion

## Processing

Use deterministic evidence first.

AI may then classify and interpret the observed structures.

## Component Capture

Where useful, store component-level captures independently from full-state captures.

## Acceptance Criteria

The system can identify major UI components and associate them with the states in which they appear.

---

# Milestone 8 — Flow Recognition

## Goal

Identify meaningful user journeys from the interaction graph.

Examples:

```text id="0ykd84"
Authentication
Signup
Password Recovery
Onboarding
Product Discovery
Pricing
Checkout
```

## Example

```text id="6ndaqh"
Home
 ↓
Login Modal
 ↓
Email Login
 ↓
Forgot Password
 ↓
Password Recovery
```

becomes:

```text id="du51lq"
Flow:
Password Recovery
```

## Acceptance Criteria

The system can group relevant states and transitions into named functional flows without modifying the underlying observed evidence.

---

# Milestone 9 — Pattern Extraction

## Goal

Convert specific observed implementations into generalized reusable patterns.

Example:

```text id="9fv0le"
Observed:

Website X
Login Modal
480 × 620
OAuth buttons
Email fallback
Forgot password


        ↓ ABSTRACT


Pattern:

OAuth-First Authentication Modal

Structure
├── Heading
├── OAuth actions
├── Divider
├── Credential input
├── Primary action
├── Recovery action
└── Signup action
```

## Pattern Categories

Initial categories may include:

- Navigation
- Heroes
- Authentication
- Forms
- Pricing
- Product presentation
- Onboarding
- Search
- Application navigation
- Mobile navigation

## Acceptance Criteria

Patterns contain generalized structure and behavior rather than source-site branding or implementation-specific code.

---

# Milestone 10 — Pattern Library

## Goal

Create a reusable library of patterns discovered across analyzed sites.

## Example

```text id="7fqgss"
Pattern Library

Navigation
├── Centered Marketing Header
├── Mega Menu
├── Application Sidebar
└── Mobile Drawer

Authentication
├── OAuth First
├── Email First
├── Authentication Modal
└── Dedicated Authentication Page

Pricing
├── Three Tier
├── Usage Based
├── Feature Matrix
└── Monthly/Annual Toggle
```

## Pattern Comparison

Allow patterns from different sites to be compared.

The system should recognize structurally similar implementations without treating them as identical.

## Acceptance Criteria

Patterns can be browsed independently from the source sites from which they were derived.

---

# Milestone 11 — Template Model

## Goal

Compose reusable patterns into a normalized specification for a new application.

Example:

```text id="pp4jij"
Template

Marketing
├── Header Pattern A
├── Hero Pattern C
├── Feature Pattern B
└── Pricing Pattern A

Application
├── Sidebar Pattern B
├── Dashboard Pattern D
└── Account Pattern A

Authentication
└── OAuth-First Pattern
```

Templates describe structure and behavior without being tied to a specific implementation framework.

## Acceptance Criteria

A Template can exist independently from:

- The source website
- React
- Next.js
- Tauri
- Any particular CSS framework

---

# Milestone 12 — Project Generation

## Goal

Generate a new application scaffold from a Template Model.

Initial target:

```text id="n3ic04"
React / TypeScript
```

Additional generators may later support:

```text id="y7w6zg"
Next.js
Other web frameworks
```

## Generation Pipeline

```text id="j91e3r"
Template Model
      ↓
Target Generator
      ↓
Components
      ↓
Layouts
      ↓
Routes
      ↓
Interaction Scaffolding
      ↓
New Project
```

## Acceptance Criteria

A generated project:

- Builds successfully.
- Contains original implementation code.
- Implements selected structural patterns.
- Implements expected interaction scaffolding.
- Does not depend upon the analyzed source website.

---

# Future Milestones

Potential later capabilities include:

- Responsive/mobile capture
- Multi-viewport comparison
- Design-system extraction
- Accessibility analysis
- Visual regression
- Pattern quality analysis
- Multiple-site comparison
- Template composition UI
- AI-assisted template modification
- Repository analysis integration
- Requirements integration
- Existing-project comparison
- Generated test scaffolding
- Component-library generation

These should remain future capabilities until the core capture → state → interaction → pattern pipeline is proven.

---

# Current Development Target

The immediate development sequence is:

```text id="1yd54w"
Milestone 0
Application Foundation
       ↓
Milestone 1
Single Page Capture
       ↓
Milestone 2
Interaction Discovery
       ↓
Milestone 3
UI State Capture
       ↓
Milestone 4
Interactive Navigation
```

These first five milestones establish the core technical proof of the product.

Do not prematurely implement later milestones before this foundation is working and tested.