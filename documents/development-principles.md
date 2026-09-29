# Development Principles

## Single Responsibility

Every module has one primary responsibility and one primary
reason to change.

UI components do not contain business logic.

Business services do not contain UI logic.

Storage implementations do not contain domain logic.

Crawler orchestration does not implement individual crawling
capabilities.

## DRY

Shared behavior is implemented once and consumed through
well-defined interfaces.

DRY applies to knowledge and behavior, not merely identical
lines of code.

Do not prematurely abstract coincidentally similar code.

## Dependency Direction

UI
 ↓
Application
 ↓
Domain
 ↓
Infrastructure

Lower layers must not depend upon higher layers.

## Observed vs Derived Data

Raw observations are immutable evidence.

Derived analysis can always be regenerated from observed data.

Generated artifacts derive from the normalized model rather
than directly from scraped website content.