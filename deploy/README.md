# Private k3s deployment

Target: `charles-k3s`, namespace `gs-plai-5h`, single amd64 node `charleskoh-nucbox-g3`.

The image registry binds only node loopback `127.0.0.1:15050`. k3s/containerd uses loopback HTTP by default; no cluster runtime configuration changes are required. Image uploads use an authenticated Kubernetes API port-forward, never a public registry port. Registry contents persist on a dedicated local-path PVC. The app is pinned by immutable digest and scheduled to that node.

Bootstrap:

```sh
kubectl --context charles-k3s apply -f deploy/registry.yaml
kubectl --context charles-k3s -n gs-plai-5h rollout status deployment/grid-registry
kubectl --context charles-k3s -n gs-plai-5h port-forward deployment/grid-registry 15050:15050
# Separate terminal:
./scripts/deploy-bootstrap.sh
docker buildx build --builder desktop-linux --platform linux/amd64 --provenance=false --output type=oci,dest=artifacts/private/grid-image.oci.tar .
python3 scripts/oci-push.py artifacts/private/grid-image.oci.tar checkpoint-TIMESTAMP
./scripts/deploy-image.sh 127.0.0.1:15050/grid@sha256:RETURNED_DIGEST
```

Access:

```sh
kubectl --context charles-k3s -n gs-plai-5h port-forward deployment/grid 3101:3001 18884:1883
```

UI: `http://127.0.0.1:3101`. API token is stored in the ignored, mode-0600 `artifacts/private/deploy/api-token` file and `grid-secrets` Secret. External VPP client uses MQTT user `vpp-client`, secret from `artifacts/private/deploy/client-password`, broker `mqtt://127.0.0.1:18884`. Emulator uses separate `grid` credentials. Broker ACL limits the external client to telemetry/ack/status reads and command writes. MQTT and HTTP traverse encrypted Kubernetes tunnels, with no public NodePort or ingress. A deny-all ingress NetworkPolicy isolates the pod; app-to-broker traffic stays within the pod. No TLS bypass is used. Tunnel lifetime is separate from remote deployment lifetime.

App and MQTT persistence share a 5Gi PVC with separate database files. Deployments use Recreate to prevent concurrent SQLite writers. Both containers run as non-root, with a read-only root filesystem, dropped capabilities, no privilege escalation, and no service account credential mount. Local-path storage survives pod replacement but does not replicate across node loss; back up SQLite and MQTT state separately. Kubernetes Secrets require cluster access controls and are not an encrypted-at-rest guarantee.

Recovery: redeploy a previously verified image digest with `deploy-image.sh`; restore the matching SQLite backup if a schema change is incompatible. `kubectl rollout undo` alone restores image/configuration, not persisted data. Record checkpoint image digest and backup path together before any release.
