#!/usr/bin/env bash
set -euo pipefail

package=/tmp/local-ledger-dist-20260904-icons-chart.tar.gz
target=/var/www/local-ledger
backup=/var/www/local-ledger.backup-20260904-chart-order
expected_hash=c0de69b6b2069bc1057003b08753b00ba095a4ae61b22b7d244ac9ab057f6ebd

printf '%s  %s\n' "$expected_hash" "$package" | sha256sum -c -
test ! -e "$backup"
cp -a "$target" "$backup"
tar -xzf "$package" -C "$target"
grep -o 'assets/index-[^" ]*\.js' "$target/index.html"
echo '__DEPLOYED__'
