#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
BACKEND_ENV="$BACKEND_DIR/.env"
VERCEL_ENV_FILE="$BACKEND_DIR/.env.vercel.runtime"
TIMESTAMP="$(date '+%Y%m%d-%H%M%S')"

SUPABASE_DB_PORT="${SUPABASE_DB_PORT:-5432}"
SUPABASE_DB_NAME="${SUPABASE_DB_NAME:-postgres}"
SUPABASE_DB_SSLMODE="${SUPABASE_DB_SSLMODE:-require}"
VERCEL_BACKEND_URL="${VERCEL_BACKEND_URL:-https://your-backend-project.vercel.app}"
VERCEL_FRONTEND_ORIGIN="${VERCEL_FRONTEND_ORIGIN:-https://uat-kerjanusa.vercel.app}"
RUN_LOCAL_MIGRATIONS="${RUN_LOCAL_MIGRATIONS:-0}"
RUN_LOCAL_SEED="${RUN_LOCAL_SEED:-0}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: command '$1' tidak ditemukan."
    exit 1
  fi
}

require_env() {
  local name="$1"

  if [[ -z "${!name:-}" ]]; then
    echo "Error: env '$name' wajib diisi."
    exit 1
  fi
}

format_env_value() {
  local value="$1"

  php -r '
    $value = $argv[1];

    if ($value === "") {
        echo "";
        exit(0);
    }

    if (preg_match("/^[A-Za-z0-9_:\\/.@,-]+$/", $value)) {
        echo $value;
        exit(0);
    }

    $escaped = addcslashes($value, "\\\"");
    echo "\"{$escaped}\"";
  ' "$value"
}

upsert_env_var() {
  local file_path="$1"
  local key="$2"
  local raw_value="$3"
  local formatted_value

  formatted_value="$(format_env_value "$raw_value")"

  php -r '
    $file = $argv[1];
    $key = $argv[2];
    $value = $argv[3];

    $line = $key . "=" . $value;
    $contents = is_file($file) ? file($file, FILE_IGNORE_NEW_LINES) : [];
    $updated = false;

    foreach ($contents as $index => $existing) {
        if (str_starts_with($existing, $key . "=")) {
            $contents[$index] = $line;
            $updated = true;
        }
    }

    if (!$updated) {
        $contents[] = $line;
    }

    file_put_contents($file, implode(PHP_EOL, $contents) . PHP_EOL);
  ' "$file_path" "$key" "$formatted_value"
}

read_env_var() {
  local file_path="$1"
  local key="$2"

  php -r '
    $file = $argv[1];
    $key = $argv[2];

    if (!is_file($file)) {
        exit(0);
    }

    foreach (file($file, FILE_IGNORE_NEW_LINES) as $line) {
        if (!str_starts_with($line, $key . "=")) {
            continue;
        }

        $value = substr($line, strlen($key) + 1);
        $value = trim($value);
        $value = trim($value, "\"");
        echo $value;
        exit(0);
    }
  ' "$file_path" "$key"
}

frontend_host_from_origin() {
  php -r '
    $origin = $argv[1];
    $host = parse_url($origin, PHP_URL_HOST);
    $port = parse_url($origin, PHP_URL_PORT);

    if (!$host) {
        echo $origin;
        exit(0);
    }

    echo $host . ($port ? ":" . $port : "");
  ' "$1"
}

require_command php

require_env SUPABASE_DB_HOST
require_env SUPABASE_DB_USER
require_env SUPABASE_DB_PASSWORD

if [[ ! -f "$BACKEND_ENV" ]]; then
  cp "$BACKEND_DIR/.env.example" "$BACKEND_ENV"
fi

cp "$BACKEND_ENV" "$BACKEND_ENV.backup-$TIMESTAMP"

echo "Backup .env dibuat: $BACKEND_ENV.backup-$TIMESTAMP"

upsert_env_var "$BACKEND_ENV" "DB_CONNECTION" "pgsql"
upsert_env_var "$BACKEND_ENV" "DB_HOST" "$SUPABASE_DB_HOST"
upsert_env_var "$BACKEND_ENV" "DB_PORT" "$SUPABASE_DB_PORT"
upsert_env_var "$BACKEND_ENV" "DB_DATABASE" "$SUPABASE_DB_NAME"
upsert_env_var "$BACKEND_ENV" "DB_USERNAME" "$SUPABASE_DB_USER"
upsert_env_var "$BACKEND_ENV" "DB_PASSWORD" "$SUPABASE_DB_PASSWORD"
upsert_env_var "$BACKEND_ENV" "DB_SSLMODE" "$SUPABASE_DB_SSLMODE"
upsert_env_var "$BACKEND_ENV" "DB_SOCKET" ""

