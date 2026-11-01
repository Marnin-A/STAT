# Refresh button spacing fix

Cause: the shared secondary-action rule had no padding or explicit button width. Tailwind's reset left the label against its outline.

Fix: 12px vertical / 20px horizontal padding, full available width and normal text wrapping; existing 52px minimum height, plum styling and callbacks retained. Trade-off: all secondary-action controls now use the same full-width padded treatment.

Scope: CSS only; no incident, API, data or refresh-state changes. User screenshot is the before reference.

Evidence: three stylesheet-to-DOM computed-style regressions failed at zero padding before the fix, then passed. These verify the shared rule for refresh/retry/send labels, not actual browser geometry. Browser visual/zoom checks not performed. Full frontend suite result recorded in final handoff.
