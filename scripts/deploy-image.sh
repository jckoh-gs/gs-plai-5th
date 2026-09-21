#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
image=${1:?Usage: deploy-image.sh 127.0.0.1:15050/grid@sha256:DIGEST}
case "$image" in 127.0.0.1:15050/grid@sha256:*) ;; *) echo 'Expected immutable private-registry digest' >&2; exit 1;; esac
mkdir -p artifacts/private
sed "s|GRID_IMAGE|$image|g" deploy/app.yaml > artifacts/private/app-rendered.yaml
kubectl --context charles-k3s apply -f artifacts/private/app-rendered.yaml
kubectl --context charles-k3s -n gs-plai-5h rollout status deployment/grid --timeout=180s
