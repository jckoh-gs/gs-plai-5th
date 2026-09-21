# ISSUE033: observed reconnection at 21:08–21:10 UTC

The original supervisor and both observer processes continued through an automatic reconnection. The selected received windows show 60 unreceived sample positions per RTU, 300 total; this is not itself proof of loss from persistent storage. The actual post-event Pod identity is unchanged, with both containers ready and zero restarts. This does not establish continuous availability during the incident.

`execution.json` records the original bounded capture command exit. `selection-provenance.json` binds raw selected lines to complete prefixes of the original append-only logs. `sha256.json` inventories the preserved payloads. Subsequent persistence inspection, if completed, is separate evidence. ISSUE030 and ISSUE032 remain historical incidents, and error counters are not reset.
