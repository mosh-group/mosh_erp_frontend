# R4 — Actual verification, 2026-09-27

## Scope

The complete current frontend was executed in isolated Chromium with a mocked Laravel API. No production API, employee account, database, network deployment or actual fingerprint device was accessed. Browser URL navigation to local files is blocked by the testing environment, so the real document and modules were loaded inline in an isolated page. The standalone HTML was also loaded in this way with its own in-memory demo transport. Tests are **not** evidence of deployed Laravel permissions or persistence across real devices.

## Passed checks

- **53** notification integration assertions (`tests/browser/notices_r4.py`): header placement; own-recipient filtering; unread priority; no automatic reading on opening/listing; explicit acknowledgement; delayed response; denied write; repeated click; lost-response same-key retry; stale refresh warning/recovery; search focus; pagination; safe plain-text display; account switching; missing duplicates; attendance history; preserved task controls; widths 1920/1366/800/390; zero uncaught JavaScript errors in this flow.
- **57** existing workdesk lifecycle/regression assertions rerun against R4 (`regression.py`): receive/start/pause/resume/finish, server-confirmed transitions, switching tasks, return for revisions, rejected saves, idempotency, permission denials, accurate time totals, date selection and responsive layout. The initial 20-second runner invocation was stopped by its timeout; the complete rerun with a 60-second limit passed all 57 assertions. The final completed run is the recorded result.
- **45** existing five-minute-reminder browser assertions rerun against R4 (`reminder_r3.py`): 4:59/5:00 thresholds, snooze, running task/break/no-work exclusions, failed-save behavior, existing dialogs and time reports.
- **42** workday-model assertions and **35** reminder-model assertions, unchanged test sources, rerun successfully.
- **12** standalone-preview assertions: full standalone document initialization, acknowledgement count, injected demo notice, attendance dialog, existing reminder demonstration, fresh-context data reset, mobile dialog bounds, **no outgoing HTTP requests** and no page errors.
- **64** JavaScript files parsed with `node --check`; all referenced production styles/scripts found; no duplicate static IDs; `config.js` byte-identical to R3. These checks do not replace functional testing.

The screenshots are taken from the actual standalone preview with fictional fixtures, not from a production employee account or an AI-generated mockup.

## Evidence and rerun

See `tests/results/r4-*`. For the browser tests install Playwright and point `MOSH_TEST_CHROMIUM` at a supported Chromium executable, then run from `tests/browser`: `python notices_r4.py`, `python regression.py`, `python reminder_r3.py`. Run the model checks with `node tests/workday-model.test.cjs` and `node tests/reminder-model.test.cjs` from the project root. Test data is confined to the mocked server.

## Before production

Verify own-recipient GET/PATCH permissions on the real Laravel deployment with a restricted employee. Verify the server derives the receipt actor/timestamp, atomically updates any archive copy, rejects other-recipient reads, and returns the updated record/version. Verify unread state after logout/login, on another device and after a real new notice. A 403 or malformed acknowledgement is shown as a failure; the frontend does not silently grant HR editing rights. Check the unchanged R3 workday/reminder backend contract separately.
