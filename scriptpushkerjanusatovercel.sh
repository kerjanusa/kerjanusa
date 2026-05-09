#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PUSH_SCRIPT="${PUSH_SCRIPT:-$SCRIPT_DIR/scriptgithubnusa.sh}"
DEFAULT_BRANCH="${GIT_DEFAULT_BRANCH:-main}"
VERCEL_PROJECT_NAME="${VERCEL_PROJECT_NAME:-kerjanusa}"
VERCEL_PROJECT_URL="${VERCEL_PROJECT_URL:-https://uat-kerjanusa.vercel.app}"
VERCEL_SCOPE="${VERCEL_SCOPE:-}"
VERCEL_WAIT_SECONDS="${VERCEL_WAIT_SECONDS:-0}"
COMMIT_MESSAGE="${*:-Sync local ke GitHub kerjanusa dan trigger deploy Vercel}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: command '$1' tidak ditemukan."
    exit 1
  fi
}

if [[ ! -x "$PUSH_SCRIPT" ]]; then
  echo "Error: push script tidak ditemukan atau belum executable: $PUSH_SCRIPT"
  exit 1
fi

require_command bash

echo "==> Push ke GitHub kerjanusa"
"$PUSH_SCRIPT" "$COMMIT_MESSAGE"

LATEST_COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")"

echo ""
echo "Push ke GitHub selesai."
echo "Deployment Vercel dipicu via Git integration dari GitHub branch '$DEFAULT_BRANCH'."
echo "Commit yang dipicu: $LATEST_COMMIT"
echo "Target domain: $VERCEL_PROJECT_URL"

if ! command -v vercel >/dev/null 2>&1; then
  echo "Vercel CLI tidak ditemukan, verifikasi deployment via CLI dilewati."
  exit 0
fi

VERCEL_ARGS=()
if [[ -n "$VERCEL_SCOPE" ]]; then
  VERCEL_ARGS+=(--scope "$VERCEL_SCOPE")
fi

if vercel whoami >/dev/null 2>&1; then
  echo "Akun Vercel aktif: $(vercel whoami)"
else
  echo "Vercel CLI belum login. Deployment tetap bisa jalan lewat GitHub integration."
  exit 0
fi

if ! vercel project inspect "$VERCEL_PROJECT_NAME" "${VERCEL_ARGS[@]}" >/dev/null 2>&1; then
  echo "Project Vercel '$VERCEL_PROJECT_NAME' tidak bisa diakses dari scope aktif CLI."
  echo "Deployment tetap akan berjalan otomatis lewat GitHub integration."
  echo "Jika ingin cek dari CLI, login/switch ke workspace Vercel yang benar lalu jalankan ulang script ini."
  exit 0
fi

if [[ "$VERCEL_WAIT_SECONDS" =~ ^[0-9]+$ ]] && [[ "$VERCEL_WAIT_SECONDS" -gt 0 ]]; then
  echo "Menunggu $VERCEL_WAIT_SECONDS detik sebelum cek deployment Vercel..."
  sleep "$VERCEL_WAIT_SECONDS"
fi

echo ""
echo "==> Deployment terbaru di Vercel"
vercel ls "$VERCEL_PROJECT_NAME" "${VERCEL_ARGS[@]}"
