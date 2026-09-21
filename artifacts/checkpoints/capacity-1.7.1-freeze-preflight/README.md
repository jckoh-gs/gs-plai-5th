# Actual capacity observation before final freeze

The bounded read completed at 21:29 UTC on the unchanged 1.7.1 Pod. `execution.json` binds the actual command exit to the observation hash. The application, broker and registry were ready, and all 35 PVCs were Bound. The current DB was 1,479,634,944 bytes, with 58,529,443,840 available bytes on its host filesystem and 564,894,715,904 locally.

The remote planning allowance is three current raw DB sizes for a snapshot, comparable compressed transfer copy and restore DB; the local allowance is two raw sizes. Observed available space exceeds both. These are planning allowances, not reserved PVC capacity or a guarantee of future growth. No backup, restore, deployment or final media generation occurred in this read.
