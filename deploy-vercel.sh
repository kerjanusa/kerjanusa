#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
EXPECTED_BACKEND_PROJECT_NAME="${EXPECTED_BACKEND_PROJECT_NAME:-kerjanusa-backend}"
EXPECTED_FRONTEND_PROJECT_NAME="${EXPECTED_FRONTEND_PROJECT_NAME:-kerjanusa}"
REQUIRED_VERCEL_USER="${REQUIRED_VERCEL_USER:-muhamadlutfichandra-7217}"
REQUIRED_VERCEL_ORG_ID="${REQUIRED_VERCEL_ORG_ID:-}"

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Command '$command_name' tidak ditemukan. Install dulu sebelum deploy."
    exit 1
  fi
}

ensure_non_legacy_target() {
  local value="$1"
  local label="$2"

  if [[ "$value" == *pintarnya* || "$value" == *Pintarnya* ]]; then
    echo "$label masih mengarah ke target legacy Pintarnya: $value"
    exit 1
  fi
}

ensure_vercel_auth() {
  local auth_output=""

  if auth_output="$(vercel whoami 2>&1)"; then
    if [[ "$auth_output" != "$REQUIRED_VERCEL_USER" ]]; then
      echo "Autentikasi Vercel tidak sesuai target deploy."
      echo "Akun aktif: $auth_output"
      echo "Akun wajib: $REQUIRED_VERCEL_USER"
      echo "Login ulang dengan akun $REQUIRED_VERCEL_USER sebelum deploy."
      exit 1
    fi

    echo "Authenticated as: $auth_output"
    return
  fi

  echo "Autentikasi Vercel tidak valid."

  if [[ -n "${VERCEL_TOKEN:-}" ]]; then
    echo "Environment variable VERCEL_TOKEN terdeteksi, tetapi token tersebut tidak valid atau sudah expired."
    echo "Generate token baru lalu export ulang, atau unset token lama sebelum deploy."
    echo "Contoh:"
    echo "  unset VERCEL_TOKEN"
    echo "  vercel login"
    echo "  # atau"
    echo "  export VERCEL_TOKEN=token_baru_anda"
  else
    echo "Session login Vercel CLI lokal tidak valid atau sudah expired."
    echo "Jalankan:"
    echo "  vercel login"
    echo "Jika Anda ingin deploy non-interaktif, gunakan token baru:"
    echo "  export VERCEL_TOKEN=token_baru_anda"
  fi

  echo ""
  echo "Detail CLI:"
  echo "$auth_output"
  exit 1
}

ensure_vercel_link() {
  local project_dir="$1"
  local label="$2"

  if [[ ! -d "$project_dir/.vercel" ]]; then
    echo "Project $label belum ter-link ke Vercel."
    echo "Jalankan dulu: (cd \"$project_dir\" && vercel link)"
    exit 1
  fi
}

read_linked_project_name() {
  local project_dir="$1"
  local project_json="$project_dir/.vercel/project.json"

  php -r '
    $path = $argv[1];
    if (!is_file($path)) {
        exit(1);
    }

    $data = json_decode(file_get_contents($path), true);
    if (!is_array($data) || empty($data["projectName"])) {
        exit(1);
    }

    echo $data["projectName"];
  ' "$project_json"
}

read_linked_project_field() {
  local project_dir="$1"
  local field_name="$2"
  local project_json="$project_dir/.vercel/project.json"

  php -r '
    $path = $argv[1];
    $field = $argv[2];

    if (!is_file($path)) {
        exit(1);
    }

    $data = json_decode(file_get_contents($path), true);
    if (!is_array($data) || empty($data[$field])) {
        exit(1);
    }

    echo $data[$field];
  ' "$project_json" "$field_name"
}

