#!/bin/bash
set -eu

# Merging source must never acquire packages or apply a database schema.
# These are instructions only; each release action needs its own reviewed gate.
printf '%s\n' \
  'Source merge complete. No dependencies were installed or database changes applied.' \
  'Dependency acquisition, only after its separate approval: pnpm install --frozen-lockfile' \
  'Manual application verification, with the approved matching graph: pnpm build' \
  'Database changes: prepare and review a versioned migration and rollback; obtain explicit database approval before applying either.'
