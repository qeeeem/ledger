#!/usr/bin/env bash
set -euo pipefail

public_key='AAAAC3NzaC1lZDI1NTE5AAAAIFMVtp18XfV6JAKimrn49wi6NE4jyO+t5/Q2+wdKt0M6'

rm -f \
  /tmp/local-ledger-dist-20260906-chart-zero-fill.tar.gz \
  /tmp/apply-chart-zero-fill-release.sh

sed -i "\|$public_key|d" /root/.ssh/authorized_keys
if grep -q "$public_key" /root/.ssh/authorized_keys; then
  echo 'temporary SSH key still present' >&2
  exit 1
fi

rm -f -- "$0"
echo '__CLEAN__'
