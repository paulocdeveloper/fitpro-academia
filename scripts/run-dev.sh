#!/usr/bin/env bash
# Arranca o Next.js a partir da raiz do projeto (funciona mesmo que invoques com caminho absoluto).
# Ex.: bash /mnt/c/Users/.../FitPro/scripts/run-dev.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

if [[ ! -f package.json ]]; then
  echo "Erro: não encontrei package.json em: $ROOT"
  exit 1
fi

echo "Pasta do projeto: $ROOT"
exec npm run dev
