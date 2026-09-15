#!/usr/bin/env bash
# Run once as root on 8.148.157.132. Retains the existing ALPN certificates.
set -euo pipefail
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
umask 077
test "$(id -u)" -eq 0
test -x /root/.acme.sh/acme.sh
nginx -t
if pgrep -f '[/]root/\.acme\.sh/acme\.sh .*--(cron|renew|issue)' >/dev/null; then
  echo 'An ACME task is running. Retry after it finishes.' >&2
  exit 1
fi

configs=(
  /root/.acme.sh/8.148.157.132/8.148.157.132.conf
  /root/.acme.sh/catudio.art_ecc/catudio.art.conf
  /root/.acme.sh/ledger.catudio.art_ecc/ledger.catudio.art.conf
)
for conf in "${configs[@]}"; do
  test -f "$conf"
  test "$(grep -c '^Le_ReloadCmd=' "$conf")" -eq 1
done
backup=$(mktemp -d /root/ledger-renew-backup.XXXXXXXX)
crontab -l > "$backup/crontab"
for conf in "${configs[@]}"; do cp -p "$conf" "$backup/$(basename "$conf")"; done
for unit in ledger-acme-renew.service ledger-acme-renew.timer; do
  if test -e "/etc/systemd/system/$unit"; then
    cp -p "/etc/systemd/system/$unit" "$backup/$unit"
  fi
done
echo "Backup: $backup"

# Base64 is acme.sh's own encoding for persisted hook commands.
encoded=$(printf '%s' 'nginx -t && systemctl reload-or-restart nginx' | base64 -w 0)
for conf in "${configs[@]}"; do
  sed -i "s|^Le_ReloadCmd=.*|Le_ReloadCmd='__ACME_BASE64__START_${encoded}__ACME_BASE64__END_'|" "$conf"
done

cat > /etc/systemd/system/ledger-acme-renew.service <<'UNIT'
[Unit]
Description=Automatic ACME renewal with Nginx recovery
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
Environment="HOME=/root" "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=/root/.acme.sh/acme.sh --cron --home /root/.acme.sh
ExecStopPost=/bin/sh -c '/usr/sbin/nginx -t && /usr/bin/systemctl start nginx'
TimeoutStartSec=20min
TimeoutStopSec=90s
KillMode=control-group
StandardOutput=journal
StandardError=journal
UNIT

cat > /etc/systemd/system/ledger-acme-renew.timer <<'UNIT'
[Unit]
Description=Check ACME certificates every six hours

[Timer]
OnCalendar=*-*-* 00,06,12,18:35:00
Persistent=true
RandomizedDelaySec=120
Unit=ledger-acme-renew.service

[Install]
WantedBy=timers.target
UNIT
chmod 644 /etc/systemd/system/ledger-acme-renew.{service,timer}
systemd-analyze verify /etc/systemd/system/ledger-acme-renew.{service,timer}
systemctl daemon-reload

# Preserve unrelated cron entries. Enable the replacement before removing this one.
systemctl enable ledger-acme-renew.timer
awk '{ line=$0; gsub(/"/, "", line); if (line ~ /^[[:space:]]*#/ || index(line, "/root/.acme.sh/acme.sh --cron --home /root/.acme.sh") == 0) print }' \
  "$backup/crontab" > "$backup/crontab.updated"
crontab "$backup/crontab.updated"
systemctl start ledger-acme-renew.timer
if ! systemctl start ledger-acme-renew.service; then
  journalctl -u ledger-acme-renew.service -n 40 --no-pager
  echo 'Renewal reported an error; the timer remains enabled. See the log above.' >&2
  exit 1
fi
systemctl is-active nginx
systemctl is-enabled ledger-acme-renew.timer
systemctl list-timers ledger-acme-renew.timer --no-pager
echo 'INSTALL_OK: automatic renewal and Nginx recovery are installed.'
