"""Linux-only isolated checks; never invokes the host's systemctl or ACME client."""
import base64
import os
from pathlib import Path
import re
import subprocess
import tempfile

project = Path(__file__).resolve().parents[1]
installer = (project / 'deploy/install-acme-renew-service.sh').read_text()
acme = (project.parent / '.tmp-acme-sh/acme.sh').read_text()
installcert = re.search(r'^_installcert\(\) \{.*?^\}', acme, re.M | re.S).group()
old_hook = 'systemctl reload nginx'
new_hook = 'nginx -t && systemctl reload-or-restart nginx'

with tempfile.TemporaryDirectory(prefix='ledger-acme-test-') as directory:
    root = Path(directory)
    bindir = root / 'bin'
    bindir.mkdir()

    def executable(name, body):
        path = bindir / name
        path.write_text('#!/bin/bash\n' + body + '\n')
        path.chmod(0o700)

    env = dict(os.environ, PATH=str(bindir) + ':' + os.environ['PATH'], FIXTURE=str(root))
    executable('nginx', 'exit 0')
    executable('systemctl', '''
case "$1" in
  reload) test "$(cat "$FIXTURE/state")" = active ;;
  start|reload-or-restart) echo active > "$FIXTURE/state" ;;
  *) exit 0 ;;
esac''')
    # Exercise acme.sh's real installation hook, which precedes its post-hook.
    for hook, expected in [(old_hook, 1), (new_hook, 0)]:
        (root / 'state').write_text('inactive\n')
        script = '''
_info() { :; }; _err() { :; }; __green() { :; }
_time() { echo 1; }; _time2str() { echo now; }; _savedomainconf() { :; }
DOMAIN_PATH="$FIXTURE"
DOMAIN_BACKUP_PATH="$FIXTURE/backup"
''' + installcert + '\n_installcert test "" "" "" "" "$1"\n'
        result = subprocess.run(['bash', '-c', script, 'test', hook], env=env)
        assert result.returncode == expected, (hook, result.returncode)
        assert (root / 'state').read_text().strip() == ('active' if expected == 0 else 'inactive')
    print('PASS: original reload fails with stopped Nginx; repaired ACME installation starts it')

    # Execute the installer in an isolated filesystem with command doubles.
    names = ['8.148.157.132/8.148.157.132', 'catudio.art_ecc/catudio.art',
             'ledger.catudio.art_ecc/ledger.catudio.art']
    originals = {}
    for name in names:
        path = root / 'root/.acme.sh' / (name + '.conf')
        path.parent.mkdir(parents=True, exist_ok=True)
        originals[path] = "Le_Webroot='alpn'\nLe_RealKeyPath='/keep/key.pem'\nLe_PreHook='keep'\nLe_PostHook='keep'\n"
        path.write_text(originals[path] + "Le_ReloadCmd='__ACME_BASE64__START_" +
                        base64.b64encode(old_hook.encode()).decode() + "__ACME_BASE64__END_'\n")
    client = root / 'root/.acme.sh/acme.sh'
    client.write_text('#!/bin/sh\nexit 0\n')
    client.chmod(0o700)
    (root / 'etc/systemd/system').mkdir(parents=True)
    original_cron = ('# keep this comment\n1 2 * * * /usr/local/bin/backup\n'
                     '35 0,6,12,18 * * * "/root/.acme.sh"/acme.sh --cron --home "/root/.acme.sh" > /dev/null\n')
    (root / 'crontab').write_text(original_cron.replace('/root/', str(root) + '/root/'))
    executable('crontab', 'if [ "$1" = -l ]; then cat "$FIXTURE/crontab"; else cp "$1" "$FIXTURE/crontab"; fi')
    executable('pgrep', 'exit 1')
    executable('id', 'echo 0')
    executable('systemd-analyze', 'exit 0')
    isolated = installer.replace('/root/', str(root) + '/root/').replace(
        '/etc/systemd/system', str(root) + '/etc/systemd/system').replace(
        'export PATH=', 'export PATH=' + str(bindir) + ':')
    for _ in range(2):
        result = subprocess.run(['bash'], input=isolated, text=True, env=env, capture_output=True)
        assert result.returncode == 0, result.stdout + result.stderr
    assert (root / 'crontab').read_text() == '# keep this comment\n1 2 * * * /usr/local/bin/backup\n'
    for path, original in originals.items():
        updated = path.read_text()
        assert updated.startswith(original)
        encoded = re.search('__ACME_BASE64__START_(.*?)__ACME_BASE64__END_', updated).group(1)
        assert base64.b64decode(encoded).decode() == new_hook
    assert len(list((root / 'root').glob('ledger-renew-backup.*'))) == 2
    print('PASS: installer is repeatable, backs up settings, preserves certificate paths and unrelated cron jobs')

    # Validate the generated real unit syntax without loading any service.
    units = root / 'etc/systemd/system'
    service = units / 'ledger-acme-renew.service'
    assert "ExecStopPost=/bin/sh -c '/usr/sbin/nginx -t && /usr/bin/systemctl start nginx'" in service.read_text()
    result = subprocess.run(['/usr/bin/systemd-analyze', 'verify', str(service),
                             str(units / 'ledger-acme-renew.timer')], capture_output=True, text=True)
    assert result.returncode == 0, result.stdout + result.stderr
    print('PASS: systemd validates the generated service and timer; failure recovery is configured')
