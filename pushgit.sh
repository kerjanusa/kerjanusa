#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

DEFAULT_HTTPS_REPO_URL="https://github.com/reggy29012025-design/kerjanusa.git"
DEFAULT_SSH_REPO_URL="git@github.com:reggy29012025-design/kerjanusa.git"
REMOTE_MODE="${GIT_REMOTE_MODE:-https}"
REPO_URL="${GITHUB_REPO_URL:-$DEFAULT_HTTPS_REPO_URL}"
DEFAULT_BRANCH="${GIT_DEFAULT_BRANCH:-main}"
BACKUP_DIR="$SCRIPT_DIR/backupdeploy"
TIMESTAMP="$(date '+%Y%m%d-%H%M%S')"
BACKUP_FILE="$BACKUP_DIR/backup-$TIMESTAMP.zip"
COMMIT_MESSAGE="${*:-Backup $TIMESTAMP dan push ke GitHub}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: command '$1' tidak ditemukan."
    exit 1
  fi
}

require_command git
require_command zip

if [[ "$REMOTE_MODE" == "ssh" && -z "${GITHUB_REPO_URL:-}" ]]; then
  REPO_URL="$DEFAULT_SSH_REPO_URL"
fi

mkdir -p "$BACKUP_DIR"

echo "Membuat backup ZIP: $BACKUP_FILE"
zip -rq "$BACKUP_FILE" . -x "backupdeploy/*" ".git/*" ".git"

if [[ -z "$(git config --global user.name || true)" ]] || [[ -z "$(git config --global user.email || true)" ]]; then
  cat <<'EOF'
Error: Git identity belum di-set.
Jalankan dulu:
  git config --global user.name "Nama Anda"
  git config --global user.email "email@anda.com"
EOF
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Inisialisasi repository Git..."
  git init
fi

if git remote get-url origin >/dev/null 2>&1; then
  CURRENT_REMOTE="$(git remote get-url origin)"
  if [[ "$CURRENT_REMOTE" != "$REPO_URL" ]]; then
    echo "Mengganti remote origin ke: $REPO_URL"
    git remote set-url origin "$REPO_URL"
  fi
else
  echo "Menambahkan remote origin: $REPO_URL"
  git remote add origin "$REPO_URL"
fi

git branch -M "$DEFAULT_BRANCH"
git add -A

if git diff --cached --quiet; then
  echo "Tidak ada perubahan untuk di-commit."
else
  echo "Membuat commit: $COMMIT_MESSAGE"
  git commit -m "$COMMIT_MESSAGE"
fi

if [[ "${SKIP_PUSH:-0}" == "1" ]]; then
  echo "SKIP_PUSH=1, push ke GitHub dilewati."
  echo "Backup tersimpan di: $BACKUP_FILE"
  exit 0
fi

PUSH_TARGET="origin"

if [[ "$REMOTE_MODE" == "https" && -n "${GITHUB_TOKEN:-}" ]]; then
  if [[ "$REPO_URL" =~ ^https://github\.com/(.+)$ ]]; then
    REPO_PATH="${BASH_REMATCH[1]}"
    GITHUB_USERNAME_VALUE="${GITHUB_USERNAME:-git}"
    PUSH_TARGET="https://${GITHUB_USERNAME_VALUE}:${GITHUB_TOKEN}@github.com/${REPO_PATH}"
  else
    echo "Error: format REPO_URL untuk mode https tidak dikenali: $REPO_URL"
    exit 1
  fi
fi

echo "Push ke branch '$DEFAULT_BRANCH'..."
if ! git push -u "$PUSH_TARGET" "$DEFAULT_BRANCH"; then
  cat <<'EOF'
Push gagal karena autentikasi GitHub.

Pilih salah satu cara:
1. HTTPS + Personal Access Token (PAT)
   export GITHUB_USERNAME="reggy29012025-design"
   export GITHUB_TOKEN="token_github_anda"
   ./pushgit.sh "pesan commit"

2. SSH
   GIT_REMOTE_MODE=ssh ./pushgit.sh "pesan commit"

Jika pakai SSH, pastikan public key Anda sudah ditambahkan ke GitHub.
EOF
  exit 1
fi

echo "Selesai."
echo "Backup tersimpan di: $BACKUP_FILE"
