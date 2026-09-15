#!/usr/bin/env bash
set -euo pipefail

package=/tmp/local-ledger-dist-20260904-chart-focus.tar.gz
target=/var/www/local-ledger
backup=/var/www/local-ledger.backup-20260904-chart-focus
expected_hash=49c8cd1194ee977ccb0ef6198648a3d18a5853b31fbdbd2437e44b0206091ff9

printf '%s  %s\n' "$expected_hash" "$package" | sha256sum -c -
test ! -e "$backup"
cp -a "$target" "$backup"
tar -xzf "$package" -C "$target"
grep -o 'assets/index-[^" ]*\.js' "$target/index.html"
grep -o 'assets/index-[^" ]*\.css' "$target/index.html"
echo '__DEPLOYED__'
