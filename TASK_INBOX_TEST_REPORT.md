# Task Inbox R1 — Test report

Date: 2026-09-27
Base: MOSH_VANILLA_FRONTEND_UPDATED(2).zip

## Scope and environment

The supplied real frontend HTML, CSS and 54 manifest JavaScript files were loaded in Chromium using Playwright. The API transport was connected to an in-memory contract mock following the supplied API documentation. Two independent authenticated fixture sessions represented the employee and manager. No request was sent to the deployed server, no real account was used, and no production data was modified.

The tests load an already-authenticated bootstrap fixture. They do not establish successful real-server authentication, production routing/CORS/cookie behavior, actual Laravel policy behavior, or database durability. The stock approval/finalization projection was tested by changing the server fixture, not by claiming a new end-to-end test of all manager approval paths. Permissions were exercised in the actual frontend and simulated server. Hardening a real backend against crafted requests is outside this frontend change.

## Results

- 41 browser workflow/assertion checks passed.
- 16 pure receipt-model assertions passed using Node's built-in `assert`.
- 57 application/config JavaScript files passed `node --check` (including the 54 manifest files and transport/boot/config files).
- No browser page errors or console errors in the tested scenarios.
- The existing config, original stylesheet and two bundled vendor libraries are byte-identical to the input archive.
- All 54 manifest script references resolve to present files, with no duplicate entries.

These are targeted regression checks, not certification of the whole ERP, a security audit, a concurrency load test or a live deployment test.

## Browser checks (passed)

1. employee session, all scripts load.
2. only employee tasks: two new, zero active.
3. open does not acknowledge or start.
4. receipt persisted without starting work.
5. counts move only one task.
6. start saves working state and timer.
7. pause is current, not new.
8. submit removes active and adds review.
9. native manager return button exists.
10. return reason required.
11. manager returns with supported API state and reason.
12. returned work reappears in new in employee session.
13. return reason visible inside employee details.
14. cannot skip repeated receipt.
15. second receipt does not run timer or erase prior work.
16. received return moves to active while preserving original server state.
17. receipt survives full server reload.
18. second manager return creates cycle three, not previous receipt.
19. all earlier receipts and return reasons retained.
20. HTTP 403: no false success, receipt remains available.
21. HTTP 422: no false success, receipt remains available.
22. HTTP 409: no false success, receipt remains available.
23. HTTP 500: no false success, receipt remains available.
24. double-click produces exactly one committed receipt.
25. reviewed and received tasks have distinct counters.
26. task search preserves focus across Arabic typing.
27. department task row is still available.
28. execution controls work from department with status-only employee.
29. another employee task is denied on direct open/action.
30. status denial hides execution controls and rejects direct action.
31. details denial disables quick-open buttons.
32. employee cannot open the manager return form.
33. approved/finalized task removed from active without deletion.
34. large list page one limited to 20.
35. large list next page works.
36. card has no horizontal overflow.
37. counts wait for server confirmation, not optimistic click.
38. delayed success then applies once.
39. lost response retries without duplicate receipt.
40. no browser runtime errors during tested flows.
41. no console errors during tested flows.

## Model checks

Initial assignment; non-mutating display/open projection; received-without-starting; working; paused; submitted/review; first manager return; received return while retaining paused API state; second return invalidating prior receipt; preservation of time and earlier events; independent third-cycle receipt; finalized projection; legacy returned task; persisted legacy receipt across version changes/reload; uninterrupted already-working legacy task; exclusion of shared container rows while retaining assigned children.

## Before production

Run the acceptance cycle in TASK_INBOX_UPDATE_AR.md against a staging copy of the actual Laravel API and database, including the workChat-only receipt request for returned tasks. The real server must retain message IDs and enforce ownership, explicit receipt, return reason, actor/time integrity and idempotency. This delivery has not changed the deployed server.
