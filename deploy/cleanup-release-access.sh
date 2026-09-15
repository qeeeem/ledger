#!/usr/bin/env bash
set -euo pipefail

ls -ld \
  /var/www/local-ledger.backup-20260904-icons \
  /var/www/local-ledger.backup-20260904-chart-order \
  /var/www/local-ledger.backup-20260904-chart-focus

rm -f \
  /tmp/local-ledger-dist-20260904-icons.tar.gz \
  /tmp/apply-icons-release.sh \
  /tmp/local-ledger-dist-20260904-icons-chart.tar.gz \
  /tmp/apply-icons-chart-release.sh \
  /tmp/local-ledger-dist-20260904-chart-focus.tar.gz \
  /tmp/apply-chart-focus-release.sh

sed -i '\|AAAAC3NzaC1lZDI1NTE5AAAAIL9UX0WCiZkk6X3T/PN7AcVt/lA9db1c9M6MNi3XUPg8|d' /root/.ssh/authorized_keys
if grep -q 'AAAAC3NzaC1lZDI1NTE5AAAAIL9UX0WCiZkk6X3T/PN7AcVt/lA9db1c9M6MNi3XUPg8' /root/.ssh/authorized_keys; then
  echo 'temporary SSH key still present' >&2
  exit 1
fi

rm -f -- "$0"
echo '__CLEAN__'
