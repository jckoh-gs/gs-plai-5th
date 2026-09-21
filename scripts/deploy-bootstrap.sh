#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
umask 077
mkdir -p artifacts/private/deploy
for name in api-token mqtt-password client-password; do
  if [ ! -s "artifacts/private/deploy/$name" ]; then openssl rand -hex 32 > "artifacts/private/deploy/$name"; fi
done
python3 - <<'PY'
from pathlib import Path
p=Path('artifacts/private/deploy')
for name in ['api-token','mqtt-password','client-password']:
    f=p/name;f.write_text(f.read_text().strip())
(p/'passwords').write_text('grid:'+ (p/'mqtt-password').read_text().strip()+'\nvpp-client:'+(p/'client-password').read_text().strip()+'\n')
PY
docker run --rm --user "$(id -u):$(id -g)" -v "$PWD/artifacts/private/deploy:/work" eclipse-mosquitto:2@sha256:6f8d8a947c506f8a2290ec65cd4bd2bc7cb4d43fb5f6271f861cb013e2ef9797 mosquitto_passwd -U /work/passwords
kubectl --context charles-k3s -n gs-plai-5h create secret generic grid-secrets --from-file=api-token=artifacts/private/deploy/api-token --from-file=mqtt-password=artifacts/private/deploy/mqtt-password --from-file=client-password=artifacts/private/deploy/client-password --from-file=passwords=artifacts/private/deploy/passwords --dry-run=client -o yaml | kubectl --context charles-k3s apply -f -
kubectl --context charles-k3s -n gs-plai-5h create configmap grid-mqtt --from-file=deploy/mosquitto.conf --from-file=deploy/acl --dry-run=client -o yaml | kubectl --context charles-k3s apply -f -
