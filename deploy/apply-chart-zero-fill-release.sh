#!/usr/bin/env bash
set -euo pipefail

package=/tmp/local-ledger-dist-20260906-chart-zero-fill.tar.gz
target=/var/www/local-ledger
backup=/var/www/local-ledger.backup-20260906-chart-zero-fill
expected_hash=905358510edf60858b8b2cd4f173cdd8f0fd43785471e26c95ffc2ca318f8adf

printf '%s  %s\n' "$expected_hash" "$package" | sha256sum -c -
test ! -e "$backup"
cp -a "$target" "$backup"
tar -xzf "$package" -C "$target"
grep -q 'assets/index-c8TQ4Kyp.js' "$target/index.html"
echo '__DEPLOYED__'
