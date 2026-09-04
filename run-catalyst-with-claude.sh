#!/usr/bin/env bash
set -euo pipefail

# Uses the existing local Claude Code credential without copying it into the repo.
export ANTHROPIC_API_KEY="$(jq -r '.primaryApiKey // empty' "$HOME/.claude.json")"
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "No primaryApiKey found in $HOME/.claude.json" >&2
  exit 1
fi
export DEMO_MOCK_PAYMENTS="${DEMO_MOCK_PAYMENTS:-true}"
exec catalyst serve
