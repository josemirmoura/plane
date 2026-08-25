# Plane CE Mobile Staging Runbook

## Goal

Deploy `plane-mobile-app-ux` beside the existing Plane CE production instance so the mobile UX can be tested on a physical Android device without modifying production containers, volumes, database, ports, or source tree.

## Fixed topology

- Production root: `/opt/hubbr.plane`
- Staging root: `/opt/hubbr.plane-mobile-test`
- Git repository: `https://github.com/josemirmoura/plane.git`
- Staging branch: `plane-mobile-app-ux`
- Compose project: `plane-mobile-test`
- Default staging HTTP port: `8180`
- Default staging HTTPS reservation: `8443`
- Production is read-only during this procedure.

## Non-negotiable safety rules

1. Never run `docker compose down`, `up`, `pull`, `build`, `rm`, or volume commands from `/opt/hubbr.plane`.
2. Never reuse production container names. The staging override must remain enabled.
3. Never reuse ports 80 or 443 for staging.
4. Never mount or copy production Docker volumes into staging.
5. Never point the staging API at the production PostgreSQL, Redis, RabbitMQ, or MinIO services.
6. Never commit `.env` files or generated secrets.
7. Do not merge PR #2 or replace the production branch as part of staging validation.
8. If the real production topology differs materially from these assumptions, stop before any write operation and report the difference.

## Phase 0: read-only host inspection

Run from any neutral directory, not from the production root:

```bash
set -euo pipefail

PROD=/opt/hubbr.plane
STAGE=/opt/hubbr.plane-mobile-test

test -d "$PROD"
printf '\n== Compose projects ==\n'
docker compose ls
printf '\n== Running containers ==\n'
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
printf '\n== Listening ports ==\n'
ss -ltnp
printf '\n== Capacity ==\n'
df -h /
free -h
```

Record the output. Do not change production.

## Phase 1: prepare the isolated source tree

If `/opt/hubbr.plane-mobile-test` does not exist:

```bash
sudo install -d -o "$USER" -g "$USER" /opt/hubbr.plane-mobile-test
git clone --branch plane-mobile-app-ux --single-branch \
  https://github.com/josemirmoura/plane.git \
  /opt/hubbr.plane-mobile-test
```

If the staging directory already exists, do not delete it. Inspect it and update only by fast-forward:

```bash
cd /opt/hubbr.plane-mobile-test
git remote -v
git status --short
git fetch origin plane-mobile-app-ux
git checkout plane-mobile-app-ux
git merge --ff-only origin/plane-mobile-app-ux
```

Confirm:

```bash
git branch --show-current
git rev-parse HEAD
git status --short
```

Expected branch: `plane-mobile-app-ux`. The working tree must be clean.

## Phase 2: choose the staging origin

For the first real-device test, prefer a simple dedicated high port rather than changing the production reverse proxy.

Example:

```bash
export STAGING_ORIGIN='http://PUBLIC_VPS_IP:8180'
```

Replace `PUBLIC_VPS_IP` with the actual reachable VPS address. Do not put a placeholder into `.env`.

If port 8180 is not reachable externally, inspect the host firewall/security group before changing anything. Do not alter the production reverse proxy merely to make staging work.

## Phase 3: create staging-only environment files

Run this only for a new/disposable staging environment. If staging `.env` files already exist from a previous valid deployment, preserve them and continue to the preflight.

```bash
cd /opt/hubbr.plane-mobile-test
STAGING_ORIGIN="$STAGING_ORIGIN" \
LISTEN_HTTP_PORT=8180 \
LISTEN_HTTPS_PORT=8443 \
bash scripts/mobile-staging-bootstrap-env.sh
```

This script creates fresh environment files from repository templates and generates staging-only credentials for PostgreSQL, RabbitMQ, MinIO, Django and Plane Live. It does not copy production data or secrets.

It also sets all public Plane applications to the same staging origin. The CE Caddy proxy routes `/api`, `/auth`, `/spaces`, `/god-mode`, `/live`, static files, uploads and the web application internally.

Do not display or commit the generated `.env` contents.

