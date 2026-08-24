# Plane CE Mobile Web

## Goal

Improve the responsive/mobile experience of Plane Community Edition without creating a parallel frontend or diverging unnecessarily from upstream.

## Working branch

- Upstream: `makeplane/plane`
- Fork: `josemirmoura/plane`
- Base branch: `preview`
- Feature branch: `plane-mobile-web`
- Engineering checkpoint: draft PR `josemirmoura/plane#1`

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
- settings mobile navigation with hamburger/sidebar behavior;
- inbox-specific mobile navigation and actions.

The opportunity is therefore to make these existing patterns coherent and improve responsive behavior, not to bolt on a second mobile application.

## Key findings addressed

- Issue, cycle, module, and profile work-item screens duplicated layout selection behavior. They now reuse the shared `MobileLayoutSelection` where applicable.
- The shared mobile layout selector previously rendered a Propel `Button` inside the button created by `CustomMenu`, producing nested interactive elements. The selector now uses a single semantic button.
- Module list mobile controls used `md:hidden` while the desktop module controls started at `sm`, so both sets could appear between 640 px and 767 px. The breakpoints are now aligned.
- App header flex children could resist shrinking because of `w-full` and missing `min-w-0`, increasing horizontal overflow risk with long breadcrumbs or translated labels.
- Breadcrumbs previously measured `window.innerWidth` in React state to choose mobile rendering. They now use CSS responsive rendering, avoiding a hydration-time layout switch.
- Work Item Calendar rendered its mobile detail block twice. The duplicate render was removed.
- Work Item Parent tags could force modal overflow because of `w-min` plus no-wrap behavior. Parent content now shrinks/truncates safely.
- Project and Module cards used whole-card links containing nested links/buttons/dropdowns. Navigation and card actions are now separate interactive layers.
- View creation contained invalid flex utility names (`flex-shrink0` and `flew-grow`), which prevented intended shrinking/growing behavior.
- Gantt controls allowed wrapping while the header itself used a fixed height. The header now grows when controls wrap and its view controls use semantic buttons.
- Settings and Inbox used small or non-semantic clickable navigation icons. These controls now use design-system buttons with accessible labels and larger mobile targets where the surrounding header allows it.
- Search close actions in Cycles and Views were effectively icon-sized touch targets. Their mobile targets and available input width were increased.

## Implementation phases

### Phase 0 - Fork and isolation

- [x] Fork `makeplane/plane` to `josemirmoura/plane`.
- [x] Keep `preview` as the clean synchronization branch.
- [x] Create `plane-mobile-web` from `preview`.
- [x] Keep an internal draft PR as the review/checkpoint surface.

### Phase 1 - Mobile shell and navigation

Code-level pass complete; physical validation remains pending.

- [x] Inventory mobile headers/navigation and identify duplicated patterns.
- [x] Standardize the changed mobile headers' spacing, touch targets, overflow, and safe text truncation.
- [x] Make Settings/sidebar interactions expose accessible state and use consistent mobile controls.
- [x] Prevent known horizontal overflow paths in shared headers and breadcrumbs.
- [x] Preserve desktop breakpoints/behavior in the changed shared components.

### Phase 2 - Work-item experience

Code-level pass complete; physical validation remains pending.

- [x] Improve list readability and selection behavior on narrow screens.
- [x] Protect primary Work Item identity/title while allowing secondary property content to wrap or truncate safely.
- [x] Make filters, display controls, analytics/layout controls, grouped controls, and quick actions touch friendly.
- [x] Improve Kanban card title/action behavior on phones.
- [x] Make Work Item detail layout/padding/sidebar behavior breakpoint driven.
- [x] Make create/edit modal properties and footer safe at phone widths.
- [x] Remove duplicate Calendar mobile rendering and improve Calendar controls/cards.

### Phase 3 - Project surfaces

Code-level pass complete; physical validation remains pending.

- [x] Projects list and Project cards.
- [x] Kanban/board touch behavior covered in the Work Item pass.
- [x] Cycles list/header/modal controls.
- [x] Modules list/card/modal controls.
- [x] Views list/header/modal controls.
- [x] Profile and Settings mobile navigation/actions.
- [x] Gantt degrades as a native horizontal/vertical pan surface while keeping controls reachable.

### Phase 4 - Hardening

Automated/static pass is nearing completion. The final orientation/device behavior requires the real Plane CE installation.

- [x] Review changed loading/empty/error states for narrow-width structure.
- [x] Review keyboard/focus semantics in changed navigation and action controls.
- [x] Review touch targets and scroll behavior in changed surfaces.
- [x] Stress flex layouts for long names and translated labels in the changed surfaces.
- [ ] Validate portrait/landscape and tablet transitions on a real Plane CE instance.
- [ ] Perform physical-device validation and feedback-driven cleanup.

## Validation matrix

Primary widths:

- 360 px - compact Android.
- 390 px - common modern phone.
- 412 px - large Android.
- 768 px - tablet/breakpoint transition.

For each changed surface verify:

- no unintended horizontal document overflow;
- primary actions remain reachable;
- interactive targets are comfortable for touch;
- labels truncate/wrap intentionally;
- dropdowns/modals remain inside the viewport;
- desktop rendering is unchanged.

## Automated validation bench

A fork-only GitHub Actions workflow validates the branch remotely because the local execution environment used during development cannot resolve GitHub for a normal checkout.

The bench runs:

- official Plane `oxfmt` formatting on affected workspaces;
- affected-workspace lint;
- affected-workspace TypeScript checks;
- affected-workspace build;
- React Doctor;
- CodeQL;
- copyright checks;
- `@plane/ui` Storybook build;
- Chromium/Playwright screenshots at 360, 390, 412, and 768 px.

The screenshot loop has already caught a real breadcrumb regression (an orphan separator), which was fixed before continuing.

Storybook screenshots currently exercise the shared responsive Breadcrumbs and Header primitives. Full application surfaces require either a configured Plane runtime or the final test installation and should not be replaced by fake component screenshots that bypass application state.

## Required repository checks

Follow the repository's `AGENTS.md` guidance. At minimum, before an upstream reviewable milestone:

```bash
pnpm check
pnpm build
```

The fork CI mirrors the relevant formatting, linting, type-checking, and build checks remotely during development.

## Human validation gate

Human validation is intentionally the final engineering gate, not the first debugging tool. Before any upstream contribution:

1. Finish the automated/static pass with a clean branch and CI.
2. Install `plane-mobile-web` on a real Plane CE environment.
3. Test at the primary viewport widths and on physical mobile devices.
4. Record interaction/layout feedback and apply a final cleanup pass.
5. Re-run automated checks.
6. Only then consider converting the draft checkpoint into an upstream-ready contribution.
