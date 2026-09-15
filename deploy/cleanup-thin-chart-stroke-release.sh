#!/usr/bin/env bash
set -euo pipefail

public_key='AAAAC3NzaC1lZDI1NTE5AAAAIOIfqCc0jsoe4/YFosdiaKtdZm9mq83wnMDkyTs0B0Rh'

rm -f \
  /tmp/local-ledger-dist-20260906-thin-chart-stroke.tar.gz \
  /tmp/apply-thin-chart-stroke-release.sh

sed -i "\|$public_key|d" /root/.ssh/authorized_keys
if grep -q "$public_key" /root/.ssh/authorized_keys; then
  echo 'temporary SSH key still present' >&2
  exit 1
fi

rm -f -- "$0"
echo '__CLEAN__'