## Phase 4: mandatory safety preflight

Run:

```bash
cd /opt/hubbr.plane-mobile-test
bash scripts/mobile-staging-preflight.sh
```

The preflight must pass before any container is built or started. It verifies:

- staging and production roots differ;
- the checked-out branch is `plane-mobile-app-ux`;
- the Git working tree is clean;
- staging ports do not collide with production or another process;
- all fixed upstream `container_name` values have staging-specific overrides;
- the effective Compose configuration does not reference `/opt/hubbr.plane`.

If any check fails, do not bypass it. Fix the staging configuration or report the mismatch.

## Phase 5: build and start only staging

Use both Compose files and the dedicated project name:

```bash
cd /opt/hubbr.plane-mobile-test

docker compose \
  -p plane-mobile-test \
  -f docker-compose.yml \
  -f docker-compose.mobile-staging.yml \
  up -d --build
```

Do not run the command without `-p plane-mobile-test` and the staging override.

## Phase 6: validate the staging stack

Inspect only the staging project:

```bash
cd /opt/hubbr.plane-mobile-test

docker compose \
  -p plane-mobile-test \
  -f docker-compose.yml \
  -f docker-compose.mobile-staging.yml \
  ps

docker ps --filter 'name=plane-mobile-test'
```

Expected persistent containers include the staging web, API, workers, Live, PostgreSQL, Redis, RabbitMQ, MinIO and proxy. The migrator is expected to finish rather than remain a long-running service.

Check the HTTP entry point from the VPS:

```bash
curl -I http://127.0.0.1:8180/
curl -fsS http://127.0.0.1:8180/api/health/ || true
```

If the health endpoint differs in this Plane version, inspect API routes rather than changing production.

## Phase 7: Android QA

Open the staging origin on the physical Android device and test these M1 behaviors:

1. At phone width, the desktop App Rail is absent.
2. The bottom navigation shows Home, Projects, Work items, Inbox and Search.
3. The floating `+` opens the real work-item creation flow.
4. Search opens Plane Power-K.
5. Navigation does not leave an invisible sidebar overlay.
6. Content is not hidden behind the bottom navigation.
7. The Android bottom safe area does not cover controls.
8. Workspace switcher and user menu remain usable in the compact header.
9. Rotate portrait/landscape once and return to portrait.
10. Recheck at a desktop browser width to confirm normal desktop navigation remains intact.

Use staging data only. Create a disposable workspace/project/work item if needed.

## Updating staging after a new mobile commit

```bash
cd /opt/hubbr.plane-mobile-test

git status --short
git fetch origin plane-mobile-app-ux
git merge --ff-only origin/plane-mobile-app-ux
bash scripts/mobile-staging-preflight.sh

docker compose \
  -p plane-mobile-test \
  -f docker-compose.yml \
  -f docker-compose.mobile-staging.yml \
  up -d --build
```

The preflight accepts staging ports already owned by `plane-mobile-test-proxy`, while still rejecting another process using them.

## Stopping staging

This command targets only the dedicated staging Compose project:

```bash
cd /opt/hubbr.plane-mobile-test

docker compose \
  -p plane-mobile-test \
  -f docker-compose.yml \
  -f docker-compose.mobile-staging.yml \
  down
```

Do not add `-v` during normal stop/restart because that would delete staging data.

## Full disposable reset of staging

Only when staging data is intentionally disposable and only after confirming `pwd` is `/opt/hubbr.plane-mobile-test`:

```bash
pwd
docker compose \
  -p plane-mobile-test \
  -f docker-compose.yml \
  -f docker-compose.mobile-staging.yml \
  down -v
```

This must never be executed against the production Compose project.

## Gate to M2

M1 is accepted only when:

- GitHub `React Doctor` is green;
- GitHub `Mobile web validation` format/lint/types/build is green;
- responsive Storybook screenshots complete;
- staging scripts/bootstrap/preflight pass CI;
- staging starts without production collisions;
- physical Android navigation and quick actions work;
- desktop behavior remains normal.

Only then continue with M2, the mobile Home experience.
