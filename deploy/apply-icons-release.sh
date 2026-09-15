#!/usr/bin/env bash
set -euo pipefail

package=/tmp/local-ledger-dist-20260904-icons.tar.gz
target=/var/www/local-ledger
backup=/var/www/local-ledger.backup-20260904-icons
expected_hash=51884a7f873c5c65a551393e49698e95258b8a5fd42d2c7a5b2f3a64cb6b9952

printf '%s  %s\n' "$expected_hash" "$package" | sha256sum -c -
test ! -e "$backup"
cp -a "$target" "$backup"
tar -xzf "$package" -C "$target"
grep -o 'assets/index-[^" ]*\.js' "$target/index.html"
echo '__DEPLOYED__'
