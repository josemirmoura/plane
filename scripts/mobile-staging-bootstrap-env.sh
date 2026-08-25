#!/usr/bin/env bash
set -euo pipefail

STAGE_ROOT="${STAGE_ROOT:-/opt/hubbr.plane-mobile-test}"
HTTP_PORT="${LISTEN_HTTP_PORT:-8180}"
HTTPS_PORT="${LISTEN_HTTPS_PORT:-8443}"
FORCE_ENV_BOOTSTRAP="${FORCE_ENV_BOOTSTRAP:-0}"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

command -v openssl >/dev/null 2>&1 || fail "openssl is required"
command -v python3 >/dev/null 2>&1 || fail "python3 is required"

: "${STAGING_ORIGIN:?Set STAGING_ORIGIN, for example http://203.0.113.10:8180}"
STAGING_ORIGIN="${STAGING_ORIGIN%/}"
[[ "$STAGING_ORIGIN" =~ ^https?:// ]] || fail "STAGING_ORIGIN must start with http:// or https://"

CURRENT_ROOT="$(pwd -P)"
RESOLVED_STAGE_ROOT="$(realpath -m "$STAGE_ROOT")"
[[ "$CURRENT_ROOT" == "$RESOLVED_STAGE_ROOT" ]] || fail "run from $RESOLVED_STAGE_ROOT (current: $CURRENT_ROOT)"

ENV_FILES=(
  .env
  apps/api/.env
  apps/web/.env
  apps/admin/.env
  apps/space/.env
  apps/live/.env
)

EXAMPLE_FILES=(
  .env.example
  apps/api/.env.example
  apps/web/.env.example
  apps/admin/.env.example
  apps/space/.env.example
  apps/live/.env.example
)

for file in "${EXAMPLE_FILES[@]}"; do
  [[ -f "$file" ]] || fail "missing template $file"
done

if [[ "$FORCE_ENV_BOOTSTRAP" != "1" ]]; then
  for file in "${ENV_FILES[@]}"; do
    [[ ! -e "$file" ]] || fail "$file already exists; refusing to overwrite (set FORCE_ENV_BOOTSTRAP=1 only for disposable staging)"
  done
fi

for i in "${!ENV_FILES[@]}"; do
  cp "${EXAMPLE_FILES[$i]}" "${ENV_FILES[$i]}"
done

set_env() {
  local file="$1"
  local key="$2"
  local value="$3"
  python3 - "$file" "$key" "$value" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
key = sys.argv[2]
value = sys.argv[3]
lines = path.read_text().splitlines()
replacement = f"{key}={value}"
found = False
result = []
for line in lines:
    if line.startswith(f"{key}="):
        if not found:
            result.append(replacement)
            found = True
        continue
    result.append(line)
if not found:
    result.append(replacement)
path.write_text("\n".join(result) + "\n")
PY
}

random_hex() {
  openssl rand -hex "$1"
}

POSTGRES_PASSWORD="$(random_hex 24)"
RABBITMQ_PASSWORD="$(random_hex 24)"
AWS_ACCESS_KEY_ID="staging-$(random_hex 8)"
AWS_SECRET_ACCESS_KEY="$(random_hex 32)"
DJANGO_SECRET_KEY="$(random_hex 32)"
LIVE_SERVER_SECRET_KEY="$(random_hex 32)"

# Root infrastructure environment.
set_env .env POSTGRES_USER plane
set_env .env POSTGRES_PASSWORD "$POSTGRES_PASSWORD"
set_env .env POSTGRES_DB plane
set_env .env REDIS_HOST plane-redis
set_env .env REDIS_PORT 6379
set_env .env RABBITMQ_HOST plane-mq
set_env .env RABBITMQ_PORT 5672
set_env .env RABBITMQ_USER plane
set_env .env RABBITMQ_PASSWORD "$RABBITMQ_PASSWORD"
set_env .env RABBITMQ_VHOST plane
set_env .env LISTEN_HTTP_PORT "$HTTP_PORT"
set_env .env LISTEN_HTTPS_PORT "$HTTPS_PORT"
set_env .env AWS_ACCESS_KEY_ID "$AWS_ACCESS_KEY_ID"
set_env .env AWS_SECRET_ACCESS_KEY "$AWS_SECRET_ACCESS_KEY"
set_env .env AWS_S3_ENDPOINT_URL http://plane-minio:9000
set_env .env AWS_S3_BUCKET_NAME uploads
set_env .env USE_MINIO 1
set_env .env SITE_ADDRESS :80
set_env .env MINIO_ENDPOINT_SSL 0
set_env .env CERT_EMAIL ""
set_env .env CERT_ACME_DNS ""

# API environment. All public applications share the staging origin; Caddy
# routes /api, /auth, /spaces, /god-mode and /live internally.
set_env apps/api/.env DEBUG 0
set_env apps/api/.env CORS_ALLOWED_ORIGINS "$STAGING_ORIGIN"
set_env apps/api/.env POSTGRES_USER plane
set_env apps/api/.env POSTGRES_PASSWORD "$POSTGRES_PASSWORD"
set_env apps/api/.env POSTGRES_HOST plane-db
set_env apps/api/.env POSTGRES_DB plane
set_env apps/api/.env POSTGRES_PORT 5432
set_env apps/api/.env DATABASE_URL "postgresql://plane:${POSTGRES_PASSWORD}@plane-db:5432/plane"
set_env apps/api/.env REDIS_HOST plane-redis
set_env apps/api/.env REDIS_PORT 6379
set_env apps/api/.env REDIS_URL redis://plane-redis:6379/
set_env apps/api/.env RABBITMQ_HOST plane-mq
set_env apps/api/.env RABBITMQ_PORT 5672
set_env apps/api/.env RABBITMQ_USER plane
set_env apps/api/.env RABBITMQ_PASSWORD "$RABBITMQ_PASSWORD"
set_env apps/api/.env RABBITMQ_VHOST plane
set_env apps/api/.env AWS_ACCESS_KEY_ID "$AWS_ACCESS_KEY_ID"
set_env apps/api/.env AWS_SECRET_ACCESS_KEY "$AWS_SECRET_ACCESS_KEY"
set_env apps/api/.env AWS_S3_ENDPOINT_URL http://plane-minio:9000
set_env apps/api/.env AWS_S3_BUCKET_NAME uploads
set_env apps/api/.env USE_MINIO 1
set_env apps/api/.env MINIO_ENDPOINT_SSL 0
set_env apps/api/.env WEB_URL "$STAGING_ORIGIN"
set_env apps/api/.env ADMIN_BASE_URL "$STAGING_ORIGIN"
set_env apps/api/.env ADMIN_BASE_PATH /god-mode
set_env apps/api/.env SPACE_BASE_URL "$STAGING_ORIGIN"
set_env apps/api/.env SPACE_BASE_PATH /spaces
set_env apps/api/.env APP_BASE_URL "$STAGING_ORIGIN"
set_env apps/api/.env APP_BASE_PATH ""
set_env apps/api/.env LIVE_BASE_URL "$STAGING_ORIGIN"
set_env apps/api/.env LIVE_BASE_PATH /live
set_env apps/api/.env LIVE_SERVER_SECRET_KEY "$LIVE_SERVER_SECRET_KEY"
set_env apps/api/.env SECRET_KEY "$DJANGO_SECRET_KEY"

# Frontend build-time environments.
for file in apps/web/.env apps/admin/.env apps/space/.env; do
  set_env "$file" VITE_API_BASE_URL "$STAGING_ORIGIN"
  set_env "$file" VITE_WEB_BASE_URL "$STAGING_ORIGIN"
  set_env "$file" VITE_ADMIN_BASE_URL "$STAGING_ORIGIN"
  set_env "$file" VITE_ADMIN_BASE_PATH /god-mode
  set_env "$file" VITE_SPACE_BASE_URL "$STAGING_ORIGIN"
  set_env "$file" VITE_SPACE_BASE_PATH /spaces
  set_env "$file" VITE_LIVE_BASE_URL "$STAGING_ORIGIN"
  set_env "$file" VITE_LIVE_BASE_PATH /live
done

# Live service runs on port 3000 in Dockerfile.live and is reached via /live.
set_env apps/live/.env PORT 3000
set_env apps/live/.env API_BASE_URL "$STAGING_ORIGIN"
set_env apps/live/.env WEB_BASE_URL "$STAGING_ORIGIN"
set_env apps/live/.env LIVE_BASE_URL "$STAGING_ORIGIN"
set_env apps/live/.env LIVE_BASE_PATH /live
set_env apps/live/.env LIVE_SERVER_SECRET_KEY "$LIVE_SERVER_SECRET_KEY"
set_env apps/live/.env REDIS_HOST plane-redis
set_env apps/live/.env REDIS_PORT 6379
set_env apps/live/.env REDIS_URL redis://plane-redis:6379/

chmod 600 "${ENV_FILES[@]}"

printf 'Staging environment created for %s\n' "$STAGING_ORIGIN"
printf 'HTTP port: %s | HTTPS reservation: %s\n' "$HTTP_PORT" "$HTTPS_PORT"
printf 'Secrets were generated locally and were not printed.\n'
printf 'Next: ./scripts/mobile-staging-preflight.sh\n'
