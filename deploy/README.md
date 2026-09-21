# Private k3s deployment

Target: `charles-k3s`, namespace `gs-plai-5h`, single amd64 node `charleskoh-nucbox-g3`.

The image registry binds only node loopback `127.0.0.1:15050`. k3s/containerd uses loopback HTTP by default; no cluster runtime configuration changes are required. Image uploads use an authenticated Kubernetes API port-forward, never a public registry port. Registry contents persist on a dedicated local-path PVC. The app is pinned by immutable digest and scheduled to that node.

## Current run and access

The actual deployment is candidate **1.6.0 / PRD1.13 / runtime331ab9a / image4af99e7b**. Its full recovery acceptance is still pending. The verified recovery fallback is **1.5.0 / runtime6d165d1**, with the719527936-byte ad34 snapshot and immutable checkpoint1.5. ISSUE023 (missing audit timestamps) remains a known limitation of that fallback. Do not combine candidate images with historical backup evidence.

Use [run.json](../docs/operations/run.json) for the current deployment and selected backup, [resume.json](../docs/operations/resume.json) for owned processes and unfinished operations, and [NEXT-ACTIONS](../docs/operations/NEXT-ACTIONS.md) for the next step. These records supersede historical checkpoint descriptions below. Reconcile actual image/Ready/API and pending operation outcomes before changing anything; a lost local connection is not authorization to repeat rollout, control or restore writes.

The run's singleton supervisor owns3104/18884. Read `artifacts/operations/status.json` and verify process identity before opening a manual forward. After that owned forward has ended, manual access is:

```sh
kubectl --context charles-k3s -n gs-plai-5h port-forward --address=127.0.0.1 deployment/grid 3104:3001 18884:1883
```

## New installation reference

The following bootstrap is for an intentional new installation/image release, not reconnecting to this existing run. Select committed source and matching product/PRD versions from the approved release; do not reuse historical version numbers.

Bootstrap:

```sh
kubectl --context charles-k3s apply -f deploy/registry-bootstrap.yaml
kubectl --context charles-k3s -n gs-plai-5h rollout status deployment/grid-registry
kubectl --context charles-k3s -n gs-plai-5h port-forward deployment/grid-registry 15050:15050
# Separate terminal:
./scripts/deploy-bootstrap.sh
docker buildx build --builder desktop-linux --platform linux/amd64 --provenance=false --build-arg SOURCE_COMMIT=COMMITTED_SHA --build-arg PRD_VERSION=SELECTED_PRD_VERSION --build-arg PRODUCT_VERSION=SELECTED_PRODUCT_VERSION --output type=oci,dest=artifacts/private/grid-image.oci.tar .
python3 scripts/oci-push.py artifacts/private/grid-image.oci.tar checkpoint-TIMESTAMP
./scripts/deploy-image.sh 127.0.0.1:15050/grid@sha256:APP_DIGEST 127.0.0.1:15050/grid-mqtt@sha256:MQTT_DIGEST
```

UI: `http://127.0.0.1:3104`. API token is stored in the ignored, mode-0600 `artifacts/private/deploy/api-token` file and `grid-secrets` Secret. External VPP client uses MQTT user `vpp-client`, secret from `artifacts/private/deploy/client-password`, broker `mqtt://127.0.0.1:18884`. Emulator uses separate `grid` credentials. Broker ACL limits the external client to telemetry/ack/status reads and command writes. MQTT and HTTP traverse encrypted Kubernetes tunnels, with no public NodePort or ingress. A deny-all ingress NetworkPolicy isolates the pod; app-to-broker traffic stays within the pod. No TLS bypass is used. Tunnel lifetime is separate from remote deployment lifetime.

App SQLite uses the 5Gi grid-data PVC; MQTT uses a separate 1Gi grid-mqtt-data PVC. A non-root init container performs a one-time, non-destructive copy of the prior shared-volume mosquitto.db into the dedicated volume, then records a migration marker. It never overwrites existing broker state or deletes the original. The running broker cannot mount or access app SQLite. Deployments use Recreate to prevent concurrent SQLite writers. Both containers run as non-root, with a read-only root filesystem, dropped capabilities, no privilege escalation, and no service account credential mount. Local-path storage survives pod replacement but does not replicate across node loss; back up SQLite and MQTT state separately. Kubernetes Secrets require cluster access controls and are not an encrypted-at-rest guarantee.

## Snapshot selection and recovery

For this autonomous run, use [FINAL-RESTORE-PLAN](../docs/operations/FINAL-RESTORE-PLAN.md) and [NETWORK-RECOVERY](../docs/operations/NETWORK-RECOVERY.md). The operational `scripts/remote-backup.mjs` records the exact image/source, immutable remote/local path, bytes, SHA, integrity and bounded worker outcome. Inspect its private journal and actual remote process before retrying an interrupted operation. An unfinished partial is not a backup; an existing completed snapshot retransfer does not create new snapshot-generation evidence.

Select an image and matching verified snapshot from the authoritative run record. An isolated proof requires explicit `deploy-restore-rig.py` image, backup basename, unique owned rig name and `--expected-sha256`; verify original/destination SHA before app start, actual image, original data, UI/MQTT and cleanup. Follow the plan's exact argument/port/deadline sequence. If a prior apply response was lost, inspect that same rig/PVC rather than creating a second one. Never use the helper's historical default backup/name as the current selection. Retain backups/PVCs after scaling proof rigs to zero and closing only owned tunnels. Production DB restoration is a separate deliberate operation; `rollout undo` alone does not restore data.

