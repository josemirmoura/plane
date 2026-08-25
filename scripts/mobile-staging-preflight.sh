#!/usr/bin/env bash
set -euo pipefail

STAGE_ROOT="${STAGE_ROOT:-/opt/hubbr.plane-mobile-test}"
PROD_ROOT="${PROD_ROOT:-/opt/hubbr.plane}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-plane-mobile-test}"
BASE_COMPOSE="${BASE_COMPOSE:-docker-compose.yml}"
STAGING_COMPOSE="${STAGING_COMPOSE:-docker-compose.mobile-staging.yml}"
EXPECTED_BRANCH="${EXPECTED_BRANCH:-plane-mobile-app-ux}"
STAGING_PROXY_CONTAINER="${STAGING_PROXY_CONTAINER:-plane-mobile-test-proxy}"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

ok() {
  printf 'OK: %s\n' "$*"
}

read_env_value() {
  local file="$1"
  local key="$2"
  sed -n "s/^${key}=//p" "$file" | tail -n 1 | tr -d '"' | tr -d "'"
}

port_is_listening() {
  local port="$1"
  ss -ltnH | awk '{print $4}' | grep -Eq "(^|:)${port}$"
}

port_belongs_to_staging_proxy() {
  local port="$1"
  docker ps --filter "name=^/${STAGING_PROXY_CONTAINER}$" --format '{{.Ports}}' | grep -Eq "${port}->"
}

command -v docker >/dev/null 2>&1 || fail "docker is not installed"
docker compose version >/dev/null 2>&1 || fail "docker compose plugin is unavailable"

CURRENT_ROOT="$(pwd -P)"
RESOLVED_STAGE_ROOT="$(realpath -m "$STAGE_ROOT")"
RESOLVED_PROD_ROOT="$(realpath -m "$PROD_ROOT")"

[[ "$RESOLVED_STAGE_ROOT" != "$RESOLVED_PROD_ROOT" ]] || fail "staging and production roots resolve to the same path"
[[ "$CURRENT_ROOT" == "$RESOLVED_STAGE_ROOT" ]] || fail "run this script from $RESOLVED_STAGE_ROOT (current: $CURRENT_ROOT)"
[[ -d "$RESOLVED_PROD_ROOT" ]] || fail "production root $RESOLVED_PROD_ROOT was not found; refusing to assume topology"
[[ -f "$BASE_COMPOSE" ]] || fail "$BASE_COMPOSE not found"
[[ -f "$STAGING_COMPOSE" ]] || fail "$STAGING_COMPOSE not found"
[[ -f .env ]] || fail "staging .env not found"

ok "staging root is isolated from production"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  CURRENT_BRANCH="$(git branch --show-current)"
  [[ "$CURRENT_BRANCH" == "$EXPECTED_BRANCH" ]] || fail "expected branch $EXPECTED_BRANCH, found $CURRENT_BRANCH"
  [[ -z "$(git status --porcelain)" ]] || fail "working tree is dirty"
  ok "branch is $EXPECTED_BRANCH and working tree is clean"
fi

HTTP_PORT="$(read_env_value .env LISTEN_HTTP_PORT)"
HTTPS_PORT="$(read_env_value .env LISTEN_HTTPS_PORT)"
[[ -n "$HTTP_PORT" ]] || fail "LISTEN_HTTP_PORT is missing from staging .env"
[[ -n "$HTTPS_PORT" ]] || fail "LISTEN_HTTPS_PORT is missing from staging .env"
[[ "$HTTP_PORT" != "80" ]] || fail "staging must not bind production HTTP port 80"
[[ "$HTTPS_PORT" != "443" ]] || fail "staging must not bind production HTTPS port 443"
[[ "$HTTP_PORT" != "$HTTPS_PORT" ]] || fail "staging HTTP and HTTPS ports must differ"

if [[ -f "$RESOLVED_PROD_ROOT/.env" ]]; then
  PROD_HTTP_PORT="$(read_env_value "$RESOLVED_PROD_ROOT/.env" LISTEN_HTTP_PORT)"
  PROD_HTTPS_PORT="$(read_env_value "$RESOLVED_PROD_ROOT/.env" LISTEN_HTTPS_PORT)"
  [[ -z "$PROD_HTTP_PORT" || "$HTTP_PORT" != "$PROD_HTTP_PORT" ]] || fail "staging HTTP port matches production ($HTTP_PORT)"
  [[ -z "$PROD_HTTPS_PORT" || "$HTTPS_PORT" != "$PROD_HTTPS_PORT" ]] || fail "staging HTTPS port matches production ($HTTPS_PORT)"
fi

if command -v ss >/dev/null 2>&1; then
  if port_is_listening "$HTTP_PORT" && ! port_belongs_to_staging_proxy "$HTTP_PORT"; then
    fail "staging HTTP port $HTTP_PORT is already owned by another process/container"
  fi
  if port_is_listening "$HTTPS_PORT" && ! port_belongs_to_staging_proxy "$HTTPS_PORT"; then
    fail "staging HTTPS port $HTTPS_PORT is already owned by another process/container"
  fi
fi
ok "staging ports $HTTP_PORT/$HTTPS_PORT are free or already owned by the staging proxy"

COMPOSE_CMD=(docker compose -p "$COMPOSE_PROJECT" -f "$BASE_COMPOSE" -f "$STAGING_COMPOSE")
CONFIG="$("${COMPOSE_CMD[@]}" config)"

EXPECTED_CONTAINERS=(
  plane-mobile-test-web
  plane-mobile-test-admin
  plane-mobile-test-space
  plane-mobile-test-api
  plane-mobile-test-bgworker
  plane-mobile-test-beatworker
  plane-mobile-test-migrator
  plane-mobile-test-live
  plane-mobile-test-db
  plane-mobile-test-redis
  plane-mobile-test-mq
  plane-mobile-test-minio
  plane-mobile-test-proxy
)

for name in "${EXPECTED_CONTAINERS[@]}"; do
  grep -Fq "container_name: $name" <<<"$CONFIG" || fail "compose config does not isolate container $name"
done

if grep -Fq "$RESOLVED_PROD_ROOT" <<<"$CONFIG"; then
  fail "compose config references production root $RESOLVED_PROD_ROOT"
fi

ok "all fixed container names are staging-specific"
ok "compose config contains no reference to production root"

printf '\nPreflight passed. Safe command to build/start staging:\n'
printf 'docker compose -p %q -f %q -f %q up -d --build\n' "$COMPOSE_PROJECT" "$BASE_COMPOSE" "$STAGING_COMPOSE"
