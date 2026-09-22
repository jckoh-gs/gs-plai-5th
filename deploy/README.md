# k3s deployment

Target: `charles-k3s`, namespace `gs-plai-5h`, single amd64 node `charleskoh-nucbox-g3`.

The image registry binds only node loopback `127.0.0.1:15050`. k3s/containerd uses loopback HTTP by default; no cluster runtime configuration changes are required. Image uploads use an authenticated Kubernetes API port-forward, never a public registry port. Registry contents persist on a dedicated local-path PVC. The app is pinned by immutable digest and scheduled to that node.

## Current run and access

Public UI: **http://grid.koh.it.kr/**. The HTTP Ingress uses the existing `nginx` ingress class and routes to `grid:http` (3001). DNS points to the controller's existing external IP, `121.143.126.21`. No TLS certificate or HTTPS redirect is configured for GRID. The shared controller's existing HTTPS listener belongs to other services and is not changed by this manifest.

Apply the independent routing manifest without rebuilding or restarting the app:

```sh
kubectl --context charles-k3s apply -f deploy/ingress.yaml
```

`grid-private` remains the default-deny policy. The additive `grid-ingress-nginx` policy allows only controller pods in `ingress-nginx` to reach TCP3001; it does not expose MQTT. Ingress buffering is disabled for real-time SSE, and the request limit matches the app's20MiB JSON limit. API authentication still applies. HTTP does not encrypt API tokens; the local Kubernetes tunnel below remains available for encrypted transport to the cluster.

To remove this public route, delete only this manifest's two objects (`kubectl --context charles-k3s delete -f deploy/ingress.yaml`); the app, data, private access and default-deny policy remain in place. Verification is recorded in [ingress-grid-20260922](verification/ingress-grid-20260922/).

The current HTTP-compatible deployment is **1.7.2 / PRD1.16 / runtime1646f6c / image645a098**. It passed359 regression tests, an actual insecure-origin Chrome fixture, and deployed UI/API/SSE/copy checks. All6 pre-existing RTU configuration hashes and run IDs survived the app rollout. See [the new deployment verification](verification/ingress-grid-20260922/release-verification.json). The original14-hour final release, video, deck and backup evidence remain1.7.1.

The original final functional deployment was **1.7.1 / PRD1.15 / runtime40b9ed8 / image234ec56**. Its exact1075081216-byte5ff snapshot passed current1.7.1/backward1.7 recovery:26 reports and2 actual Pod identities, followed by root live cleanup and preservation of the original5 configurations. Both proof rigs are0/noPods, four PVCs retained and their forwards ended. The immutable checkpoint-1.7.1 manifest passed2,033 hashes, actualReady and backup checks in independent REVIEW046. New stable-v1.7.1 represents the complete operational/evidence checkpoint; stable-runtime-v1.7.1-40b9ed8 represents the exact app build. Read run.json for their actual creation/remote status. Preserve historical1.7/1cab and1.6/9bd checkpoints. The new final video and14-slide editable deck were produced and reviewed within the original final window. Final public artifact delivery after the deadline was separately authorized by the user; see [final handoff](../docs/operations/FINAL-DELIVERY.md).

Use [run.json](../docs/operations/run.json) for the current deployment and selected backup, [resume.json](../docs/operations/resume.json) for owned processes and unfinished operations, and [NEXT-ACTIONS](../docs/operations/NEXT-ACTIONS.md) for the next step. These records supersede historical checkpoint descriptions below. Reconcile actual image/Ready/API and pending operation outcomes before changing anything; a lost local connection is not authorization to repeat rollout, control or restore writes.

The run-owned supervisor and3104/18884 forwards ended during final cleanup. The k3s workload remains running. To open an authenticated local access tunnel after checking these ports are free:

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

Local UI: `http://127.0.0.1:3104`; public HTTP access is configured separately above. API token is stored in the ignored, mode-0600 `artifacts/private/deploy/api-token` file and `grid-secrets` Secret. External VPP client uses MQTT user `vpp-client`, secret from `artifacts/private/deploy/client-password`, broker `mqtt://127.0.0.1:18884`. Emulator uses separate `grid` credentials. Broker ACL limits the external client to telemetry/ack/status reads and command writes. Local MQTT and HTTP access traverse encrypted Kubernetes tunnels, with no public MQTT route or NodePort. The default-deny ingress policy has only the narrow HTTP-controller exception described above; app-to-broker traffic stays within the pod. No TLS bypass is used. Tunnel lifetime is separate from remote deployment lifetime.

