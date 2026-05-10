#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PUSH_SCRIPT="${PUSH_SCRIPT:-$SCRIPT_DIR/scriptgithubnusa.sh}"
DEFAULT_BRANCH="${GIT_DEFAULT_BRANCH:-main}"
FRONTEND_PROJECT_NAME="${FRONTEND_PROJECT_NAME:-kerjanusa}"
BACKEND_PROJECT_NAME="${BACKEND_PROJECT_NAME:-kerjanusa-backend}"
FRONTEND_PROJECT_DIR="${FRONTEND_PROJECT_DIR:-$SCRIPT_DIR/frontend}"
BACKEND_PROJECT_DIR="${BACKEND_PROJECT_DIR:-$SCRIPT_DIR/backend}"
FRONTEND_URL="${FRONTEND_URL:-https://uat-kerjanusa.vercel.app}"
FRONTEND_CHECK_URL="${FRONTEND_CHECK_URL:-$FRONTEND_URL/login}"
BACKEND_URL="${BACKEND_URL:-https://kerjanusa-backend.vercel.app}"
BACKEND_HEALTH_URL="${BACKEND_HEALTH_URL:-$BACKEND_URL/api/health}"
BACKEND_JOBS_URL="${BACKEND_JOBS_URL:-$BACKEND_URL/api/jobs}"
REQUIRE_VERCEL_LINK_CHECK="${REQUIRE_VERCEL_LINK_CHECK:-0}"
INITIAL_WAIT_SECONDS="${INITIAL_WAIT_SECONDS:-10}"
DEPLOY_TIMEOUT_SECONDS="${DEPLOY_TIMEOUT_SECONDS:-300}"
DEPLOY_POLL_INTERVAL_SECONDS="${DEPLOY_POLL_INTERVAL_SECONDS:-10}"
COMMIT_MESSAGE="${*:-Sync local ke GitHub kerjanusa dan trigger deploy frontend + backend Vercel}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: command '$1' tidak ditemukan."
    exit 1
  fi
}

ensure_non_legacy_target() {
  local value="$1"
  local label="$2"

  if [[ "$value" == *pintarnya* || "$value" == *Pintarnya* ]]; then
    echo "Error: $label masih mengarah ke target legacy Pintarnya: $value"
    exit 1
  fi
}

read_linked_vercel_project_name() {
  local project_dir="$1"
  local project_json="$project_dir/.vercel/project.json"

  if [[ ! -f "$project_json" ]]; then
    return 2
  fi

  php -r '
    $path = $argv[1];

    if (!is_file($path)) {
        exit(2);
    }

    $data = json_decode(file_get_contents($path), true);

    if (!is_array($data) || empty($data["projectName"])) {
        exit(1);
    }

    echo $data["projectName"];
  ' "$project_json"
}

assert_url_matches_base() {
  local expected_base="$1"
  local actual_url="$2"
  local label="$3"

  if [[ "$actual_url" != "$expected_base"* ]]; then
    echo "Error: $label harus memakai base URL '$expected_base', tetapi saat ini '$actual_url'."
    exit 1
  fi
}

assert_linked_vercel_project() {
  local project_dir="$1"
  local expected_project_name="$2"
  local label="$3"
  local linked_project_name=""
  local read_status=0

  if linked_project_name="$(read_linked_vercel_project_name "$project_dir" 2>/dev/null)"; then
    :
  else
    read_status=$?

    if [[ "$read_status" -eq 2 ]]; then
      return 0
    fi

    echo "Error: metadata Vercel lokal untuk $label tidak bisa dibaca: $project_dir/.vercel/project.json"
    return 1
  fi

  if [[ "$linked_project_name" != "$expected_project_name" ]]; then
    echo "Error: link Vercel lokal untuk $label masih '$linked_project_name', seharusnya '$expected_project_name'."
    echo "Relink project sebelum push:"
    echo "  (cd \"$project_dir\" && rm -rf .vercel && vercel link --yes --project \"$expected_project_name\")"
    return 1
  fi
}