if [[ -n "${SUPABASE_DATABASE_URL:-}" ]]; then
  upsert_env_var "$BACKEND_ENV" "DATABASE_URL" "$SUPABASE_DATABASE_URL"
fi

APP_KEY_VALUE="$(read_env_var "$BACKEND_ENV" "APP_KEY")"
FRONTEND_STATEFUL_HOST="$(frontend_host_from_origin "$VERCEL_FRONTEND_ORIGIN")"

cat > "$VERCEL_ENV_FILE" <<EOF
APP_NAME="Pintarnya"
APP_ENV=production
APP_KEY=$(format_env_value "${APP_KEY_VALUE}")
APP_DEBUG=false
APP_TIMEZONE=Asia/Jakarta
APP_URL=$(format_env_value "${VERCEL_BACKEND_URL}")
APP_STORAGE_PATH=/tmp/pintarnya-storage

LOG_CHANNEL=stderr
LOG_LEVEL=error

DB_CONNECTION=pgsql
DB_HOST=$(format_env_value "${SUPABASE_DB_HOST}")
DB_PORT=$(format_env_value "${SUPABASE_DB_PORT}")
DB_DATABASE=$(format_env_value "${SUPABASE_DB_NAME}")
DB_USERNAME=$(format_env_value "${SUPABASE_DB_USER}")
DB_PASSWORD=$(format_env_value "${SUPABASE_DB_PASSWORD}")
DB_SSLMODE=$(format_env_value "${SUPABASE_DB_SSLMODE}")
$(if [[ -n "${SUPABASE_DATABASE_URL:-}" ]]; then printf 'DATABASE_URL=%s\n' "$(format_env_value "${SUPABASE_DATABASE_URL}")"; fi)

CACHE_DRIVER=array
QUEUE_CONNECTION=sync
SESSION_DRIVER=array

MAIL_MAILER=log
MAIL_FROM_ADDRESS="noreply@pintarnya.com"
MAIL_FROM_NAME="\${APP_NAME}"

SANCTUM_STATEFUL_DOMAINS=$(format_env_value "${FRONTEND_STATEFUL_HOST}")
CORS_ALLOWED_ORIGINS=$(format_env_value "${VERCEL_FRONTEND_ORIGIN}")
EOF

echo "backend/.env diarahkan ke Supabase Postgres."
echo "Template env Vercel dibuat di: $VERCEL_ENV_FILE"

if [[ "$RUN_LOCAL_MIGRATIONS" == "1" ]]; then
  echo ""
  echo "==> Menjalankan migrasi local"
  (
    cd "$BACKEND_DIR"
    php artisan config:clear

    if [[ "$RUN_LOCAL_SEED" == "1" ]]; then
      php artisan migrate:fresh --seed
    else
      php artisan migrate:fresh
    fi
  )
fi

echo ""
echo "Nilai yang perlu Anda set di Vercel backend:"
echo "  APP_KEY"
echo "  APP_URL=$VERCEL_BACKEND_URL"
echo "  DB_CONNECTION=pgsql"
echo "  DB_HOST=$SUPABASE_DB_HOST"
echo "  DB_PORT=$SUPABASE_DB_PORT"
echo "  DB_DATABASE=$SUPABASE_DB_NAME"
echo "  DB_USERNAME=$SUPABASE_DB_USER"
echo "  DB_PASSWORD=<terisi dari script>"
echo "  DB_SSLMODE=$SUPABASE_DB_SSLMODE"
echo "  SANCTUM_STATEFUL_DOMAINS=$FRONTEND_STATEFUL_HOST"
echo "  CORS_ALLOWED_ORIGINS=$VERCEL_FRONTEND_ORIGIN"

if [[ -n "${SUPABASE_DATABASE_URL:-}" ]]; then
  echo "  DATABASE_URL=<terisi dari script>"
fi

echo ""
echo "Langkah berikutnya:"
echo "1. Review $BACKEND_ENV"
echo "2. Jika koneksi sudah benar, jalankan:"
echo "   RUN_LOCAL_MIGRATIONS=1 RUN_LOCAL_SEED=1 SUPABASE_DB_HOST=... SUPABASE_DB_USER=... SUPABASE_DB_PASSWORD=... ./setup-supabase-vercel.sh"
echo "3. Salin env dari $VERCEL_ENV_FILE ke project backend di Vercel"
