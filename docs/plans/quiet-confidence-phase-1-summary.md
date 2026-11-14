# Foundation / citizen slice

Implemented shared plum/lilac/ivory tokens and SVG icons, citizen shell, Home/Activity/Profile, honest receipt and optional response questions. Removed GPS/haptic blocking, silent submission failure, new-id-on-retry, unverified 911 and fabricated readings/ETA from citizen medical detail.

Trade-offs: uncertain pending SOS stored per-tab to preserve request identity across reload. Storage denial retains identity in memory with warning; closing that tab cannot preserve it. GPS is optional and explicit. No auth, tracking or ownership claims from UI.

Evidence: failing new public React regressions observed before changes; mobile suite and both builds pass. Backend rerun outside network sandbox: 169 pass, 20 hosted DB checks skipped. Browser/native evidence outstanding.

Not complete: staff redesign, Better Auth, secure receipt ownership, tracking APIs/storage, Android foreground service, maps and physical-device evidence. Existing staff pages remain legacy and may still contain fixtures; not acceptable for real use.

## Questions
None for scope. Disposable hosted target and Android device needed for later evidence.
## Next
Finish staff medical views; secure sessions/assignments and tracking; native publisher; browser/hosted/device verification.
