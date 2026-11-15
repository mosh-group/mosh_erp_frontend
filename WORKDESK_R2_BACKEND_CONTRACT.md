# Workdesk R2 — integration contract for the existing Laravel API

## Delivery boundary

This document specifies an additive backend integration. The Laravel source/database was NOT supplied or modified. Do not treat the contract as an installed controller or migration. Existing source references are `API_DOCUMENTATION.md` (v1.2), `api-map.json`, and `config.js`. This release does not replace the existing authentication or authorization scheme.

## 1. Existing write contract reused

The UI submits `POST /transactions` with session credentials, CSRF token, a fresh Idempotency-Key per logical action, and `{operations:[...]}`. Updates have `version`; operations touch ONLY `tasks` and `work-presence`. All domain writes and the ledger transition below must use one database transaction and one authoritative server timestamp.

Task payload fields: `employeeState`, append-only `workChat` receipt/action marker, and where needed `returnedForRevision`, `reviewManager`. Existing protected identity and elapsed-time fields are NOT computed/submitted by the new UI. Presence payload fields: `mode`, `noWork`, `pausedTaskId` (all described by the original WorkPresence schema).

Return `{success:true,data:{transactionId,changes:[{resource,id,data:{...canonicalRecord,_version}}]}}`. Include every record changed by the command, plus any parent/shared-stage side effects needed to refresh the cache. Do not return a partial success for an atomic action. A successful response with a missing record/version is treated as an uncertain result rather than fabricated rollback.

The exact same body/key must return the original result after a lost response. A reused key with a different body must be rejected. On 409 no part commits; require a fresh read before another logical action. On repeated network/5xx failures the UI freezes new workdesk actions and offers reconciliation using the SAME key. Keys are held in memory for the pending session only; beforeunload warns about an unresolved action. There is no offline queue and no cross-reload claim of guaranteed delivery.

## 2. Server invariants and authorization

Resolve employee identity from the authenticated user. Never trust an employee/user ID supplied solely in the body or resource id. Allow own presence transitions without granting generic dashboard data-edit rights. Keep the existing module-status permission for changes to tasks. Deny changes to anyone else's assignment. Validate the client-supplied presence id against the authenticated employee; server supplies employeeId, actor and timestamps.

Before applying task/presence operations, lock the employee's work-state row in a consistent lock order. Task _version checks alone do NOT prevent two simultaneous starts of different tasks. Serialize ALL routes that can start/resume/pause/submit work for an employee, including the old detail screens. After all operations, enforce at most one active execution interval per employee; a break/no-work/off presence cannot coexist with an active task. Reject the WHOLE command on any inconsistency.

Do not let ordinary employees modify another user's activity, attendance, timestamps, cumulative elapsed values, old receipt messages, or ledger history. Recompute actor/time for appended receipt markers on the server. Honor the R1 receipt cycle: opening is not receipt; receiving is not starting; manager return requires a new receipt for that return before execution. Validate reviewManager from the employee's authorized direct manager, not from arbitrary client text.

The original model uses separately assigned shared child tasks. Keep those per-worker assignment IDs: pausing one worker must not pause the other worker's child/session. Never replace individual durations with the aggregate duration of a group task.

## 3. State transitions

| Action | Task changes | Presence changes |
|---|---|---|
| work_start | none; no timer | active / noWork false |
| receive | new→received OR acknowledgement of latest return | none |
| start/resume T | all other active own tasks→paused; T→working | active / noWork false |
| pause T | T→paused | unchanged |
| break | all active own tasks→paused | break / noWork false |
| no_work | all active own tasks→paused | active / noWork true |
| finish/submit T | T→submitted; manager review | unchanged |
| work_end | all active own tasks→paused | off / noWork false |

Selecting/opening a task writes nothing. After receive, require a separate start. A repeated no-op does not generate another session. Manager return closes any inconsistent running state, appends its reason/cycle, and places the task into the R1 new-inbox category without deleting earlier sessions.

`work_start` and `work_end` never create or alter fingerprint punches. Neither `active + noWork false` without a running task nor a bare receipt counts as task execution.

## 4. Add a persistent event/interval ledger

Suggested additive entities (adapt names/types to the real schema):

- `employee_work_state`: employee FK, kind/task FK/current interval FK, version, updated_at. Use a unique employee key and row lock; provision before the first transition in a race-safe transaction.
- `employee_activity_intervals`: stable id, employee FK, kind (`task`, `break`, `no_work`), task FK nullable, started_at UTC, ended_at UTC nullable, actor FK, transaction FK/idempotency reference, source, revision/superseded metadata. Enforce end >= start, and valid task presence for kind task.
- `employee_activity_coverage`: employee FK, from/to UTC or a continuous trustworthy-from watermark. Use this to distinguish known unrecorded gaps from missing history.
- Append-only audit/corrections: original reference, approved replacement, reason, actor, approved_at. Retain originals; do not silently rewrite history.

After all operations are validated and before commit:

