# Frontend correction report

Completed 21 September 2026. All 15 findings from `MOSH_API_Audit_Report.md` are resolved in the Vanilla frontend while retaining the existing HTML/CSS design and the single API base URL in `config.js`.

| Finding | Resolution |
|---|---|
| F01 | The shared client parses seconds/date `Retry-After`, exposes the retry deadline, and raises the existing session-expired event for protected 401 and all 419 responses. |
| F02 | Account and role updates send changed fields plus `_version`; permission-only saves no longer issue an unrelated profile PATCH. |
| F03 | The current-user permission editor awaits persistence before reporting success or closing. |
| F04 | Password, attempt and session controls match backend limits: 6–128, 1–20 and 5–10080. |
| F05 | Administrator password changes use `POST /users/{id}/password` with confirmation and version chaining. |
| F06 | `customerInfo` remains available to the UI but is removed from quotation API payloads. |
| F07 | HR acknowledgement fields use the documented contract; finance requests send currency and document-update requests upload owned file references. |
| F08 | Unsupported `leaveAccrualCycle` is not sent; employee/staff save wrappers await the API result. |
| F09 | Shared-team container tasks retain `shared_container`, which is explicitly supported by contract v1.2 and the corrected backend. |
| F10 | Wisdom item order is persisted in `wisdomSettings.order`; reorder, toggle, edit and delete actions await saving. |
| F11 | Customer, service, quotation, HR, executive-report, administration, wisdom and marketing flows do not close or navigate until saving succeeds. |
| F12 | Local draft undo restores only its local snapshot; explicit saved-transaction undo remains a separate encoded API action. |
| F13 | Delete controls/actions are wired for customers, services, salespeople, sales teams, quotation templates, requisitions, recognition records and print layouts. |
| F14 | Quotation IDs are opaque strings generated independently of display numbers, string-compared and safely passed by UI handlers. |
| F15 | A committed financial transaction is finalized before journal refresh; refresh failure emits a refresh warning rather than a false save failure. |

## Verification performed

- Every JavaScript file passed `node --check`.
- 25 targeted correction assertions passed, including runtime checks for throttling and protected-auth expiry behavior.
- A headless Chromium run used a fresh SQLite database and the corrected Laravel server over HTTP.
- Setup/login, bootstrap, opaque quotation IDs, sanitized quotation payloads, and the eight added deletion paths passed in 34 API calls.
- The final browser run had no JavaScript errors and no HTTP 500 responses.
- `css/styles.css` has the same SHA-256 hash as the supplied prototype; no frontend framework or build step was added.

The test scripts used for this correction pass are maintained outside the distributed frontend ZIP. Normal users only need the steps in `SETUP.md`.