ensure_vercel_project_access() {
  local project_dir="$1"
  local label="$2"
  local expected_project_name="$3"
  local project_name=""
  local org_id=""

  if ! project_name="$(read_linked_project_name "$project_dir")"; then
    echo "Link Vercel untuk $label tidak bisa dibaca dari .vercel/project.json."
    echo "Jalankan ulang link project:"
    echo "  (cd \"$project_dir\" && rm -rf .vercel && vercel link)"
    exit 1
  fi

  if ! org_id="$(read_linked_project_field "$project_dir" "orgId")"; then
    echo "Org ID untuk link $label tidak bisa dibaca dari .vercel/project.json."
    exit 1
  fi

  if [[ -n "$expected_project_name" && "$project_name" != "$expected_project_name" ]]; then
    echo "Link Vercel untuk $label mengarah ke project yang salah."
    echo "Project saat ini: $project_name"
    echo "Project wajib: $expected_project_name"
    echo "Relink project sebelum deploy:"
    echo "  (cd \"$project_dir\" && rm -rf .vercel && vercel link --yes --project \"$expected_project_name\")"
    exit 1
  fi

  if [[ -n "$REQUIRED_VERCEL_ORG_ID" && "$org_id" != "$REQUIRED_VERCEL_ORG_ID" ]]; then
    echo "Link Vercel untuk $label mengarah ke workspace yang salah."
    echo "Org ID saat ini: $org_id"
    echo "Org ID wajib: $REQUIRED_VERCEL_ORG_ID"
    echo "Relink project ke workspace Vercel yang benar sebelum deploy."
    exit 1
  fi

  if vercel project inspect "$project_name" >/dev/null 2>&1; then
    return
  fi

  echo "Link Vercel untuk $label tidak valid atau project \"$project_name\" sudah tidak ada di scope aktif."
  echo "Perbaiki link project dengan:"
  echo "  (cd \"$project_dir\" && rm -rf .vercel && vercel link --yes --project \"$project_name\")"
  echo "Jika project belum ada, buat dulu dengan:"
  echo "  vercel project add \"$project_name\""
  exit 1
}

print_linked_project_summary() {
  local project_dir="$1"
  local label="$2"
  local project_name=""
  local org_id=""

  project_name="$(read_linked_project_field "$project_dir" "projectName" 2>/dev/null || true)"
  org_id="$(read_linked_project_field "$project_dir" "orgId" 2>/dev/null || true)"

  if [[ -n "$project_name" && -n "$org_id" ]]; then
    echo "$label -> $project_name ($org_id)"
    return
  fi

  echo "$label -> link metadata tidak lengkap"
}

deploy_project() {
  local project_dir="$1"
  local label="$2"

  echo ""
  echo "==> Deploying $label"
  (
    cd "$project_dir"
    vercel --prod --yes
  )
}

run_backend_migrations() {
  echo ""
  echo "==> Running backend production migrations"
  (
    cd "$BACKEND_DIR"
    vercel env run -e production -- php artisan migrate --force
  )
}

run_backend_seeders() {
  echo ""
  echo "==> Running backend production seeders"
  (
    cd "$BACKEND_DIR"
    vercel env run -e production -- php artisan db:seed --force
  )
}

require_command vercel
require_command php
ensure_non_legacy_target "$EXPECTED_BACKEND_PROJECT_NAME" "EXPECTED_BACKEND_PROJECT_NAME"
ensure_non_legacy_target "$EXPECTED_FRONTEND_PROJECT_NAME" "EXPECTED_FRONTEND_PROJECT_NAME"
ensure_vercel_auth

ensure_vercel_link "$BACKEND_DIR" "backend"
ensure_vercel_link "$FRONTEND_DIR" "frontend"
ensure_vercel_project_access "$BACKEND_DIR" "backend" "$EXPECTED_BACKEND_PROJECT_NAME"
ensure_vercel_project_access "$FRONTEND_DIR" "frontend" "$EXPECTED_FRONTEND_PROJECT_NAME"

echo "Linked projects:"
print_linked_project_summary "$BACKEND_DIR" "backend"
print_linked_project_summary "$FRONTEND_DIR" "frontend"

deploy_project "$BACKEND_DIR" "backend"

if [[ "${RUN_PROD_MIGRATIONS:-0}" == "1" ]]; then
  run_backend_migrations
fi

if [[ "${RUN_PROD_SEED:-0}" == "1" ]]; then
  run_backend_seeders
fi

deploy_project "$FRONTEND_DIR" "frontend"

echo ""
echo "Deploy selesai."
echo "Set RUN_PROD_MIGRATIONS=1 jika ingin sekaligus menjalankan migrate production."
echo "Set RUN_PROD_SEED=1 jika ingin sekaligus menjalankan seed production."
