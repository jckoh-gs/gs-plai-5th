# GRID patched registry candidate

This builds Distribution 3.1.1 from upstream commit `9a8d98b679740cd514aa7e7d84d23d442a5ef54c`, archive SHA256 `db8d38f341b7699e516eaa33986814cce3276e75d1df4ac6f77d60e58c688c45`.

The Go 1.27.1 builder is digest-pinned. `security-upgrades.txt` pins the affected module upgrades (including their minimum compatible x/net/x/text versions). The final image uses scratch, contains static registry and HTTP healthcheck binaries plus CA roots/license/config, and runs as UID/GID1000. No shell or package manager is needed at runtime. The default listener remains `127.0.0.1:15050`.

Build from the project root:

```sh
docker buildx build --platform linux/amd64 --progress plain -t grid-registry:3.1.1-sec1 --output type=oci,dest=artifacts/private/grid-registry-sec1.oci.tar deploy/registry-source
```

Configuration, filesystem driver and registry API upstream tests run with a 90-second per-package bound during the build. Image scanning and independent push/pull tests are required before rollout; successful compilation alone is insufficient.

For the Kubernetes manifest, use exec readiness probe `[/healthcheck]` instead of wget. Preserve the existing registry until the candidate has successfully pushed and fetched content by verified digest. The data PVC stays mounted at `/var/lib/registry`; validate the existing registry format against the candidate before any irreversible data change. Updates do not imply all CVEs are absent: the scan evidence is authoritative.
