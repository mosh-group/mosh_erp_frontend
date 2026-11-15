# Workdesk R3 integration boundary and reminder audit hook

## What exists and what is not installed

This delivery changes only the supplied Vanilla frontend. The API config, authentication client and existing `/transactions` transport are unchanged. The prior `WORKDESK_R2_BACKEND_CONTRACT.md` still defines authoritative employee activity intervals, fingerprint windows, identity, server times and atomic state transitions. No Laravel source was supplied or modified.

The reminder's break/no-work choice calls the existing `MoshWorkdesk50.perform` method. There is no extra direct task-state mutation or client-supplied activity start time. Task selection delegates to the existing authorized task picker. A confirmed `mosh:workdesk-transition` is the only UI signal used to label a task-start/break/no-work response as confirmed.

## Required authoritative read data

The existing `GET /dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD` must return the R2 `workday` contract for the authenticated employee: valid employeeId, company-calendar date, valid IANA timeZone, server asOf timestamp, live:true for the current open day, complete:true only for truly complete history, fingerprint attendance and all activity intervals. A successful HTTP response alone does not establish complete history.

The frontend rejects known issues, mismatched users, expired snapshots, incomplete accounting or unresolved save errors. It does not identify a five-minute waste gap merely from mouse/keyboard activity or from a lack of data. Unsupported/missing `workday` yields a partial-report notice instead of an unrecorded-time reminder.

## Optional durable audit integration

The frontend emits a DOM `mosh:reminder-audit` event and, only when explicitly supplied by the integrator, calls:

```js
window.MoshReminderAuditTransport = async function (event) {
  // This route is PROPOSED, not installed by this frontend ZIP.
  const response = await MoshApi.request('/workday/reminder-events', {
    method: 'POST',
    headers: { 'Idempotency-Key': event.id },
    body: event,
  });
  return { stored: response?.stored === true };
};
```

Load that hook before the reminder module, after defining the API client. Do not add it until the authenticated route exists and has been tested. The frontend does not silently call an invented endpoint. Hook failures do not fail or reverse a successfully saved work action; the UI journal will remain explicitly session-local. This single optional call is not a durable outbox and makes no guaranteed-delivery claim across browser close.

Suggested event fields:

- id (stable event id), reminderId (prompt instance id).
- type: shown, dismissed, task_picker_opened, response_confirmed, save_failed, state_changed, tab_hidden.
- date, gapStart, shownAt, observedAt: client observations using the existing server-adjusted clock; they are metadata, never authority to edit activity history.
- choice when relevant: break, no_work, start.
- responseMs: observed time from actual prompt display to confirmed response.
- taskId only for a confirmed task response; nextReminderAt for a dismissal.

Server requirements:

1. Resolve user and employee from the authenticated session, not an arbitrary supplied employee ID.
2. Authorize own event insertion, and separately authorize managerial audit reads. Reject access to other employees' event streams.
3. Validate event types, references, bounds and schema; enforce a unique `(employee_id, event_id)` idempotency constraint.
4. Preserve original UI observation timestamps alongside authoritative server ingestion time. Treat all client observations as untrusted; do not use them to rewrite task sessions, fingerprints or accepted durations.
5. Cross-check a claimed gap against the authoritative ledger before using it in a managerial report. Missing history, off-site activity or known outages require review.
6. Keep this audit append-only; audit corrections separately. The reminder log never substitutes for the atomic work-state transaction.
7. Return `{success:true,data:{stored:true}}` only after persistence. The frontend then marks that session-log entry as server-stored.

## Multi-tab and delivery limitations

The reminder uses browser-origin/user/day/gap-scoped snooze metadata and Web Locks, with a lease fallback. This prevents UI popup duplication in common same-origin tab use; it does not lock work transactions or coordinate separate physical devices. The backend must still enforce one active task interval per employee, versions and idempotency as specified in R2.

The reminder runs while the app is open. There is no OS push service and no claim that a closed browser displays an alert. On visibility return it rechecks the authoritative snapshot. Background task timing remains the backend ledger's responsibility.

## Suggested production acceptance checks

- Fingerprint in; 4:59 unrecorded has no alert, 5:00 does.
- A running task, a recorded break and no-work each suppress the alert, regardless of mouse movement.
- Start-work/receive/select without task start does not create execution time.
- Dismiss and task-picker-only defer, without changing the gap start or totals.
- Break/no-work response starts at the confirmed transaction time; old gap stays intact.
- Simultaneous tabs/devices and lost responses do not duplicate domain writes.
- Stale/missing/overlapping attendance and failed/uncertain saves do not produce a false managerial judgment.
- Reload and account switch preserve the correct snooze scope without exposing another employee's journal.
