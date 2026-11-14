# Demo users — completed local implementation
Delivered five complete fictional personas, medical profiles/contacts and staff records, linked active/awaiting/completed cases, two ambulances, one hospital, accepted dispatch and named notes. Added collapsible persona selector, profile/scenario links and reset. Existing UI/UX tokens retained; labelled native select, ≥48px controls, no added motion.
Tests: 92 frontend + 169 backend pass; both builds pass. 20 hosted checks skipped. Browser rendering/keyboard/device checks not performed. No hosted changes.
Regression: clearing storage alone left pending SOS in React memory. Persona/reset-scoped content remount fixes it; trade-off resets current screen-local drafts in synthetic mode. Real API mode never receives persona context.
## Questions
None.
## Next
Use /profile and /demo for review. Broader staff redesign/auth/tracking remain incomplete.