App SQLite uses the 5Gi grid-data PVC; MQTT uses a separate 1Gi grid-mqtt-data PVC. A non-root init container performs a one-time, non-destructive copy of the prior shared-volume mosquitto.db into the dedicated volume, then records a migration marker. It never overwrites existing broker state or deletes the original. The running broker cannot mount or access app SQLite. Deployments use Recreate to prevent concurrent SQLite writers. Both containers run as non-root, with a read-only root filesystem, dropped capabilities, no privilege escalation, and no service account credential mount. Local-path storage survives pod replacement but does not replicate across node loss; back up SQLite and MQTT state separately. Kubernetes Secrets require cluster access controls and are not an encrypted-at-rest guarantee.

## KMA live observations

The app reads `KMA_AUTH_KEY` from the dedicated `grid-kma` Secret, key `auth-key`, in `gs-plai-5h`. Store only the API Hub credential in that key, without leading/trailing whitespace. The credential stays on the server and must not be committed or included in browser configuration. The reference is optional so installations without a KMA credential can still use CSV and manual weather; live lookup then reports the missing configuration.

Updating this Secret requires restarting the app deployment because the credential is injected as an environment variable. The endpoint is the API Hub ASOS hourly observation service (`kma_sfctm2.php`); `stn` selects the RTU's station and omitted `tm` requests the current observation. A successful lookup updates wind and temperature. Irradiance remains sourced from CSV/manual input because accumulated solar radiation is not instantaneous W/m². API verification is recorded in [kma-20260922](verification/kma-20260922/).

## Snapshot selection and recovery

For this autonomous run, use [FINAL-RESTORE-PLAN](../docs/operations/FINAL-RESTORE-PLAN.md) and [NETWORK-RECOVERY](../docs/operations/NETWORK-RECOVERY.md). The operational `scripts/remote-backup.mjs` records the exact image/source, immutable remote/local path, bytes, SHA, integrity and bounded worker outcome. Inspect its private journal and actual remote process before retrying an interrupted operation. An unfinished partial is not a backup; an existing completed snapshot retransfer does not create new snapshot-generation evidence.

Select an image and matching verified snapshot from the authoritative run record. An isolated proof requires explicit `deploy-restore-rig.py` image, backup basename, unique owned rig name and `--expected-sha256`; verify original/destination SHA before app start, actual image, original data, UI/MQTT and cleanup. Follow the plan's exact argument/port/deadline sequence. If a prior apply response was lost, inspect that same rig/PVC rather than creating a second one. Never use the helper's historical default backup/name as the current selection. Retain backups/PVCs after scaling proof rigs to zero and closing only owned tunnels. Production DB restoration is a separate deliberate operation; `rollout undo` alone does not restore data.

## Historical checkpoints

The following paragraphs describe completed past evidence, not current recovery instructions. Immutable1.0–1.7 manifests are retained in [artifacts/releases](../artifacts/releases/); the selected fallback and any candidate remain explicit in run.json.

Initial verified deployment checkpoint: source `0b23c41`, image digest `sha256:1dd9be395d7fe324b20216f2db7162da51851cf01edc212bd2334a6a12bc7223`. Evidence is in `deploy/verification/`. MQTT access, remote VPP dispatch, pod replacement persistence, and direct pod ingress denial passed. This checkpoint is not the final PRD acceptance release.

The default app uses pinned Node24.21.0 Alpine, apk security upgrades, and omits global npm/corepack/yarn from the final runtime. The Debian checkpoint was retained for recovery evidence. Build the patched broker using `deploy/Dockerfile.mqtt`, then upload with `oci-push.py --repository grid-mqtt`. Supply both immutable digests to `deploy-image.sh`. Scan each resulting OCI archive; base tags alone do not prove patched status. The live registry now uses the source-patched 3.1.1-grid-sec1 image, digest `sha256:404bd3e27cc5923825c1f47236459f5feff627711fafb00c739c9c2c15f9b56c`. Its scan catalogued105 packages with zero known matches at scan time; migration and fresh push/pull passed. Source/provenance and upstream/local tests are recorded under `docs/security/evidence/`.

