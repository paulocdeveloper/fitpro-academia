#!/usr/bin/env bash
# Instala dependências, corrige SaaS na base, repõe master e abre o servidor.
# Ex.: bash /caminho/completo/scripts/setup-and-dev.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

if [[ ! -f package.json ]]; then
  echo "Erro: não encontrei package.json em: $ROOT"
  exit 1
fi

echo "Pasta do projeto: $ROOT"
npm install
npm run db:fix-saas
npm run db:seed-master
exec npm run dev