maybe_assert_linked_vercel_project() {
  local project_dir="$1"
  local expected_project_name="$2"
  local label="$3"

  if [[ "$REQUIRE_VERCEL_LINK_CHECK" == "1" ]]; then
    assert_linked_vercel_project "$project_dir" "$expected_project_name" "$label" || exit 1
    return 0
  fi

  if ! assert_linked_vercel_project "$project_dir" "$expected_project_name" "$label"; then
    echo "Peringatan: verifikasi link Vercel lokal untuk $label dilewati."
    echo "Workflow push via GitHub tetap bisa lanjut, tetapi relink lokal tetap disarankan."
  fi
}

cleanup_temp_files() {
  rm -f "${TMP_FRONTEND_HEADERS:-}" "${TMP_FRONTEND_BODY:-}" \
    "${TMP_BACKEND_HEALTH_HEADERS:-}" "${TMP_BACKEND_HEALTH_BODY:-}" \
    "${TMP_BACKEND_JOBS_HEADERS:-}" "${TMP_BACKEND_JOBS_BODY:-}"
}

create_temp_files() {
  TMP_FRONTEND_HEADERS="$(mktemp)"
  TMP_FRONTEND_BODY="$(mktemp)"
  TMP_BACKEND_HEALTH_HEADERS="$(mktemp)"
  TMP_BACKEND_HEALTH_BODY="$(mktemp)"
  TMP_BACKEND_JOBS_HEADERS="$(mktemp)"
  TMP_BACKEND_JOBS_BODY="$(mktemp)"
  trap cleanup_temp_files EXIT
}

json_read() {
  local file_path="$1"
  local field_path="$2"

  php -r '
    $path = $argv[1];
    $fieldPath = $argv[2];
    $data = json_decode(file_get_contents($path), true);

    if (!is_array($data)) {
        exit(1);
    }

    $value = $data;
    foreach (explode(".", $fieldPath) as $segment) {
        if (!is_array($value) || !array_key_exists($segment, $value)) {
            exit(1);
        }
        $value = $value[$segment];
    }

    if (is_array($value)) {
        echo json_encode($value, JSON_UNESCAPED_SLASHES);
        exit(0);
    }

    if (is_bool($value)) {
        echo $value ? "true" : "false";
        exit(0);
    }

    if ($value === null) {
        echo "null";
        exit(0);
    }

    echo (string) $value;
  ' "$file_path" "$field_path"
}

http_get() {
  local url="$1"
  local headers_file="$2"
  local body_file="$3"

  curl -sS -L -D "$headers_file" -o "$body_file" -w "%{http_code}" "$url"
}

assert_positive_integer() {
  local value="$1"
  local label="$2"

  if [[ ! "$value" =~ ^[0-9]+$ ]]; then
    echo "Error: $label harus berupa angka bulat positif."
    exit 1
  fi
}

print_backend_diagnostics() {
  local health_file="$1"

  local connection=""
  local error_hint=""
  local database_url_present=""
  local db_host_present=""
  local db_host_supabase=""
  local db_port=""
  local db_database_present=""
  local db_username_present=""
  local db_username_postgres=""
  local db_password_present=""
  local db_sslmode=""

  connection="$(json_read "$health_file" "connection" 2>/dev/null || true)"
  error_hint="$(json_read "$health_file" "error_hint" 2>/dev/null || true)"
  database_url_present="$(json_read "$health_file" "env.database_url_present" 2>/dev/null || true)"
  db_host_present="$(json_read "$health_file" "env.db_host_present" 2>/dev/null || true)"
  db_host_supabase="$(json_read "$health_file" "env.db_host_supabase" 2>/dev/null || true)"
  db_port="$(json_read "$health_file" "env.db_port" 2>/dev/null || true)"
  db_database_present="$(json_read "$health_file" "env.db_database_present" 2>/dev/null || true)"
  db_username_present="$(json_read "$health_file" "env.db_username_present" 2>/dev/null || true)"
  db_username_postgres="$(json_read "$health_file" "env.db_username_postgres" 2>/dev/null || true)"
  db_password_present="$(json_read "$health_file" "env.db_password_present" 2>/dev/null || true)"
  db_sslmode="$(json_read "$health_file" "env.db_sslmode" 2>/dev/null || true)"

  echo "Diagnostik backend:"
  echo "  connection: ${connection:-unknown}"
  echo "  error_hint: ${error_hint:-unknown}"
  echo "  database_url_present: ${database_url_present:-unknown}"
  echo "  db_host_present: ${db_host_present:-unknown}"
  echo "  db_host_supabase: ${db_host_supabase:-unknown}"
  echo "  db_port: ${db_port:-unknown}"
  echo "  db_database_present: ${db_database_present:-unknown}"
  echo "  db_username_present: ${db_username_present:-unknown}"
  echo "  db_username_postgres: ${db_username_postgres:-unknown}"
  echo "  db_password_present: ${db_password_present:-unknown}"
  echo "  db_sslmode: ${db_sslmode:-unknown}"
}

