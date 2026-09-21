# Prepared remote monitor source review

Read-only review only; no monitor, remote query or control was executed. The existing preflight correctly labels actual1.7/d1e4 as NOT_ELIGIBLE and monitorSpawned=false. Actual1.7.1 execution remains pending.

The harness requires API1.7.1 plus exact Ready234 image before spawn, byte-matches local supplied client/message sources to40b9ed8, restricts RTU identity, and launches the subscriber without --dispatch. It supplies broker credentials via child environment, suppresses child stderr, caps stdout128000bytes and retains only selected status fields. Local Popen cleanup checks poll before signalling, waits finitely and escalates only the owned child. Afterward it compares Pod identity/Ready and API version. No deployed-device disconnect or command publication appears in the harness.

Required execution boundary: use the plan's40second deadline-command wrapper. urllib's8second socket timeout is not a whole-response wall-clock limit, and direct Python exceptions can include parsing fragments; the wrapper bounds the operation and withholds failed stdout/stderr. Current process cleanup cannot guarantee termination after host failure/SIGKILL or uninterruptible kernel work. Credentials are not deliberately printed; exact matching/source trust remains part of the boundary.

Evidence limitation reported to root: supplied monitor output has no MQTT retained-delivery flag. Observing online=true therefore proves an online status record, not that this particular delivery carried retain=true. Describe it as observed online status; retained-state limitations and separately verified isolated LWT behavior may be cited without manufacturing a retain-flag observation. Neither online nor unchanged Ready identity establishes comprehensive current device health or missed-session receipt.

Source/plan/preflight hashes are in evidence/remote-monitor-1.7.1-review.json. No runtime/source changes or tests were run. New actual result must remain separate from this preparation review and preserved preflight.
