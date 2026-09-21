# Host power observation, 13:25 incident

Read-only pmset query found these events in the requested KST2026-09-21 22:24:20–22:26:20 interval: Sleep22:24:40 with allowlisted reason Maintenance Sleep; Wake22:24:42; DarkWake and WakeTime22:25:48. The latter reasons did not match the narrow allowlist and remain unclassified; no raw event text was retained. UTC times are13:24:40,13:24:42 and13:25:48.

These establish recorded host power transitions overlapping the local audit snapshot pause13:24:36.624–13:25:52.042. They support a host-power involvement hypothesis, but the timestamps alone do not establish exactly how long this observer was suspended, whether every HTTP/MQTT symptom had the same cause, or a unique root cause. A Wake label alone is not interpreted here as a completed usable full wake. Remote sample continuity and PUBACK evidence remain in reconnect-20260921T1325 and are not replaced by this finding.

At13:30:40UTC, ps for designated caffeinate PID30356 returned exit1/no entry. No assertion for that PID was observed. Current global assertions included PreventUserIdleSystemSleep1, but PreventSystemSleep0 and PreventUserIdleDisplaySleep0. These current values do not establish the historical assertion state, and the remaining assertion is not attributed to another application.

Only allowed timestamp/eventkind/reason and current power categories were persisted. Whole pmset output was captured transiently in a local subprocess and filtered; no full system log or app messages were saved or displayed. Each command had a15second timeout. No signal, power setting, source/runtime modification or caffeinate restart occurred. No extra cluster/node resource query was necessary for this bounded host classification. Original run and deadlines remain unchanged.