verify_frontend() {
  local http_code=""
  http_code="$(http_get "$FRONTEND_CHECK_URL" "$TMP_FRONTEND_HEADERS" "$TMP_FRONTEND_BODY")"

  if [[ "$http_code" == "200" ]]; then
    return 0
  fi

  echo "Frontend belum sehat. HTTP $http_code dari $FRONTEND_CHECK_URL"
  head -n 20 "$TMP_FRONTEND_BODY" || true
  return 1
}

verify_backend_health() {
  local http_code=""
  local status=""
  local database_status=""

  http_code="$(http_get "$BACKEND_HEALTH_URL" "$TMP_BACKEND_HEALTH_HEADERS" "$TMP_BACKEND_HEALTH_BODY")"

  if [[ "$http_code" != "200" ]]; then
    echo "Backend health belum sehat. HTTP $http_code dari $BACKEND_HEALTH_URL"
    cat "$TMP_BACKEND_HEALTH_BODY" || true
    return 1
  fi

  status="$(json_read "$TMP_BACKEND_HEALTH_BODY" "status" 2>/dev/null || true)"
  database_status="$(json_read "$TMP_BACKEND_HEALTH_BODY" "database" 2>/dev/null || true)"

  if [[ "$status" == "ok" && "$database_status" == "ready" ]]; then
    return 0
  fi

  echo "Backend health merespons, tetapi belum siap penuh."
  cat "$TMP_BACKEND_HEALTH_BODY" || true
  return 1
}

verify_backend_jobs() {
  local http_code=""

  http_code="$(http_get "$BACKEND_JOBS_URL" "$TMP_BACKEND_JOBS_HEADERS" "$TMP_BACKEND_JOBS_BODY")"

  if [[ "$http_code" == "200" ]]; then
    return 0
  fi

  echo "Endpoint jobs backend belum sehat. HTTP $http_code dari $BACKEND_JOBS_URL"
  cat "$TMP_BACKEND_JOBS_BODY" || true
  return 1
}

wait_for_deploy() {
  local started_at now elapsed
  local verification_target="deployment"
  local timeout_label="deployment Vercel"
  started_at="$(date +%s)"

  if [[ "${SKIP_PUSH:-0}" == "1" ]]; then
    verification_target="endpoint live"
    timeout_label="verifikasi endpoint live"
  fi

  while true; do
    now="$(date +%s)"
    elapsed=$((now - started_at))

    echo ""
    echo "==> Verifikasi ${verification_target} (${elapsed}s)"

    local frontend_ok=0
    local backend_health_ok=0
    local backend_jobs_ok=0

    if verify_frontend; then
      frontend_ok=1
      echo "Frontend siap: $FRONTEND_CHECK_URL"
    fi

    if verify_backend_health; then
      backend_health_ok=1
      echo "Backend health siap: $BACKEND_HEALTH_URL"
    fi

    if verify_backend_jobs; then
      backend_jobs_ok=1
      echo "Backend jobs siap: $BACKEND_JOBS_URL"
    fi

    if [[ "$frontend_ok" -eq 1 && "$backend_health_ok" -eq 1 && "$backend_jobs_ok" -eq 1 ]]; then
      echo ""
      echo "Semua endpoint utama sudah sehat."
      return 0
    fi

    if [[ "$elapsed" -ge "$DEPLOY_TIMEOUT_SECONDS" ]]; then
      echo ""
      echo "Timeout menunggu ${timeout_label}."

      if [[ -s "$TMP_BACKEND_HEALTH_BODY" ]]; then
        print_backend_diagnostics "$TMP_BACKEND_HEALTH_BODY"
      fi

      return 1
    fi

    sleep "$DEPLOY_POLL_INTERVAL_SECONDS"
  done
}