## Historical checkpoints

The following paragraphs describe completed past evidence, not current recovery instructions. Immutable1.0–1.5 manifests are retained in [artifacts/releases](../artifacts/releases/); the selected fallback and any candidate remain explicit in run.json.

Initial verified deployment checkpoint: source `0b23c41`, image digest `sha256:1dd9be395d7fe324b20216f2db7162da51851cf01edc212bd2334a6a12bc7223`. Evidence is in `deploy/verification/`. MQTT access, remote VPP dispatch, pod replacement persistence, and direct pod ingress denial passed. This checkpoint is not the final PRD acceptance release.

The default app uses pinned Node24.21.0 Alpine, apk security upgrades, and omits global npm/corepack/yarn from the final runtime. The Debian checkpoint was retained for recovery evidence. Build the patched broker using `deploy/Dockerfile.mqtt`, then upload with `oci-push.py --repository grid-mqtt`. Supply both immutable digests to `deploy-image.sh`. Scan each resulting OCI archive; base tags alone do not prove patched status. The live registry now uses the source-patched 3.1.1-grid-sec1 image, digest `sha256:404bd3e27cc5923825c1f47236459f5feff627711fafb00c739c9c2c15f9b56c`. Its scan catalogued105 packages with zero known matches at scan time; migration and fresh push/pull passed. Source/provenance and upstream/local tests are recorded under `docs/security/evidence/`.

Earlier security-patched Debian checkpoint: source `79c996f`; app `sha256:617ff5ec1dc207af7028d8cdec08c4d2bcf09c7f65db1397fdfd4dc61253adbb`; broker `sha256:a75b570829c431d0423c4faee4696c3b3758784c6e817a9abe7d7cc5382b179c`. Published distro fixes were applied and rescanned. Remaining unfixed/wont-fix scanner findings are tracked by the security workstream; this is not a zero-vulnerability claim. Dedicated broker storage migration, historical state persistence, and broker ACL checks passed.

Historical pre-security79c996f recovery used an isolated rig and the then-selected backup. Its fixed backup/name/port commands are deliberately not presented as current instructions; inspect the preserved evidence under `deploy/verification/` for that experiment.

The initial registry bootstrap uses the pinned upstream image only long enough to receive the source-patched registry image. After uploading `grid-registry-sec1.oci.tar` to repository `grid-registry`, apply `deploy/registry-prepull.yaml` and wait for its phase to be `Succeeded`. Then apply `deploy/registry.yaml` and verify rollout before deleting the prepull pod. Pre-pulling is required because Recreate stops the old registry before its replacement can pull from the same registry. If node image cache is lost, temporarily apply `registry-bootstrap.yaml` against the retained registry PVC and repeat pre-pull/upgrade. Do not discard the registry backups in `.checkpoints` or the local OCI archives. The ordinary running registry is the patched scratch image, with no shell and a read-only root filesystem.

Historical functional checkpoint: product `1.1.0`, PRD `1.8`, source `8599ab9`, app `sha256:07f968cc6e5a11d31c9a1f2d55b287c19cac7f11574925b58004745dae396420`. Patched broker `sha256:a75b570829c431d0423c4faee4696c3b3758784c6e817a9abe7d7cc5382b179c` and registry `sha256:404bd3e27cc5923825c1f47236459f5feff627711fafb00c739c9c2c15f9b56c` remain unchanged. Evidence is in `deploy/verification/candidate-8599ab9/`. The app scan has 4 unfixed matches, broker 10, registry 0 known matches at scan time; see the vulnerability register.

The exact 1.1.0 backup was restored onto fresh isolated PVCs and verified through UI and actual MQTT. The same restored database then passed the prior 1.0.0 image's UI, original-data and MQTT checks. Recovery deployments are scaled to zero with PVCs retained. The corresponding immutable1.1 manifest preserves that checkpoint and its prior1.0 fallback; current selection is in run.json. This functional checkpoint does not imply completion of the scheduled final media and operating-time gates.

Historical promoted functional checkpoint: product `1.2.0`, PRD `1.9`, runtime `83d10cebcd7cab2b1f889c970011a463bad09099`, tag `stable-v1.2.0`, app `sha256:cc387c6db005acf798dbbbbd41979f07114474a5fe697118ad8c29afc904eab6`. Prior checkpoint paragraphs above are historical. `candidate-83d10ce/` records exact-image tests, deployed UI/command export/preview/MQTT, actual Pod replacement outbox replay, and immutable169414656-byte backup restoration with same-DB backward1.1 checks. Recovery rig is scaled to zero. Broker and registry digests are unchanged. Image scan retains4 unfixed app matches at scan time. `artifacts/releases/checkpoint-1.2.0.json` connects source, runtime, backup and evidence; final scheduled video/PPT remain separate gates.

During this autonomous run the singleton connection supervisor owns3104/18884 and verifies actual image/version/authentication after reconnection. Check `artifacts/operations/status.json` before starting another forward. It stops only its own forward at the original deadline; the remote deployment remains running. After the run, the manual access command above remains available. See `docs/operations/NETWORK-RECOVERY.md`.