1. Get ONE server timestamp t and lock the employee state.
2. Capture old effective activity (running task, break, no_work, or no activity).
3. Apply allowed domain transitions and task-time sessions using t.
4. Derive new effective activity. If unchanged, do not close/reopen its interval.
5. If changed, close the old interval at t; open the new interval at t if one exists. No interval is opened for unspecified/idle/ready/off gaps.
6. Persist ledger and canonical task/presence records in the same transaction; idempotent retry returns the prior result without a second interval.

Manager/automated changes, task reassignment/cancellation, expiration checks and fingerprint-out handling must use the same service or produce auditable boundaries. Do not silently auto-close on browser close; an abandoned session needs policy/review. Do not forge an end time from the last browser heartbeat. Task execution outside a valid fingerprint window is reported separately and excluded from presence totals.

## 5. Extend GET /dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD

Keep existing response fields, add `data.workday`. This UI requests one date at a time (from==to), and the endpoint returns ONLY the authenticated employee's activity. Admin multi-employee reporting is a separate future UI/permission; query parameters must never broaden access.

See `backend-contract/workday-response.example.json` for a complete envelope.

Required fields:

- `employeeId`: linked employee stable id as string; must match current account.
- `date`: requested company-calendar date.
- `timeZone`: valid IANA company zone; do not depend on the viewer's device.
- `asOf`: server snapshot timestamp, ISO 8601 WITH timezone.
- `live`: true only for a current/day range permitted to advance with server-derived time; closed historical snapshots are false.
- `complete`: true ONLY if all relevant activity transitions/punch history for the returned period are trustworthy. Never set true merely because a query succeeded.
- `attendance`: full timestamp intervals `{id,inAt,outAt,status,source}`; open today may have null outAt and status open. Legacy date/inTime/outTime rows remain understood, but full UTC timestamps avoid daylight-saving ambiguity. Include the previous-day shift if it crosses midnight.
- `activities`: interval list `{id,kind,taskId?,taskTitle?,startAt,endAt?,open?}` for this employee. End is exclusive. Open intervals must have `open:true` and `endAt:null` (not a stale finite end). Include closed/superseded filtering or flags. Never serialize someone else's active task sessions.
- `coverage`: optional list `{startAt,endAt}` specifying trustworthy historical ranges when complete=false.
- `issues`: safe human-readable integrity/outage/punch flags; no sensitive data from other employees.

If a known recording outage exists, do NOT mark the entire day complete=true with only a warning string. Mark complete=false and supply coverage excluding the outage. Unknown gaps become review time, not chargeable waste. Do not manufacture pre-migration sessions from aggregate totals: set the history's trustworthy start to the actual migration/cutover time unless reliable original events are migrated.

Provide HTTP Date, and expose that header for cross-origin credentialed reads if needed, so the live UI can estimate server time. Derive all saved timestamps on the server regardless of client clock/header visibility. Credentials/CSRF/CORS handling must retain the existing same-host policy. Before production, serve authenticated traffic through HTTPS; the source HTTP configuration was preserved, not silently changed by this delivery.

## 6. Accounting rules

Normalize and union valid fingerprint presence intervals; sum actual elapsed time. Slice by company-date boundaries, including overnight shifts. Within each presence interval, partition at all activity/coverage boundaries:

- Exactly one distinct effective activity → that category. Duplicate equivalent intervals count once.
- More than one conflicting activity → review; never double-count.
- No activity, trustworthy coverage → waste (وقت مهدور — غير مسجّل).
- No activity, incomplete/untrustworthy history → review.

For an accepted closed day:
`presence = task + break + no_work + waste`, and review=0.
For an unaccepted/incomplete day include `review` so the arithmetic still partitions known presence, but do NOT approve it as a final report. Missing/bad punches can make total presence itself unknown; do not fake an 8h shift. Valid present-day open punches are provisional, not final.

The delivered JS pure model implements display-side accounting and tests; for authoritative manager/HR reports reproduce this algorithm on the server and compare against the supplied test fixtures. Do not use frontend totals directly in payroll/discipline.

## 7. Live integration acceptance checklist

- A status-enabled employee with dashboard edit denied can execute only own task/presence actions.
- Two simultaneous tabs start different tasks: only one active interval remains, or one command receives 409.
- Lost response and duplicate retry create one transaction/interval, not two.
- A rejected task or presence op rolls back all accompanying operations and the ledger.
- Receive then refresh stays received with timer stopped; return forces receipt of the new cycle.
- Pause, break, no_work, resume, switch, submit and work_end preserve exact previously accrued seconds.
- Reload/new login/new device/day switch reconstructs history from the ledger, not process memory.
- Fingerprint in/out periods are read separately; app actions do not create punches.
- Completed day includes before-first-task gaps and post-work_end/pre-fingerprint-out gaps as waste when history is complete.
- Missing checkout, overlapping records, DST, overnight work and outages flag review without invented durations.
- Scope tests deny requesting another employee's ledger and protected time edits.
- Back up before deploying; test on staging before live use.