if [[ ! -x "$PUSH_SCRIPT" ]]; then
  echo "Error: push script tidak ditemukan atau belum executable: $PUSH_SCRIPT"
  exit 1
fi

require_command bash
require_command curl
require_command git
require_command php

assert_positive_integer "$INITIAL_WAIT_SECONDS" "INITIAL_WAIT_SECONDS"
assert_positive_integer "$DEPLOY_TIMEOUT_SECONDS" "DEPLOY_TIMEOUT_SECONDS"
assert_positive_integer "$DEPLOY_POLL_INTERVAL_SECONDS" "DEPLOY_POLL_INTERVAL_SECONDS"

ensure_non_legacy_target "$FRONTEND_PROJECT_NAME" "FRONTEND_PROJECT_NAME"
ensure_non_legacy_target "$BACKEND_PROJECT_NAME" "BACKEND_PROJECT_NAME"
ensure_non_legacy_target "$FRONTEND_URL" "FRONTEND_URL"
ensure_non_legacy_target "$FRONTEND_CHECK_URL" "FRONTEND_CHECK_URL"
ensure_non_legacy_target "$BACKEND_URL" "BACKEND_URL"
ensure_non_legacy_target "$BACKEND_HEALTH_URL" "BACKEND_HEALTH_URL"
ensure_non_legacy_target "$BACKEND_JOBS_URL" "BACKEND_JOBS_URL"
assert_url_matches_base "$FRONTEND_URL" "$FRONTEND_CHECK_URL" "FRONTEND_CHECK_URL"
assert_url_matches_base "$BACKEND_URL" "$BACKEND_HEALTH_URL" "BACKEND_HEALTH_URL"
assert_url_matches_base "$BACKEND_URL" "$BACKEND_JOBS_URL" "BACKEND_JOBS_URL"
maybe_assert_linked_vercel_project "$FRONTEND_PROJECT_DIR" "$FRONTEND_PROJECT_NAME" "frontend"
maybe_assert_linked_vercel_project "$BACKEND_PROJECT_DIR" "$BACKEND_PROJECT_NAME" "backend"

create_temp_files

echo "==> Push ke GitHub kerjanusa"
"$PUSH_SCRIPT" "$COMMIT_MESSAGE"

LATEST_COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")"

echo ""
if [[ "${SKIP_PUSH:-0}" == "1" ]]; then
  echo "Push ke GitHub dilewati (SKIP_PUSH=1)."
  echo "Tidak ada deploy baru yang dipicu; script hanya memverifikasi endpoint live."
else
  echo "Push ke GitHub selesai."
  echo "Deployment Vercel dipicu via Git integration dari branch '$DEFAULT_BRANCH'."
fi

echo "Frontend project: $FRONTEND_PROJECT_NAME -> $FRONTEND_URL"
echo "Backend project: $BACKEND_PROJECT_NAME -> $BACKEND_URL"
if [[ "${SKIP_PUSH:-0}" == "1" ]]; then
  echo "Commit lokal saat ini: $LATEST_COMMIT"
else
  echo "Commit yang dipicu: $LATEST_COMMIT"
fi

if [[ "$INITIAL_WAIT_SECONDS" -gt 0 ]]; then
  if [[ "${SKIP_PUSH:-0}" == "1" ]]; then
    echo "Menunggu $INITIAL_WAIT_SECONDS detik sebelum mulai verifikasi endpoint live..."
  else
    echo "Menunggu $INITIAL_WAIT_SECONDS detik sebelum mulai verifikasi deployment..."
  fi
  sleep "$INITIAL_WAIT_SECONDS"
fi

wait_for_deploy

echo ""
echo "Deploy aman dipakai."
echo "Frontend: $FRONTEND_URL"
echo "Backend: $BACKEND_URL"
