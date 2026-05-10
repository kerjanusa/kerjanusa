#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

DEFAULT_HTTPS_REPO_URL="https://github.com/kerjanusa/kerjanusa.git"
DEFAULT_SSH_REPO_URL="git@github.com:kerjanusa/kerjanusa.git"
REMOTE_NAME="${GIT_REMOTE_NAME:-kerjanusa}"
REMOTE_MODE="${GIT_REMOTE_MODE:-ssh}"
DEFAULT_BRANCH="${GIT_DEFAULT_BRANCH:-main}"
BACKUP_DIR="$SCRIPT_DIR/backupdeploy"
TIMESTAMP="$(date '+%Y%m%d-%H%M%S')"
BACKUP_FILE="$BACKUP_DIR/kerjanusa-backup-$TIMESTAMP.zip"
COMMIT_MESSAGE="${*:-Sync local changes $TIMESTAMP ke kerjanusa/kerjanusa}"
SSH_KEY_PATH="${GITHUB_SSH_KEY:-}"

if [[ -n "${GITHUB_REPO_URL:-}" ]]; then
  REPO_URL="$GITHUB_REPO_URL"
elif [[ "$REMOTE_MODE" == "https" ]]; then
  REPO_URL="$DEFAULT_HTTPS_REPO_URL"
else
  REPO_URL="$DEFAULT_SSH_REPO_URL"
fi

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: command '$1' tidak ditemukan."
    exit 1
  fi
}

require_command git
require_command zip

if [[ "$REMOTE_MODE" == "ssh" && -z "$SSH_KEY_PATH" ]]; then
  for candidate in \
    "$HOME/.ssh/id_ed25519_reggy" \
    "$HOME/.ssh/id_ed25519_kerjanusa" \
    "$HOME/.ssh/id_ed25519" \
    "$HOME/.ssh/id_rsa"
  do
    if [[ -f "$candidate" ]]; then
      SSH_KEY_PATH="$candidate"
      break
    fi
  done
fi

mkdir -p "$BACKUP_DIR"

echo "Membuat backup ZIP: $BACKUP_FILE"
zip -rq "$BACKUP_FILE" . -x "backupdeploy/*" ".git/*" ".git"

if [[ -z "$(git config user.name || true)" ]] || [[ -z "$(git config user.email || true)" ]]; then
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

if git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
  CURRENT_REMOTE="$(git remote get-url "$REMOTE_NAME")"
  if [[ "$CURRENT_REMOTE" != "$REPO_URL" ]]; then
    echo "Mengganti remote '$REMOTE_NAME' ke: $REPO_URL"
    git remote set-url "$REMOTE_NAME" "$REPO_URL"
  fi
else
  echo "Menambahkan remote '$REMOTE_NAME': $REPO_URL"
  git remote add "$REMOTE_NAME" "$REPO_URL"
fi

CURRENT_BRANCH="$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)"

if [[ -z "$CURRENT_BRANCH" ]]; then
  git checkout -B "$DEFAULT_BRANCH"
elif [[ "$CURRENT_BRANCH" != "$DEFAULT_BRANCH" ]]; then
  git branch -M "$DEFAULT_BRANCH"
fi

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

PUSH_TARGET="$REMOTE_NAME"

if [[ "$REMOTE_MODE" == "https" && -n "${GITHUB_TOKEN:-}" ]]; then
  if [[ "$REPO_URL" =~ ^https://github\.com/(.+)$ ]]; then
    REPO_PATH="${BASH_REMATCH[1]}"
    GITHUB_USERNAME_VALUE="${GITHUB_USERNAME:-git}"
    PUSH_TARGET="https://${GITHUB_USERNAME_VALUE}:${GITHUB_TOKEN}@github.com/${REPO_PATH}"
  else
    echo "Error: format REPO_URL untuk mode https tidak dikenali: $REPO_URL"
    exit 1
  fi
elif [[ "$REMOTE_MODE" == "ssh" && -n "$SSH_KEY_PATH" ]]; then
  export GIT_SSH_COMMAND="ssh -F /dev/null -i $SSH_KEY_PATH -o IdentitiesOnly=yes"
  echo "Menggunakan SSH key: $SSH_KEY_PATH"
fi

echo "Push ke remote '$REMOTE_NAME' branch '$DEFAULT_BRANCH'..."
if ! git push -u "$PUSH_TARGET" "$DEFAULT_BRANCH"; then
  cat <<'EOF'
Push gagal karena autentikasi GitHub.

Pilih salah satu cara:
1. SSH
   ./scriptgithubnusa.sh "pesan commit"

2. HTTPS + Personal Access Token (PAT)
   export GITHUB_USERNAME="kerjanusa"
   export GITHUB_TOKEN="token_github_anda"
   GIT_REMOTE_MODE=https ./scriptgithubnusa.sh "pesan commit"

Jika pakai SSH, pastikan public key Anda sudah ditambahkan ke GitHub.
EOF
  exit 1
fi

echo "Selesai."
echo "Remote yang dipakai: $REMOTE_NAME -> $REPO_URL"
echo "Backup tersimpan di: $BACKUP_FILE"