Earlier security-patched Debian checkpoint: source `79c996f`; app `sha256:617ff5ec1dc207af7028d8cdec08c4d2bcf09c7f65db1397fdfd4dc61253adbb`; broker `sha256:a75b570829c431d0423c4faee4696c3b3758784c6e817a9abe7d7cc5382b179c`. Published distro fixes were applied and rescanned. Remaining unfixed/wont-fix scanner findings are tracked by the security workstream; this is not a zero-vulnerability claim. Dedicated broker storage migration, historical state persistence, and broker ACL checks passed.

Historical pre-security79c996f recovery used an isolated rig and the then-selected backup. Its fixed backup/name/port commands are deliberately not presented as current instructions; inspect the preserved evidence under `deploy/verification/` for that experiment.

The initial registry bootstrap uses the pinned upstream image only long enough to receive the source-patched registry image. After uploading `grid-registry-sec1.oci.tar` to repository `grid-registry`, apply `deploy/registry-prepull.yaml` and wait for its phase to be `Succeeded`. Then apply `deploy/registry.yaml` and verify rollout before deleting the prepull pod. Pre-pulling is required because Recreate stops the old registry before its replacement can pull from the same registry. If node image cache is lost, temporarily apply `registry-bootstrap.yaml` against the retained registry PVC and repeat pre-pull/upgrade. Do not discard the registry backups in `.checkpoints` or the local OCI archives. The ordinary running registry is the patched scratch image, with no shell and a read-only root filesystem.

Historical functional checkpoint: product `1.1.0`, PRD `1.8`, source `8599ab9`, app `sha256:07f968cc6e5a11d31c9a1f2d55b287c19cac7f11574925b58004745dae396420`. Patched broker `sha256:a75b570829c431d0423c4faee4696c3b3758784c6e817a9abe7d7cc5382b179c` and registry `sha256:404bd3e27cc5923825c1f47236459f5feff627711fafb00c739c9c2c15f9b56c` remain unchanged. Evidence is in `deploy/verification/candidate-8599ab9/`. The app scan has 4 unfixed matches, broker 10, registry 0 known matches at scan time; see the vulnerability register.

The exact 1.1.0 backup was restored onto fresh isolated PVCs and verified through UI and actual MQTT. The same restored database then passed the prior 1.0.0 image's UI, original-data and MQTT checks. Recovery deployments are scaled to zero with PVCs retained. The corresponding immutable1.1 manifest preserves that checkpoint and its prior1.0 fallback; current selection is in run.json. This functional checkpoint does not imply completion of the scheduled final media and operating-time gates.

Historical promoted functional checkpoint: product `1.2.0`, PRD `1.9`, runtime `83d10cebcd7cab2b1f889c970011a463bad09099`, tag `stable-v1.2.0`, app `sha256:cc387c6db005acf798dbbbbd41979f07114474a5fe697118ad8c29afc904eab6`. Prior checkpoint paragraphs above are historical. `candidate-83d10ce/` records exact-image tests, deployed UI/command export/preview/MQTT, actual Pod replacement outbox replay, and immutable169414656-byte backup restoration with same-DB backward1.1 checks. Recovery rig is scaled to zero. Broker and registry digests are unchanged. Image scan retains4 unfixed app matches at scan time. `artifacts/releases/checkpoint-1.2.0.json` connects source, runtime, backup and evidence; final scheduled video/PPT remain separate gates.

During this autonomous run the singleton connection supervisor owns3104/18884 and verifies actual image/version/authentication after reconnection. Check `artifacts/operations/status.json` before starting another forward. It stops only its own forward at the original deadline; the remote deployment remains running. After the run, the manual access command above remains available. See `docs/operations/NETWORK-RECOVERY.md`.

Deployment rendering: `scripts/deploy-image.sh APP_IMAGE BROKER_IMAGE` validates both exact private-registry image references with64 lowercase SHA256 digits. Its pure `render-deployment.mjs` renderer replaces the app slot and both broker slots whether the checked-in template contains older pins or placeholders; unsupported/ambiguous slot layouts fail before kubectl. The checked-in app pin matches actual verified1.7.2 image645a098…, but arguments are authoritative for a reviewed release or rollback. Render-only inspection is `node scripts/render-deployment.mjs APP_IMAGE BROKER_IMAGE deploy/app.yaml`; it does not apply resources. The wrapper resolves the template relative to the repository root and uses a unique private temporary manifest cleaned on exit. Do not run the deploying wrapper for a read-only inspection.
