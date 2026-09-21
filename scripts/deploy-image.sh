#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
image=${1:?Usage: deploy-image.sh 127.0.0.1:15050/grid@sha256:DIGEST}
mqtt_image=${2:?Supply immutable patched broker image as second argument}
case "$mqtt_image" in 127.0.0.1:15050/grid-mqtt@sha256:*) ;; *) echo 'Expected immutable broker digest' >&2; exit 1;; esac
case "$image" in 127.0.0.1:15050/grid@sha256:*) ;; *) echo 'Expected immutable private-registry digest' >&2; exit 1;; esac
mkdir -p artifacts/private
sed -e "s|GRID_IMAGE|$image|g" -e "s|MQTT_IMAGE|$mqtt_image|g" deploy/app.yaml > artifacts/private/app-rendered.yaml
kubectl --context charles-k3s apply -f artifacts/private/app-rendered.yaml
kubectl --context charles-k3s -n gs-plai-5h rollout status deployment/grid --timeout=180s
