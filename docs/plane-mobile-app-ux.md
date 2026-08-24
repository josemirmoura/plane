# Plane CE Mobile App UX

## Goal

Turn the Plane CE web experience on phones into a deliberately mobile-first interface while preserving the existing desktop experience.

This phase builds on top of the completed `plane-mobile-web` responsive foundation. It does not replace that work.

## Baseline strategy

- Baseline A: `plane-mobile-web`
- Mobile-first iteration: `plane-mobile-app-ux`
- Keep desktop behavior stable.
- Do not merge either branch upstream until real-device validation is complete.

## Product principle

The phone experience must look and feel intentionally designed for a handheld device, not like a desktop interface that happens to fit inside a narrow viewport.

We will use the official Plane mobile product as UX inspiration while implementing the experience independently inside the Community Edition web codebase. Do not copy proprietary assets or unavailable implementation code.

## Mobile information architecture

### Persistent phone navigation

At phone widths, introduce a compact bottom navigation centered on the highest-frequency destinations:

- Home
- Projects
- Work items
- Inbox
- Search

Expose Create as a prominent mobile action rather than burying it inside desktop-oriented menus.

The exact number of bottom-nav items may be reduced after runtime testing if crowding appears at 360 px.

### Home

Create a mobile landing surface that prioritizes:

- assigned/open work items;
- recent/favorite projects;
- inbox/catch-up signals;
- quick create;
- recently visited content.

The Home screen should be scannable with one thumb and should not reproduce the desktop sidebar hierarchy.

### Projects

Use phone-oriented project rows/cards with:

- logo;
- project name and identifier;
- active work-item summary;
- favorite state;
- one compact overflow action.

Avoid presenting secondary metadata until the user opens the project.

### Work items

Work-item navigation should prioritize:

- readable title;
- state and priority;
- assignee;
- due date;
- project context.

The detail experience should occupy the phone viewport rather than visually imitating a desktop panel.

Secondary properties should move into mobile drawers/bottom sheets where appropriate.

### Filters and property editing

On phones:

- filters and sorting should open as mobile sheets/drawers;
- property pickers should be touch-first;
- destructive actions should stay secondary;
- actions that are common on desktop hover must have explicit mobile affordances.

### Cycles and Modules

Prefer compact summary cards/rows and hide low-priority metadata until detail view.

### Search

Expose search as a first-class mobile destination rather than only an expanding header control.

### Gantt

Do not attempt to compress the full desktop Gantt into the phone viewport. Preserve horizontal pan/scroll and provide a clean mobile entry point and controls around it.

## Visual principles

- Compact top bars.
- Thumb-reachable primary actions.
- 32–44 px practical touch areas depending on control importance.
- Strong title hierarchy and restrained metadata.
- Bottom sheets/drawers for transient property/filter interfaces.
- No desktop sidebar squeezed into phone width.
- Deliberate empty/loading states.
- Long text must truncate or wrap intentionally.
- Dark and light themes must remain supported.

## Breakpoints

Primary validation targets:

- 360 x 800
- 390 x 844
- 412 x 915
- 768 x 1024

Desktop/tablet behavior above the mobile breakpoint must remain compatible with upstream Plane conventions.

## Implementation sequence

### M1 - Mobile shell

- phone-only bottom navigation;
- compact mobile app header;
- mobile-safe page/content offsets;
- hide desktop navigation chrome where redundant;
- quick-create affordance;
- responsive behavior at 360/390/412/768.

### M2 - Mobile Home

- assigned/open work summary;
- projects/favorites;
- inbox indicator;
- recent items;
- quick-create entry points.

### M3 - Projects and Work Items

- native-feeling project list/cards;
- simplified mobile work-item rows/cards;
- full-viewport work-item detail;
- property editing through mobile-first menus/sheets;
- list/kanban/calendar navigation refinement.

### M4 - Inbox, Search, Cycles, Modules, Views

- dedicated phone navigation flows;
- compact summary surfaces;
- consistent drawers/sheets and touch actions.

### M5 - Hardening

- keyboard/focus accessibility;
- touch and scroll testing;
- orientation changes;
- long localization strings;
- dark mode;
- Storybook/Playwright screenshots;
- lint/types/build/React Doctor/CodeQL;
- physical Android validation.

## Success criterion

A user opening Plane CE on a phone should notice within a few seconds that the interface was intentionally designed for mobile, while opening the same build on desktop should still feel like normal Plane.
