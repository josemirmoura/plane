# Plane CE Mobile Web

## Goal

Improve the responsive/mobile experience of Plane Community Edition without creating a parallel frontend or diverging unnecessarily from upstream.

## Working branch

- Upstream: `makeplane/plane`
- Fork: `josemirmoura/plane`
- Base branch: `preview`
- Feature branch: `plane-mobile-web`

## Engineering principles

1. Reuse and consolidate Plane's existing mobile components before creating new abstractions.
2. Keep desktop behavior unchanged unless a shared component requires a safe refactor.
3. Prefer responsive layout changes in `apps/web` and shared UI primitives over page-specific CSS patches.
4. Preserve upstream conventions, TypeScript strictness, i18n, MobX state patterns, and Plane design tokens.
5. Keep commits small enough to review and sync with upstream.
6. Avoid backend/API/schema changes unless a mobile interaction cannot be implemented with the existing API.

## Baseline findings

Plane already contains mobile-specific implementations, including:

- project list mobile header;
- project issues mobile header and mobile layout selector;
- mobile headers for modules, cycles, views, and profile;
- settings mobile navigation with hamburger/sidebar behavior.

The opportunity is therefore to make these existing patterns coherent and improve responsive behavior, not to bolt on a second mobile application.

## Implementation phases

### Phase 0 — Fork and isolation

- [x] Fork `makeplane/plane` to `josemirmoura/plane`.
- [x] Keep `preview` as the clean synchronization branch.
- [x] Create `plane-mobile-web` from `preview`.

### Phase 1 — Mobile shell and navigation

- [ ] Inventory mobile headers/navigation and identify duplicated patterns.
- [ ] Standardize mobile header height, spacing, touch targets, overflow, and safe text truncation.
- [ ] Make sidebar/hamburger interactions consistent across workspace, project, and settings contexts.
- [ ] Prevent horizontal page overflow at phone widths.
- [ ] Preserve desktop navigation behavior.

### Phase 2 — Work-item experience

- [ ] Improve issue/work-item list readability on narrow screens.
- [ ] Prioritize primary metadata and progressively hide secondary metadata.
- [ ] Ensure filters, display controls, analytics, and layout switching are comfortably tappable.
- [ ] Review create/edit interactions, drawers, modals, and menus for phone-sized viewports.

### Phase 3 — Project surfaces

- [ ] Projects list.
- [ ] Kanban/board.
- [ ] Cycles.
- [ ] Modules.
- [ ] Views.
- [ ] Profile and settings.

### Phase 4 — Mobile polish

- [ ] Loading/empty/error states.
- [ ] Keyboard and focus behavior.
- [ ] Touch/scroll interactions.
- [ ] Long names and localization stress cases.
- [ ] Orientation and tablet transition behavior.

## Validation matrix

Primary widths:

- 360 px — compact Android.
- 390 px — common modern phone.
- 412 px — large Android.
- 768 px — tablet/breakpoint transition.

For each changed surface verify:

- no unintended horizontal document overflow;
- primary actions remain reachable;
- interactive targets are comfortable for touch;
- labels truncate/wrap intentionally;
- dropdowns/modals remain inside the viewport;
- desktop rendering is unchanged.

## Required checks

Follow the repository's `AGENTS.md` guidance. At minimum, before a reviewable milestone:

```bash
pnpm check
pnpm build
```

Use targeted package/app checks during development where possible.

## Initial focus

Start with the mobile shell/header/navigation layer because it affects every later screen. Once that contract is stable, improve Issues/Work Items first, then Projects, Modules, Cycles, Views, and Settings.
