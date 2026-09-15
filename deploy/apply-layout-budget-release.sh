#!/usr/bin/env bash
set -euo pipefail

package=/tmp/local-ledger-dist-20260915-layout-budget.tar.gz
expected_hash=2d469b92ec098ea0c735e8aa4231e97bfa5417a91f82fa0e4b6ca32e534ba750
release=20260915-layout-budget
temporary_public_key='AAAAC3NzaC1lZDI1NTE5AAAAIGtCy0nvAkCAww16l4lLjusb2h9IDuGtrsSjcyNSnccj'

printf '%s  %s\n' "$expected_hash" "$package" | sha256sum -c -

if test -f /var/www/local-ledger/index.html && grep -q '小黄账本' /var/www/local-ledger/index.html; then
  target=/var/www/local-ledger
else
  mapfile -t matches < <(find /var/www -maxdepth 5 -type f -name index.html \
    ! -path '*backup*' ! -path '*/dist/*' -exec grep -l '小黄账本' {} + 2>/dev/null || true)
  if test "${#matches[@]}" -ne 1; then
    printf 'Expected one live 小黄账本 target, found %s:\n' "${#matches[@]}" >&2
    printf '%s\n' "${matches[@]:-}" >&2
    exit 1
  fi
  target=$(dirname "${matches[0]}")
fi

case "$target" in
  /var/www/*) ;;
  *) printf 'Unsafe target: %s\n' "$target" >&2; exit 1 ;;
esac

backup="${target}.backup-${release}"
test ! -e "$backup"

stage=$(mktemp -d /tmp/local-ledger-release.XXXXXX)
cleanup() { rm -rf -- "$stage"; }
trap cleanup EXIT

tar -xzf "$package" -C "$stage"
grep -q 'assets/index-53mhyiZb.js' "$stage/index.html"
grep -q 'assets/index-D9qqeRWd.css' "$stage/index.html"

cp -a -- "$target" "$backup"
cp -a -- "$stage"/. "$target"/

grep -q 'assets/index-53mhyiZb.js' "$target/index.html"
grep -q 'assets/index-D9qqeRWd.css' "$target/index.html"

sed -i "\|$temporary_public_key|d" /root/.ssh/authorized_keys
if grep -q "$temporary_public_key" /root/.ssh/authorized_keys; then
  printf 'Temporary deployment key is still authorized\n' >&2
  exit 1
fi

rm -f -- "$package" /tmp/apply-layout-budget-release.sh
printf '__DEPLOYED__ target=%s backup=%s\n' "$target" "$backup"
