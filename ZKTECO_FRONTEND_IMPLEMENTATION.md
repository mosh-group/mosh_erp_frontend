# MOSH Vanilla Frontend — ZKTeco Integration

## Added
- Employee editor fields for `zktecoEnrollmentNumber` and `zktecoExempt`.
- ZKTeco button in HR employee management.
- ZKTeco integration panel using the existing authenticated `MoshApi` transport.
- Device status / last-seen information and unmapped, pending, and error counters.
- Device + enrollment → employee mapping creation and mapping list.
- Event filters for unmapped, error, pending, and processed events.
- Authorized replay action for unmapped/error events.
- Mapping action also updates the employee document so the backend's existing employee mapping synchronizer remains consistent.

## Backend contract used
- `GET /api/zkteco/status`
- `GET /api/zkteco/events`
- `GET /api/zkteco/mappings`
- `POST /api/zkteco/mappings`
- `POST /api/zkteco/events/{id}/replay`

All authorization remains enforced by Laravel's existing ZKTeco permissions.

## Safety
No fingerprint image or template is displayed, requested, transferred, or stored by the frontend. Only enrollment identifiers and attendance metadata are used.
