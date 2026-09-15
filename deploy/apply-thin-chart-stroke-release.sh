#!/usr/bin/env bash
set -euo pipefail

package=/tmp/local-ledger-dist-20260906-thin-chart-stroke.tar.gz
target=/var/www/local-ledger
backup=/var/www/local-ledger.backup-20260906-thin-chart-stroke
expected_hash=7b8a861667a97428313cf9c68669c732c926f56e4798c3922a21b0a684169c0a

printf '%s  %s\n' "$expected_hash" "$package" | sha256sum -c -
test ! -e "$backup"
cp -a "$target" "$backup"
tar -xzf "$package" -C "$target"
grep -q 'assets/index-BHCEOnam.js' "$target/index.html"
echo '__DEPLOYED__'
