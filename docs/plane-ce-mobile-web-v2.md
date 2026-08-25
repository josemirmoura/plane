# Plane CE Mobile Web v2

## Goal

Provide a touch-first web experience for Plane Community Edition without creating a native app and without changing the desktop Plane experience.

- Desktop stays on the existing Plane routes.
- Phones use an isolated `/app/:workspaceSlug/...` route tree.
- Both experiences share the same authentication session, backend, database, permissions, and Plane services.
- The implementation is a clean-room Community web layer informed by Plane CE source code, public documentation, the archived open-source Plane Mobile v1, and observable mobile UX patterns. It does not depend on closed-source mobile application code.

## Route model

| Mobile web | Existing desktop equivalent |
| --- | --- |
| `/app/:workspaceSlug` | `/:workspaceSlug` |
| `/app/:workspaceSlug/projects` | `/:workspaceSlug/projects` |
| `/app/:workspaceSlug/projects/:projectId` | `/:workspaceSlug/projects/:projectId/issues` |
| `/app/:workspaceSlug/projects/:projectId/work-items/:issueId` | `/:workspaceSlug/projects/:projectId/issues/:issueId` |
| `/app/:workspaceSlug/projects/:projectId/cycles/:cycleId` | `/:workspaceSlug/projects/:projectId/cycles/:cycleId` |
| `/app/:workspaceSlug/projects/:projectId/modules/:moduleId` | `/:workspaceSlug/projects/:projectId/modules/:moduleId` |
| `/app/:workspaceSlug/projects/:projectId/pages/:pageId` | `/:workspaceSlug/projects/:projectId/pages/:pageId` |
| `/app/:workspaceSlug/inbox` | `/:workspaceSlug/notifications` |
| `/app/:workspaceSlug/search` | Plane workspace search |
| `/app/:workspaceSlug/settings` | `/:workspaceSlug/settings` |

## Phone routing

`MobileWebRedirect` runs inside the existing root provider.

- A phone visiting a normal workspace route is redirected to the corresponding `/app` route.
- Auth, onboarding, God Mode, account, root, and other reserved routes are never redirected.
- Tablets and desktop-sized viewports keep the normal Plane experience.
- Choosing **Open desktop version** stores a local opt-out.
- Adding `?mobile=1` to a normal workspace URL clears that opt-out and returns the phone to mobile routing.
- `?desktop=1` can explicitly keep desktop mode.

## UX principles

The mobile layer is not desktop CSS squeezed into a narrow viewport.

- fixed bottom navigation: Home, Inbox, Search, Create;
- 44px+ touch targets;
- bottom sheets for compact decisions;
- full-screen work item flows;
- minimal headers and breadcrumbs;
- large readable typography;
- vertical cards/lists instead of dense desktop tables;
- safe-area support for phone status/navigation bars;
- same light/dark Plane theme tokens.

## Implemented flows

### Home

- workspace selector;
- projects, with favorites first;
- Your Work from the current user's assigned work items;
- recent visits/activity;
- shortcuts to Search and Settings.

### Projects

- list and filter projects;
- project overview;
- Work Items, Cycles, Modules, and Pages sections;
- cycle/module detail with contained work items.

### Work items

- open a work item;
- edit title and description;
- state, priority, assignee, and due date;
- labels display;
- sub-items;
- comments list and new comments;
- quick work-item creation.

### Global

- Inbox with All, Unread, and Mentions filters;
- workspace search;
- quick create for Work Item, Project, and Page;
- workspace switching;
- workspace settings;
- theme switching;
- desktop-mode escape hatch.

### Pages

Project Page listing, navigation, creation, and title editing are mobile-native. The existing collaborative rich-text/Yjs editor is intentionally opened in the existing Plane editor until a dedicated mobile editor adapter has the same persistence and collaboration guarantees. This avoids risking document corruption merely to mimic a mobile editor visually.

## Reused CE services

The mobile layer directly reuses current Plane CE service classes, including:

- `WorkspaceService`
- `UserService`
- `ProjectService`
- `IssueService`
- `IssueCommentService`
- `CycleService`
- `ModuleService`
- `ProjectPageService`

Axios remains credentialed through Plane's existing `APIService`, so no second authentication scheme or API key is introduced.

## Non-goals

- no APK;
- no native Android/iOS project;
- no separate mobile backend;
- no duplicated Plane database;
- no requirement to install a PWA;
- no changes to desktop information architecture;
- no extracted/decompiled closed-source Plane mobile code.

## Validation gates

Before deployment to a development instance:

1. React Router route generation/type generation succeeds.
2. `pnpm --filter web check:types` succeeds.
3. `pnpm --filter web build` succeeds.
4. Production paths remain unchanged in the diff except for the small redirect hook and route registration.
5. Mobile route mapping is reversible.
6. No production deployment is performed from this branch.

After deployment to a development instance, physical-device validation should cover:

- Chrome Android narrow viewport;
- Android back button;
- keyboard opening/closing while editing;
- dark/light theme;
- session expiry/login return path;
- workspace switching;
- project/work-item CRUD;
- Inbox and Search;
- deep links from desktop-style URLs;
- explicit desktop opt-out and `?mobile=1` return;
- safe-area behavior and rotation.

## Deployment boundary

This branch is designed to be deployed only to an existing development/staging Plane installation for device testing. Production must remain on the normal Plane CE build until the development validation gate is explicitly passed.
