#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
image=${1:?Usage: deploy-image.sh 127.0.0.1:15050/grid@sha256:DIGEST}
mqtt_image=${2:?Supply immutable patched broker image as second argument}
mkdir -p artifacts/private
umask 077
rendered=$(mktemp artifacts/private/app-rendered.XXXXXX)
trap 'rm -f "$rendered"' EXIT
trap 'exit 130' HUP INT TERM
node scripts/render-deployment.mjs "$image" "$mqtt_image" deploy/app.yaml > "$rendered"
kubectl --context charles-k3s apply -f "$rendered"
kubectl --context charles-k3s -n gs-plai-5h rollout status deployment/grid --timeout=180s
