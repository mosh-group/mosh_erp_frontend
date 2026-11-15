# MOSH ERP API documentation

Contract v1.2 — completed Vanilla frontend + Laravel backend integration, 21 September 2026.

This revision records the corrected backend contract and the completed F01–F15 Vanilla frontend integration corrections identified in MOSH_API_Audit_Report.md.

The contract covers 226 method/path pairs derived from the existing Vanilla screens. See BACKEND_FIXES.md for B01–B48, FRONTEND_FIXES.md for F01–F15, and VERIFICATION.md for the executed checks.

## 1. Base URL and HTTP conventions

The one frontend configuration value is `window.API_BASE_URL`, initially `http://localhost:8000/api`. Every request, including auth/files/reports, uses it. Serve the frontend over HTTP(S); do not open the integrated app through `file://`.

All URLs below are relative to that base URL. UTF-8 JSON is used except file bodies. Use `Accept: application/json`; writes add `Content-Type: application/json`. Browser requests use `credentials: 'include'`. Session cookies are HTTP-only. Obtain `csrfToken` from `/auth/status` and send `X-CSRF-TOKEN` on every POST/PUT/PATCH/DELETE, including login/setup. Upload requests omit Content-Type so the browser supplies the multipart boundary.

CORS allows only configured frontend origins and credentials. No wildcard credentialed CORS. HTTPS and secure session cookies are used in production. Cookie session lifetime and idle policy are enforced server-side. Authentication is never inferred from browser storage.

`{id}` is the opaque resource identifier returned by the API. Preserve it exactly and URL-encode it. Existing numeric/string prototype IDs can be retained; IDs do not confer access. Display numbers and related foreign identifiers are separate. `_version` is an optimistic-concurrency integer; it is distinct from contract/offer domain `version`.

For creation, required fields are specified in each resource schema. PATCH sends only changed top-level fields plus `_version`; nested arrays/objects are replaced atomically and validated as a unit. Unknown resources, settings, record fields, sort fields and filter field roots are rejected. DELETE sends `{"_version":N}`. Names/titles/references are strings up to 500 characters; emails up to 254. Validated record arrays are limited to 2,000 items and the serialized record to 2 MiB. Domain rules below impose narrower limits where applicable. IDs are bounded to 190 characters. A form field omitted from PATCH stays unchanged.

## 2. Responses, examples and errors

Single-record reads/creates/updates: `{"success":true,"data":{"id":"...","_version":1,...}}`. Deletes: `{"success":true,"data":null}`. List responses add `meta` and never expose records outside the caller's scope.

```json
{"success":true,"data":[{"id":"CUST-1","name":"شركة العميل","_version":1}],"meta":{"page":1,"perPage":10,"total":1,"lastPage":1}}
```

Errors always use the same shape. Field keys may be dotted (including `operations.0.data.name` for batches). The frontend shows these through the existing alert/toast/form-message patterns and rolls back failed optimistic changes. Editors using an asynchronous transaction keep their draft open on failure.

```json
{"success":false,"message":"بيانات غير صالحة.","errors":{"name":["الاسم مطلوب."]}}
```

| Code | Meaning and example | Frontend handling |
|---|---|---|
| 200 | Successful read/update/delete/action | Refresh affected data from server response |
| 201 | Resource/file/initial account created | Use returned canonical record, ID and version |
| 400 | Malformed JSON or unsupported operation | Display message |
| 401 | Missing/expired session; `{"success":false,"message":"يلزم تسجيل الدخول.","errors":{}}` | Return to existing login gate |
| 403 | Missing permission, out-of-scope write, forced password change | Display existing permission message; do not retain optimistic unauthorized changes |
| 404 | Missing or non-visible resource | Display not-found message |
| 409 | Stale version, reused idempotency key with different input, protected deletion or related records prevent deletion | Refresh through the existing navigation/refresh control before retrying |
| 413 | Request/file exceeds configured limit | Display upload error |
| 419 | CSRF/session token expired | Reload and sign in through the existing gate; do not blindly repeat a mutation |
| 422 | Validation failure | Show field errors and retain draft inputs |
| 429 | Login/API rate limit | Respect Retry-After |
| 500 | Unexpected server failure | Generic error; details remain in server logs |
| 503 | Required service unavailable, e.g. mail transport | Show failure; do not mark an email sent |

Shared error examples above apply to every endpoint below. Protected endpoint error set is 400/401/403/404/409/419/422/429/500, restricted by method (read requests do not require CSRF or write versions). File and mail endpoints also include their specific codes. Never send passwords, raw session values, stack traces, unrelated employee data or full-company state in error responses.

## 3. Authentication and authorization

Roles retain the prototype's base roles: `app_programmer`, `role_admin`, `role_manager`, `role_employee`. Module identifiers: dashboard, tasks, admin, hr, sales, marketing, design, photo, editing, promotion, logistics, purchases, accounting, warehouses, platform, archive, instructions. Module actions: view, dashboard, running, approvals, list, details, create, edit, status, assign, delete, approve, attachments, reports, print, export.

Global permissions: systemCustomization, manageUsers, managePermissions, viewPasswords (legacy UI only; no password-read API), auditLog, createTasks, notifications, viewAllTasks, editCoreTaskData, deleteTasks, viewArchive. Explicit user allow/deny overrides role inheritance. Task scope is mine/department/all. Department manager relationships are looked up by employee ID; display names are not an authorization credential.

List/detail/create/edit/delete normally require the corresponding module action, **plus record scope**. Task/workflow/finance actions additionally enforce the domain rule stated per resource. A view flag never grants write permission. Employees receive their own HR/request/work data and only minimal authorized team-directory fields. Managers cannot read private HR/financial fields merely because a colleague is assignable. Marketing writes only its customer-profile fields; sales writes customer master fields; finance can write its approved master fields.

Protected initial/root account cannot be deleted, disabled or stripped of root privileges. Current account cannot delete/disable itself. Protected roles cannot be deleted and in-use roles cannot be removed. Passwords use Laravel hashes; the existing reveal control explains that stored passwords cannot be displayed and directs the existing edit/reset flow. No reversible passwords or plaintext defaults are shipped.

## 4. Atomic updates and the existing Save buttons

The existing frontend retains local drafts and an in-memory read cache. The server is authoritative. A UI action that changes several records submits **only those records/patches** to `/transactions`; it never posts the complete browser state. This is needed for staged HR Save and Close, task packages, purchase receipt plus stock, and payroll. Each operation invokes the same validation/authorization as its individual resource endpoint. All changes commit or all roll back. Generated history, totals, stock/custody, approval effects and journal entries are calculated on the server.

Updates use current versions. Transactions serialize conflicting domain writes and recheck dependent balances/stages inside the database transaction. `Idempotency-Key` is required for `/transactions`, transaction undo and quotation email. The frontend sends every business Save through `/transactions`, including payment, receipt and signature operations. Individual resource CRUD also accepts the header; supply it for retryable direct-client writes. Reusing a key with a different body returns 409. Retrying an identical completed request returns its original result. File uploads are staged; linking them validates ownership and the target record. Unlinked abandoned uploads are cleaned separately.

Local draft undo stays local. Undo of saved data refers to the original transaction and is allowed only when affected versions are unchanged and the caller still has permission. Posted financial/stock effects require the explicit reversal workflow; undo cannot erase their audit history.

## 5. Authentication, account and infrastructure endpoints

### GET /auth/status — Setup/login state and CSRF token

- Authentication: Public.
- Required permission/scope: None.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing auth gate. Trigger: Page startup.
- Backend behavior/validation: Only setup availability, authentication state and CSRF token are public. Do not expose account lists.
- Request body: None.
- Example request: `GET /api/auth/status`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "setupRequired": false,
    "authenticated": false,
    "csrfToken": "csrf-token",
    "setupAllowed": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /auth/setup — Create initial root account

- Authentication: Public with CSRF.
- Required permission/scope: Only while setup enabled and no users exist.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Initial account form. Trigger: Create account and enter.
- Backend behavior/validation: Require matching password of 8–128 characters. Lock setup to one account atomically; hash password, link root employee, initialize server session. No hardcoded default password.
- Request body: 
```json
{
  "name": "مسؤول النظام",
  "username": "admin",
  "password": "Use-a-unique-password",
  "password_confirmation": "Use-a-unique-password"
}
```
- Example request: `POST /api/auth/setup` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "USR-ROOT",
      "name": "مسؤول النظام",
      "roleId": "app_programmer"
    },
    "csrfToken": "renewed-token"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### POST /auth/login — Login

- Authentication: Public with CSRF.
- Required permission/scope: Active account, correct credentials.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Login form. Trigger: Submit login.
- Backend behavior/validation: Normalize username; verify hash; rate-limit IP/account; enforce maxAttempts/lockMinutes and active status; regenerate session. Do not reveal which part is wrong.
- Request body: 
```json
{
  "username": "admin",
  "password": "Use-a-unique-password"
}
```
- Example request: `POST /api/auth/login` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "USR-ROOT",
      "name": "مسؤول النظام"
    },
    "csrfToken": "renewed-token"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### POST /auth/logout — Logout

- Authentication: Session.
- Required permission/scope: Current account.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Top bar account. Trigger: Logout.
- Backend behavior/validation: Invalidate session and regenerate CSRF; audit successful logout.
- Request body: 
```json
{}
```
- Example request: `POST /api/auth/logout` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "csrfToken": "renewed-token"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /auth/me — Current account

- Authentication: Session.
- Required permission/scope: Self.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Auth/navigation. Trigger: Load or refresh current identity.
- Backend behavior/validation: Return public user, linked employee ID, role and effective permissions, task scope and mustChange.
- Request body: None.
- Example request: `GET /api/auth/me`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "USR-ROOT",
    "username": "admin",
    "roleId": "app_programmer",
    "employeeId": "EMP-ROOT",
    "mustChange": false
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /auth/password — Change password

- Authentication: Session, including mustChange.
- Required permission/scope: Self.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: My account modal. Trigger: Submit password change.
- Backend behavior/validation: Current password must match, new/confirmation match, minLength enforced, different from old. Hash new password, clear mustChange and invalidate other sessions.
- Request body: 
```json
{
  "current_password": "old-password",
  "password": "new-unique-password",
  "password_confirmation": "new-unique-password"
}
```
- Example request: `PATCH /api/auth/password` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "USR-1",
      "mustChange": false
    },
    "csrfToken": "renewed-token"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /users — users: Read/list

- Authentication: Session.
- Required permission/scope: manageUsers.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: Lists: q, page (default 1), perPage (default 50, max 100). q searches the display name.
- Frontend: Account/role administration. Trigger: Open list/details or submit existing editor/delete confirmation.
- Backend behavior/validation: Unique case-normalized username; existing role; boolean action/global flags; tri-state inheritance for user overrides. Link an existing employee for mine/employee scope; each employee links to at most one account. Protect root/current/in-use roles. Session identity cannot supply its own elevated privileges.
- Request body: None.
- Example request: `GET /api/users`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "users-1",
      "_version": 2
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /users — users: Create

- Authentication: Session.
- Required permission/scope: manageUsers.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Account/role administration. Trigger: Open list/details or submit existing editor/delete confirmation.
- Backend behavior/validation: Unique case-normalized username; existing role; boolean action/global flags; tri-state inheritance for user overrides. Link an existing employee for mine/employee scope; each employee links to at most one account. Protect root/current/in-use roles. Session identity cannot supply its own elevated privileges.
- Request body: 
```json
{
  "name": "موظف",
  "username": "employee",
  "password": "unique-password",
  "roleId": "role_employee",
  "employeeId": "EMP-1",
  "department": "التصوير",
  "active": true,
  "taskScope": "mine",
  "landing": "dashboard",
  "mustChange": true
}
```
- Example request: `POST /api/users` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "users-1",
    "_version": 2
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /users/{id} — users: Read/list

- Authentication: Session.
- Required permission/scope: manageUsers.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Account/role administration. Trigger: Open list/details or submit existing editor/delete confirmation.
- Backend behavior/validation: Unique case-normalized username; existing role; boolean action/global flags; tri-state inheritance for user overrides. Link an existing employee for mine/employee scope; each employee links to at most one account. Protect root/current/in-use roles. Session identity cannot supply its own elevated privileges.
- Request body: None.
- Example request: `GET /api/users/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "users-1",
    "_version": 2
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /users/{id} — users: Update

- Authentication: Session.
- Required permission/scope: manageUsers.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Account/role administration. Trigger: Open list/details or submit existing editor/delete confirmation.
- Backend behavior/validation: Unique case-normalized username; existing role; boolean action/global flags; tri-state inheritance for user overrides. Link an existing employee for mine/employee scope; each employee links to at most one account. Protect root/current/in-use roles. Session identity cannot supply its own elevated privileges.
- Request body: 
```json
{
  "name": "موظف",
  "username": "employee",
  "roleId": "role_employee",
  "employeeId": "EMP-1",
  "department": "التصوير",
  "active": true,
  "taskScope": "mine",
  "landing": "dashboard",
  "mustChange": true,
  "_version": 1
}
```
- Example request: `PATCH /api/users/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "users-1",
    "_version": 2
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### DELETE /users/{id} — users: Delete

- Authentication: Session.
- Required permission/scope: manageUsers.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Account/role administration. Trigger: Open list/details or submit existing editor/delete confirmation.
- Backend behavior/validation: Unique case-normalized username; existing role; boolean action/global flags; tri-state inheritance for user overrides. Link an existing employee for mine/employee scope; each employee links to at most one account. Protect root/current/in-use roles. Session identity cannot supply its own elevated privileges.
- Request body: 
```json
{
  "_version": 1
}
```
- Example request: `DELETE /api/users/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": null
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /roles — roles: Read/list

- Authentication: Session.
- Required permission/scope: managePermissions.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: Lists: q, page (default 1), perPage (default 50, max 100). q searches the display name.
- Frontend: Account/role administration. Trigger: Open list/details or submit existing editor/delete confirmation.
- Backend behavior/validation: Unique case-normalized username; existing role; boolean action/global flags; tri-state inheritance for user overrides. Link an existing employee for mine/employee scope; each employee links to at most one account. Protect root/current/in-use roles. Session identity cannot supply its own elevated privileges.
- Request body: None.
- Example request: `GET /api/roles`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "roles-1",
      "_version": 2
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /roles — roles: Create

- Authentication: Session.
- Required permission/scope: managePermissions.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Account/role administration. Trigger: Open list/details or submit existing editor/delete confirmation.
- Backend behavior/validation: Unique case-normalized username; existing role; boolean action/global flags; tri-state inheritance for user overrides. Link an existing employee for mine/employee scope; each employee links to at most one account. Protect root/current/in-use roles. Session identity cannot supply its own elevated privileges.
- Request body: 
```json
{
  "name": "دور مخصص",
  "scope": "department",
  "taskScope": "department",
  "landing": "dashboard",
  "globals": {},
  "modules": {},
  "scopeActions": {}
}
```
- Example request: `POST /api/roles` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "roles-1",
    "_version": 2
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /roles/{id} — roles: Read/list

- Authentication: Session.
- Required permission/scope: managePermissions.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Account/role administration. Trigger: Open list/details or submit existing editor/delete confirmation.
- Backend behavior/validation: Unique case-normalized username; existing role; boolean action/global flags; tri-state inheritance for user overrides. Link an existing employee for mine/employee scope; each employee links to at most one account. Protect root/current/in-use roles. Session identity cannot supply its own elevated privileges.
- Request body: None.
- Example request: `GET /api/roles/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "roles-1",
    "_version": 2
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /roles/{id} — roles: Update

- Authentication: Session.
- Required permission/scope: managePermissions.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Account/role administration. Trigger: Open list/details or submit existing editor/delete confirmation.
- Backend behavior/validation: Unique case-normalized username; existing role; boolean action/global flags; tri-state inheritance for user overrides. Link an existing employee for mine/employee scope; each employee links to at most one account. Protect root/current/in-use roles. Session identity cannot supply its own elevated privileges.
- Request body: 
```json
{
  "name": "دور مخصص",
  "scope": "department",
  "taskScope": "department",
  "landing": "dashboard",
  "globals": {},
  "modules": {},
  "scopeActions": {},
  "_version": 1
}
```
- Example request: `PATCH /api/roles/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "roles-1",
    "_version": 2
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### DELETE /roles/{id} — roles: Delete

- Authentication: Session.
- Required permission/scope: managePermissions.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Account/role administration. Trigger: Open list/details or submit existing editor/delete confirmation.
- Backend behavior/validation: Unique case-normalized username; existing role; boolean action/global flags; tri-state inheritance for user overrides. Link an existing employee for mine/employee scope; each employee links to at most one account. Protect root/current/in-use roles. Session identity cannot supply its own elevated privileges.
- Request body: 
```json
{
  "_version": 1
}
```
- Example request: `DELETE /api/roles/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": null
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### PUT /users/{id}/permissions — Save user permission overrides

- Authentication: Session.
- Required permission/scope: managePermissions.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Permissions editor. Trigger: Save allow/deny/inherit choices.
- Backend behavior/validation: Boolean allow/deny, absent means inherit. Use PATCH /users/{id} to change taskScope or landing. Root permissions immutable.
- Request body: 
```json
{
  "globalOverrides": {},
  "moduleOverrides": {},
  "_version": 1
}
```
- Example request: `PUT /api/users/{id}/permissions` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "USR-1",
    "_version": 2
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### POST /users/{id}/password — Reset user password

- Authentication: Session.
- Required permission/scope: manageUsers.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: User editor. Trigger: Save a replacement password.
- Backend behavior/validation: Enforce policy, hash and invalidate affected sessions; never return password/hash.
- Request body: 
```json
{
  "password": "unique-replacement",
  "password_confirmation": "unique-replacement",
  "_version": 1
}
```
- Example request: `POST /api/users/{id}/password` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "USR-1",
    "mustChange": true,
    "_version": 2
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /auth/security — Security policy

- Authentication: Session.
- Required permission/scope: Root only.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Security tab. Trigger: Open/save login policy.
- Backend behavior/validation: minLength 6–128; maxAttempts 1–20; lockMinutes 1–1440; sessionMinutes 5–10080; forceNewPassword boolean. Root and session policies remain server-controlled.
- Request body: None.
- Example request: `GET /api/auth/security`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "minLength": 6,
    "maxAttempts": 5,
    "lockMinutes": 10,
    "sessionMinutes": 480,
    "forceNewPassword": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /auth/security — Security policy

- Authentication: Session.
- Required permission/scope: Root only.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Security tab. Trigger: Open/save login policy.
- Backend behavior/validation: minLength 6–128; maxAttempts 1–20; lockMinutes 1–1440; sessionMinutes 5–10080; forceNewPassword boolean. Root and session policies remain server-controlled.
- Request body: 
```json
{
  "minLength": 6,
  "maxAttempts": 5,
  "lockMinutes": 10,
  "sessionMinutes": 480,
  "forceNewPassword": true
}
```
- Example request: `PATCH /api/auth/security` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "minLength": 6,
    "maxAttempts": 5,
    "lockMinutes": 10,
    "sessionMinutes": 480,
    "forceNewPassword": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /auth/audit — Security audit list

- Authentication: Session.
- Required permission/scope: auditLog.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: page, perPage (default 50, max 100).
- Frontend: Security audit tab. Trigger: Open/refresh log.
- Backend behavior/validation: Return permitted authentication/account events, newest first; no credentials.
- Request body: None.
- Example request: `GET /api/auth/audit`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "AUD-1",
      "action": "login",
      "actor_name": "admin",
      "created_at": "2026-09-21T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### DELETE /auth/audit — Clear visible security log

- Authentication: Session.
- Required permission/scope: Root only.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Security audit tab. Trigger: Confirm Clear log.
- Backend behavior/validation: Set a visible-log cutoff, retain internal audit and append a clear-log event. Do not destroy forensic history.
- Request body: 
```json
{}
```
- Example request: `DELETE /api/auth/audit` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": null
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /bootstrap — Hydrate authorized frontend cache

- Authentication: Session.
- Required permission/scope: Record and field scopes across all returned modules.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Application startup/login refresh. Trigger: Load authenticated UI data.
- Backend behavior/validation: Return state, public auth metadata, versions and revision. Only authorized projections are returned; never passwords/other-user sessions. Arrays are real database rows, not mock fallbacks. Current frontend renders from this in-memory cache; resource requests refresh lists and mutations.
- Request body: None.
- Example request: `GET /api/bootstrap`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "state": {
      "customers": [],
      "salesTasks": []
    },
    "user": {
      "id": "USR-1"
    },
    "users": [],
    "roles": [],
    "security": {
      "minLength": 8
    },
    "revision": 1,
    "settings": {},
    "settingPaths": {},
    "resources": {},
    "csrfToken": "token"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /transactions — Commit one UI action atomically

- Authentication: Session.
- Required permission/scope: Every operation must pass its resource/module/field/record policy.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: All existing save/approval forms. Trigger: Commit one Save or workflow action.
- Backend behavior/validation: operations: 1–500 bounded items. action=create/update/delete; create uses data, update uses data and version, delete uses id/version; settings uses resource=settings/{name}, action=update, id=name, data=the setting value and version. IDs may also be supplied as data.id for creates. Reject whole-state snapshots. Validate dependencies after all operations, lock concurrent writes, recalculate domain effects and append audit; all-or-nothing. Mandatory Idempotency-Key.
- Request body: 
```json
{
  "operations": [
    {
      "resource": "customers",
      "action": "update",
      "id": "CUST-1",
      "version": 1,
      "data": {
        "phone": "0933000000"
      }
    }
  ]
}
```
- Example request: `POST /api/transactions` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "transactionId": "TX-1",
    "revision": 2,
    "changes": [
      {
        "resource": "customers",
        "id": "CUST-1",
        "data": {
          "id": "CUST-1",
          "phone": "0933000000",
          "_version": 2
        }
      }
    ]
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### POST /transactions/{id}/undo — Undo eligible committed edit

- Authentication: Session.
- Required permission/scope: Original actor, still-authorized resources.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Global undo button. Trigger: Undo a saved reversible edit.
- Backend behavior/validation: Affected versions must still match. No removal of posted finance/custody/approval audit. Atomically append an inverse transaction; conflict returns 409. Local uncommitted draft edits require no HTTP.
- Request body: 
```json
{}
```
- Example request: `POST /api/transactions/{id}/undo` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "transactionId": "TX-2",
    "revision": 3,
    "changes": []
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### POST /files — Upload real attachment

- Authentication: Session.
- Required permission/scope: attachments on target module, or own staged upload.
- Headers: Accept: application/json; Content-Type: multipart/form-data; X-CSRF-TOKEN.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Task/chat/HR/operations/finance file controls. Trigger: Select file or stop voice recording.
- Backend behavior/validation: multipart/form-data instead of JSON. Limit 25 MiB per file; inspect actual MIME; allowed image/audio/PDF/text/office formats; reject executable/server script and unsafe path names. Logical key cannot overwrite another upload. Store private random path; file bytes never go into app state.
- Request body: 
```json
{
  "multipart": "file=<binary>; key=<client logical key>; name=<original filename>; kind=<file|image|audio>; mime=<declared type>"
}
```
- Example request: `POST /api/files` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "key": "FILE-1",
    "name": "document.pdf",
    "mime": "application/pdf",
    "size": 1234
  }
}
```
- Errors/status codes: 400,401,403,409,413,419,422,429,500; standard error bodies in §2.

### GET /files/{key} — Read attachment metadata

- Authentication: Session.
- Required permission/scope: Owner if staged or read access to linked parent.
- Headers: Accept: application/json.
- Path parameters: key; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Attachment list. Trigger: Resolve metadata.
- Backend behavior/validation: Check every linked parent and field policy; key is opaque and URL-encoded.
- Request body: None.
- Example request: `GET /api/files/{key}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "key": "FILE-1",
    "name": "document.pdf",
    "mime": "application/pdf",
    "size": 1234,
    "kind": "file"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### GET /files/{key}/content — Download/stream attachment

- Authentication: Session.
- Required permission/scope: Read access to staged/linked file.
- Headers: Accept: application/json.
- Path parameters: key; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Image/audio/document preview/download. Trigger: Open/download attachment.
- Backend behavior/validation: Stream binary bytes with correct MIME, safe Content-Disposition, nosniff and private cache. No direct public storage path.
- Request body: None.
- Example request: `GET /api/files/{key}/content`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "binary": "The success body is the actual file bytes, not this JSON illustration."
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### DELETE /files/{key} — Delete permitted attachment

- Authentication: Session.
- Required permission/scope: Uploader or root, and only when no saved record references the file.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: key; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Remove attachment action. Trigger: Remove uncommitted or removable attachment.
- Backend behavior/validation: A referenced file returns 409. Save the parent attachment-list removal first. The frontend defers binary deletion until that save commits. The maintenance command removes unlinked uploads older than one day.
- Request body: 
```json
{}
```
- Example request: `DELETE /api/files/{key}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": null
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### POST /quotations/{id}/email — Send quotation email

- Authentication: Session.
- Required permission/scope: sales edit and visibility of quotation.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing email modal. Trigger: Send.
- Backend behavior/validation: Validate recipient email, nonempty subject/body and visible quotation. Use configured Laravel mail transport; mark sent only on successful transport handoff, record outcome and avoid duplicate sends with Idempotency-Key. The endpoint rejects log/array transports outside automated testing with 503; configure SMTP before using Send.
- Request body: 
```json
{
  "to": "customer@example.com",
  "subject": "عرض السعر",
  "body": "يرجى الاطلاع على عرض السعر."
}
```
- Example request: `POST /api/quotations/{id}/email` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "sent": true
  }
}
```
- Errors/status codes: 400,401,403,404,409,419,422,429,500,503; standard error bodies in §2.

### GET /audit-events — Business audit events

- Authentication: Session.
- Required permission/scope: viewArchive.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: page, perPage, q, from, to, userId, module, resource, resourceId.
- Frontend: Archive audit screen. Trigger: Open/search/page archive.
- Backend behavior/validation: Scope data to visible records; derive actor/time server-side; include human-readable changed fields and bounded before/after values.
- Request body: None.
- Example request: `GET /api/audit-events`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "AUD-1",
      "app": "sales",
      "changeType": "update",
      "changedAreas": [
        "customers"
      ]
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### GET /audit-events/{id} — Business audit detail

- Authentication: Session.
- Required permission/scope: viewArchive and event record scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Archive detail modal. Trigger: Open audit detail.
- Backend behavior/validation: Return only authorized before/after fields, never passwords/files bytes.
- Request body: None.
- Example request: `GET /api/audit-events/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "AUD-1",
    "changes": [
      {
        "field": "phone",
        "before": "",
        "after": "0933000000"
      }
    ]
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### GET /dashboard — Employee dashboard

- Authentication: Session.
- Required permission/scope: Self.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q, from, to, department, employeeId, customerId, supplierId, currency, status, period, page, perPage, print=0/1. Ledger reports also accept account and party; currency is required for ledger reports. Date bounds apply to the primary record date. Grouping/formatting in the existing screens is performed on the authorized data cache.
- Frontend: Department/employee dashboard and existing report/print views. Trigger: Open, change filter, refresh or print.
- Backend behavior/validation: Recompute from permitted persisted data; do not accept client totals. For reports whitelist sales, design-work, hr, operations, inventory, finance, cash, trial-balance, party-statement, payroll. Keep currencies separate. print=1 returns full filtered data with explicit bounded result limit and does not silently print only one page.
- Request body: None.
- Example request: `GET /api/dashboard`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "rows": [],
    "summary": {},
    "generatedAt": "2026-09-21T10:00:00Z"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### GET /departments/{department}/dashboard — Department dashboard

- Authentication: Session.
- Required permission/scope: module.dashboard and department scope.
- Headers: Accept: application/json.
- Path parameters: department; exact existing identifiers, scoped as above.
- Query parameters: q, from, to, department, employeeId, customerId, supplierId, currency, status, period, page, perPage, print=0/1. Ledger reports also accept account and party; currency is required for ledger reports. Date bounds apply to the primary record date. Grouping/formatting in the existing screens is performed on the authorized data cache.
- Frontend: Department/employee dashboard and existing report/print views. Trigger: Open, change filter, refresh or print.
- Backend behavior/validation: Recompute from permitted persisted data; do not accept client totals. For reports whitelist sales, design-work, hr, operations, inventory, finance, cash, trial-balance, party-statement, payroll. Keep currencies separate. print=1 returns full filtered data with explicit bounded result limit and does not silently print only one page.
- Request body: None.
- Example request: `GET /api/departments/{department}/dashboard`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "rows": [],
    "summary": {},
    "generatedAt": "2026-09-21T10:00:00Z"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### GET /reports/{report} — Report data

- Authentication: Session.
- Required permission/scope: module.reports/print and row scope.
- Headers: Accept: application/json.
- Path parameters: report; exact existing identifiers, scoped as above.
- Query parameters: q, from, to, department, employeeId, customerId, supplierId, currency, status, period, page, perPage, print=0/1. Ledger reports also accept account and party; currency is required for ledger reports. Date bounds apply to the primary record date. Grouping/formatting in the existing screens is performed on the authorized data cache.
- Frontend: Department/employee dashboard and existing report/print views. Trigger: Open, change filter, refresh or print.
- Backend behavior/validation: Recompute from permitted persisted data; do not accept client totals. For reports whitelist sales, design-work, hr, operations, inventory, finance, cash, trial-balance, party-statement, payroll. Keep currencies separate. print=1 returns full filtered data with explicit bounded result limit and does not silently print only one page.
- Request body: None.
- Example request: `GET /api/reports/{report}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "rows": [],
    "summary": {},
    "generatedAt": "2026-09-21T10:00:00Z"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

## 6. Resource endpoints and exact editable field inventories

All resource bodies use the existing frontend field names. Server response adds `id`, `_version`, createdAt/updatedAt and canonical derived fields. This avoids changing labels or forms. Fields listed below are the accepted source schema, subject to the domain/field permission rules. Financial minor-unit values are integers; displayed unit prices/hour bases remain decimal strings until exact server conversion.

### Schema: Customer

Frontend source: scripts 02,19,24,34,40,41; cache location `customers`.

Normalized name is unique; optional emails must be valid; contact names are required for populated secondary-contact rows. Marketing profile writes require marketing permissions; finance master fields require accounting permission. Renames retain stable customer links. Marketing plans enforce draft/rejected → review → approved/rejected and manager-only decisions.

| Field | Input type | Required on create |
|---|---|---|
| `type` | source form value; see example and domain validation | No |
| `name` | source form value; see example and domain validation | Yes |
| `legalName` | source form value; see example and domain validation | No |
| `industry` | source form value; see example and domain validation | No |
| `contact` | source form value; see example and domain validation | No |
| `jobTitle` | source form value; see example and domain validation | No |
| `phone` | source form value; see example and domain validation | No |
| `alternatePhone` | source form value; see example and domain validation | No |
| `whatsapp` | source form value; see example and domain validation | No |
| `email` | source form value; see example and domain validation | No |
| `website` | source form value; see example and domain validation | No |
| `country` | source form value; see example and domain validation | No |
| `city` | source form value; see example and domain validation | No |
| `address` | source form value; see example and domain validation | No |
| `billingAddress` | source form value; see example and domain validation | No |
| `deliveryAddress` | source form value; see example and domain validation | No |
| `taxNumber` | source form value; see example and domain validation | No |
| `commercialRegister` | source form value; see example and domain validation | No |
| `paymentTerms` | source form value; see example and domain validation | No |
| `currency` | source form value; see example and domain validation | No |
| `salesperson` | source form value; see example and domain validation | No |
| `source` | object; nested record schema applies | No |
| `preferredContact` | source form value; see example and domain validation | No |
| `notes` | source form value; see example and domain validation | No |
| `active` | boolean | No |
| `secondaryContacts` | array; nested record schema applies | No |
| `marketingProfile` | object; nested record schema applies | No |
| `accountCode22` | source form value; see example and domain validation | No |
| `paymentDays` | number (or decimal string at the unchanged form boundary) | No |

### GET /customers — Customer list

- Authentication: Session.
- Required permission/scope: sales.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: Customer lists/forms/workflow controls (scripts 02,19,24,34,40,41). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Normalized name is unique; optional emails must be valid; contact names are required for populated secondary-contact rows. Marketing profile writes require marketing permissions; finance master fields require accounting permission. Renames retain stable customer links. Marketing plans enforce draft/rejected → review → approved/rejected and manager-only decisions. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/customers`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "name": "شركة العميل",
      "type": "company",
      "active": true,
      "currency": "USD",
      "secondaryContacts": []
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /customers — Customer create

- Authentication: Session.
- Required permission/scope: sales.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Customer lists/forms/workflow controls (scripts 02,19,24,34,40,41). Trigger: Save a new record.
- Backend behavior/validation: Normalized name is unique; optional emails must be valid; contact names are required for populated secondary-contact rows. Marketing profile writes require marketing permissions; finance master fields require accounting permission. Renames retain stable customer links. Marketing plans enforce draft/rejected → review → approved/rejected and manager-only decisions. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "name": "شركة العميل",
  "type": "company",
  "active": true,
  "currency": "USD",
  "secondaryContacts": []
}
```
- Example request: `POST /api/customers` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "شركة العميل",
    "type": "company",
    "active": true,
    "currency": "USD",
    "secondaryContacts": []
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /customers/{id} — Customer details

- Authentication: Session.
- Required permission/scope: sales.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Customer lists/forms/workflow controls (scripts 02,19,24,34,40,41). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Normalized name is unique; optional emails must be valid; contact names are required for populated secondary-contact rows. Marketing profile writes require marketing permissions; finance master fields require accounting permission. Renames retain stable customer links. Marketing plans enforce draft/rejected → review → approved/rejected and manager-only decisions. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/customers/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "شركة العميل",
    "type": "company",
    "active": true,
    "currency": "USD",
    "secondaryContacts": []
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /customers/{id} — Customer update/action

- Authentication: Session.
- Required permission/scope: sales.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Customer lists/forms/workflow controls (scripts 02,19,24,34,40,41). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Normalized name is unique; optional emails must be valid; contact names are required for populated secondary-contact rows. Marketing profile writes require marketing permissions; finance master fields require accounting permission. Renames retain stable customer links. Marketing plans enforce draft/rejected → review → approved/rejected and manager-only decisions. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "name": "شركة العميل",
  "type": "company",
  "active": true,
  "currency": "USD",
  "secondaryContacts": [],
  "_version": 1
}
```
- Example request: `PATCH /api/customers/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "شركة العميل",
    "type": "company",
    "active": true,
    "currency": "USD",
    "secondaryContacts": []
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### DELETE /customers/{id} — Customer delete

- Authentication: Session.
- Required permission/scope: sales.delete plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Customer lists/forms/workflow controls (scripts 02,19,24,34,40,41). Trigger: Confirm existing delete action.
- Backend behavior/validation: Normalized name is unique; optional emails must be valid; contact names are required for populated secondary-contact rows. Marketing profile writes require marketing permissions; finance master fields require accounting permission. Renames retain stable customer links. Marketing plans enforce draft/rejected → review → approved/rejected and manager-only decisions. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "_version": 1
}
```
- Example request: `DELETE /api/customers/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": null
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: Service

Frontend source: scripts 02,19; cache location `services`.

Unique normalized name. References survive edits.

| Field | Input type | Required on create |
|---|---|---|
| `name` | source form value; see example and domain validation | Yes |
| `category` | source form value; see example and domain validation | No |
| `serviceDescription` | source form value; see example and domain validation | No |
| `active` | boolean | No |
| `serviceCode` | source form value; see example and domain validation | No |

### GET /services — Service list

- Authentication: Session.
- Required permission/scope: sales.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: Service lists/forms/workflow controls (scripts 02,19). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Unique normalized name. References survive edits. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/services`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "name": "جلسة تصوير",
      "category": "التصوير",
      "serviceDescription": "تصوير منتجات",
      "active": true
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /services — Service create

- Authentication: Session.
- Required permission/scope: sales.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Service lists/forms/workflow controls (scripts 02,19). Trigger: Save a new record.
- Backend behavior/validation: Unique normalized name. References survive edits. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "name": "جلسة تصوير",
  "category": "التصوير",
  "serviceDescription": "تصوير منتجات",
  "active": true
}
```
- Example request: `POST /api/services` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "جلسة تصوير",
    "category": "التصوير",
    "serviceDescription": "تصوير منتجات",
    "active": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /services/{id} — Service details

- Authentication: Session.
- Required permission/scope: sales.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Service lists/forms/workflow controls (scripts 02,19). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Unique normalized name. References survive edits. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/services/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "جلسة تصوير",
    "category": "التصوير",
    "serviceDescription": "تصوير منتجات",
    "active": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /services/{id} — Service update/action

- Authentication: Session.
- Required permission/scope: sales.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Service lists/forms/workflow controls (scripts 02,19). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Unique normalized name. References survive edits. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "name": "جلسة تصوير",
  "category": "التصوير",
  "serviceDescription": "تصوير منتجات",
  "active": true,
  "_version": 1
}
```
- Example request: `PATCH /api/services/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "جلسة تصوير",
    "category": "التصوير",
    "serviceDescription": "تصوير منتجات",
    "active": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### DELETE /services/{id} — Service delete

- Authentication: Session.
- Required permission/scope: sales.delete plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Service lists/forms/workflow controls (scripts 02,19). Trigger: Confirm existing delete action.
- Backend behavior/validation: Unique normalized name. References survive edits. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "_version": 1
}
```
- Example request: `DELETE /api/services/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": null
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: Salesperson

Frontend source: scripts 02; cache location `salespeople`.

Validate optional email and known team when assigned.

| Field | Input type | Required on create |
|---|---|---|
| `name` | source form value; see example and domain validation | Yes |
| `phone` | source form value; see example and domain validation | No |
| `email` | source form value; see example and domain validation | No |
| `jobTitle` | source form value; see example and domain validation | No |
| `salesTeam` | source form value; see example and domain validation | No |
| `active` | boolean | No |
| `notes` | source form value; see example and domain validation | No |

### GET /salespeople — Salesperson list

- Authentication: Session.
- Required permission/scope: sales.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: Salesperson lists/forms/workflow controls (scripts 02). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Validate optional email and known team when assigned. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/salespeople`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "name": "مندوب مبيعات",
      "active": true
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /salespeople — Salesperson create

- Authentication: Session.
- Required permission/scope: sales.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Salesperson lists/forms/workflow controls (scripts 02). Trigger: Save a new record.
- Backend behavior/validation: Validate optional email and known team when assigned. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "name": "مندوب مبيعات",
  "active": true
}
```
- Example request: `POST /api/salespeople` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "مندوب مبيعات",
    "active": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /salespeople/{id} — Salesperson details

- Authentication: Session.
- Required permission/scope: sales.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Salesperson lists/forms/workflow controls (scripts 02). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Validate optional email and known team when assigned. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/salespeople/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "مندوب مبيعات",
    "active": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /salespeople/{id} — Salesperson update/action

- Authentication: Session.
- Required permission/scope: sales.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Salesperson lists/forms/workflow controls (scripts 02). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Validate optional email and known team when assigned. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "name": "مندوب مبيعات",
  "active": true,
  "_version": 1
}
```
- Example request: `PATCH /api/salespeople/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "مندوب مبيعات",
    "active": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### DELETE /salespeople/{id} — Salesperson delete

- Authentication: Session.
- Required permission/scope: sales.delete plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Salesperson lists/forms/workflow controls (scripts 02). Trigger: Confirm existing delete action.
- Backend behavior/validation: Validate optional email and known team when assigned. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "_version": 1
}
```
- Example request: `DELETE /api/salespeople/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": null
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: SalesTeam

Frontend source: scripts 02; cache location `salesTeamsCfg`.

Members and leader must identify existing salespeople; no duplicate members.

| Field | Input type | Required on create |
|---|---|---|
| `name` | source form value; see example and domain validation | Yes |
| `leader` | source form value; see example and domain validation | No |
| `members` | array; nested record schema applies | No |
| `active` | boolean | No |
| `notes` | source form value; see example and domain validation | No |

### GET /sales-teams — SalesTeam list

- Authentication: Session.
- Required permission/scope: sales.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: SalesTeam lists/forms/workflow controls (scripts 02). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Members and leader must identify existing salespeople; no duplicate members. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/sales-teams`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "name": "فريق المبيعات",
      "members": [],
      "active": true
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /sales-teams — SalesTeam create

- Authentication: Session.
- Required permission/scope: sales.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: SalesTeam lists/forms/workflow controls (scripts 02). Trigger: Save a new record.
- Backend behavior/validation: Members and leader must identify existing salespeople; no duplicate members. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "name": "فريق المبيعات",
  "members": [],
  "active": true
}
```
- Example request: `POST /api/sales-teams` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "فريق المبيعات",
    "members": [],
    "active": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /sales-teams/{id} — SalesTeam details

- Authentication: Session.
- Required permission/scope: sales.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: SalesTeam lists/forms/workflow controls (scripts 02). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Members and leader must identify existing salespeople; no duplicate members. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/sales-teams/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "فريق المبيعات",
    "members": [],
    "active": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /sales-teams/{id} — SalesTeam update/action

- Authentication: Session.
- Required permission/scope: sales.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: SalesTeam lists/forms/workflow controls (scripts 02). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Members and leader must identify existing salespeople; no duplicate members. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "name": "فريق المبيعات",
  "members": [],
  "active": true,
  "_version": 1
}
```
- Example request: `PATCH /api/sales-teams/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "فريق المبيعات",
    "members": [],
    "active": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### DELETE /sales-teams/{id} — SalesTeam delete

- Authentication: Session.
- Required permission/scope: sales.delete plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: SalesTeam lists/forms/workflow controls (scripts 02). Trigger: Confirm existing delete action.
- Backend behavior/validation: Members and leader must identify existing salespeople; no duplicate members. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "_version": 1
}
```
- Example request: `DELETE /api/sales-teams/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": null
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: QuotationTemplate

Frontend source: scripts 02; cache location `quoteTemplates`.

style: official/compact/detailed; validityDays is nonnegative; exactly one active default when defaults exist.

| Field | Input type | Required on create |
|---|---|---|
| `name` | source form value; see example and domain validation | Yes |
| `style` | source form value; see example and domain validation | No |
| `validityDays` | source form value; see example and domain validation | No |
| `defaultNotes` | source form value; see example and domain validation | No |
| `isDefault` | boolean | No |
| `active` | boolean | No |

### GET /quotation-templates — QuotationTemplate list

- Authentication: Session.
- Required permission/scope: sales.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: QuotationTemplate lists/forms/workflow controls (scripts 02). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: style: official/compact/detailed; validityDays is nonnegative; exactly one active default when defaults exist. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/quotation-templates`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "name": "رسمي",
      "style": "official",
      "validityDays": 7,
      "isDefault": false,
      "active": true
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /quotation-templates — QuotationTemplate create

- Authentication: Session.
- Required permission/scope: sales.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: QuotationTemplate lists/forms/workflow controls (scripts 02). Trigger: Save a new record.
- Backend behavior/validation: style: official/compact/detailed; validityDays is nonnegative; exactly one active default when defaults exist. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "name": "رسمي",
  "style": "official",
  "validityDays": 7,
  "isDefault": false,
  "active": true
}
```
- Example request: `POST /api/quotation-templates` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "رسمي",
    "style": "official",
    "validityDays": 7,
    "isDefault": false,
    "active": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /quotation-templates/{id} — QuotationTemplate details

- Authentication: Session.
- Required permission/scope: sales.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: QuotationTemplate lists/forms/workflow controls (scripts 02). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: style: official/compact/detailed; validityDays is nonnegative; exactly one active default when defaults exist. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/quotation-templates/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "رسمي",
    "style": "official",
    "validityDays": 7,
    "isDefault": false,
    "active": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /quotation-templates/{id} — QuotationTemplate update/action

- Authentication: Session.
- Required permission/scope: sales.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: QuotationTemplate lists/forms/workflow controls (scripts 02). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: style: official/compact/detailed; validityDays is nonnegative; exactly one active default when defaults exist. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "name": "رسمي",
  "style": "official",
  "validityDays": 7,
  "isDefault": false,
  "active": true,
  "_version": 1
}
```
- Example request: `PATCH /api/quotation-templates/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "رسمي",
    "style": "official",
    "validityDays": 7,
    "isDefault": false,
    "active": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### DELETE /quotation-templates/{id} — QuotationTemplate delete

- Authentication: Session.
- Required permission/scope: sales.delete plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: QuotationTemplate lists/forms/workflow controls (scripts 02). Trigger: Confirm existing delete action.
- Backend behavior/validation: style: official/compact/detailed; validityDays is nonnegative; exactly one active default when defaults exist. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "_version": 1
}
```
- Example request: `DELETE /api/quotation-templates/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": null
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: ServiceContract

Frontend source: scripts 02; cache location `serviceContracts`.

status: draft/active/expired/cancelled; endDate ≥ startDate; active contracts need at least one line. Each line has service, description, qty > 0 and price ≥ 0; taxRate 0–100; the existing renderer calculates displayed totals from stored lines.

| Field | Input type | Required on create |
|---|---|---|
| `contractNumber` | source form value; see example and domain validation | No |
| `contractTitle` | source form value; see example and domain validation | Yes |
| `customer` | source form value; see example and domain validation | Yes |
| `customerId` | source form value; see example and domain validation | No |
| `customerRepresentative` | source form value; see example and domain validation | No |
| `customerRepresentativeTitle` | source form value; see example and domain validation | No |
| `moshRepresentative` | source form value; see example and domain validation | No |
| `status` | source form value; see example and domain validation | No |
| `startDate` | date YYYY-MM-DD; empty/null allowed when optional | No |
| `endDate` | date YYYY-MM-DD; empty/null allowed when optional | No |
| `autoRenew` | boolean | No |
| `renewalPeriod` | source form value; see example and domain validation | No |
| `noticeDays` | source form value; see example and domain validation | No |
| `currency` | source form value; see example and domain validation | No |
| `billingCycle` | source form value; see example and domain validation | No |
| `paymentDueDays` | source form value; see example and domain validation | No |
| `taxRate` | number (or decimal string at the unchanged form boundary) | No |
| `lines` | array; nested record schema applies | No |
| `scopeText` | source form value; see example and domain validation | No |
| `moshObligations` | source form value; see example and domain validation | No |
| `clientObligations` | source form value; see example and domain validation | No |
| `confidentiality` | source form value; see example and domain validation | No |
| `intellectualProperty` | source form value; see example and domain validation | No |
| `termination` | source form value; see example and domain validation | No |
| `forceMajeure` | source form value; see example and domain validation | No |
| `disputes` | source form value; see example and domain validation | No |
| `additionalTerms` | source form value; see example and domain validation | No |
| `clientSignatory` | source form value; see example and domain validation | No |
| `clientSignatoryTitle` | source form value; see example and domain validation | No |
| `moshSignatory` | source form value; see example and domain validation | No |
| `moshSignatoryTitle` | source form value; see example and domain validation | No |

### GET /service-contracts — ServiceContract list

- Authentication: Session.
- Required permission/scope: sales.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: ServiceContract lists/forms/workflow controls (scripts 02). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: status: draft/active/expired/cancelled; endDate ≥ startDate; active contracts need at least one line. Each line has service, description, qty > 0 and price ≥ 0; taxRate 0–100; the existing renderer calculates displayed totals from stored lines. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/service-contracts`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "contractTitle": "عقد خدمات",
      "customer": "شركة العميل",
      "status": "draft",
      "currency": "USD",
      "taxRate": 0,
      "lines": []
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /service-contracts — ServiceContract create

- Authentication: Session.
- Required permission/scope: sales.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: ServiceContract lists/forms/workflow controls (scripts 02). Trigger: Save a new record.
- Backend behavior/validation: status: draft/active/expired/cancelled; endDate ≥ startDate; active contracts need at least one line. Each line has service, description, qty > 0 and price ≥ 0; taxRate 0–100; the existing renderer calculates displayed totals from stored lines. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "contractTitle": "عقد خدمات",
  "customer": "شركة العميل",
  "status": "draft",
  "currency": "USD",
  "taxRate": 0,
  "lines": []
}
```
- Example request: `POST /api/service-contracts` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "contractTitle": "عقد خدمات",
    "customer": "شركة العميل",
    "status": "draft",
    "currency": "USD",
    "taxRate": 0,
    "lines": []
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /service-contracts/{id} — ServiceContract details

- Authentication: Session.
- Required permission/scope: sales.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: ServiceContract lists/forms/workflow controls (scripts 02). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: status: draft/active/expired/cancelled; endDate ≥ startDate; active contracts need at least one line. Each line has service, description, qty > 0 and price ≥ 0; taxRate 0–100; the existing renderer calculates displayed totals from stored lines. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/service-contracts/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "contractTitle": "عقد خدمات",
    "customer": "شركة العميل",
    "status": "draft",
    "currency": "USD",
    "taxRate": 0,
    "lines": []
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /service-contracts/{id} — ServiceContract update/action

- Authentication: Session.
- Required permission/scope: sales.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: ServiceContract lists/forms/workflow controls (scripts 02). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: status: draft/active/expired/cancelled; endDate ≥ startDate; active contracts need at least one line. Each line has service, description, qty > 0 and price ≥ 0; taxRate 0–100; the existing renderer calculates displayed totals from stored lines. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "contractTitle": "عقد خدمات",
  "customer": "شركة العميل",
  "status": "draft",
  "currency": "USD",
  "taxRate": 0,
  "lines": [],
  "_version": 1
}
```
- Example request: `PATCH /api/service-contracts/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "contractTitle": "عقد خدمات",
    "customer": "شركة العميل",
    "status": "draft",
    "currency": "USD",
    "taxRate": 0,
    "lines": []
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: Quotation

Frontend source: scripts 02,19,24; cache location `quotations`.

Stages: draft/sent/order/cancel. Product rows require qty > 0, price/cost ≥ 0, discount/tax 0–100; section/note rows require description. Displayed quote totals are calculated from persisted product lines; invoice totals are independently recalculated on the server. Order confirmation is an authorized status operation; linked orders cannot be deleted while tasks/invoices exist. Optional rows require product, positive qty and nonnegative price. Chatter is stored with the quotation; all mutations also receive an independent authenticated server audit event.

| Field | Input type | Required on create |
|---|---|---|
| `number` | source form value; see example and domain validation | No |
| `title` | source form value; see example and domain validation | No |
| `status` | source form value; see example and domain validation | No |
| `customer` | source form value; see example and domain validation | Yes |
| `customerId` | source form value; see example and domain validation | No |
| `invoiceAddress` | source form value; see example and domain validation | No |
| `deliveryAddress` | source form value; see example and domain validation | No |
| `template` | source form value; see example and domain validation | No |
| `expiration` | date YYYY-MM-DD; empty/null allowed when optional | No |
| `pricelist` | source form value; see example and domain validation | No |
| `paymentTerms` | source form value; see example and domain validation | No |
| `salesperson` | source form value; see example and domain validation | No |
| `salesTeam` | source form value; see example and domain validation | No |
| `company` | source form value; see example and domain validation | No |
| `onlineSignature` | boolean | No |
| `onlinePayment` | boolean | No |
| `prepayment` | number (or decimal string at the unchanged form boundary) | No |
| `deliveryDate` | date YYYY-MM-DD; empty/null allowed when optional | No |
| `fiscalPosition` | source form value; see example and domain validation | No |
| `customerReference` | source form value; see example and domain validation | No |
| `sourceDocument` | source form value; see example and domain validation | No |
| `campaign` | source form value; see example and domain validation | No |
| `medium` | source form value; see example and domain validation | No |
| `source` | object; nested record schema applies | No |
| `lines` | array; nested record schema applies | No |
| `optional` | array; nested record schema applies | No |
| `notes` | source form value; see example and domain validation | No |
| `quoteBuilder` | object; nested record schema applies | No |
| `quoteFollowup` | source form value; see example and domain validation | No |
| `salesFollowup` | source form value; see example and domain validation | No |
| `followupNotes` | array; nested record schema applies | No |
| `chatter` | array; nested record schema applies | No |
| `invoiceCreated` | boolean | No |
| `sentAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `confirmedAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `cancelledAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |

### GET /quotations — Quotation list

- Authentication: Session.
- Required permission/scope: sales.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: Quotation lists/forms/workflow controls (scripts 02,19,24). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Stages: draft/sent/order/cancel. Product rows require qty > 0, price/cost ≥ 0, discount/tax 0–100; section/note rows require description. Displayed quote totals are calculated from persisted product lines; invoice totals are independently recalculated on the server. Order confirmation is an authorized status operation; linked orders cannot be deleted while tasks/invoices exist. Optional rows require product, positive qty and nonnegative price. Chatter is stored with the quotation; all mutations also receive an independent authenticated server audit event. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/quotations`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "customer": "شركة العميل",
      "status": "draft",
      "lines": [
        {
          "type": "product",
          "product": "جلسة تصوير",
          "description": "تصوير",
          "qty": 1,
          "price": 100,
          "discount": 0,
          "tax": 0,
          "cost": 50
        }
      ],
      "optional": [],
      "notes": ""
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /quotations — Quotation create

- Authentication: Session.
- Required permission/scope: sales.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Quotation lists/forms/workflow controls (scripts 02,19,24). Trigger: Save a new record.
- Backend behavior/validation: Stages: draft/sent/order/cancel. Product rows require qty > 0, price/cost ≥ 0, discount/tax 0–100; section/note rows require description. Displayed quote totals are calculated from persisted product lines; invoice totals are independently recalculated on the server. Order confirmation is an authorized status operation; linked orders cannot be deleted while tasks/invoices exist. Optional rows require product, positive qty and nonnegative price. Chatter is stored with the quotation; all mutations also receive an independent authenticated server audit event. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "customer": "شركة العميل",
  "status": "draft",
  "lines": [
    {
      "type": "product",
      "product": "جلسة تصوير",
      "description": "تصوير",
      "qty": 1,
      "price": 100,
      "discount": 0,
      "tax": 0,
      "cost": 50
    }
  ],
  "optional": [],
  "notes": ""
}
```
- Example request: `POST /api/quotations` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "customer": "شركة العميل",
    "status": "draft",
    "lines": [
      {
        "type": "product",
        "product": "جلسة تصوير",
        "description": "تصوير",
        "qty": 1,
        "price": 100,
        "discount": 0,
        "tax": 0,
        "cost": 50
      }
    ],
    "optional": [],
    "notes": ""
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /quotations/{id} — Quotation details

- Authentication: Session.
- Required permission/scope: sales.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Quotation lists/forms/workflow controls (scripts 02,19,24). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Stages: draft/sent/order/cancel. Product rows require qty > 0, price/cost ≥ 0, discount/tax 0–100; section/note rows require description. Displayed quote totals are calculated from persisted product lines; invoice totals are independently recalculated on the server. Order confirmation is an authorized status operation; linked orders cannot be deleted while tasks/invoices exist. Optional rows require product, positive qty and nonnegative price. Chatter is stored with the quotation; all mutations also receive an independent authenticated server audit event. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/quotations/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "customer": "شركة العميل",
    "status": "draft",
    "lines": [
      {
        "type": "product",
        "product": "جلسة تصوير",
        "description": "تصوير",
        "qty": 1,
        "price": 100,
        "discount": 0,
        "tax": 0,
        "cost": 50
      }
    ],
    "optional": [],
    "notes": ""
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /quotations/{id} — Quotation update/action

- Authentication: Session.
- Required permission/scope: sales.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Quotation lists/forms/workflow controls (scripts 02,19,24). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Stages: draft/sent/order/cancel. Product rows require qty > 0, price/cost ≥ 0, discount/tax 0–100; section/note rows require description. Displayed quote totals are calculated from persisted product lines; invoice totals are independently recalculated on the server. Order confirmation is an authorized status operation; linked orders cannot be deleted while tasks/invoices exist. Optional rows require product, positive qty and nonnegative price. Chatter is stored with the quotation; all mutations also receive an independent authenticated server audit event. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "customer": "شركة العميل",
  "status": "draft",
  "lines": [
    {
      "type": "product",
      "product": "جلسة تصوير",
      "description": "تصوير",
      "qty": 1,
      "price": 100,
      "discount": 0,
      "tax": 0,
      "cost": 50
    }
  ],
  "optional": [],
  "notes": "",
  "_version": 1
}
```
- Example request: `PATCH /api/quotations/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "customer": "شركة العميل",
    "status": "draft",
    "lines": [
      {
        "type": "product",
        "product": "جلسة تصوير",
        "description": "تصوير",
        "qty": 1,
        "price": 100,
        "discount": 0,
        "tax": 0,
        "cost": 50
      }
    ],
    "optional": [],
    "notes": ""
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### DELETE /quotations/{id} — Quotation delete

- Authentication: Session.
- Required permission/scope: sales.delete plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Quotation lists/forms/workflow controls (scripts 02,19,24). Trigger: Confirm existing delete action.
- Backend behavior/validation: Stages: draft/sent/order/cancel. Product rows require qty > 0, price/cost ≥ 0, discount/tax 0–100; section/note rows require description. Displayed quote totals are calculated from persisted product lines; invoice totals are independently recalculated on the server. Order confirmation is an authorized status operation; linked orders cannot be deleted while tasks/invoices exist. Optional rows require product, positive qty and nonnegative price. Chatter is stored with the quotation; all mutations also receive an independent authenticated server audit event. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "_version": 1
}
```
- Example request: `DELETE /api/quotations/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": null
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: Task

Frontend source: scripts 02,09,24,30,37,44–51; cache location `salesTasks`.

Scoped by mine/department/all and module action. Assignee must be an active linked employee in the target department or its appointed manager. Customer and optional order/parent must exist. Enforce task transitions and server-owned timing/history; shared children cannot escape their root or introduce cycles. Submitted work returns only to the assignee or completes through the manager/accounting route. Validate completed children before package billing.

| Field | Input type | Required on create |
|---|---|---|
| `number` | source form value; see example and domain validation | No |
| `taskNo` | source form value; see example and domain validation | No |
| `parentTaskId` | source form value; see example and domain validation | No |
| `parentTaskNo` | source form value; see example and domain validation | No |
| `parentTaskTitle` | source form value; see example and domain validation | No |
| `salesOrderId` | source form value; see example and domain validation | No |
| `salesOrderNo` | source form value; see example and domain validation | No |
| `origin` | source form value; see example and domain validation | No |
| `customer` | source form value; see example and domain validation | Yes |
| `customerId` | source form value; see example and domain validation | No |
| `title` | source form value; see example and domain validation | Yes |
| `description` | source form value; see example and domain validation | No |
| `department` | source form value; see example and domain validation | Yes |
| `assignee` | source form value; see example and domain validation | No |
| `assigneeId` | source form value; see example and domain validation | No |
| `assignmentMode` | source form value; see example and domain validation | No |
| `employeeState` | source form value; see example and domain validation | No |
| `reviewManager` | source form value; see example and domain validation | No |
| `returnedForRevision` | boolean | No |
| `dueDate` | date YYYY-MM-DD; empty/null allowed when optional | No |
| `notes` | source form value; see example and domain validation | No |
| `attachments` | array; nested record schema applies | No |
| `status` | source form value; see example and domain validation | No |
| `history` | array; nested record schema applies | No |
| `workChat` | array; nested record schema applies | No |
| `workTiming` | object; nested record schema applies | No |
| `sharedDistributionRoot` | boolean | No |
| `sharedDistributionMode` | source form value; see example and domain validation | No |
| `sharedDistributionVersion` | source form value; see example and domain validation | No |
| `sharedOriginalDepartment` | source form value; see example and domain validation | No |
| `sharedLeadDepartment` | source form value; see example and domain validation | No |
| `sharedCreatedAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `sharedCreatedBy` | source form value; see example and domain validation | No |
| `sharedReady` | boolean | No |
| `sharedReadyAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `sharedPreviousDepartment` | source form value; see example and domain validation | No |
| `sharedDistributionChild` | boolean | No |
| `sharedNodeType` | source form value; see example and domain validation | No |
| `sharedRootTaskId` | source form value; see example and domain validation | No |
| `sharedDepartment` | source form value; see example and domain validation | No |
| `sharedVersion` | source form value; see example and domain validation | No |
| `sharedTeamContainer` | boolean | No |
| `sharedTeamLead` | source form value; see example and domain validation | No |
| `sharedLead` | boolean | No |
| `packageReady` | boolean | No |
| `packageReadyAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `closedFromDepartment` | source form value; see example and domain validation | No |
| `closedAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `closedBy` | source form value; see example and domain validation | No |
| `completedAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `completedBy` | source form value; see example and domain validation | No |
| `archiveBillingType` | source form value; see example and domain validation | No |
| `archivedAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `archivedBy` | source form value; see example and domain validation | No |
| `finalizedAccountingAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `finalizedAccountingBy` | source form value; see example and domain validation | No |
| `invoicedAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `noInvoiceAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `restoredAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `restoredBy` | source form value; see example and domain validation | No |
| `restoredFromArchiveStatus` | source form value; see example and domain validation | No |
| `restoredToDepartment` | source form value; see example and domain validation | No |
| `finance21InvoiceId` | source form value; see example and domain validation | No |
| `finance21ExternalInvoice` | source form value; see example and domain validation | No |
| `finance21Reason` | source form value; see example and domain validation | No |
| `serviceCode` | source form value; see example and domain validation | No |
| `serviceDescription` | source form value; see example and domain validation | No |

### GET /tasks — Task list

- Authentication: Session.
- Required permission/scope: tasks.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: Task lists/forms/workflow controls (scripts 02,09,24,30,37,44–51). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Scoped by mine/department/all and module action. Assignee must be an active linked employee in the target department or its appointed manager. Customer and optional order/parent must exist. Enforce task transitions and server-owned timing/history; shared children cannot escape their root or introduce cycles. Submitted work returns only to the assignee or completes through the manager/accounting route. Validate completed children before package billing. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/tasks`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "title": "تصوير المنتج",
      "customer": "شركة العميل",
      "department": "التصوير",
      "status": "in_progress",
      "assignmentMode": "manager",
      "employeeState": "new",
      "assignee": "",
      "attachments": []
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /tasks — Task create

- Authentication: Session.
- Required permission/scope: tasks.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Task lists/forms/workflow controls (scripts 02,09,24,30,37,44–51). Trigger: Save a new record.
- Backend behavior/validation: Scoped by mine/department/all and module action. Assignee must be an active linked employee in the target department or its appointed manager. Customer and optional order/parent must exist. Enforce task transitions and server-owned timing/history; shared children cannot escape their root or introduce cycles. Submitted work returns only to the assignee or completes through the manager/accounting route. Validate completed children before package billing. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "title": "تصوير المنتج",
  "customer": "شركة العميل",
  "department": "التصوير",
  "status": "in_progress",
  "assignmentMode": "manager",
  "employeeState": "new",
  "assignee": "",
  "attachments": []
}
```
- Example request: `POST /api/tasks` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "title": "تصوير المنتج",
    "customer": "شركة العميل",
    "department": "التصوير",
    "status": "in_progress",
    "assignmentMode": "manager",
    "employeeState": "new",
    "assignee": "",
    "attachments": []
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /tasks/{id} — Task details

- Authentication: Session.
- Required permission/scope: tasks.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Task lists/forms/workflow controls (scripts 02,09,24,30,37,44–51). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Scoped by mine/department/all and module action. Assignee must be an active linked employee in the target department or its appointed manager. Customer and optional order/parent must exist. Enforce task transitions and server-owned timing/history; shared children cannot escape their root or introduce cycles. Submitted work returns only to the assignee or completes through the manager/accounting route. Validate completed children before package billing. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/tasks/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "title": "تصوير المنتج",
    "customer": "شركة العميل",
    "department": "التصوير",
    "status": "in_progress",
    "assignmentMode": "manager",
    "employeeState": "new",
    "assignee": "",
    "attachments": []
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /tasks/{id} — Task update/action

- Authentication: Session.
- Required permission/scope: tasks.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Task lists/forms/workflow controls (scripts 02,09,24,30,37,44–51). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Scoped by mine/department/all and module action. Assignee must be an active linked employee in the target department or its appointed manager. Customer and optional order/parent must exist. Enforce task transitions and server-owned timing/history; shared children cannot escape their root or introduce cycles. Submitted work returns only to the assignee or completes through the manager/accounting route. Validate completed children before package billing. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "title": "تصوير المنتج",
  "customer": "شركة العميل",
  "department": "التصوير",
  "status": "in_progress",
  "assignmentMode": "manager",
  "employeeState": "new",
  "assignee": "",
  "attachments": [],
  "_version": 1
}
```
- Example request: `PATCH /api/tasks/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "title": "تصوير المنتج",
    "customer": "شركة العميل",
    "department": "التصوير",
    "status": "in_progress",
    "assignmentMode": "manager",
    "employeeState": "new",
    "assignee": "",
    "attachments": []
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### DELETE /tasks/{id} — Task delete

- Authentication: Session.
- Required permission/scope: tasks.delete plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Task lists/forms/workflow controls (scripts 02,09,24,30,37,44–51). Trigger: Confirm existing delete action.
- Backend behavior/validation: Scoped by mine/department/all and module action. Assignee must be an active linked employee in the target department or its appointed manager. Customer and optional order/parent must exist. Enforce task transitions and server-owned timing/history; shared children cannot escape their root or introduce cycles. Submitted work returns only to the assignee or completes through the manager/accounting route. Validate completed children before package billing. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "_version": 1
}
```
- Example request: `DELETE /api/tasks/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": null
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: Employee

Frontend source: scripts 02,16–19,35; cache location `staffProfiles`.

HR profile writes are atomic, including staged leave/attendance/document changes. Own/manager directory projections must omit unauthorized private fields. Protect current/root profile; reject deletion with live tasks or signed contracts. Status active/inactive/resigned; resigned needs date/reason. Validate emails, dates, leave overlap, attendance duplicates/breaks; the staged HR editor calculates entitlement and requests overrides, documents, evaluations 0–100, disciplinary reasons and linked approvals.

| Field | Input type | Required on create |
|---|---|---|
| `employeeNo` | source form value; see example and domain validation | No |
| `username` | source form value; see example and domain validation | No |
| `name` | source form value; see example and domain validation | Yes |
| `department` | source form value; see example and domain validation | Yes |
| `jobTitle` | source form value; see example and domain validation | No |
| `employmentType` | source form value; see example and domain validation | No |
| `hireDate` | date YYYY-MM-DD; empty/null allowed when optional | No |
| `employmentStatus` | source form value; see example and domain validation | No |
| `active` | boolean | No |
| `phone` | source form value; see example and domain validation | No |
| `email` | source form value; see example and domain validation | No |
| `notes` | source form value; see example and domain validation | No |
| `directManager` | source form value; see example and domain validation | No |
| `isManager` | boolean | No |
| `documents` | array; nested record schema applies | No |
| `statusHistory` | array; nested record schema applies | No |
| `resignationHistory` | array; nested record schema applies | No |
| `resignationDate` | date YYYY-MM-DD; empty/null allowed when optional | No |
| `resignationReason` | source form value; see example and domain validation | No |
| `leaveRecords` | array; nested record schema applies | No |
| `attendanceRecords` | array; nested record schema applies | No |
| `delayRecords` | array; nested record schema applies | No |
| `disciplinaryRecords` | array; nested record schema applies | No |
| `rewardRecords` | array; nested record schema applies | No |
| `evaluationRecords` | array; nested record schema applies | No |
| `payrollRecords` | array; nested record schema applies | No |
| `fatherName` | source form value; see example and domain validation | No |
| `motherName` | source form value; see example and domain validation | No |
| `nationalId` | source form value; see example and domain validation | No |
| `nationality` | source form value; see example and domain validation | No |
| `birthDate` | date YYYY-MM-DD; empty/null allowed when optional | No |
| `birthPlace` | source form value; see example and domain validation | No |
| `gender` | source form value; see example and domain validation | No |
| `maritalStatus` | source form value; see example and domain validation | No |
| `identifyingMarks` | source form value; see example and domain validation | No |
| `personalEmail` | source form value; see example and domain validation | No |
| `hasHealthCondition` | boolean | No |
| `healthDetails` | source form value; see example and domain validation | No |
| `emergencyPhone` | source form value; see example and domain validation | No |
| `emergencyContactName` | source form value; see example and domain validation | No |
| `emergencyRelation` | source form value; see example and domain validation | No |
| `address` | source form value; see example and domain validation | No |
| `city` | source form value; see example and domain validation | No |
| `country` | source form value; see example and domain validation | No |
| `company` | source form value; see example and domain validation | No |
| `branch` | source form value; see example and domain validation | No |
| `workMode` | source form value; see example and domain validation | No |
| `contractType` | source form value; see example and domain validation | No |
| `probationMonths` | number (or decimal string at the unchanged form boundary) | No |
| `probationEndDate` | date YYYY-MM-DD; empty/null allowed when optional | No |
| `contractEndDate` | date YYYY-MM-DD; empty/null allowed when optional | No |
| `serviceEndReasonType` | source form value; see example and domain validation | No |
| `lastWorkDay` | date YYYY-MM-DD; empty/null allowed when optional | No |
| `hasRelatives` | boolean | No |
| `relativesDetails` | source form value; see example and domain validation | No |
| `corporateEmail` | source form value; see example and domain validation | No |
| `extension` | source form value; see example and domain validation | No |
| `systemUsername` | source form value; see example and domain validation | No |
| `issuedAssets` | source form value; see example and domain validation | No |
| `educationDegree` | source form value; see example and domain validation | No |
| `educationUniversity` | source form value; see example and domain validation | No |
| `educationSpecialization` | source form value; see example and domain validation | No |
| `graduationYear` | source form value; see example and domain validation | No |
| `drivingLicenseType` | source form value; see example and domain validation | No |
| `drivingLicenseNumber` | source form value; see example and domain validation | No |
| `drivingLicenseExpiry` | date YYYY-MM-DD; empty/null allowed when optional | No |
| `offboarding` | object; nested record schema applies | No |
| `assets` | array; nested record schema applies | No |
| `auditTrail` | array; nested record schema applies | No |
| `plannedTimeCoefficient` | number (or decimal string at the unchanged form boundary) | No |
| `annualLeaveDays` | number (or decimal string at the unchanged form boundary) | No |
| `sickLeaveDays` | number (or decimal string at the unchanged form boundary) | No |
| `workdayHours` | number (or decimal string at the unchanged form boundary) | No |
| `leaveOpeningBalance` | source form value; see example and domain validation | No |
| `leaveBalanceAdjustment` | source form value; see example and domain validation | No |
| `performanceWeights` | object; nested record schema applies | No |
| `hrNoticeArchive` | array; nested record schema applies | No |
| `fieldWorkTemplateId` | source form value; see example and domain validation | No |
| `fieldTemplateId` | source form value; see example and domain validation | No |
| `salary` | number (or decimal string at the unchanged form boundary) | No |
| `basicSalary` | source form value; see example and domain validation | No |
| `hourlyRate` | source form value; see example and domain validation | No |
| `currency` | source form value; see example and domain validation | No |
| `payrollCurrency` | source form value; see example and domain validation | No |
| `payrollBasis` | source form value; see example and domain validation | No |
| `monthlySalary` | source form value; see example and domain validation | No |
| `expectedMonthlyHours` | source form value; see example and domain validation | No |
| `passportNumber` | source form value; see example and domain validation | No |
| `residenceNumber` | source form value; see example and domain validation | No |

### GET /employees — Employee list

- Authentication: Session.
- Required permission/scope: hr.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: Employee lists/forms/workflow controls (scripts 02,16–19,35). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: HR profile writes are atomic, including staged leave/attendance/document changes. Own/manager directory projections must omit unauthorized private fields. Protect current/root profile; reject deletion with live tasks or signed contracts. Status active/inactive/resigned; resigned needs date/reason. Validate emails, dates, leave overlap, attendance duplicates/breaks; the staged HR editor calculates entitlement and requests overrides, documents, evaluations 0–100, disciplinary reasons and linked approvals. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/employees`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "name": "موظف تجريبي",
      "department": "التصوير",
      "jobTitle": "مصور",
      "employmentStatus": "active",
      "active": true,
      "hireDate": "2026-01-01",
      "documents": [],
      "leaveRecords": [],
      "attendanceRecords": []
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /employees — Employee create

- Authentication: Session.
- Required permission/scope: hr.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Employee lists/forms/workflow controls (scripts 02,16–19,35). Trigger: Save a new record.
- Backend behavior/validation: HR profile writes are atomic, including staged leave/attendance/document changes. Own/manager directory projections must omit unauthorized private fields. Protect current/root profile; reject deletion with live tasks or signed contracts. Status active/inactive/resigned; resigned needs date/reason. Validate emails, dates, leave overlap, attendance duplicates/breaks; the staged HR editor calculates entitlement and requests overrides, documents, evaluations 0–100, disciplinary reasons and linked approvals. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "name": "موظف تجريبي",
  "department": "التصوير",
  "jobTitle": "مصور",
  "employmentStatus": "active",
  "active": true,
  "hireDate": "2026-01-01",
  "documents": [],
  "leaveRecords": [],
  "attendanceRecords": []
}
```
- Example request: `POST /api/employees` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "موظف تجريبي",
    "department": "التصوير",
    "jobTitle": "مصور",
    "employmentStatus": "active",
    "active": true,
    "hireDate": "2026-01-01",
    "documents": [],
    "leaveRecords": [],
    "attendanceRecords": []
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /employees/{id} — Employee details

- Authentication: Session.
- Required permission/scope: hr.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Employee lists/forms/workflow controls (scripts 02,16–19,35). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: HR profile writes are atomic, including staged leave/attendance/document changes. Own/manager directory projections must omit unauthorized private fields. Protect current/root profile; reject deletion with live tasks or signed contracts. Status active/inactive/resigned; resigned needs date/reason. Validate emails, dates, leave overlap, attendance duplicates/breaks; the staged HR editor calculates entitlement and requests overrides, documents, evaluations 0–100, disciplinary reasons and linked approvals. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/employees/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "موظف تجريبي",
    "department": "التصوير",
    "jobTitle": "مصور",
    "employmentStatus": "active",
    "active": true,
    "hireDate": "2026-01-01",
    "documents": [],
    "leaveRecords": [],
    "attendanceRecords": []
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /employees/{id} — Employee update/action

- Authentication: Session.
- Required permission/scope: hr.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Employee lists/forms/workflow controls (scripts 02,16–19,35). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: HR profile writes are atomic, including staged leave/attendance/document changes. Own/manager directory projections must omit unauthorized private fields. Protect current/root profile; reject deletion with live tasks or signed contracts. Status active/inactive/resigned; resigned needs date/reason. Validate emails, dates, leave overlap, attendance duplicates/breaks; the staged HR editor calculates entitlement and requests overrides, documents, evaluations 0–100, disciplinary reasons and linked approvals. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "name": "موظف تجريبي",
  "department": "التصوير",
  "jobTitle": "مصور",
  "employmentStatus": "active",
  "active": true,
  "hireDate": "2026-01-01",
  "documents": [],
  "leaveRecords": [],
  "attendanceRecords": [],
  "_version": 1
}
```
- Example request: `PATCH /api/employees/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "موظف تجريبي",
    "department": "التصوير",
    "jobTitle": "مصور",
    "employmentStatus": "active",
    "active": true,
    "hireDate": "2026-01-01",
    "documents": [],
    "leaveRecords": [],
    "attendanceRecords": []
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### DELETE /employees/{id} — Employee delete

- Authentication: Session.
- Required permission/scope: hr.delete plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Employee lists/forms/workflow controls (scripts 02,16–19,35). Trigger: Confirm existing delete action.
- Backend behavior/validation: HR profile writes are atomic, including staged leave/attendance/document changes. Own/manager directory projections must omit unauthorized private fields. Protect current/root profile; reject deletion with live tasks or signed contracts. Status active/inactive/resigned; resigned needs date/reason. Validate emails, dates, leave overlap, attendance duplicates/breaks; the staged HR editor calculates entitlement and requests overrides, documents, evaluations 0–100, disciplinary reasons and linked approvals. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "_version": 1
}
```
- Example request: `DELETE /api/employees/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": null
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: HrRequest

Frontend source: scripts 04,16,30–33; cache location `hrProRequests`.

Types/routes are the exact HR request table below. Route and actor are server-derived. Only the current manager/department stage can approve/reject; once final, source effects apply once. Self-service cannot impersonate another employee. Final-result acknowledgement is limited to the affected employee. Type-specific dates, times, amount, destination and documents are validated.

| Field | Input type | Required on create |
|---|---|---|
| `type` | source form value; see example and domain validation | Yes |
| `employeeId` | source form value; see example and domain validation | Yes |
| `employeeName` | source form value; see example and domain validation | No |
| `department` | source form value; see example and domain validation | No |
| `manager` | source form value; see example and domain validation | No |
| `createdDate` | source form value; see example and domain validation | No |
| `status` | source form value; see example and domain validation | No |
| `route` | source form value; see example and domain validation | No |
| `stageIndex` | number (or decimal string at the unchanged form boundary) | No |
| `reason` | source form value; see example and domain validation | Yes |
| `data` | object; nested record schema applies | No |
| `history` | array; nested record schema applies | No |
| `completedAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `managerDecision` | source form value; see example and domain validation | No |
| `managerDecisionAt` | source form value; see example and domain validation | No |
| `managerDecisionBy` | source form value; see example and domain validation | No |
| `managerDecisionNote` | source form value; see example and domain validation | No |
| `finalSeenAt` | source form value; see example and domain validation | No |
| `finalSeenBy` | source form value; see example and domain validation | No |
| `resultSeenAt` | source form value; see example and domain validation | No |
| `resultSeenBy` | source form value; see example and domain validation | No |
| `employeeSeenAt` | source form value; see example and domain validation | No |
| `employeeSeenBy` | source form value; see example and domain validation | No |
| `managerNote` | source form value; see example and domain validation | No |

### GET /hr-requests — HrRequest list

- Authentication: Session.
- Required permission/scope: hr.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: HrRequest lists/forms/workflow controls (scripts 04,16,30–33). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Types/routes are the exact HR request table below. Route and actor are server-derived. Only the current manager/department stage can approve/reject; once final, source effects apply once. Self-service cannot impersonate another employee. Final-result acknowledgement is limited to the affected employee. Type-specific dates, times, amount, destination and documents are validated. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/hr-requests`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "type": "annual_leave",
      "employeeId": "EMP-1",
      "reason": "إجازة",
      "data": {
        "startDate": "2026-10-01",
        "endDate": "2026-10-02"
      },
      "status": "pending"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /hr-requests — HrRequest create

- Authentication: Session.
- Required permission/scope: hr.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: HrRequest lists/forms/workflow controls (scripts 04,16,30–33). Trigger: Save a new record.
- Backend behavior/validation: Types/routes are the exact HR request table below. Route and actor are server-derived. Only the current manager/department stage can approve/reject; once final, source effects apply once. Self-service cannot impersonate another employee. Final-result acknowledgement is limited to the affected employee. Type-specific dates, times, amount, destination and documents are validated. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "type": "annual_leave",
  "employeeId": "EMP-1",
  "reason": "إجازة",
  "data": {
    "startDate": "2026-10-01",
    "endDate": "2026-10-02"
  },
  "status": "pending"
}
```
- Example request: `POST /api/hr-requests` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "type": "annual_leave",
    "employeeId": "EMP-1",
    "reason": "إجازة",
    "data": {
      "startDate": "2026-10-01",
      "endDate": "2026-10-02"
    },
    "status": "pending"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /hr-requests/{id} — HrRequest details

- Authentication: Session.
- Required permission/scope: hr.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: HrRequest lists/forms/workflow controls (scripts 04,16,30–33). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Types/routes are the exact HR request table below. Route and actor are server-derived. Only the current manager/department stage can approve/reject; once final, source effects apply once. Self-service cannot impersonate another employee. Final-result acknowledgement is limited to the affected employee. Type-specific dates, times, amount, destination and documents are validated. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/hr-requests/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "type": "annual_leave",
    "employeeId": "EMP-1",
    "reason": "إجازة",
    "data": {
      "startDate": "2026-10-01",
      "endDate": "2026-10-02"
    },
    "status": "pending"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /hr-requests/{id} — HrRequest update/action

- Authentication: Session.
- Required permission/scope: hr.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: HrRequest lists/forms/workflow controls (scripts 04,16,30–33). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Types/routes are the exact HR request table below. Route and actor are server-derived. Only the current manager/department stage can approve/reject; once final, source effects apply once. Self-service cannot impersonate another employee. Final-result acknowledgement is limited to the affected employee. Type-specific dates, times, amount, destination and documents are validated. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "type": "annual_leave",
  "employeeId": "EMP-1",
  "reason": "إجازة",
  "data": {
    "startDate": "2026-10-01",
    "endDate": "2026-10-02"
  },
  "status": "pending",
  "_version": 1
}
```
- Example request: `PATCH /api/hr-requests/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "type": "annual_leave",
    "employeeId": "EMP-1",
    "reason": "إجازة",
    "data": {
      "startDate": "2026-10-01",
      "endDate": "2026-10-02"
    },
    "status": "pending"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: HrApproval

Frontend source: scripts 02,20; cache location `hrApprovals`.

Legacy approval kinds: leave_override/disciplinary/reward/termination. Stage, source record and actor are validated; source effect applies once. No arbitrary employee-provided approval level.

| Field | Input type | Required on create |
|---|---|---|
| `type` | source form value; see example and domain validation | Yes |
| `employeeId` | source form value; see example and domain validation | Yes |
| `employeeName` | source form value; see example and domain validation | No |
| `sourceId` | source form value; see example and domain validation | No |
| `title` | source form value; see example and domain validation | Yes |
| `payload` | object; nested record schema applies | No |
| `levels` | source form value; see example and domain validation | No |
| `currentLevel` | number (or decimal string at the unchanged form boundary) | No |
| `status` | source form value; see example and domain validation | No |
| `history` | array; nested record schema applies | No |
| `completedAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |

### GET /hr-approvals — HrApproval list

- Authentication: Session.
- Required permission/scope: hr.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: HrApproval lists/forms/workflow controls (scripts 02,20). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Legacy approval kinds: leave_override/disciplinary/reward/termination. Stage, source record and actor are validated; source effect applies once. No arbitrary employee-provided approval level. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/hr-approvals`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "type": "leave_override",
      "employeeId": "EMP-1",
      "title": "تجاوز رصيد إجازة",
      "payload": {
        "days": 2
      },
      "status": "pending"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /hr-approvals — HrApproval create

- Authentication: Session.
- Required permission/scope: hr.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: HrApproval lists/forms/workflow controls (scripts 02,20). Trigger: Save a new record.
- Backend behavior/validation: Legacy approval kinds: leave_override/disciplinary/reward/termination. Stage, source record and actor are validated; source effect applies once. No arbitrary employee-provided approval level. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "type": "leave_override",
  "employeeId": "EMP-1",
  "title": "تجاوز رصيد إجازة",
  "payload": {
    "days": 2
  },
  "status": "pending"
}
```
- Example request: `POST /api/hr-approvals` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "type": "leave_override",
    "employeeId": "EMP-1",
    "title": "تجاوز رصيد إجازة",
    "payload": {
      "days": 2
    },
    "status": "pending"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /hr-approvals/{id} — HrApproval details

- Authentication: Session.
- Required permission/scope: hr.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: HrApproval lists/forms/workflow controls (scripts 02,20). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Legacy approval kinds: leave_override/disciplinary/reward/termination. Stage, source record and actor are validated; source effect applies once. No arbitrary employee-provided approval level. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/hr-approvals/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "type": "leave_override",
    "employeeId": "EMP-1",
    "title": "تجاوز رصيد إجازة",
    "payload": {
      "days": 2
    },
    "status": "pending"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /hr-approvals/{id} — HrApproval update/action

- Authentication: Session.
- Required permission/scope: hr.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: HrApproval lists/forms/workflow controls (scripts 02,20). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Legacy approval kinds: leave_override/disciplinary/reward/termination. Stage, source record and actor are validated; source effect applies once. No arbitrary employee-provided approval level. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "type": "leave_override",
  "employeeId": "EMP-1",
  "title": "تجاوز رصيد إجازة",
  "payload": {
    "days": 2
  },
  "status": "pending",
  "_version": 1
}
```
- Example request: `PATCH /api/hr-approvals/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "type": "leave_override",
    "employeeId": "EMP-1",
    "title": "تجاوز رصيد إجازة",
    "payload": {
      "days": 2
    },
    "status": "pending"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: Requisition

Frontend source: scripts 04,16,19,20; cache location `hrRecruitmentRequisitions`.

headcount is a positive integer; status open/closed. Candidates have unique IDs, name/contact/stage/notes/interviewDate/interviewTime/interviewer/interviewLocation/interviewStatus/decisionAt/history. Interview requires date/time; accepted requires completed interview; rejection before interview requires reason.

| Field | Input type | Required on create |
|---|---|---|
| `title` | source form value; see example and domain validation | Yes |
| `department` | source form value; see example and domain validation | Yes |
| `headcount` | number (or decimal string at the unchanged form boundary) | Yes |
| `status` | source form value; see example and domain validation | No |
| `approved` | boolean | No |
| `candidates` | array; nested record schema applies | No |

### GET /requisitions — Requisition list

- Authentication: Session.
- Required permission/scope: hr.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: Requisition lists/forms/workflow controls (scripts 04,16,19,20). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: headcount is a positive integer; status open/closed. Candidates have unique IDs, name/contact/stage/notes/interviewDate/interviewTime/interviewer/interviewLocation/interviewStatus/decisionAt/history. Interview requires date/time; accepted requires completed interview; rejection before interview requires reason. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/requisitions`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "title": "مصور",
      "department": "التصوير",
      "headcount": 1,
      "status": "open",
      "candidates": []
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /requisitions — Requisition create

- Authentication: Session.
- Required permission/scope: hr.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Requisition lists/forms/workflow controls (scripts 04,16,19,20). Trigger: Save a new record.
- Backend behavior/validation: headcount is a positive integer; status open/closed. Candidates have unique IDs, name/contact/stage/notes/interviewDate/interviewTime/interviewer/interviewLocation/interviewStatus/decisionAt/history. Interview requires date/time; accepted requires completed interview; rejection before interview requires reason. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "title": "مصور",
  "department": "التصوير",
  "headcount": 1,
  "status": "open",
  "candidates": []
}
```
- Example request: `POST /api/requisitions` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "title": "مصور",
    "department": "التصوير",
    "headcount": 1,
    "status": "open",
    "candidates": []
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /requisitions/{id} — Requisition details

- Authentication: Session.
- Required permission/scope: hr.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Requisition lists/forms/workflow controls (scripts 04,16,19,20). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: headcount is a positive integer; status open/closed. Candidates have unique IDs, name/contact/stage/notes/interviewDate/interviewTime/interviewer/interviewLocation/interviewStatus/decisionAt/history. Interview requires date/time; accepted requires completed interview; rejection before interview requires reason. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/requisitions/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "title": "مصور",
    "department": "التصوير",
    "headcount": 1,
    "status": "open",
    "candidates": []
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /requisitions/{id} — Requisition update/action

- Authentication: Session.
- Required permission/scope: hr.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Requisition lists/forms/workflow controls (scripts 04,16,19,20). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: headcount is a positive integer; status open/closed. Candidates have unique IDs, name/contact/stage/notes/interviewDate/interviewTime/interviewer/interviewLocation/interviewStatus/decisionAt/history. Interview requires date/time; accepted requires completed interview; rejection before interview requires reason. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "title": "مصور",
  "department": "التصوير",
  "headcount": 1,
  "status": "open",
  "candidates": [],
  "_version": 1
}
```
- Example request: `PATCH /api/requisitions/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "title": "مصور",
    "department": "التصوير",
    "headcount": 1,
    "status": "open",
    "candidates": []
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### DELETE /requisitions/{id} — Requisition delete

- Authentication: Session.
- Required permission/scope: hr.delete plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Requisition lists/forms/workflow controls (scripts 04,16,19,20). Trigger: Confirm existing delete action.
- Backend behavior/validation: headcount is a positive integer; status open/closed. Candidates have unique IDs, name/contact/stage/notes/interviewDate/interviewTime/interviewer/interviewLocation/interviewStatus/decisionAt/history. Interview requires date/time; accepted requires completed interview; rejection before interview requires reason. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "_version": 1
}
```
- Example request: `DELETE /api/requisitions/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": null
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: OffboardingCase

Frontend source: scripts 04,16; cache location `hrOffboardingCases`.

Each clearance is restricted to its responsible department or authorized administration; close only after all required clearances, then set employee resigned/inactive. Retain tasks and audit.

| Field | Input type | Required on create |
|---|---|---|
| `employeeId` | source form value; see example and domain validation | Yes |
| `employeeName` | source form value; see example and domain validation | No |
| `reason` | source form value; see example and domain validation | Yes |
| `lastWorkDay` | date YYYY-MM-DD; empty/null allowed when optional | No |
| `hr` | source form value; see example and domain validation | No |
| `logistics` | source form value; see example and domain validation | No |
| `accounting` | source form value; see example and domain validation | No |
| `system` | source form value; see example and domain validation | No |
| `status` | source form value; see example and domain validation | No |
| `requestId` | source form value; see example and domain validation | No |

### GET /offboarding — OffboardingCase list

- Authentication: Session.
- Required permission/scope: hr.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: OffboardingCase lists/forms/workflow controls (scripts 04,16). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Each clearance is restricted to its responsible department or authorized administration; close only after all required clearances, then set employee resigned/inactive. Retain tasks and audit. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/offboarding`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "employeeId": "EMP-1",
      "reason": "انتهاء التعاقد",
      "lastWorkDay": "2026-10-01",
      "hr": false,
      "logistics": false,
      "accounting": false,
      "system": false,
      "status": "open"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /offboarding — OffboardingCase create

- Authentication: Session.
- Required permission/scope: hr.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: OffboardingCase lists/forms/workflow controls (scripts 04,16). Trigger: Save a new record.
- Backend behavior/validation: Each clearance is restricted to its responsible department or authorized administration; close only after all required clearances, then set employee resigned/inactive. Retain tasks and audit. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "employeeId": "EMP-1",
  "reason": "انتهاء التعاقد",
  "lastWorkDay": "2026-10-01",
  "hr": false,
  "logistics": false,
  "accounting": false,
  "system": false,
  "status": "open"
}
```
- Example request: `POST /api/offboarding` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "employeeId": "EMP-1",
    "reason": "انتهاء التعاقد",
    "lastWorkDay": "2026-10-01",
    "hr": false,
    "logistics": false,
    "accounting": false,
    "system": false,
    "status": "open"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /offboarding/{id} — OffboardingCase details

- Authentication: Session.
- Required permission/scope: hr.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: OffboardingCase lists/forms/workflow controls (scripts 04,16). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Each clearance is restricted to its responsible department or authorized administration; close only after all required clearances, then set employee resigned/inactive. Retain tasks and audit. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/offboarding/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "employeeId": "EMP-1",
    "reason": "انتهاء التعاقد",
    "lastWorkDay": "2026-10-01",
    "hr": false,
    "logistics": false,
    "accounting": false,
    "system": false,
    "status": "open"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /offboarding/{id} — OffboardingCase update/action

- Authentication: Session.
- Required permission/scope: hr.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: OffboardingCase lists/forms/workflow controls (scripts 04,16). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Each clearance is restricted to its responsible department or authorized administration; close only after all required clearances, then set employee resigned/inactive. Retain tasks and audit. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "employeeId": "EMP-1",
  "reason": "انتهاء التعاقد",
  "lastWorkDay": "2026-10-01",
  "hr": false,
  "logistics": false,
  "accounting": false,
  "system": false,
  "status": "open",
  "_version": 1
}
```
- Example request: `PATCH /api/offboarding/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "employeeId": "EMP-1",
    "reason": "انتهاء التعاقد",
    "lastWorkDay": "2026-10-01",
    "hr": false,
    "logistics": false,
    "accounting": false,
    "system": false,
    "status": "open"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: Recognition

Frontend source: scripts 04; cache location `hrRecognition`.

Recognition generated from approved requests must keep its source ID and cannot be applied twice.

| Field | Input type | Required on create |
|---|---|---|
| `type` | source form value; see example and domain validation | Yes |
| `employeeId` | source form value; see example and domain validation | Yes |
| `employeeName` | source form value; see example and domain validation | No |
| `reason` | source form value; see example and domain validation | Yes |
| `month` | source form value; see example and domain validation | No |

### GET /recognition — Recognition list

- Authentication: Session.
- Required permission/scope: hr.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: Recognition lists/forms/workflow controls (scripts 04). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Recognition generated from approved requests must keep its source ID and cannot be applied twice. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/recognition`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "type": "appreciation",
      "employeeId": "EMP-1",
      "reason": "إنجاز المهمة",
      "month": "2026-09"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /recognition — Recognition create

- Authentication: Session.
- Required permission/scope: hr.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Recognition lists/forms/workflow controls (scripts 04). Trigger: Save a new record.
- Backend behavior/validation: Recognition generated from approved requests must keep its source ID and cannot be applied twice. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "type": "appreciation",
  "employeeId": "EMP-1",
  "reason": "إنجاز المهمة",
  "month": "2026-09"
}
```
- Example request: `POST /api/recognition` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "type": "appreciation",
    "employeeId": "EMP-1",
    "reason": "إنجاز المهمة",
    "month": "2026-09"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /recognition/{id} — Recognition details

- Authentication: Session.
- Required permission/scope: hr.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Recognition lists/forms/workflow controls (scripts 04). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Recognition generated from approved requests must keep its source ID and cannot be applied twice. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/recognition/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "type": "appreciation",
    "employeeId": "EMP-1",
    "reason": "إنجاز المهمة",
    "month": "2026-09"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /recognition/{id} — Recognition update/action

- Authentication: Session.
- Required permission/scope: hr.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Recognition lists/forms/workflow controls (scripts 04). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Recognition generated from approved requests must keep its source ID and cannot be applied twice. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "type": "appreciation",
  "employeeId": "EMP-1",
  "reason": "إنجاز المهمة",
  "month": "2026-09",
  "_version": 1
}
```
- Example request: `PATCH /api/recognition/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "type": "appreciation",
    "employeeId": "EMP-1",
    "reason": "إنجاز المهمة",
    "month": "2026-09"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### DELETE /recognition/{id} — Recognition delete

- Authentication: Session.
- Required permission/scope: hr.delete plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Recognition lists/forms/workflow controls (scripts 04). Trigger: Confirm existing delete action.
- Backend behavior/validation: Recognition generated from approved requests must keep its source ID and cannot be applied twice. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "_version": 1
}
```
- Example request: `DELETE /api/recognition/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": null
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: Announcement

Frontend source: scripts 08,14,19; cache location `hrAnnouncements`.

Snapshot eligible recipients at send time. Own read receipts are idempotent and cannot acknowledge for others. Alert copies are preserved in employee archives; deleting one copy is scoped to that employee. Deleting the original soft-deletes its visible copies but retains audit.

| Field | Input type | Required on create |
|---|---|---|
| `type` | source form value; see example and domain validation | Yes |
| `title` | source form value; see example and domain validation | Yes |
| `message` | source form value; see example and domain validation | Yes |
| `targetType` | source form value; see example and domain validation | Yes |
| `targetValue` | source form value; see example and domain validation | No |
| `targetName` | source form value; see example and domain validation | No |
| `sourceDepartment` | source form value; see example and domain validation | No |
| `active` | boolean | No |
| `readBy` | array; nested record schema applies | No |
| `readAtBy` | object; nested record schema applies | No |
| `recipientSnapshots` | array; nested record schema applies | No |
| `recipientIds` | array; nested record schema applies | No |
| `deletedAt` | source form value; see example and domain validation | No |
| `deletedBy` | source form value; see example and domain validation | No |
| `createdById` | source form value; see example and domain validation | No |

### GET /announcements — Announcement list

- Authentication: Session.
- Required permission/scope: hr.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: Announcement lists/forms/workflow controls (scripts 08,14,19). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Snapshot eligible recipients at send time. Own read receipts are idempotent and cannot acknowledge for others. Alert copies are preserved in employee archives; deleting one copy is scoped to that employee. Deleting the original soft-deletes its visible copies but retains audit. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/announcements`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "type": "announcement",
      "title": "تعميم",
      "message": "نص التعميم",
      "targetType": "all",
      "targetValue": "",
      "active": true
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /announcements — Announcement create

- Authentication: Session.
- Required permission/scope: hr.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Announcement lists/forms/workflow controls (scripts 08,14,19). Trigger: Save a new record.
- Backend behavior/validation: Snapshot eligible recipients at send time. Own read receipts are idempotent and cannot acknowledge for others. Alert copies are preserved in employee archives; deleting one copy is scoped to that employee. Deleting the original soft-deletes its visible copies but retains audit. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "type": "announcement",
  "title": "تعميم",
  "message": "نص التعميم",
  "targetType": "all",
  "targetValue": "",
  "active": true
}
```
- Example request: `POST /api/announcements` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "type": "announcement",
    "title": "تعميم",
    "message": "نص التعميم",
    "targetType": "all",
    "targetValue": "",
    "active": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /announcements/{id} — Announcement details

- Authentication: Session.
- Required permission/scope: hr.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Announcement lists/forms/workflow controls (scripts 08,14,19). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Snapshot eligible recipients at send time. Own read receipts are idempotent and cannot acknowledge for others. Alert copies are preserved in employee archives; deleting one copy is scoped to that employee. Deleting the original soft-deletes its visible copies but retains audit. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/announcements/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "type": "announcement",
    "title": "تعميم",
    "message": "نص التعميم",
    "targetType": "all",
    "targetValue": "",
    "active": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /announcements/{id} — Announcement update/action

- Authentication: Session.
- Required permission/scope: hr.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Announcement lists/forms/workflow controls (scripts 08,14,19). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Snapshot eligible recipients at send time. Own read receipts are idempotent and cannot acknowledge for others. Alert copies are preserved in employee archives; deleting one copy is scoped to that employee. Deleting the original soft-deletes its visible copies but retains audit. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "type": "announcement",
  "title": "تعميم",
  "message": "نص التعميم",
  "targetType": "all",
  "targetValue": "",
  "active": true,
  "_version": 1
}
```
- Example request: `PATCH /api/announcements/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "type": "announcement",
    "title": "تعميم",
    "message": "نص التعميم",
    "targetType": "all",
    "targetValue": "",
    "active": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### DELETE /announcements/{id} — Announcement delete

- Authentication: Session.
- Required permission/scope: hr.delete plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Announcement lists/forms/workflow controls (scripts 08,14,19). Trigger: Confirm existing delete action.
- Backend behavior/validation: Snapshot eligible recipients at send time. Own read receipts are idempotent and cannot acknowledge for others. Alert copies are preserved in employee archives; deleting one copy is scoped to that employee. Deleting the original soft-deletes its visible copies but retains audit. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "_version": 1
}
```
- Example request: `DELETE /api/announcements/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": null
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: EmploymentContract

Frontend source: scripts 18,19; cache location `employeeContracts`.

Employee must exist; salary ≥ 0; workHours 1–24; end ≥ start; temporary/probation/training needs endDate. Once any signature exists terms are immutable. Signature side employer/employee is write-once, name and bounded strokes required; the dialog requires consent, strokes bounded. Both signed → signed; one → pending_signature. Signed DELETE is rejected; PATCH status=archived archives; duplication clears signatures and creates next version.

| Field | Input type | Required on create |
|---|---|---|
| `number` | source form value; see example and domain validation | No |
| `employeeId` | source form value; see example and domain validation | Yes |
| `employeeName` | source form value; see example and domain validation | Yes |
| `employeeNo` | source form value; see example and domain validation | No |
| `company` | source form value; see example and domain validation | Yes |
| `companyRepresentative` | source form value; see example and domain validation | No |
| `companyAddress` | source form value; see example and domain validation | No |
| `jobTitle` | source form value; see example and domain validation | Yes |
| `department` | source form value; see example and domain validation | No |
| `type` | source form value; see example and domain validation | Yes |
| `employmentType` | source form value; see example and domain validation | No |
| `workMode` | source form value; see example and domain validation | No |
| `startDate` | date YYYY-MM-DD; empty/null allowed when optional | Yes |
| `endDate` | date YYYY-MM-DD; empty/null allowed when optional | No |
| `salary` | number (or decimal string at the unchanged form boundary) | No |
| `currency` | source form value; see example and domain validation | No |
| `payCycle` | source form value; see example and domain validation | No |
| `workHours` | number (or decimal string at the unchanged form boundary) | No |
| `weeklyDays` | source form value; see example and domain validation | No |
| `annualLeave` | source form value; see example and domain validation | No |
| `probationMonths` | number (or decimal string at the unchanged form boundary) | No |
| `workLocation` | source form value; see example and domain validation | No |
| `jurisdiction` | source form value; see example and domain validation | No |
| `duties` | source form value; see example and domain validation | No |
| `noticeTerms` | source form value; see example and domain validation | No |
| `benefits` | source form value; see example and domain validation | No |
| `employerRepresentative` | source form value; see example and domain validation | No |
| `employeeAddress` | source form value; see example and domain validation | No |
| `nationalId` | source form value; see example and domain validation | No |
| `clauses` | object; nested record schema applies | No |
| `terms` | source form value; see example and domain validation | No |
| `notes` | source form value; see example and domain validation | No |
| `signatures` | object; nested record schema applies | No |
| `status` | source form value; see example and domain validation | No |
| `parentContractId` | source form value; see example and domain validation | No |
| `version` | source form value; see example and domain validation | No |
| `templateType` | source form value; see example and domain validation | No |
| `commonClauses` | object; nested record schema applies | No |
| `typeClauses` | object; nested record schema applies | No |
| `customClauses` | object; nested record schema applies | No |
| `dutyClauses` | source form value; see example and domain validation | No |
| `conditionClauses` | source form value; see example and domain validation | No |
| `templateVersion` | source form value; see example and domain validation | No |

### GET /employment-contracts — EmploymentContract list

- Authentication: Session.
- Required permission/scope: hr.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: EmploymentContract lists/forms/workflow controls (scripts 18,19). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Employee must exist; salary ≥ 0; workHours 1–24; end ≥ start; temporary/probation/training needs endDate. Once any signature exists terms are immutable. Signature side employer/employee is write-once, name and bounded strokes required; the dialog requires consent, strokes bounded. Both signed → signed; one → pending_signature. Signed DELETE is rejected; PATCH status=archived archives; duplication clears signatures and creates next version. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/employment-contracts`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "employeeId": "EMP-1",
      "employeeName": "موظف تجريبي",
      "company": "Mosh Group",
      "jobTitle": "مصور",
      "type": "دائم",
      "startDate": "2026-01-01",
      "salary": 500,
      "currency": "USD",
      "workHours": 8,
      "status": "draft",
      "signatures": {}
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /employment-contracts — EmploymentContract create

- Authentication: Session.
- Required permission/scope: hr.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: EmploymentContract lists/forms/workflow controls (scripts 18,19). Trigger: Save a new record.
- Backend behavior/validation: Employee must exist; salary ≥ 0; workHours 1–24; end ≥ start; temporary/probation/training needs endDate. Once any signature exists terms are immutable. Signature side employer/employee is write-once, name and bounded strokes required; the dialog requires consent, strokes bounded. Both signed → signed; one → pending_signature. Signed DELETE is rejected; PATCH status=archived archives; duplication clears signatures and creates next version. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "employeeId": "EMP-1",
  "employeeName": "موظف تجريبي",
  "company": "Mosh Group",
  "jobTitle": "مصور",
  "type": "دائم",
  "startDate": "2026-01-01",
  "salary": 500,
  "currency": "USD",
  "workHours": 8,
  "status": "draft",
  "signatures": {}
}
```
- Example request: `POST /api/employment-contracts` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "employeeId": "EMP-1",
    "employeeName": "موظف تجريبي",
    "company": "Mosh Group",
    "jobTitle": "مصور",
    "type": "دائم",
    "startDate": "2026-01-01",
    "salary": 500,
    "currency": "USD",
    "workHours": 8,
    "status": "draft",
    "signatures": {}
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /employment-contracts/{id} — EmploymentContract details

- Authentication: Session.
- Required permission/scope: hr.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: EmploymentContract lists/forms/workflow controls (scripts 18,19). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Employee must exist; salary ≥ 0; workHours 1–24; end ≥ start; temporary/probation/training needs endDate. Once any signature exists terms are immutable. Signature side employer/employee is write-once, name and bounded strokes required; the dialog requires consent, strokes bounded. Both signed → signed; one → pending_signature. Signed DELETE is rejected; PATCH status=archived archives; duplication clears signatures and creates next version. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/employment-contracts/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "employeeId": "EMP-1",
    "employeeName": "موظف تجريبي",
    "company": "Mosh Group",
    "jobTitle": "مصور",
    "type": "دائم",
    "startDate": "2026-01-01",
    "salary": 500,
    "currency": "USD",
    "workHours": 8,
    "status": "draft",
    "signatures": {}
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /employment-contracts/{id} — EmploymentContract update/action

- Authentication: Session.
- Required permission/scope: hr.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: EmploymentContract lists/forms/workflow controls (scripts 18,19). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Employee must exist; salary ≥ 0; workHours 1–24; end ≥ start; temporary/probation/training needs endDate. Once any signature exists terms are immutable. Signature side employer/employee is write-once, name and bounded strokes required; the dialog requires consent, strokes bounded. Both signed → signed; one → pending_signature. Signed DELETE is rejected; PATCH status=archived archives; duplication clears signatures and creates next version. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "employeeId": "EMP-1",
  "employeeName": "موظف تجريبي",
  "company": "Mosh Group",
  "jobTitle": "مصور",
  "type": "دائم",
  "startDate": "2026-01-01",
  "salary": 500,
  "currency": "USD",
  "workHours": 8,
  "status": "draft",
  "signatures": {},
  "_version": 1
}
```
- Example request: `PATCH /api/employment-contracts/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "employeeId": "EMP-1",
    "employeeName": "موظف تجريبي",
    "company": "Mosh Group",
    "jobTitle": "مصور",
    "type": "دائم",
    "startDate": "2026-01-01",
    "salary": 500,
    "currency": "USD",
    "workHours": 8,
    "status": "draft",
    "signatures": {}
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### DELETE /employment-contracts/{id} — EmploymentContract delete

- Authentication: Session.
- Required permission/scope: hr.delete plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: EmploymentContract lists/forms/workflow controls (scripts 18,19). Trigger: Confirm existing delete action.
- Backend behavior/validation: Employee must exist; salary ≥ 0; workHours 1–24; end ≥ start; temporary/probation/training needs endDate. Once any signature exists terms are immutable. Signature side employer/employee is write-once, name and bounded strokes required; the dialog requires consent, strokes bounded. Both signed → signed; one → pending_signature. Signed DELETE is rejected; PATCH status=archived archives; duplication clears signatures and creates next version. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "_version": 1
}
```
- Example request: `DELETE /api/employment-contracts/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": null
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: ExecutiveReport

Frontend source: scripts 10,11,20; cache location `executiveReports`.

Department submitters can create and read their reports; management reviews status/comments without rewriting the original author/summary.

| Field | Input type | Required on create |
|---|---|---|
| `department` | source form value; see example and domain validation | Yes |
| `departmentKey` | source form value; see example and domain validation | No |
| `type` | source form value; see example and domain validation | No |
| `title` | source form value; see example and domain validation | Yes |
| `priority` | source form value; see example and domain validation | No |
| `period` | source form value; see example and domain validation | No |
| `sender` | source form value; see example and domain validation | No |
| `summary` | source form value; see example and domain validation | Yes |
| `executiveNeed` | source form value; see example and domain validation | No |
| `status` | source form value; see example and domain validation | No |
| `review` | object; nested record schema applies | No |
| `reviewNote` | source form value; see example and domain validation | No |
| `reviewedAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `reviewedBy` | source form value; see example and domain validation | No |

### GET /executive-reports — ExecutiveReport list

- Authentication: Session.
- Required permission/scope: admin.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: ExecutiveReport lists/forms/workflow controls (scripts 10,11,20). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Department submitters can create and read their reports; management reviews status/comments without rewriting the original author/summary. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/executive-reports`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "title": "تقرير القسم",
      "summary": "ملخص العمل",
      "department": "التصوير",
      "departmentKey": "photo",
      "type": "تقرير تنفيذي",
      "priority": "للاطلاع فقط",
      "status": "جديد"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /executive-reports — ExecutiveReport create

- Authentication: Session.
- Required permission/scope: admin.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: ExecutiveReport lists/forms/workflow controls (scripts 10,11,20). Trigger: Save a new record.
- Backend behavior/validation: Department submitters can create and read their reports; management reviews status/comments without rewriting the original author/summary. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "title": "تقرير القسم",
  "summary": "ملخص العمل",
  "department": "التصوير",
  "departmentKey": "photo",
  "type": "تقرير تنفيذي",
  "priority": "للاطلاع فقط",
  "status": "جديد"
}
```
- Example request: `POST /api/executive-reports` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "title": "تقرير القسم",
    "summary": "ملخص العمل",
    "department": "التصوير",
    "departmentKey": "photo",
    "type": "تقرير تنفيذي",
    "priority": "للاطلاع فقط",
    "status": "جديد"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /executive-reports/{id} — ExecutiveReport details

- Authentication: Session.
- Required permission/scope: admin.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: ExecutiveReport lists/forms/workflow controls (scripts 10,11,20). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Department submitters can create and read their reports; management reviews status/comments without rewriting the original author/summary. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/executive-reports/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "title": "تقرير القسم",
    "summary": "ملخص العمل",
    "department": "التصوير",
    "departmentKey": "photo",
    "type": "تقرير تنفيذي",
    "priority": "للاطلاع فقط",
    "status": "جديد"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /executive-reports/{id} — ExecutiveReport update/action

- Authentication: Session.
- Required permission/scope: admin.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: ExecutiveReport lists/forms/workflow controls (scripts 10,11,20). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Department submitters can create and read their reports; management reviews status/comments without rewriting the original author/summary. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "title": "تقرير القسم",
  "summary": "ملخص العمل",
  "department": "التصوير",
  "departmentKey": "photo",
  "type": "تقرير تنفيذي",
  "priority": "للاطلاع فقط",
  "status": "جديد",
  "_version": 1
}
```
- Example request: `PATCH /api/executive-reports/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "title": "تقرير القسم",
    "summary": "ملخص العمل",
    "department": "التصوير",
    "departmentKey": "photo",
    "type": "تقرير تنفيذي",
    "priority": "للاطلاع فقط",
    "status": "جديد"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: AdminDecision

Frontend source: scripts 20; cache location `adminDecisions16`.

Administration writes only; keep prior revisions in audit. Date/time must be valid.

| Field | Input type | Required on create |
|---|---|---|
| `title` | source form value; see example and domain validation | Yes |
| `status` | source form value; see example and domain validation | No |
| `date` | date YYYY-MM-DD; empty/null allowed when optional | No |
| `time` | source form value; see example and domain validation | No |
| `owner` | source form value; see example and domain validation | No |
| `department` | source form value; see example and domain validation | No |
| `location` | source form value; see example and domain validation | No |
| `participants` | source form value; see example and domain validation | No |
| `body` | source form value; see example and domain validation | No |
| `notes` | source form value; see example and domain validation | No |
| `history` | array; nested record schema applies | No |

### GET /admin-decisions — AdminDecision list

- Authentication: Session.
- Required permission/scope: admin.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: AdminDecision lists/forms/workflow controls (scripts 20). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Administration writes only; keep prior revisions in audit. Date/time must be valid. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/admin-decisions`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "title": "اجتماع الإدارة",
      "status": "draft",
      "date": "2026-09-21",
      "body": "محضر الاجتماع"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /admin-decisions — AdminDecision create

- Authentication: Session.
- Required permission/scope: admin.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: AdminDecision lists/forms/workflow controls (scripts 20). Trigger: Save a new record.
- Backend behavior/validation: Administration writes only; keep prior revisions in audit. Date/time must be valid. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "title": "اجتماع الإدارة",
  "status": "draft",
  "date": "2026-09-21",
  "body": "محضر الاجتماع"
}
```
- Example request: `POST /api/admin-decisions` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "title": "اجتماع الإدارة",
    "status": "draft",
    "date": "2026-09-21",
    "body": "محضر الاجتماع"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /admin-decisions/{id} — AdminDecision details

- Authentication: Session.
- Required permission/scope: admin.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: AdminDecision lists/forms/workflow controls (scripts 20). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Administration writes only; keep prior revisions in audit. Date/time must be valid. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/admin-decisions/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "title": "اجتماع الإدارة",
    "status": "draft",
    "date": "2026-09-21",
    "body": "محضر الاجتماع"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /admin-decisions/{id} — AdminDecision update/action

- Authentication: Session.
- Required permission/scope: admin.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: AdminDecision lists/forms/workflow controls (scripts 20). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Administration writes only; keep prior revisions in audit. Date/time must be valid. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "title": "اجتماع الإدارة",
  "status": "draft",
  "date": "2026-09-21",
  "body": "محضر الاجتماع",
  "_version": 1
}
```
- Example request: `PATCH /api/admin-decisions/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "title": "اجتماع الإدارة",
    "status": "draft",
    "date": "2026-09-21",
    "body": "محضر الاجتماع"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### DELETE /admin-decisions/{id} — AdminDecision delete

- Authentication: Session.
- Required permission/scope: admin.delete plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: AdminDecision lists/forms/workflow controls (scripts 20). Trigger: Confirm existing delete action.
- Backend behavior/validation: Administration writes only; keep prior revisions in audit. Date/time must be valid. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "_version": 1
}
```
- Example request: `DELETE /api/admin-decisions/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": null
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: AdminMeeting

Frontend source: scripts 20; cache location `adminMeetings16`.

Administration writes only; keep prior revisions in audit. Date/time must be valid.

| Field | Input type | Required on create |
|---|---|---|
| `title` | source form value; see example and domain validation | Yes |
| `status` | source form value; see example and domain validation | No |
| `date` | date YYYY-MM-DD; empty/null allowed when optional | No |
| `time` | source form value; see example and domain validation | No |
| `owner` | source form value; see example and domain validation | No |
| `department` | source form value; see example and domain validation | No |
| `location` | source form value; see example and domain validation | No |
| `participants` | source form value; see example and domain validation | No |
| `body` | source form value; see example and domain validation | No |
| `notes` | source form value; see example and domain validation | No |
| `history` | array; nested record schema applies | No |

### GET /admin-meetings — AdminMeeting list

- Authentication: Session.
- Required permission/scope: admin.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: AdminMeeting lists/forms/workflow controls (scripts 20). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Administration writes only; keep prior revisions in audit. Date/time must be valid. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/admin-meetings`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "title": "اجتماع الإدارة",
      "status": "draft",
      "date": "2026-09-21",
      "body": "محضر الاجتماع"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /admin-meetings — AdminMeeting create

- Authentication: Session.
- Required permission/scope: admin.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: AdminMeeting lists/forms/workflow controls (scripts 20). Trigger: Save a new record.
- Backend behavior/validation: Administration writes only; keep prior revisions in audit. Date/time must be valid. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "title": "اجتماع الإدارة",
  "status": "draft",
  "date": "2026-09-21",
  "body": "محضر الاجتماع"
}
```
- Example request: `POST /api/admin-meetings` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "title": "اجتماع الإدارة",
    "status": "draft",
    "date": "2026-09-21",
    "body": "محضر الاجتماع"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /admin-meetings/{id} — AdminMeeting details

- Authentication: Session.
- Required permission/scope: admin.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: AdminMeeting lists/forms/workflow controls (scripts 20). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Administration writes only; keep prior revisions in audit. Date/time must be valid. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/admin-meetings/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "title": "اجتماع الإدارة",
    "status": "draft",
    "date": "2026-09-21",
    "body": "محضر الاجتماع"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /admin-meetings/{id} — AdminMeeting update/action

- Authentication: Session.
- Required permission/scope: admin.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: AdminMeeting lists/forms/workflow controls (scripts 20). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Administration writes only; keep prior revisions in audit. Date/time must be valid. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "title": "اجتماع الإدارة",
  "status": "draft",
  "date": "2026-09-21",
  "body": "محضر الاجتماع",
  "_version": 1
}
```
- Example request: `PATCH /api/admin-meetings/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "title": "اجتماع الإدارة",
    "status": "draft",
    "date": "2026-09-21",
    "body": "محضر الاجتماع"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### DELETE /admin-meetings/{id} — AdminMeeting delete

- Authentication: Session.
- Required permission/scope: admin.delete plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: AdminMeeting lists/forms/workflow controls (scripts 20). Trigger: Confirm existing delete action.
- Backend behavior/validation: Administration writes only; keep prior revisions in audit. Date/time must be valid. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "_version": 1
}
```
- Example request: `DELETE /api/admin-meetings/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": null
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: WorkPresence

Frontend source: scripts 09,15,35,36; cache location `workEvidence`.

Own record only for writes. Server sets employee/actor/time; the existing action submits task pause/resume and presence changes together; server recomputes task elapsed time. Manager/admin reads are scoped. startedAt, breakAt, endedAt and noWorkAt are server-owned, including same-mode updates.

| Field | Input type | Required on create |
|---|---|---|
| `name` | source form value; see example and domain validation | No |
| `mode` | source form value; see example and domain validation | Yes |
| `startedAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `breakAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `endedAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `pausedTaskId` | source form value; see example and domain validation | No |
| `noWork` | boolean | No |
| `noWorkAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `updatedAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `employeeId` | source form value; see example and domain validation | No |

### GET /work-presence — WorkPresence list

- Authentication: Session.
- Required permission/scope: dashboard.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: WorkPresence lists/forms/workflow controls (scripts 09,15,35,36). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Own record only for writes. Server sets employee/actor/time; the existing action submits task pause/resume and presence changes together; server recomputes task elapsed time. Manager/admin reads are scoped. startedAt, breakAt, endedAt and noWorkAt are server-owned, including same-mode updates. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/work-presence`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "id:EMP-1",
      "_version": 2,
      "mode": "active",
      "noWork": false
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /work-presence — WorkPresence create

- Authentication: Session.
- Required permission/scope: dashboard.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: WorkPresence lists/forms/workflow controls (scripts 09,15,35,36). Trigger: Save a new record.
- Backend behavior/validation: Own record only for writes. Server sets employee/actor/time; the existing action submits task pause/resume and presence changes together; server recomputes task elapsed time. Manager/admin reads are scoped. startedAt, breakAt, endedAt and noWorkAt are server-owned, including same-mode updates. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "mode": "active",
  "noWork": false,
  "id": "id:EMP-1"
}
```
- Example request: `POST /api/work-presence` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "id:EMP-1",
    "_version": 2,
    "mode": "active",
    "noWork": false
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /work-presence/{id} — WorkPresence details

- Authentication: Session.
- Required permission/scope: dashboard.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: WorkPresence lists/forms/workflow controls (scripts 09,15,35,36). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Own record only for writes. Server sets employee/actor/time; the existing action submits task pause/resume and presence changes together; server recomputes task elapsed time. Manager/admin reads are scoped. startedAt, breakAt, endedAt and noWorkAt are server-owned, including same-mode updates. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/work-presence/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "id:EMP-1",
    "_version": 2,
    "mode": "active",
    "noWork": false
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /work-presence/{id} — WorkPresence update/action

- Authentication: Session.
- Required permission/scope: dashboard.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: WorkPresence lists/forms/workflow controls (scripts 09,15,35,36). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Own record only for writes. Server sets employee/actor/time; the existing action submits task pause/resume and presence changes together; server recomputes task elapsed time. Manager/admin reads are scoped. startedAt, breakAt, endedAt and noWorkAt are server-owned, including same-mode updates. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "mode": "active",
  "noWork": false,
  "id": "id:EMP-1",
  "_version": 1
}
```
- Example request: `PATCH /api/work-presence/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "id:EMP-1",
    "_version": 2,
    "mode": "active",
    "noWork": false
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: FieldWork

Frontend source: scripts 35,36; cache location `fieldWorkV30B.employees`.

Own assigned active template only. Status and activity identifiers must belong to it. New activity events supply activityId; status events supply statusId, separately from the event id. Event actor and all event/shift timestamps are server-controlled.

| Field | Input type | Required on create |
|---|---|---|
| `employeeId` | source form value; see example and domain validation | No |
| `employeeName` | source form value; see example and domain validation | No |
| `name` | source form value; see example and domain validation | No |
| `currentStatus` | source form value; see example and domain validation | No |
| `statusAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `workState` | source form value; see example and domain validation | No |
| `activities` | array; nested record schema applies | No |
| `fieldTemplateId` | source form value; see example and domain validation | No |
| `fieldTemplateLabel` | source form value; see example and domain validation | No |
| `startedAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `endedAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `updatedAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `department` | source form value; see example and domain validation | No |
| `shiftStartAt` | source form value; see example and domain validation | No |

### GET /field-work — FieldWork list

- Authentication: Session.
- Required permission/scope: dashboard.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: FieldWork lists/forms/workflow controls (scripts 35,36). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Own assigned active template only. Status and activity identifiers must belong to it. New activity events supply activityId; status events supply statusId, separately from the event id. Event actor and all event/shift timestamps are server-controlled. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/field-work`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EMP-1",
      "_version": 2,
      "currentStatus": "",
      "workState": "working",
      "activities": [],
      "employeeId": "EMP-1",
      "fieldTemplateId": "FIELD-TEMPLATE-1"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /field-work — FieldWork create

- Authentication: Session.
- Required permission/scope: dashboard.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: FieldWork lists/forms/workflow controls (scripts 35,36). Trigger: Save a new record.
- Backend behavior/validation: Own assigned active template only. Status and activity identifiers must belong to it. New activity events supply activityId; status events supply statusId, separately from the event id. Event actor and all event/shift timestamps are server-controlled. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "currentStatus": "",
  "workState": "working",
  "activities": [],
  "id": "EMP-1",
  "employeeId": "EMP-1",
  "fieldTemplateId": "FIELD-TEMPLATE-1"
}
```
- Example request: `POST /api/field-work` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EMP-1",
    "_version": 2,
    "currentStatus": "",
    "workState": "working",
    "activities": [],
    "employeeId": "EMP-1",
    "fieldTemplateId": "FIELD-TEMPLATE-1"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /field-work/{id} — FieldWork details

- Authentication: Session.
- Required permission/scope: dashboard.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: FieldWork lists/forms/workflow controls (scripts 35,36). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Own assigned active template only. Status and activity identifiers must belong to it. New activity events supply activityId; status events supply statusId, separately from the event id. Event actor and all event/shift timestamps are server-controlled. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/field-work/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EMP-1",
    "_version": 2,
    "currentStatus": "",
    "workState": "working",
    "activities": [],
    "employeeId": "EMP-1",
    "fieldTemplateId": "FIELD-TEMPLATE-1"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /field-work/{id} — FieldWork update/action

- Authentication: Session.
- Required permission/scope: dashboard.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: FieldWork lists/forms/workflow controls (scripts 35,36). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Own assigned active template only. Status and activity identifiers must belong to it. New activity events supply activityId; status events supply statusId, separately from the event id. Event actor and all event/shift timestamps are server-controlled. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "currentStatus": "",
  "workState": "working",
  "activities": [],
  "id": "EMP-1",
  "employeeId": "EMP-1",
  "fieldTemplateId": "FIELD-TEMPLATE-1",
  "_version": 1
}
```
- Example request: `PATCH /api/field-work/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EMP-1",
    "_version": 2,
    "currentStatus": "",
    "workState": "working",
    "activities": [],
    "employeeId": "EMP-1",
    "fieldTemplateId": "FIELD-TEMPLATE-1"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: FieldTemplate

Frontend source: scripts 35; cache location `fieldWorkSettingsV30B.templates`.

Template item IDs unique, label nonempty, active flag boolean. Templates and their item ordering are stored independently; deactivate templates that should no longer be assigned.

| Field | Input type | Required on create |
|---|---|---|
| `label` | source form value; see example and domain validation | Yes |
| `active` | boolean | No |
| `statuses` | array; nested record schema applies | No |
| `activities` | array; nested record schema applies | No |

### GET /field-templates — FieldTemplate list

- Authentication: Session.
- Required permission/scope: hr.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: FieldTemplate lists/forms/workflow controls (scripts 35). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Template item IDs unique, label nonempty, active flag boolean. Templates and their item ordering are stored independently; deactivate templates that should no longer be assigned. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/field-templates`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "label": "مصور",
      "active": true,
      "statuses": [
        {
          "id": "office",
          "label": "بالشركة",
          "active": true,
          "order": 1
        }
      ],
      "activities": []
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /field-templates — FieldTemplate create

- Authentication: Session.
- Required permission/scope: hr.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: FieldTemplate lists/forms/workflow controls (scripts 35). Trigger: Save a new record.
- Backend behavior/validation: Template item IDs unique, label nonempty, active flag boolean. Templates and their item ordering are stored independently; deactivate templates that should no longer be assigned. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "label": "مصور",
  "active": true,
  "statuses": [
    {
      "id": "office",
      "label": "بالشركة",
      "active": true,
      "order": 1
    }
  ],
  "activities": []
}
```
- Example request: `POST /api/field-templates` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "label": "مصور",
    "active": true,
    "statuses": [
      {
        "id": "office",
        "label": "بالشركة",
        "active": true,
        "order": 1
      }
    ],
    "activities": []
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /field-templates/{id} — FieldTemplate details

- Authentication: Session.
- Required permission/scope: hr.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: FieldTemplate lists/forms/workflow controls (scripts 35). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Template item IDs unique, label nonempty, active flag boolean. Templates and their item ordering are stored independently; deactivate templates that should no longer be assigned. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/field-templates/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "label": "مصور",
    "active": true,
    "statuses": [
      {
        "id": "office",
        "label": "بالشركة",
        "active": true,
        "order": 1
      }
    ],
    "activities": []
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /field-templates/{id} — FieldTemplate update/action

- Authentication: Session.
- Required permission/scope: hr.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: FieldTemplate lists/forms/workflow controls (scripts 35). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Template item IDs unique, label nonempty, active flag boolean. Templates and their item ordering are stored independently; deactivate templates that should no longer be assigned. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "label": "مصور",
  "active": true,
  "statuses": [
    {
      "id": "office",
      "label": "بالشركة",
      "active": true,
      "order": 1
    }
  ],
  "activities": [],
  "_version": 1
}
```
- Example request: `PATCH /api/field-templates/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "label": "مصور",
    "active": true,
    "statuses": [
      {
        "id": "office",
        "label": "بالشركة",
        "active": true,
        "order": 1
      }
    ],
    "activities": []
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### DELETE /field-templates/{id} — FieldTemplate delete

- Authentication: Session.
- Required permission/scope: hr.delete plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: FieldTemplate lists/forms/workflow controls (scripts 35). Trigger: Confirm existing delete action.
- Backend behavior/validation: Template item IDs unique, label nonempty, active flag boolean. Templates and their item ordering are stored independently; deactivate templates that should no longer be assigned. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "_version": 1
}
```
- Example request: `DELETE /api/field-templates/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": null
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: Wisdom

Frontend source: scripts 20,26,28; cache location `wisdom.items`.

Trim and deduplicate text; preserve ordering and enable/disable behavior. Do not reseed deleted real content.

| Field | Input type | Required on create |
|---|---|---|
| `text` | source form value; see example and domain validation | Yes |
| `enabled` | boolean | No |

### GET /wisdom — Wisdom list

- Authentication: Session.
- Required permission/scope: hr.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: Wisdom lists/forms/workflow controls (scripts 20,26,28). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Trim and deduplicate text; preserve ordering and enable/disable behavior. Do not reseed deleted real content. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/wisdom`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "text": "معاً نصنع الفرق.",
      "enabled": true
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /wisdom — Wisdom create

- Authentication: Session.
- Required permission/scope: hr.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Wisdom lists/forms/workflow controls (scripts 20,26,28). Trigger: Save a new record.
- Backend behavior/validation: Trim and deduplicate text; preserve ordering and enable/disable behavior. Do not reseed deleted real content. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "text": "معاً نصنع الفرق.",
  "enabled": true
}
```
- Example request: `POST /api/wisdom` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "text": "معاً نصنع الفرق.",
    "enabled": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /wisdom/{id} — Wisdom details

- Authentication: Session.
- Required permission/scope: hr.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Wisdom lists/forms/workflow controls (scripts 20,26,28). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Trim and deduplicate text; preserve ordering and enable/disable behavior. Do not reseed deleted real content. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/wisdom/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "text": "معاً نصنع الفرق.",
    "enabled": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /wisdom/{id} — Wisdom update/action

- Authentication: Session.
- Required permission/scope: hr.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Wisdom lists/forms/workflow controls (scripts 20,26,28). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Trim and deduplicate text; preserve ordering and enable/disable behavior. Do not reseed deleted real content. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "text": "معاً نصنع الفرق.",
  "enabled": true,
  "_version": 1
}
```
- Example request: `PATCH /api/wisdom/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "text": "معاً نصنع الفرق.",
    "enabled": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### DELETE /wisdom/{id} — Wisdom delete

- Authentication: Session.
- Required permission/scope: hr.delete plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Wisdom lists/forms/workflow controls (scripts 20,26,28). Trigger: Confirm existing delete action.
- Backend behavior/validation: Trim and deduplicate text; preserve ordering and enable/disable behavior. Do not reseed deleted real content. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "_version": 1
}
```
- Example request: `DELETE /api/wisdom/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": null
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: SupportRequest

Frontend source: scripts 02,22; cache location `supportRequests`.

type purchase/logistics. Creator identity and source task are checked. Purchase transitions, quoted version, offer expiry, reasons, approval authority, accepted quantities and stock effects are transactional. Logistics scheduling rejects resource/person overlaps and other-customer goods. Complete requires receiver/proof; unresolved linked purchases block execution.

| Field | Input type | Required on create |
|---|---|---|
| `requestNo` | source form value; see example and domain validation | No |
| `type` | source form value; see example and domain validation | Yes |
| `taskId` | source form value; see example and domain validation | No |
| `taskNo` | source form value; see example and domain validation | No |
| `taskTitle` | source form value; see example and domain validation | No |
| `customer` | source form value; see example and domain validation | No |
| `sourceDepartment` | source form value; see example and domain validation | No |
| `destinationDepartment` | source form value; see example and domain validation | No |
| `item` | source form value; see example and domain validation | No |
| `quantity` | number (or decimal string at the unchanged form boundary) | No |
| `details` | source form value; see example and domain validation | Yes |
| `neededDate` | date YYYY-MM-DD; empty/null allowed when optional | No |
| `neededTime` | source form value; see example and domain validation | No |
| `priority` | source form value; see example and domain validation | No |
| `title` | source form value; see example and domain validation | Yes |
| `location` | source form value; see example and domain validation | No |
| `logisticsType` | source form value; see example and domain validation | No |
| `status` | source form value; see example and domain validation | No |
| `assignedTo` | source form value; see example and domain validation | No |
| `attachments` | array; nested record schema applies | No |
| `history` | array; nested record schema applies | No |
| `operation18` | object; nested record schema applies | No |
| `responseNote` | source form value; see example and domain validation | No |
| `supplier` | source form value; see example and domain validation | No |
| `createdById` | source form value; see example and domain validation | No |

### GET /support-requests — SupportRequest list

- Authentication: Session.
- Required permission/scope: purchases.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: SupportRequest lists/forms/workflow controls (scripts 02,22). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: type purchase/logistics. Creator identity and source task are checked. Purchase transitions, quoted version, offer expiry, reasons, approval authority, accepted quantities and stock effects are transactional. Logistics scheduling rejects resource/person overlaps and other-customer goods. Complete requires receiver/proof; unresolved linked purchases block execution. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/support-requests`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "type": "purchase",
      "title": "شراء معدات",
      "details": "معدات لمهمة تصوير",
      "priority": "normal",
      "status": "new",
      "operation18": {
        "phase": "new",
        "version": 1,
        "lines": [
          {
            "id": "L1",
            "name": "بطارية",
            "qty": 1,
            "unit": "قطعة",
            "kind": "goods",
            "spec": ""
          }
        ],
        "quotes": [],
        "receipts": []
      }
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /support-requests — SupportRequest create

- Authentication: Session.
- Required permission/scope: purchases.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: SupportRequest lists/forms/workflow controls (scripts 02,22). Trigger: Save a new record.
- Backend behavior/validation: type purchase/logistics. Creator identity and source task are checked. Purchase transitions, quoted version, offer expiry, reasons, approval authority, accepted quantities and stock effects are transactional. Logistics scheduling rejects resource/person overlaps and other-customer goods. Complete requires receiver/proof; unresolved linked purchases block execution. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "type": "purchase",
  "title": "شراء معدات",
  "details": "معدات لمهمة تصوير",
  "priority": "normal",
  "status": "new",
  "operation18": {
    "phase": "new",
    "version": 1,
    "lines": [
      {
        "id": "L1",
        "name": "بطارية",
        "qty": 1,
        "unit": "قطعة",
        "kind": "goods",
        "spec": ""
      }
    ],
    "quotes": [],
    "receipts": []
  }
}
```
- Example request: `POST /api/support-requests` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "type": "purchase",
    "title": "شراء معدات",
    "details": "معدات لمهمة تصوير",
    "priority": "normal",
    "status": "new",
    "operation18": {
      "phase": "new",
      "version": 1,
      "lines": [
        {
          "id": "L1",
          "name": "بطارية",
          "qty": 1,
          "unit": "قطعة",
          "kind": "goods",
          "spec": ""
        }
      ],
      "quotes": [],
      "receipts": []
    }
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /support-requests/{id} — SupportRequest details

- Authentication: Session.
- Required permission/scope: purchases.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: SupportRequest lists/forms/workflow controls (scripts 02,22). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: type purchase/logistics. Creator identity and source task are checked. Purchase transitions, quoted version, offer expiry, reasons, approval authority, accepted quantities and stock effects are transactional. Logistics scheduling rejects resource/person overlaps and other-customer goods. Complete requires receiver/proof; unresolved linked purchases block execution. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/support-requests/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "type": "purchase",
    "title": "شراء معدات",
    "details": "معدات لمهمة تصوير",
    "priority": "normal",
    "status": "new",
    "operation18": {
      "phase": "new",
      "version": 1,
      "lines": [
        {
          "id": "L1",
          "name": "بطارية",
          "qty": 1,
          "unit": "قطعة",
          "kind": "goods",
          "spec": ""
        }
      ],
      "quotes": [],
      "receipts": []
    }
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /support-requests/{id} — SupportRequest update/action

- Authentication: Session.
- Required permission/scope: purchases.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: SupportRequest lists/forms/workflow controls (scripts 02,22). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: type purchase/logistics. Creator identity and source task are checked. Purchase transitions, quoted version, offer expiry, reasons, approval authority, accepted quantities and stock effects are transactional. Logistics scheduling rejects resource/person overlaps and other-customer goods. Complete requires receiver/proof; unresolved linked purchases block execution. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "type": "purchase",
  "title": "شراء معدات",
  "details": "معدات لمهمة تصوير",
  "priority": "normal",
  "status": "new",
  "operation18": {
    "phase": "new",
    "version": 1,
    "lines": [
      {
        "id": "L1",
        "name": "بطارية",
        "qty": 1,
        "unit": "قطعة",
        "kind": "goods",
        "spec": ""
      }
    ],
    "quotes": [],
    "receipts": []
  },
  "_version": 1
}
```
- Example request: `PATCH /api/support-requests/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "type": "purchase",
    "title": "شراء معدات",
    "details": "معدات لمهمة تصوير",
    "priority": "normal",
    "status": "new",
    "operation18": {
      "phase": "new",
      "version": 1,
      "lines": [
        {
          "id": "L1",
          "name": "بطارية",
          "qty": 1,
          "unit": "قطعة",
          "kind": "goods",
          "spec": ""
        }
      ],
      "quotes": [],
      "receipts": []
    }
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: Warehouse

Supported kind values are general (default), equipment, internal and customer. The original equipment/internal seed definitions remain valid; customer retains its ownership restriction.

Frontend source: scripts 22; cache location `operations18.warehouses`.

Unique name; manager is active employee; cannot deactivate with stock, active reservations or outstanding custody.

| Field | Input type | Required on create |
|---|---|---|
| `name` | source form value; see example and domain validation | Yes |
| `kind` | source form value; see example and domain validation | No |
| `location` | source form value; see example and domain validation | No |
| `managerId` | source form value; see example and domain validation | No |
| `active` | boolean | No |

### GET /warehouses — Warehouse list

- Authentication: Session.
- Required permission/scope: warehouses.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: Warehouse lists/forms/workflow controls (scripts 22). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Unique name; manager is active employee; cannot deactivate with stock, active reservations or outstanding custody. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/warehouses`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "name": "مستودع المعدات",
      "kind": "equipment",
      "location": "دمشق",
      "managerId": "",
      "active": true
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /warehouses — Warehouse create

- Authentication: Session.
- Required permission/scope: warehouses.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Warehouse lists/forms/workflow controls (scripts 22). Trigger: Save a new record.
- Backend behavior/validation: Unique name; manager is active employee; cannot deactivate with stock, active reservations or outstanding custody. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "name": "مستودع المعدات",
  "kind": "equipment",
  "location": "دمشق",
  "managerId": "",
  "active": true
}
```
- Example request: `POST /api/warehouses` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "مستودع المعدات",
    "kind": "equipment",
    "location": "دمشق",
    "managerId": "",
    "active": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /warehouses/{id} — Warehouse details

- Authentication: Session.
- Required permission/scope: warehouses.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Warehouse lists/forms/workflow controls (scripts 22). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Unique name; manager is active employee; cannot deactivate with stock, active reservations or outstanding custody. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/warehouses/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "مستودع المعدات",
    "kind": "equipment",
    "location": "دمشق",
    "managerId": "",
    "active": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /warehouses/{id} — Warehouse update/action

- Authentication: Session.
- Required permission/scope: warehouses.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Warehouse lists/forms/workflow controls (scripts 22). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Unique name; manager is active employee; cannot deactivate with stock, active reservations or outstanding custody. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "name": "مستودع المعدات",
  "kind": "equipment",
  "location": "دمشق",
  "managerId": "",
  "active": true,
  "_version": 1
}
```
- Example request: `PATCH /api/warehouses/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "مستودع المعدات",
    "kind": "equipment",
    "location": "دمشق",
    "managerId": "",
    "active": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: StockItem

Frontend source: scripts 22; cache location `operations18.items`.

Unique normalized serial/barcode; serial tracking needs serial; customer ownership requires existing customer; minQty ≥ 0. tracking: serial/returnable/consumable.

| Field | Input type | Required on create |
|---|---|---|
| `sku` | source form value; see example and domain validation | No |
| `barcode` | source form value; see example and domain validation | No |
| `name` | source form value; see example and domain validation | Yes |
| `unit` | source form value; see example and domain validation | No |
| `category` | source form value; see example and domain validation | No |
| `tracking` | source form value; see example and domain validation | No |
| `owner` | source form value; see example and domain validation | No |
| `customer` | source form value; see example and domain validation | No |
| `serial` | source form value; see example and domain validation | No |
| `minQty` | number (or decimal string at the unchanged form boundary) | No |
| `notes` | source form value; see example and domain validation | No |
| `active` | boolean | No |

### GET /stock-items — StockItem list

- Authentication: Session.
- Required permission/scope: warehouses.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: StockItem lists/forms/workflow controls (scripts 22). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Unique normalized serial/barcode; serial tracking needs serial; customer ownership requires existing customer; minQty ≥ 0. tracking: serial/returnable/consumable. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/stock-items`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "name": "كاميرا",
      "unit": "قطعة",
      "category": "equipment",
      "tracking": "serial",
      "owner": "company",
      "serial": "CAM-001",
      "barcode": "12345",
      "minQty": 0,
      "active": true
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /stock-items — StockItem create

- Authentication: Session.
- Required permission/scope: warehouses.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: StockItem lists/forms/workflow controls (scripts 22). Trigger: Save a new record.
- Backend behavior/validation: Unique normalized serial/barcode; serial tracking needs serial; customer ownership requires existing customer; minQty ≥ 0. tracking: serial/returnable/consumable. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "name": "كاميرا",
  "unit": "قطعة",
  "category": "equipment",
  "tracking": "serial",
  "owner": "company",
  "serial": "CAM-001",
  "barcode": "12345",
  "minQty": 0,
  "active": true
}
```
- Example request: `POST /api/stock-items` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "كاميرا",
    "unit": "قطعة",
    "category": "equipment",
    "tracking": "serial",
    "owner": "company",
    "serial": "CAM-001",
    "barcode": "12345",
    "minQty": 0,
    "active": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /stock-items/{id} — StockItem details

- Authentication: Session.
- Required permission/scope: warehouses.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: StockItem lists/forms/workflow controls (scripts 22). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Unique normalized serial/barcode; serial tracking needs serial; customer ownership requires existing customer; minQty ≥ 0. tracking: serial/returnable/consumable. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/stock-items/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "كاميرا",
    "unit": "قطعة",
    "category": "equipment",
    "tracking": "serial",
    "owner": "company",
    "serial": "CAM-001",
    "barcode": "12345",
    "minQty": 0,
    "active": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /stock-items/{id} — StockItem update/action

- Authentication: Session.
- Required permission/scope: warehouses.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: StockItem lists/forms/workflow controls (scripts 22). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Unique normalized serial/barcode; serial tracking needs serial; customer ownership requires existing customer; minQty ≥ 0. tracking: serial/returnable/consumable. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "name": "كاميرا",
  "unit": "قطعة",
  "category": "equipment",
  "tracking": "serial",
  "owner": "company",
  "serial": "CAM-001",
  "barcode": "12345",
  "minQty": 0,
  "active": true,
  "_version": 1
}
```
- Example request: `PATCH /api/stock-items/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "كاميرا",
    "unit": "قطعة",
    "category": "equipment",
    "tracking": "serial",
    "owner": "company",
    "serial": "CAM-001",
    "barcode": "12345",
    "minQty": 0,
    "active": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: StockMovement

Frontend source: scripts 22; cache location `operations18.movements`.

Types: opening/receipt/purchase_receipt/transfer/issue/return/consume/customer_return/damage. Positive qty, serial exactly 1; never negative available stock. Validate direction, warehouse authority, related approval, customer ownership, reservations and custody remainder. Entry is immutable except authorized eligible reversal; linked purchase/custody movements cannot reverse independently.

| Field | Input type | Required on create |
|---|---|---|
| `number` | source form value; see example and domain validation | No |
| `type` | source form value; see example and domain validation | Yes |
| `itemId` | source form value; see example and domain validation | Yes |
| `qty` | number (or decimal string at the unchanged form boundary) | Yes |
| `from` | source form value; see example and domain validation | No |
| `to` | source form value; see example and domain validation | No |
| `date` | date YYYY-MM-DD; empty/null allowed when optional | Yes |
| `employeeId` | source form value; see example and domain validation | No |
| `employeeName` | source form value; see example and domain validation | No |
| `party` | source form value; see example and domain validation | No |
| `reason` | source form value; see example and domain validation | No |
| `condition` | source form value; see example and domain validation | No |
| `authorization` | source form value; see example and domain validation | No |
| `dueDate` | date YYYY-MM-DD; empty/null allowed when optional | No |
| `refMoveId` | source form value; see example and domain validation | No |
| `logisticsId` | source form value; see example and domain validation | No |
| `purchaseId` | source form value; see example and domain validation | No |
| `receiptId` | source form value; see example and domain validation | No |
| `purchaseLineId` | source form value; see example and domain validation | No |
| `at` | source form value; see example and domain validation | No |
| `by` | source form value; see example and domain validation | No |
| `byId` | source form value; see example and domain validation | No |
| `voided` | boolean | No |
| `voidedAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `voidedBy` | source form value; see example and domain validation | No |
| `voidReason` | source form value; see example and domain validation | No |

### GET /stock-movements — StockMovement list

- Authentication: Session.
- Required permission/scope: warehouses.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: StockMovement lists/forms/workflow controls (scripts 22). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Types: opening/receipt/purchase_receipt/transfer/issue/return/consume/customer_return/damage. Positive qty, serial exactly 1; never negative available stock. Validate direction, warehouse authority, related approval, customer ownership, reservations and custody remainder. Entry is immutable except authorized eligible reversal; linked purchase/custody movements cannot reverse independently. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/stock-movements`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "type": "opening",
      "itemId": "ITEM-1",
      "qty": 1,
      "from": "",
      "to": "WH-1",
      "date": "2026-09-21",
      "reason": "افتتاحية"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /stock-movements — StockMovement create

- Authentication: Session.
- Required permission/scope: warehouses.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: StockMovement lists/forms/workflow controls (scripts 22). Trigger: Save a new record.
- Backend behavior/validation: Types: opening/receipt/purchase_receipt/transfer/issue/return/consume/customer_return/damage. Positive qty, serial exactly 1; never negative available stock. Validate direction, warehouse authority, related approval, customer ownership, reservations and custody remainder. Entry is immutable except authorized eligible reversal; linked purchase/custody movements cannot reverse independently. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "type": "opening",
  "itemId": "ITEM-1",
  "qty": 1,
  "from": "",
  "to": "WH-1",
  "date": "2026-09-21",
  "reason": "افتتاحية"
}
```
- Example request: `POST /api/stock-movements` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "type": "opening",
    "itemId": "ITEM-1",
    "qty": 1,
    "from": "",
    "to": "WH-1",
    "date": "2026-09-21",
    "reason": "افتتاحية"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /stock-movements/{id} — StockMovement details

- Authentication: Session.
- Required permission/scope: warehouses.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: StockMovement lists/forms/workflow controls (scripts 22). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Types: opening/receipt/purchase_receipt/transfer/issue/return/consume/customer_return/damage. Positive qty, serial exactly 1; never negative available stock. Validate direction, warehouse authority, related approval, customer ownership, reservations and custody remainder. Entry is immutable except authorized eligible reversal; linked purchase/custody movements cannot reverse independently. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/stock-movements/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "type": "opening",
    "itemId": "ITEM-1",
    "qty": 1,
    "from": "",
    "to": "WH-1",
    "date": "2026-09-21",
    "reason": "افتتاحية"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /stock-movements/{id} — StockMovement update/action

- Authentication: Session.
- Required permission/scope: warehouses.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: StockMovement lists/forms/workflow controls (scripts 22). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Types: opening/receipt/purchase_receipt/transfer/issue/return/consume/customer_return/damage. Positive qty, serial exactly 1; never negative available stock. Validate direction, warehouse authority, related approval, customer ownership, reservations and custody remainder. Entry is immutable except authorized eligible reversal; linked purchase/custody movements cannot reverse independently. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "type": "opening",
  "itemId": "ITEM-1",
  "qty": 1,
  "from": "",
  "to": "WH-1",
  "date": "2026-09-21",
  "reason": "افتتاحية",
  "_version": 1
}
```
- Example request: `PATCH /api/stock-movements/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "type": "opening",
    "itemId": "ITEM-1",
    "qty": 1,
    "from": "",
    "to": "WH-1",
    "date": "2026-09-21",
    "reason": "افتتاحية"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: Reservation

Frontend source: scripts 22; cache location `operations18.reservations`.

Positive qty; end > start; validate active item/warehouse and peak overlap availability. Status reserved/released/issued/completed; issued requires movementId referencing a matching authorized issue with the same logistics request, item, warehouse and quantity. Supply both in one transaction when creating the movement.

| Field | Input type | Required on create |
|---|---|---|
| `logisticsId` | source form value; see example and domain validation | Yes |
| `itemId` | source form value; see example and domain validation | Yes |
| `warehouseId` | source form value; see example and domain validation | Yes |
| `qty` | number (or decimal string at the unchanged form boundary) | Yes |
| `start` | source form value; see example and domain validation | Yes |
| `end` | source form value; see example and domain validation | Yes |
| `status` | source form value; see example and domain validation | No |
| `movementId` | source form value; see example and domain validation | No |
| `at` | source form value; see example and domain validation | No |
| `by` | source form value; see example and domain validation | No |

### GET /reservations — Reservation list

- Authentication: Session.
- Required permission/scope: logistics.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: Reservation lists/forms/workflow controls (scripts 22). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Positive qty; end > start; validate active item/warehouse and peak overlap availability. Status reserved/released/issued/completed; issued requires movementId referencing a matching authorized issue with the same logistics request, item, warehouse and quantity. Supply both in one transaction when creating the movement. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/reservations`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "logisticsId": "LOG-1",
      "itemId": "ITEM-1",
      "warehouseId": "WH-1",
      "qty": 1,
      "start": "2026-09-21T09:00:00",
      "end": "2026-09-21T12:00:00",
      "status": "reserved"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /reservations — Reservation create

- Authentication: Session.
- Required permission/scope: logistics.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Reservation lists/forms/workflow controls (scripts 22). Trigger: Save a new record.
- Backend behavior/validation: Positive qty; end > start; validate active item/warehouse and peak overlap availability. Status reserved/released/issued/completed; issued requires movementId referencing a matching authorized issue with the same logistics request, item, warehouse and quantity. Supply both in one transaction when creating the movement. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "logisticsId": "LOG-1",
  "itemId": "ITEM-1",
  "warehouseId": "WH-1",
  "qty": 1,
  "start": "2026-09-21T09:00:00",
  "end": "2026-09-21T12:00:00",
  "status": "reserved"
}
```
- Example request: `POST /api/reservations` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "logisticsId": "LOG-1",
    "itemId": "ITEM-1",
    "warehouseId": "WH-1",
    "qty": 1,
    "start": "2026-09-21T09:00:00",
    "end": "2026-09-21T12:00:00",
    "status": "reserved"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /reservations/{id} — Reservation details

- Authentication: Session.
- Required permission/scope: logistics.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Reservation lists/forms/workflow controls (scripts 22). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Positive qty; end > start; validate active item/warehouse and peak overlap availability. Status reserved/released/issued/completed; issued requires movementId referencing a matching authorized issue with the same logistics request, item, warehouse and quantity. Supply both in one transaction when creating the movement. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/reservations/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "logisticsId": "LOG-1",
    "itemId": "ITEM-1",
    "warehouseId": "WH-1",
    "qty": 1,
    "start": "2026-09-21T09:00:00",
    "end": "2026-09-21T12:00:00",
    "status": "reserved"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /reservations/{id} — Reservation update/action

- Authentication: Session.
- Required permission/scope: logistics.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Reservation lists/forms/workflow controls (scripts 22). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Positive qty; end > start; validate active item/warehouse and peak overlap availability. Status reserved/released/issued/completed; issued requires movementId referencing a matching authorized issue with the same logistics request, item, warehouse and quantity. Supply both in one transaction when creating the movement. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "logisticsId": "LOG-1",
  "itemId": "ITEM-1",
  "warehouseId": "WH-1",
  "qty": 1,
  "start": "2026-09-21T09:00:00",
  "end": "2026-09-21T12:00:00",
  "status": "reserved",
  "_version": 1
}
```
- Example request: `PATCH /api/reservations/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "logisticsId": "LOG-1",
    "itemId": "ITEM-1",
    "warehouseId": "WH-1",
    "qty": 1,
    "start": "2026-09-21T09:00:00",
    "end": "2026-09-21T12:00:00",
    "status": "reserved"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: Supplier

Frontend source: scripts 22,24; cache location `operations18.suppliers`.

Unique normalized name; valid email; paymentDays 0–3650. Catalog shared with accounting.

| Field | Input type | Required on create |
|---|---|---|
| `name` | source form value; see example and domain validation | Yes |
| `contact` | source form value; see example and domain validation | No |
| `phone` | source form value; see example and domain validation | No |
| `email` | source form value; see example and domain validation | No |
| `address` | source form value; see example and domain validation | No |
| `notes` | source form value; see example and domain validation | No |
| `active` | boolean | No |
| `taxNumber` | source form value; see example and domain validation | No |
| `currency` | source form value; see example and domain validation | No |
| `paymentDays` | number (or decimal string at the unchanged form boundary) | No |
| `accountCode22` | source form value; see example and domain validation | No |

### GET /suppliers — Supplier list

- Authentication: Session.
- Required permission/scope: purchases.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: Supplier lists/forms/workflow controls (scripts 22,24). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Unique normalized name; valid email; paymentDays 0–3650. Catalog shared with accounting. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/suppliers`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "name": "مورد معدات",
      "active": true,
      "currency": "USD",
      "paymentDays": 30
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /suppliers — Supplier create

- Authentication: Session.
- Required permission/scope: purchases.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Supplier lists/forms/workflow controls (scripts 22,24). Trigger: Save a new record.
- Backend behavior/validation: Unique normalized name; valid email; paymentDays 0–3650. Catalog shared with accounting. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "name": "مورد معدات",
  "active": true,
  "currency": "USD",
  "paymentDays": 30
}
```
- Example request: `POST /api/suppliers` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "مورد معدات",
    "active": true,
    "currency": "USD",
    "paymentDays": 30
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /suppliers/{id} — Supplier details

- Authentication: Session.
- Required permission/scope: purchases.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Supplier lists/forms/workflow controls (scripts 22,24). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Unique normalized name; valid email; paymentDays 0–3650. Catalog shared with accounting. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/suppliers/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "مورد معدات",
    "active": true,
    "currency": "USD",
    "paymentDays": 30
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /suppliers/{id} — Supplier update/action

- Authentication: Session.
- Required permission/scope: purchases.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Supplier lists/forms/workflow controls (scripts 22,24). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Unique normalized name; valid email; paymentDays 0–3650. Catalog shared with accounting. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "name": "مورد معدات",
  "active": true,
  "currency": "USD",
  "paymentDays": 30,
  "_version": 1
}
```
- Example request: `PATCH /api/suppliers/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "مورد معدات",
    "active": true,
    "currency": "USD",
    "paymentDays": 30
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: Invoice

Frontend source: scripts 02,24; cache location `invoices`.

Server calculates integer minor-unit finance totals. A legacy invoice without finance21 must identify an approved quotation through source; its lines, sourceId and finance21 draft are derived server-side. Otherwise finance21 is required. Active source order can have only one linked invoice. Posted document cannot edit; cancellation requires no payments and no archived billed task. Existing UI uses INV:<id> finance identity.

| Field | Input type | Required on create |
|---|---|---|
| `number` | source form value; see example and domain validation | No |
| `customer` | source form value; see example and domain validation | Yes |
| `source` | object; nested record schema applies | No |
| `total` | number (or decimal string at the unchanged form boundary) | No |
| `currency` | source form value; see example and domain validation | No |
| `status` | source form value; see example and domain validation | No |
| `finance21` | object; nested record schema applies | No |

### GET /invoices — Invoice list

- Authentication: Session.
- Required permission/scope: accounting.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: Invoice lists/forms/workflow controls (scripts 02,24). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Server calculates integer minor-unit finance totals. A legacy invoice without finance21 must identify an approved quotation through source; its lines, sourceId and finance21 draft are derived server-side. Otherwise finance21 is required. Active source order can have only one linked invoice. Posted document cannot edit; cancellation requires no payments and no archived billed task. Existing UI uses INV:<id> finance identity. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/invoices`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "customer": "شركة العميل",
      "currency": "USD",
      "finance21": {
        "kind": "customer",
        "status": "draft",
        "currency": "USD",
        "date": "2026-09-21",
        "dueDate": "2026-10-21",
        "lines": [
          {
            "name": "خدمة",
            "qty": 1,
            "price": 100,
            "discount": 0,
            "tax": 0
          }
        ],
        "notes": ""
      }
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /invoices — Invoice create

- Authentication: Session.
- Required permission/scope: accounting.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Invoice lists/forms/workflow controls (scripts 02,24). Trigger: Save a new record.
- Backend behavior/validation: Server calculates integer minor-unit finance totals. A legacy invoice without finance21 must identify an approved quotation through source; its lines, sourceId and finance21 draft are derived server-side. Otherwise finance21 is required. Active source order can have only one linked invoice. Posted document cannot edit; cancellation requires no payments and no archived billed task. Existing UI uses INV:<id> finance identity. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "customer": "شركة العميل",
  "currency": "USD",
  "finance21": {
    "kind": "customer",
    "status": "draft",
    "currency": "USD",
    "date": "2026-09-21",
    "dueDate": "2026-10-21",
    "lines": [
      {
        "name": "خدمة",
        "qty": 1,
        "price": 100,
        "discount": 0,
        "tax": 0
      }
    ],
    "notes": ""
  }
}
```
- Example request: `POST /api/invoices` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "customer": "شركة العميل",
    "currency": "USD",
    "finance21": {
      "kind": "customer",
      "status": "draft",
      "currency": "USD",
      "date": "2026-09-21",
      "dueDate": "2026-10-21",
      "lines": [
        {
          "name": "خدمة",
          "qty": 1,
          "price": 100,
          "discount": 0,
          "tax": 0
        }
      ],
      "notes": ""
    }
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /invoices/{id} — Invoice details

- Authentication: Session.
- Required permission/scope: accounting.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Invoice lists/forms/workflow controls (scripts 02,24). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Server calculates integer minor-unit finance totals. A legacy invoice without finance21 must identify an approved quotation through source; its lines, sourceId and finance21 draft are derived server-side. Otherwise finance21 is required. Active source order can have only one linked invoice. Posted document cannot edit; cancellation requires no payments and no archived billed task. Existing UI uses INV:<id> finance identity. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/invoices/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "customer": "شركة العميل",
    "currency": "USD",
    "finance21": {
      "kind": "customer",
      "status": "draft",
      "currency": "USD",
      "date": "2026-09-21",
      "dueDate": "2026-10-21",
      "lines": [
        {
          "name": "خدمة",
          "qty": 1,
          "price": 100,
          "discount": 0,
          "tax": 0
        }
      ],
      "notes": ""
    }
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /invoices/{id} — Invoice update/action

- Authentication: Session.
- Required permission/scope: accounting.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Invoice lists/forms/workflow controls (scripts 02,24). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Server calculates integer minor-unit finance totals. A legacy invoice without finance21 must identify an approved quotation through source; its lines, sourceId and finance21 draft are derived server-side. Otherwise finance21 is required. Active source order can have only one linked invoice. Posted document cannot edit; cancellation requires no payments and no archived billed task. Existing UI uses INV:<id> finance identity. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "customer": "شركة العميل",
  "currency": "USD",
  "finance21": {
    "kind": "customer",
    "status": "draft",
    "currency": "USD",
    "date": "2026-09-21",
    "dueDate": "2026-10-21",
    "lines": [
      {
        "name": "خدمة",
        "qty": 1,
        "price": 100,
        "discount": 0,
        "tax": 0
      }
    ],
    "notes": ""
  },
  "_version": 1
}
```
- Example request: `PATCH /api/invoices/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "customer": "شركة العميل",
    "currency": "USD",
    "finance21": {
      "kind": "customer",
      "status": "draft",
      "currency": "USD",
      "date": "2026-09-21",
      "dueDate": "2026-10-21",
      "lines": [
        {
          "name": "خدمة",
          "qty": 1,
          "price": 100,
          "discount": 0,
          "tax": 0
        }
      ],
      "notes": ""
    }
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: FinancialDocument

Frontend source: scripts 24; cache location `finance21.documents`.

kind vendor/employee/expense; status draft/review/posted/cancelled. Validate party, approval, source quantities/currency and duplicate vendor reference/employee period. Draft only editing; standalone vendor bill and unlinked employee payable/expense require management approval. Locked/future posting is rejected. Server recalculates totals and linked HR amounts. Payroll documents move only with entire payroll run.

| Field | Input type | Required on create |
|---|---|---|
| `number` | source form value; see example and domain validation | No |
| `kind` | source form value; see example and domain validation | Yes |
| `status` | source form value; see example and domain validation | No |
| `party` | source form value; see example and domain validation | No |
| `partyId` | source form value; see example and domain validation | No |
| `sourceId` | source form value; see example and domain validation | No |
| `sourceLabel` | source form value; see example and domain validation | No |
| `approvalId` | source form value; see example and domain validation | No |
| `reference` | source form value; see example and domain validation | Yes |
| `currency` | source form value; see example and domain validation | Yes |
| `date` | date YYYY-MM-DD; empty/null allowed when optional | Yes |
| `dueDate` | date YYYY-MM-DD; empty/null allowed when optional | Yes |
| `lines` | array; nested record schema applies | No |
| `total` | number (or decimal string at the unchanged form boundary) | No |
| `net` | number (or decimal string at the unchanged form boundary) | No |
| `tax` | number (or decimal string at the unchanged form boundary) | No |
| `category` | source form value; see example and domain validation | No |
| `department` | source form value; see example and domain validation | No |
| `taskId` | source form value; see example and domain validation | No |
| `period` | source form value; see example and domain validation | No |
| `notes` | source form value; see example and domain validation | No |
| `files` | array; nested record schema applies | No |
| `postedAt` | source form value; see example and domain validation | No |
| `postedBy` | source form value; see example and domain validation | No |
| `approvedAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `approvedBy` | source form value; see example and domain validation | No |
| `decisionReason` | source form value; see example and domain validation | No |
| `cancelledAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `cancelledBy` | source form value; see example and domain validation | No |
| `cancelReason` | source form value; see example and domain validation | No |
| `standalone22` | boolean | No |
| `ledgerAccount22` | source form value; see example and domain validation | No |
| `opening22` | boolean | No |
| `payroll23` | object; nested record schema applies | No |

### GET /financial-documents — FinancialDocument list

- Authentication: Session.
- Required permission/scope: accounting.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: FinancialDocument lists/forms/workflow controls (scripts 24). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: kind vendor/employee/expense; status draft/review/posted/cancelled. Validate party, approval, source quantities/currency and duplicate vendor reference/employee period. Draft only editing; standalone vendor bill and unlinked employee payable/expense require management approval. Locked/future posting is rejected. Server recalculates totals and linked HR amounts. Payroll documents move only with entire payroll run. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/financial-documents`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "kind": "vendor",
      "partyId": "SUPPLIER-1",
      "party": "مورد معدات",
      "reference": "BILL-001",
      "currency": "USD",
      "date": "2026-09-21",
      "dueDate": "2026-10-21",
      "status": "draft",
      "standalone22": true,
      "notes": "شراء مباشر",
      "lines": [
        {
          "name": "بطارية",
          "qty": 1,
          "price": 50,
          "discount": 0,
          "tax": 0
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /financial-documents — FinancialDocument create

- Authentication: Session.
- Required permission/scope: accounting.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: FinancialDocument lists/forms/workflow controls (scripts 24). Trigger: Save a new record.
- Backend behavior/validation: kind vendor/employee/expense; status draft/review/posted/cancelled. Validate party, approval, source quantities/currency and duplicate vendor reference/employee period. Draft only editing; standalone vendor bill and unlinked employee payable/expense require management approval. Locked/future posting is rejected. Server recalculates totals and linked HR amounts. Payroll documents move only with entire payroll run. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "kind": "vendor",
  "partyId": "SUPPLIER-1",
  "party": "مورد معدات",
  "reference": "BILL-001",
  "currency": "USD",
  "date": "2026-09-21",
  "dueDate": "2026-10-21",
  "status": "draft",
  "standalone22": true,
  "notes": "شراء مباشر",
  "lines": [
    {
      "name": "بطارية",
      "qty": 1,
      "price": 50,
      "discount": 0,
      "tax": 0
    }
  ]
}
```
- Example request: `POST /api/financial-documents` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "kind": "vendor",
    "partyId": "SUPPLIER-1",
    "party": "مورد معدات",
    "reference": "BILL-001",
    "currency": "USD",
    "date": "2026-09-21",
    "dueDate": "2026-10-21",
    "status": "draft",
    "standalone22": true,
    "notes": "شراء مباشر",
    "lines": [
      {
        "name": "بطارية",
        "qty": 1,
        "price": 50,
        "discount": 0,
        "tax": 0
      }
    ]
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /financial-documents/{id} — FinancialDocument details

- Authentication: Session.
- Required permission/scope: accounting.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: FinancialDocument lists/forms/workflow controls (scripts 24). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: kind vendor/employee/expense; status draft/review/posted/cancelled. Validate party, approval, source quantities/currency and duplicate vendor reference/employee period. Draft only editing; standalone vendor bill and unlinked employee payable/expense require management approval. Locked/future posting is rejected. Server recalculates totals and linked HR amounts. Payroll documents move only with entire payroll run. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/financial-documents/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "kind": "vendor",
    "partyId": "SUPPLIER-1",
    "party": "مورد معدات",
    "reference": "BILL-001",
    "currency": "USD",
    "date": "2026-09-21",
    "dueDate": "2026-10-21",
    "status": "draft",
    "standalone22": true,
    "notes": "شراء مباشر",
    "lines": [
      {
        "name": "بطارية",
        "qty": 1,
        "price": 50,
        "discount": 0,
        "tax": 0
      }
    ]
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /financial-documents/{id} — FinancialDocument update/action

- Authentication: Session.
- Required permission/scope: accounting.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: FinancialDocument lists/forms/workflow controls (scripts 24). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: kind vendor/employee/expense; status draft/review/posted/cancelled. Validate party, approval, source quantities/currency and duplicate vendor reference/employee period. Draft only editing; standalone vendor bill and unlinked employee payable/expense require management approval. Locked/future posting is rejected. Server recalculates totals and linked HR amounts. Payroll documents move only with entire payroll run. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "kind": "vendor",
  "partyId": "SUPPLIER-1",
  "party": "مورد معدات",
  "reference": "BILL-001",
  "currency": "USD",
  "date": "2026-09-21",
  "dueDate": "2026-10-21",
  "status": "draft",
  "standalone22": true,
  "notes": "شراء مباشر",
  "lines": [
    {
      "name": "بطارية",
      "qty": 1,
      "price": 50,
      "discount": 0,
      "tax": 0
    }
  ],
  "_version": 1
}
```
- Example request: `PATCH /api/financial-documents/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "kind": "vendor",
    "partyId": "SUPPLIER-1",
    "party": "مورد معدات",
    "reference": "BILL-001",
    "currency": "USD",
    "date": "2026-09-21",
    "dueDate": "2026-10-21",
    "status": "draft",
    "standalone22": true,
    "notes": "شراء مباشر",
    "lines": [
      {
        "name": "بطارية",
        "qty": 1,
        "price": 50,
        "discount": 0,
        "tax": 0
      }
    ]
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: CashAccount

Frontend source: scripts 24; cache location `finance21.accounts`.

Administration creates cash/bank account; unique name+currency. Opening is integer minor units, nonnegative and dated no later than today, outside locked period.

| Field | Input type | Required on create |
|---|---|---|
| `name` | source form value; see example and domain validation | Yes |
| `currency` | source form value; see example and domain validation | Yes |
| `type` | source form value; see example and domain validation | Yes |
| `opening` | number (or decimal string at the unchanged form boundary) | No |
| `openingDate` | date YYYY-MM-DD; empty/null allowed when optional | Yes |
| `active` | boolean | No |

### GET /cash-accounts — CashAccount list

- Authentication: Session.
- Required permission/scope: accounting.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: CashAccount lists/forms/workflow controls (scripts 24). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Administration creates cash/bank account; unique name+currency. Opening is integer minor units, nonnegative and dated no later than today, outside locked period. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/cash-accounts`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "name": "الصندوق",
      "currency": "USD",
      "type": "cash",
      "opening": 100000,
      "openingDate": "2026-09-21",
      "active": true
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /cash-accounts — CashAccount create

- Authentication: Session.
- Required permission/scope: accounting.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: CashAccount lists/forms/workflow controls (scripts 24). Trigger: Save a new record.
- Backend behavior/validation: Administration creates cash/bank account; unique name+currency. Opening is integer minor units, nonnegative and dated no later than today, outside locked period. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "name": "الصندوق",
  "currency": "USD",
  "type": "cash",
  "opening": 100000,
  "openingDate": "2026-09-21",
  "active": true
}
```
- Example request: `POST /api/cash-accounts` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "الصندوق",
    "currency": "USD",
    "type": "cash",
    "opening": 100000,
    "openingDate": "2026-09-21",
    "active": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /cash-accounts/{id} — CashAccount details

- Authentication: Session.
- Required permission/scope: accounting.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: CashAccount lists/forms/workflow controls (scripts 24). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Administration creates cash/bank account; unique name+currency. Opening is integer minor units, nonnegative and dated no later than today, outside locked period. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/cash-accounts/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "الصندوق",
    "currency": "USD",
    "type": "cash",
    "opening": 100000,
    "openingDate": "2026-09-21",
    "active": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /cash-accounts/{id} — CashAccount update/action

- Authentication: Session.
- Required permission/scope: accounting.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: CashAccount lists/forms/workflow controls (scripts 24). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Administration creates cash/bank account; unique name+currency. Opening is integer minor units, nonnegative and dated no later than today, outside locked period. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "name": "الصندوق",
  "currency": "USD",
  "type": "cash",
  "opening": 100000,
  "openingDate": "2026-09-21",
  "active": true,
  "_version": 1
}
```
- Example request: `PATCH /api/cash-accounts/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "الصندوق",
    "currency": "USD",
    "type": "cash",
    "opening": 100000,
    "openingDate": "2026-09-21",
    "active": true
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: Payment

Frontend source: scripts 24; cache location `finance21.payments`.

Integer minor-unit amount > 0. Enforce posted document, correct cash direction/currency, outstanding amount, source caps, same-party available advance, duplicate token/reference and no negative cash at any date. kind receipt/payout/supplier_advance/transfer/apply_advance/employee_return/employee_offset/reversal. Reversal preserves original and validates downstream settlements.

| Field | Input type | Required on create |
|---|---|---|
| `number` | source form value; see example and domain validation | No |
| `kind` | source form value; see example and domain validation | Yes |
| `currency` | source form value; see example and domain validation | Yes |
| `date` | date YYYY-MM-DD; empty/null allowed when optional | Yes |
| `amount` | number (or decimal string at the unchanged form boundary) | Yes |
| `docId` | source form value; see example and domain validation | No |
| `accountId` | source form value; see example and domain validation | No |
| `toAccountId` | source form value; see example and domain validation | No |
| `reference` | source form value; see example and domain validation | Yes |
| `party` | source form value; see example and domain validation | No |
| `partyId` | source form value; see example and domain validation | No |
| `sourceId` | source form value; see example and domain validation | No |
| `advanceId` | source form value; see example and domain validation | No |
| `files` | array; nested record schema applies | No |
| `note` | source form value; see example and domain validation | No |
| `token` | source form value; see example and domain validation | No |
| `at` | source form value; see example and domain validation | No |
| `by` | source form value; see example and domain validation | No |
| `approvalId` | source form value; see example and domain validation | No |
| `reversedAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `reversedBy` | source form value; see example and domain validation | No |
| `reverseReason` | source form value; see example and domain validation | No |
| `reverses` | source form value; see example and domain validation | No |

### GET /payments — Payment list

- Authentication: Session.
- Required permission/scope: accounting.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: Payment lists/forms/workflow controls (scripts 24). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Integer minor-unit amount > 0. Enforce posted document, correct cash direction/currency, outstanding amount, source caps, same-party available advance, duplicate token/reference and no negative cash at any date. kind receipt/payout/supplier_advance/transfer/apply_advance/employee_return/employee_offset/reversal. Reversal preserves original and validates downstream settlements. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/payments`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "kind": "receipt",
      "currency": "USD",
      "date": "2026-09-21",
      "amount": 10000,
      "docId": "INV:1",
      "accountId": "ACC-1",
      "reference": "RCPT-001",
      "token": "unique-operation-key"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /payments — Payment create

- Authentication: Session.
- Required permission/scope: accounting.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Payment lists/forms/workflow controls (scripts 24). Trigger: Save a new record.
- Backend behavior/validation: Integer minor-unit amount > 0. Enforce posted document, correct cash direction/currency, outstanding amount, source caps, same-party available advance, duplicate token/reference and no negative cash at any date. kind receipt/payout/supplier_advance/transfer/apply_advance/employee_return/employee_offset/reversal. Reversal preserves original and validates downstream settlements. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "kind": "receipt",
  "currency": "USD",
  "date": "2026-09-21",
  "amount": 10000,
  "docId": "INV:1",
  "accountId": "ACC-1",
  "reference": "RCPT-001",
  "token": "unique-operation-key"
}
```
- Example request: `POST /api/payments` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "kind": "receipt",
    "currency": "USD",
    "date": "2026-09-21",
    "amount": 10000,
    "docId": "INV:1",
    "accountId": "ACC-1",
    "reference": "RCPT-001",
    "token": "unique-operation-key"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /payments/{id} — Payment details

- Authentication: Session.
- Required permission/scope: accounting.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Payment lists/forms/workflow controls (scripts 24). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Integer minor-unit amount > 0. Enforce posted document, correct cash direction/currency, outstanding amount, source caps, same-party available advance, duplicate token/reference and no negative cash at any date. kind receipt/payout/supplier_advance/transfer/apply_advance/employee_return/employee_offset/reversal. Reversal preserves original and validates downstream settlements. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/payments/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "kind": "receipt",
    "currency": "USD",
    "date": "2026-09-21",
    "amount": 10000,
    "docId": "INV:1",
    "accountId": "ACC-1",
    "reference": "RCPT-001",
    "token": "unique-operation-key"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /payments/{id} — Payment update/action

- Authentication: Session.
- Required permission/scope: accounting.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Payment lists/forms/workflow controls (scripts 24). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Integer minor-unit amount > 0. Enforce posted document, correct cash direction/currency, outstanding amount, source caps, same-party available advance, duplicate token/reference and no negative cash at any date. kind receipt/payout/supplier_advance/transfer/apply_advance/employee_return/employee_offset/reversal. Reversal preserves original and validates downstream settlements. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "kind": "receipt",
  "currency": "USD",
  "date": "2026-09-21",
  "amount": 10000,
  "docId": "INV:1",
  "accountId": "ACC-1",
  "reference": "RCPT-001",
  "token": "unique-operation-key",
  "_version": 1
}
```
- Example request: `PATCH /api/payments/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "kind": "receipt",
    "currency": "USD",
    "date": "2026-09-21",
    "amount": 10000,
    "docId": "INV:1",
    "accountId": "ACC-1",
    "reference": "RCPT-001",
    "token": "unique-operation-key"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: JournalEntry

Frontend source: scripts 24; cache location `finance22.journal`.

Server generates all source postings; client-generated automatic entries are not authoritative. Manual entries need ≥2 lines, known accounts, nonnegative minor units, one debit/credit side per line and equal nonzero totals. Manual entries cannot touch controlled cash or party accounts. Entries append only; eligible manual reversal requires administration and reason.

| Field | Input type | Required on create |
|---|---|---|
| `key` | source form value; see example and domain validation | No |
| `number` | source form value; see example and domain validation | No |
| `date` | date YYYY-MM-DD; empty/null allowed when optional | Yes |
| `currency` | source form value; see example and domain validation | Yes |
| `reference` | source form value; see example and domain validation | Yes |
| `memo` | source form value; see example and domain validation | Yes |
| `lines` | array; nested record schema applies | Yes |
| `source` | object; nested record schema applies | No |
| `manual` | boolean | No |
| `reverses` | source form value; see example and domain validation | No |
| `at` | source form value; see example and domain validation | No |
| `by` | source form value; see example and domain validation | No |
| `fingerprint` | source form value; see example and domain validation | No |
| `total` | number (or decimal string at the unchanged form boundary) | No |
| `postedAt` | source form value; see example and domain validation | No |
| `postedBy` | source form value; see example and domain validation | No |

### GET /journal-entries — JournalEntry list

- Authentication: Session.
- Required permission/scope: accounting.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: JournalEntry lists/forms/workflow controls (scripts 24). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Server generates all source postings; client-generated automatic entries are not authoritative. Manual entries need ≥2 lines, known accounts, nonnegative minor units, one debit/credit side per line and equal nonzero totals. Manual entries cannot touch controlled cash or party accounts. Entries append only; eligible manual reversal requires administration and reason. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/journal-entries`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "date": "2026-09-21",
      "currency": "USD",
      "reference": "JV-001",
      "memo": "قيد يدوي",
      "manual": true,
      "lines": [
        {
          "account": "5100",
          "debit": 10000,
          "credit": 0
        },
        {
          "account": "3900",
          "debit": 0,
          "credit": 10000
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /journal-entries — JournalEntry create

- Authentication: Session.
- Required permission/scope: accounting.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: JournalEntry lists/forms/workflow controls (scripts 24). Trigger: Save a new record.
- Backend behavior/validation: Server generates all source postings; client-generated automatic entries are not authoritative. Manual entries need ≥2 lines, known accounts, nonnegative minor units, one debit/credit side per line and equal nonzero totals. Manual entries cannot touch controlled cash or party accounts. Entries append only; eligible manual reversal requires administration and reason. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "date": "2026-09-21",
  "currency": "USD",
  "reference": "JV-001",
  "memo": "قيد يدوي",
  "manual": true,
  "lines": [
    {
      "account": "5100",
      "debit": 10000,
      "credit": 0
    },
    {
      "account": "3900",
      "debit": 0,
      "credit": 10000
    }
  ]
}
```
- Example request: `POST /api/journal-entries` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "date": "2026-09-21",
    "currency": "USD",
    "reference": "JV-001",
    "memo": "قيد يدوي",
    "manual": true,
    "lines": [
      {
        "account": "5100",
        "debit": 10000,
        "credit": 0
      },
      {
        "account": "3900",
        "debit": 0,
        "credit": 10000
      }
    ]
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /journal-entries/{id} — JournalEntry details

- Authentication: Session.
- Required permission/scope: accounting.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: JournalEntry lists/forms/workflow controls (scripts 24). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Server generates all source postings; client-generated automatic entries are not authoritative. Manual entries need ≥2 lines, known accounts, nonnegative minor units, one debit/credit side per line and equal nonzero totals. Manual entries cannot touch controlled cash or party accounts. Entries append only; eligible manual reversal requires administration and reason. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/journal-entries/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "date": "2026-09-21",
    "currency": "USD",
    "reference": "JV-001",
    "memo": "قيد يدوي",
    "manual": true,
    "lines": [
      {
        "account": "5100",
        "debit": 10000,
        "credit": 0
      },
      {
        "account": "3900",
        "debit": 0,
        "credit": 10000
      }
    ]
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /journal-entries/{id} — JournalEntry update/action

- Authentication: Session.
- Required permission/scope: accounting.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: JournalEntry lists/forms/workflow controls (scripts 24). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Server generates all source postings; client-generated automatic entries are not authoritative. Manual entries need ≥2 lines, known accounts, nonnegative minor units, one debit/credit side per line and equal nonzero totals. Manual entries cannot touch controlled cash or party accounts. Entries append only; eligible manual reversal requires administration and reason. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "date": "2026-09-21",
  "currency": "USD",
  "reference": "JV-001",
  "memo": "قيد يدوي",
  "manual": true,
  "lines": [
    {
      "account": "5100",
      "debit": 10000,
      "credit": 0
    },
    {
      "account": "3900",
      "debit": 0,
      "credit": 10000
    }
  ],
  "_version": 1
}
```
- Example request: `PATCH /api/journal-entries/{id}` using the JSON body above.
- Success response: Not applicable. Posted journal entries are append-only; this route consistently rejects edits. Create an authorized manual reversal with POST /journal-entries instead.
- Expected rejection: HTTP 422.
```json
{"success":false,"message":"القيد المرحّل لا يعدّل. استخدم قيداً عكسياً.","errors":{}}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: PayrollHours

Frontend source: scripts 24; cache location `finance23.hours`.

YYYY-MM period; basis monthly/hourly; positive base/norm hours; regular+paid ≤ norm; overtime factor 1–5. Overtime/deductions/bonus require their references; manager overtime is forbidden by current prototype policy. Recalculate with exact decimal arithmetic; net ≥ 0. Approved sheets immutable; supersede only if not already in a live salary document.

| Field | Input type | Required on create |
|---|---|---|
| `employeeId` | source form value; see example and domain validation | Yes |
| `employeeName` | source form value; see example and domain validation | No |
| `department` | source form value; see example and domain validation | No |
| `period` | source form value; see example and domain validation | Yes |
| `currency` | source form value; see example and domain validation | Yes |
| `basis` | source form value; see example and domain validation | Yes |
| `baseAmount` | number (or decimal string at the unchanged form boundary) | Yes |
| `normHours` | number (or decimal string at the unchanged form boundary) | Yes |
| `regularHours` | number (or decimal string at the unchanged form boundary) | No |
| `paidHours` | number (or decimal string at the unchanged form boundary) | No |
| `overtimeHours` | number (or decimal string at the unchanged form boundary) | No |
| `overtimeRate` | number (or decimal string at the unchanged form boundary) | No |
| `bonus` | number (or decimal string at the unchanged form boundary) | No |
| `deductions` | number (or decimal string at the unchanged form boundary) | No |
| `reference` | source form value; see example and domain validation | Yes |
| `overtimeApproval` | source form value; see example and domain validation | No |
| `bonusReason` | source form value; see example and domain validation | No |
| `deductionReason` | source form value; see example and domain validation | No |
| `notes` | source form value; see example and domain validation | No |
| `source` | object; nested record schema applies | No |
| `calculation` | object; nested record schema applies | No |
| `status` | source form value; see example and domain validation | No |
| `approvedAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `approvedBy` | source form value; see example and domain validation | No |
| `supersededAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `fingerprint` | source form value; see example and domain validation | No |

### GET /payroll-hours — PayrollHours list

- Authentication: Session.
- Required permission/scope: hr.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: PayrollHours lists/forms/workflow controls (scripts 24). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: YYYY-MM period; basis monthly/hourly; positive base/norm hours; regular+paid ≤ norm; overtime factor 1–5. Overtime/deductions/bonus require their references; manager overtime is forbidden by current prototype policy. Recalculate with exact decimal arithmetic; net ≥ 0. Approved sheets immutable; supersede only if not already in a live salary document. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/payroll-hours`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "employeeId": "EMP-1",
      "period": "2026-09",
      "currency": "USD",
      "basis": "monthly",
      "baseAmount": "500",
      "normHours": "160",
      "regularHours": "160",
      "paidHours": "0",
      "overtimeHours": "0",
      "overtimeRate": "1.25",
      "bonus": "0",
      "deductions": "0",
      "reference": "ATT-2026-09",
      "status": "draft"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /payroll-hours — PayrollHours create

- Authentication: Session.
- Required permission/scope: hr.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: PayrollHours lists/forms/workflow controls (scripts 24). Trigger: Save a new record.
- Backend behavior/validation: YYYY-MM period; basis monthly/hourly; positive base/norm hours; regular+paid ≤ norm; overtime factor 1–5. Overtime/deductions/bonus require their references; manager overtime is forbidden by current prototype policy. Recalculate with exact decimal arithmetic; net ≥ 0. Approved sheets immutable; supersede only if not already in a live salary document. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "employeeId": "EMP-1",
  "period": "2026-09",
  "currency": "USD",
  "basis": "monthly",
  "baseAmount": "500",
  "normHours": "160",
  "regularHours": "160",
  "paidHours": "0",
  "overtimeHours": "0",
  "overtimeRate": "1.25",
  "bonus": "0",
  "deductions": "0",
  "reference": "ATT-2026-09",
  "status": "draft"
}
```
- Example request: `POST /api/payroll-hours` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "employeeId": "EMP-1",
    "period": "2026-09",
    "currency": "USD",
    "basis": "monthly",
    "baseAmount": "500",
    "normHours": "160",
    "regularHours": "160",
    "paidHours": "0",
    "overtimeHours": "0",
    "overtimeRate": "1.25",
    "bonus": "0",
    "deductions": "0",
    "reference": "ATT-2026-09",
    "status": "draft"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /payroll-hours/{id} — PayrollHours details

- Authentication: Session.
- Required permission/scope: hr.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: PayrollHours lists/forms/workflow controls (scripts 24). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: YYYY-MM period; basis monthly/hourly; positive base/norm hours; regular+paid ≤ norm; overtime factor 1–5. Overtime/deductions/bonus require their references; manager overtime is forbidden by current prototype policy. Recalculate with exact decimal arithmetic; net ≥ 0. Approved sheets immutable; supersede only if not already in a live salary document. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/payroll-hours/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "employeeId": "EMP-1",
    "period": "2026-09",
    "currency": "USD",
    "basis": "monthly",
    "baseAmount": "500",
    "normHours": "160",
    "regularHours": "160",
    "paidHours": "0",
    "overtimeHours": "0",
    "overtimeRate": "1.25",
    "bonus": "0",
    "deductions": "0",
    "reference": "ATT-2026-09",
    "status": "draft"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /payroll-hours/{id} — PayrollHours update/action

- Authentication: Session.
- Required permission/scope: hr.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: PayrollHours lists/forms/workflow controls (scripts 24). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: YYYY-MM period; basis monthly/hourly; positive base/norm hours; regular+paid ≤ norm; overtime factor 1–5. Overtime/deductions/bonus require their references; manager overtime is forbidden by current prototype policy. Recalculate with exact decimal arithmetic; net ≥ 0. Approved sheets immutable; supersede only if not already in a live salary document. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "employeeId": "EMP-1",
  "period": "2026-09",
  "currency": "USD",
  "basis": "monthly",
  "baseAmount": "500",
  "normHours": "160",
  "regularHours": "160",
  "paidHours": "0",
  "overtimeHours": "0",
  "overtimeRate": "1.25",
  "bonus": "0",
  "deductions": "0",
  "reference": "ATT-2026-09",
  "status": "draft",
  "_version": 1
}
```
- Example request: `PATCH /api/payroll-hours/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "employeeId": "EMP-1",
    "period": "2026-09",
    "currency": "USD",
    "basis": "monthly",
    "baseAmount": "500",
    "normHours": "160",
    "regularHours": "160",
    "paidHours": "0",
    "overtimeHours": "0",
    "overtimeRate": "1.25",
    "bonus": "0",
    "deductions": "0",
    "reference": "ATT-2026-09",
    "status": "draft"
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: PayrollRun

Frontend source: scripts 24; cache location `finance23.runs`.

Use approved hour sheets of one period/currency; payroll23.snapshot on every linked salary document must preserve the approved hour sheet, including its fingerprint and calculation; the fingerprint and source inputs must match; date ≥ month end and ≤ today; dueDate ≥ date. No duplicate employee salary for a month. Create/submit/decide/cancel all linked payables atomically. Reject cancellation if payments/offsets remain.

| Field | Input type | Required on create |
|---|---|---|
| `number` | source form value; see example and domain validation | No |
| `period` | source form value; see example and domain validation | Yes |
| `currency` | source form value; see example and domain validation | Yes |
| `date` | date YYYY-MM-DD; empty/null allowed when optional | Yes |
| `dueDate` | date YYYY-MM-DD; empty/null allowed when optional | Yes |
| `status` | source form value; see example and domain validation | No |
| `lines` | array; nested record schema applies | Yes |
| `submittedAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `decidedAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `decidedBy` | source form value; see example and domain validation | No |
| `decisionReason` | source form value; see example and domain validation | No |
| `cancelReason` | source form value; see example and domain validation | No |
| `cancelledAt` | server timestamp; source-compatible ISO-8601 or epoch milliseconds | No |
| `cancelledBy` | source form value; see example and domain validation | No |

### GET /payroll-runs — PayrollRun list

- Authentication: Session.
- Required permission/scope: hr.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: PayrollRun lists/forms/workflow controls (scripts 24). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Use approved hour sheets of one period/currency; payroll23.snapshot on every linked salary document must preserve the approved hour sheet, including its fingerprint and calculation; the fingerprint and source inputs must match; date ≥ month end and ≤ today; dueDate ≥ date. No duplicate employee salary for a month. Create/submit/decide/cancel all linked payables atomically. Reject cancellation if payments/offsets remain. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/payroll-runs`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "period": "2026-09",
      "currency": "USD",
      "date": "2026-09-30",
      "dueDate": "2026-10-01",
      "status": "draft",
      "lines": [
        {
          "employeeId": "EMP-1",
          "hoursId": "HOURS-1"
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /payroll-runs — PayrollRun create

- Authentication: Session.
- Required permission/scope: hr.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: PayrollRun lists/forms/workflow controls (scripts 24). Trigger: Save a new record.
- Backend behavior/validation: Use approved hour sheets of one period/currency; payroll23.snapshot on every linked salary document must preserve the approved hour sheet, including its fingerprint and calculation; the fingerprint and source inputs must match; date ≥ month end and ≤ today; dueDate ≥ date. No duplicate employee salary for a month. Create/submit/decide/cancel all linked payables atomically. Reject cancellation if payments/offsets remain. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "period": "2026-09",
  "currency": "USD",
  "date": "2026-09-30",
  "dueDate": "2026-10-01",
  "status": "draft",
  "lines": [
    {
      "employeeId": "EMP-1",
      "hoursId": "HOURS-1"
    }
  ]
}
```
- Example request: `POST /api/payroll-runs` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "period": "2026-09",
    "currency": "USD",
    "date": "2026-09-30",
    "dueDate": "2026-10-01",
    "status": "draft",
    "lines": [
      {
        "employeeId": "EMP-1",
        "hoursId": "HOURS-1"
      }
    ]
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /payroll-runs/{id} — PayrollRun details

- Authentication: Session.
- Required permission/scope: hr.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: PayrollRun lists/forms/workflow controls (scripts 24). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Use approved hour sheets of one period/currency; payroll23.snapshot on every linked salary document must preserve the approved hour sheet, including its fingerprint and calculation; the fingerprint and source inputs must match; date ≥ month end and ≤ today; dueDate ≥ date. No duplicate employee salary for a month. Create/submit/decide/cancel all linked payables atomically. Reject cancellation if payments/offsets remain. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/payroll-runs/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "period": "2026-09",
    "currency": "USD",
    "date": "2026-09-30",
    "dueDate": "2026-10-01",
    "status": "draft",
    "lines": [
      {
        "employeeId": "EMP-1",
        "hoursId": "HOURS-1"
      }
    ]
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /payroll-runs/{id} — PayrollRun update/action

- Authentication: Session.
- Required permission/scope: hr.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: PayrollRun lists/forms/workflow controls (scripts 24). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Use approved hour sheets of one period/currency; payroll23.snapshot on every linked salary document must preserve the approved hour sheet, including its fingerprint and calculation; the fingerprint and source inputs must match; date ≥ month end and ≤ today; dueDate ≥ date. No duplicate employee salary for a month. Create/submit/decide/cancel all linked payables atomically. Reject cancellation if payments/offsets remain. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "period": "2026-09",
  "currency": "USD",
  "date": "2026-09-30",
  "dueDate": "2026-10-01",
  "status": "draft",
  "lines": [
    {
      "employeeId": "EMP-1",
      "hoursId": "HOURS-1"
    }
  ],
  "_version": 1
}
```
- Example request: `PATCH /api/payroll-runs/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "period": "2026-09",
    "currency": "USD",
    "date": "2026-09-30",
    "dueDate": "2026-10-01",
    "status": "draft",
    "lines": [
      {
        "employeeId": "EMP-1",
        "hoursId": "HOURS-1"
      }
    ]
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### Schema: PrintLayout

Frontend source: scripts 24; cache location `finance23.layouts`.

Only presentation fields; never changes document values or posted ledgers. Bound colors/fonts/numeric dimensions and sanitize user text. HR/sales can manage their corresponding print families.

| Field | Input type | Required on create |
|---|---|---|
| `name` | source form value; see example and domain validation | Yes |
| `family` | source form value; see example and domain validation | Yes |
| `font` | source form value; see example and domain validation | No |
| `size` | number (or decimal string at the unchanged form boundary) | No |
| `width` | number (or decimal string at the unchanged form boundary) | No |
| `height` | number (or decimal string at the unchanged form boundary) | No |
| `margin` | number (or decimal string at the unchanged form boundary) | No |
| `color` | source form value; see example and domain validation | No |
| `line` | source form value; see example and domain validation | No |
| `headBg` | source form value; see example and domain validation | No |
| `padding` | number (or decimal string at the unchanged form boundary) | No |
| `header` | source form value; see example and domain validation | No |
| `footer` | source form value; see example and domain validation | No |
| `columns` | array; nested record schema applies | No |
| `blocks` | array; nested record schema applies | No |

### GET /print-layouts — PrintLayout list

- Authentication: Session.
- Required permission/scope: accounting.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: q (case-insensitive search); page integer ≥1; perPage integer 1–100 (default 25; UI retains its own 10/20/30 choices); sort=known scalar field; order=asc/desc; filter[field]=exact value for allowed scalar fields; from/to date bounds; scope=mine/department/all never broadens permission.
- Frontend: PrintLayout lists/forms/workflow controls (scripts 24). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Only presentation fields; never changes document values or posted ledgers. Bound colors/fonts/numeric dimensions and sanitize user text. HR/sales can manage their corresponding print families. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/print-layouts`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": [
    {
      "id": "EXAMPLE-1",
      "_version": 2,
      "name": "النموذج الرسمي",
      "family": "invoice",
      "font": "Arial",
      "size": 12,
      "width": 210,
      "height": 297,
      "margin": 14,
      "color": "#111111",
      "line": "#c5c5c5",
      "headBg": "#f3f3f3",
      "padding": 9,
      "header": "MOSH GROUP",
      "footer": "MOSH GROUP",
      "columns": [],
      "blocks": []
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1,
    "lastPage": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### POST /print-layouts — PrintLayout create

- Authentication: Session.
- Required permission/scope: accounting.create plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: PrintLayout lists/forms/workflow controls (scripts 24). Trigger: Save a new record.
- Backend behavior/validation: Only presentation fields; never changes document values or posted ledgers. Bound colors/fonts/numeric dimensions and sanitize user text. HR/sales can manage their corresponding print families. Create validation uses the schema required column. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "name": "النموذج الرسمي",
  "family": "invoice",
  "font": "Arial",
  "size": 12,
  "width": 210,
  "height": 297,
  "margin": 14,
  "color": "#111111",
  "line": "#c5c5c5",
  "headBg": "#f3f3f3",
  "padding": 9,
  "header": "MOSH GROUP",
  "footer": "MOSH GROUP",
  "columns": [],
  "blocks": []
}
```
- Example request: `POST /api/print-layouts` using the JSON body above.
- Success: HTTP 201.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "النموذج الرسمي",
    "family": "invoice",
    "font": "Arial",
    "size": 12,
    "width": 210,
    "height": 297,
    "margin": 14,
    "color": "#111111",
    "line": "#c5c5c5",
    "headBg": "#f3f3f3",
    "padding": 9,
    "header": "MOSH GROUP",
    "footer": "MOSH GROUP",
    "columns": [],
    "blocks": []
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /print-layouts/{id} — PrintLayout details

- Authentication: Session.
- Required permission/scope: accounting.list/details plus domain scope.
- Headers: Accept: application/json.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: PrintLayout lists/forms/workflow controls (scripts 24). Trigger: Open/details/search/filter/pagination.
- Backend behavior/validation: Only presentation fields; never changes document values or posted ledgers. Bound colors/fonts/numeric dimensions and sanitize user text. HR/sales can manage their corresponding print families. Server controls identities, timestamps and derived values.
- Request body: None.
- Example request: `GET /api/print-layouts/{id}`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "النموذج الرسمي",
    "family": "invoice",
    "font": "Arial",
    "size": 12,
    "width": 210,
    "height": 297,
    "margin": 14,
    "color": "#111111",
    "line": "#c5c5c5",
    "headBg": "#f3f3f3",
    "padding": 9,
    "header": "MOSH GROUP",
    "footer": "MOSH GROUP",
    "columns": [],
    "blocks": []
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PATCH /print-layouts/{id} — PrintLayout update/action

- Authentication: Session.
- Required permission/scope: accounting.edit or validated status/assign/approve action plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: PrintLayout lists/forms/workflow controls (scripts 24). Trigger: Save edit, status, assignment or approval action.
- Backend behavior/validation: Only presentation fields; never changes document values or posted ledgers. Bound colors/fonts/numeric dimensions and sanitize user text. HR/sales can manage their corresponding print families. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "name": "النموذج الرسمي",
  "family": "invoice",
  "font": "Arial",
  "size": 12,
  "width": 210,
  "height": 297,
  "margin": 14,
  "color": "#111111",
  "line": "#c5c5c5",
  "headBg": "#f3f3f3",
  "padding": 9,
  "header": "MOSH GROUP",
  "footer": "MOSH GROUP",
  "columns": [],
  "blocks": [],
  "_version": 1
}
```
- Example request: `PATCH /api/print-layouts/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "id": "EXAMPLE-1",
    "_version": 2,
    "name": "النموذج الرسمي",
    "family": "invoice",
    "font": "Arial",
    "size": 12,
    "width": 210,
    "height": 297,
    "margin": 14,
    "color": "#111111",
    "line": "#c5c5c5",
    "headBg": "#f3f3f3",
    "padding": 9,
    "header": "MOSH GROUP",
    "footer": "MOSH GROUP",
    "columns": [],
    "blocks": []
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### DELETE /print-layouts/{id} — PrintLayout delete

- Authentication: Session.
- Required permission/scope: accounting.delete plus domain scope.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: id; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: PrintLayout lists/forms/workflow controls (scripts 24). Trigger: Confirm existing delete action.
- Backend behavior/validation: Only presentation fields; never changes document values or posted ledgers. Bound colors/fonts/numeric dimensions and sanitize user text. HR/sales can manage their corresponding print families. PATCH/DELETE requires matching _version. Server controls identities, timestamps and derived values.
- Request body: 
```json
{
  "_version": 1
}
```
- Example request: `DELETE /api/print-layouts/{id}` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": null
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

## 7. Settings endpoints

### GET /settings/system — Settings: system

- Authentication: Session.
- Required permission/scope: systemCustomization settings permission.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing settings/configuration controls. Trigger: Open settings.
- Backend behavior/validation: App/company name; exact existing typography/color/control values. PUT replaces the named configuration atomically and requires the current version. The example is structural; retain the settings keys populated by the existing form. purchasing and finance-chart use arrays. finance, finance-chart, purchasing and executive-report-reviews require administration; system/ui-controls require systemCustomization. finance-links additionally checks each party link and posted entry. print-defaults also allows HR/sales editors.
- Request body: None.
- Example request: `GET /api/settings/system`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "value": {},
    "_version": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PUT /settings/system — Settings: system

- Authentication: Session.
- Required permission/scope: systemCustomization settings permission.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing settings/configuration controls. Trigger: Save configuration.
- Backend behavior/validation: App/company name; exact existing typography/color/control values. PUT replaces the named configuration atomically and requires the current version. The example is structural; retain the settings keys populated by the existing form. purchasing and finance-chart use arrays. finance, finance-chart, purchasing and executive-report-reviews require administration; system/ui-controls require systemCustomization. finance-links additionally checks each party link and posted entry. print-defaults also allows HR/sales editors.
- Request body: 
```json
{
  "value": {},
  "_version": 1
}
```
- Example request: `PUT /api/settings/system` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "value": {},
    "_version": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /settings/department-managers — Settings: department-managers

- Authentication: Session.
- Required permission/scope: hr settings permission.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing settings/configuration controls. Trigger: Open settings.
- Backend behavior/validation: Map department → active employee ID; retain multi-department managers. PUT replaces the named configuration atomically and requires the current version. The example is structural; retain the settings keys populated by the existing form. purchasing and finance-chart use arrays. finance, finance-chart, purchasing and executive-report-reviews require administration; system/ui-controls require systemCustomization. finance-links additionally checks each party link and posted entry. print-defaults also allows HR/sales editors.
- Request body: None.
- Example request: `GET /api/settings/department-managers`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "value": {},
    "_version": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PUT /settings/department-managers — Settings: department-managers

- Authentication: Session.
- Required permission/scope: hr settings permission.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing settings/configuration controls. Trigger: Save configuration.
- Backend behavior/validation: Map department → active employee ID; retain multi-department managers. PUT replaces the named configuration atomically and requires the current version. The example is structural; retain the settings keys populated by the existing form. purchasing and finance-chart use arrays. finance, finance-chart, purchasing and executive-report-reviews require administration; system/ui-controls require systemCustomization. finance-links additionally checks each party link and posted entry. print-defaults also allows HR/sales editors.
- Request body: 
```json
{
  "value": {},
  "_version": 1
}
```
- Example request: `PUT /api/settings/department-managers` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "value": {},
    "_version": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /settings/hr — Settings: hr

- Authentication: Session.
- Required permission/scope: hr settings permission.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing settings/configuration controls. Trigger: Open settings.
- Backend behavior/validation: Annual/sick leave, daily accrual, warning expiry, alert lead days and performance weights. PUT replaces the named configuration atomically and requires the current version. The example is structural; retain the settings keys populated by the existing form. purchasing and finance-chart use arrays. finance, finance-chart, purchasing and executive-report-reviews require administration; system/ui-controls require systemCustomization. finance-links additionally checks each party link and posted entry. print-defaults also allows HR/sales editors.
- Request body: None.
- Example request: `GET /api/settings/hr`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "value": {},
    "_version": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PUT /settings/hr — Settings: hr

- Authentication: Session.
- Required permission/scope: hr settings permission.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing settings/configuration controls. Trigger: Save configuration.
- Backend behavior/validation: Annual/sick leave, daily accrual, warning expiry, alert lead days and performance weights. PUT replaces the named configuration atomically and requires the current version. The example is structural; retain the settings keys populated by the existing form. purchasing and finance-chart use arrays. finance, finance-chart, purchasing and executive-report-reviews require administration; system/ui-controls require systemCustomization. finance-links additionally checks each party link and posted entry. print-defaults also allows HR/sales editors.
- Request body: 
```json
{
  "value": {},
  "_version": 1
}
```
- Example request: `PUT /api/settings/hr` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "value": {},
    "_version": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /settings/hr-policies — Settings: hr-policies

- Authentication: Session.
- Required permission/scope: hr settings permission.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing settings/configuration controls. Trigger: Open settings.
- Backend behavior/validation: Workday hours 1–24, monthly review day 1–31, probation default months ≥ 0. PUT replaces the named configuration atomically and requires the current version. The example is structural; retain the settings keys populated by the existing form. purchasing and finance-chart use arrays. finance, finance-chart, purchasing and executive-report-reviews require administration; system/ui-controls require systemCustomization. finance-links additionally checks each party link and posted entry. print-defaults also allows HR/sales editors.
- Request body: None.
- Example request: `GET /api/settings/hr-policies`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "value": {},
    "_version": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PUT /settings/hr-policies — Settings: hr-policies

- Authentication: Session.
- Required permission/scope: hr settings permission.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing settings/configuration controls. Trigger: Save configuration.
- Backend behavior/validation: Workday hours 1–24, monthly review day 1–31, probation default months ≥ 0. PUT replaces the named configuration atomically and requires the current version. The example is structural; retain the settings keys populated by the existing form. purchasing and finance-chart use arrays. finance, finance-chart, purchasing and executive-report-reviews require administration; system/ui-controls require systemCustomization. finance-links additionally checks each party link and posted entry. print-defaults also allows HR/sales editors.
- Request body: 
```json
{
  "value": {},
  "_version": 1
}
```
- Example request: `PUT /api/settings/hr-policies` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "value": {},
    "_version": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /settings/employment-contract-templates — Settings: employment-contract-templates

- Authentication: Session.
- Required permission/scope: hr settings permission.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing settings/configuration controls. Trigger: Open settings.
- Backend behavior/validation: Common and type clauses; each nonempty title/body; version on save. PUT replaces the named configuration atomically and requires the current version. The example is structural; retain the settings keys populated by the existing form. purchasing and finance-chart use arrays. finance, finance-chart, purchasing and executive-report-reviews require administration; system/ui-controls require systemCustomization. finance-links additionally checks each party link and posted entry. print-defaults also allows HR/sales editors.
- Request body: None.
- Example request: `GET /api/settings/employment-contract-templates`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "value": {},
    "_version": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PUT /settings/employment-contract-templates — Settings: employment-contract-templates

- Authentication: Session.
- Required permission/scope: hr settings permission.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing settings/configuration controls. Trigger: Save configuration.
- Backend behavior/validation: Common and type clauses; each nonempty title/body; version on save. PUT replaces the named configuration atomically and requires the current version. The example is structural; retain the settings keys populated by the existing form. purchasing and finance-chart use arrays. finance, finance-chart, purchasing and executive-report-reviews require administration; system/ui-controls require systemCustomization. finance-links additionally checks each party link and posted entry. print-defaults also allows HR/sales editors.
- Request body: 
```json
{
  "value": {},
  "_version": 1
}
```
- Example request: `PUT /api/settings/employment-contract-templates` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "value": {},
    "_version": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /settings/executive-report-reviews — Settings: executive-report-reviews

- Authentication: Session.
- Required permission/scope: admin settings permission.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing settings/configuration controls. Trigger: Open settings.
- Backend behavior/validation: Report review map; management decision/note/actor/time. PUT replaces the named configuration atomically and requires the current version. The example is structural; retain the settings keys populated by the existing form. purchasing and finance-chart use arrays. finance, finance-chart, purchasing and executive-report-reviews require administration; system/ui-controls require systemCustomization. finance-links additionally checks each party link and posted entry. print-defaults also allows HR/sales editors.
- Request body: None.
- Example request: `GET /api/settings/executive-report-reviews`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "value": {},
    "_version": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PUT /settings/executive-report-reviews — Settings: executive-report-reviews

- Authentication: Session.
- Required permission/scope: admin settings permission.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing settings/configuration controls. Trigger: Save configuration.
- Backend behavior/validation: Report review map; management decision/note/actor/time. PUT replaces the named configuration atomically and requires the current version. The example is structural; retain the settings keys populated by the existing form. purchasing and finance-chart use arrays. finance, finance-chart, purchasing and executive-report-reviews require administration; system/ui-controls require systemCustomization. finance-links additionally checks each party link and posted entry. print-defaults also allows HR/sales editors.
- Request body: 
```json
{
  "value": {},
  "_version": 1
}
```
- Example request: `PUT /api/settings/executive-report-reviews` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "value": {},
    "_version": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /settings/wisdom — Settings: wisdom

- Authentication: Session.
- Required permission/scope: hr settings permission.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing settings/configuration controls. Trigger: Open settings.
- Backend behavior/validation: mode daily/hours; hours 1–168; anchor, offset and stable item ordering. Optional order is an ordered array of unique existing wisdom IDs; omitted IDs follow in their existing order. The GET resource and bootstrap use this sequence. PUT replaces the named configuration atomically and requires the current version. The example is structural; retain the settings keys populated by the existing form. purchasing and finance-chart use arrays. finance, finance-chart, purchasing and executive-report-reviews require administration; system/ui-controls require systemCustomization. finance-links additionally checks each party link and posted entry. print-defaults also allows HR/sales editors.
- Request body: None.
- Example request: `GET /api/settings/wisdom`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "value": {},
    "_version": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PUT /settings/wisdom — Settings: wisdom

- Authentication: Session.
- Required permission/scope: hr settings permission.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing settings/configuration controls. Trigger: Save configuration.
- Backend behavior/validation: mode daily/hours; hours 1–168; anchor, offset and stable item ordering. Optional order is an ordered array of unique existing wisdom IDs; omitted IDs follow in their existing order. The GET resource and bootstrap use this sequence. PUT replaces the named configuration atomically and requires the current version. The example is structural; retain the settings keys populated by the existing form. purchasing and finance-chart use arrays. finance, finance-chart, purchasing and executive-report-reviews require administration; system/ui-controls require systemCustomization. finance-links additionally checks each party link and posted entry. print-defaults also allows HR/sales editors.
- Request body: 
```json
{
  "value": {},
  "_version": 1
}
```
- Example request: `PUT /api/settings/wisdom` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "value": {},
    "_version": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /settings/purchasing — Settings: purchasing

- Authentication: Session.
- Required permission/scope: admin settings permission.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing settings/configuration controls. Trigger: Open settings.
- Backend behavior/validation: Array of active employee IDs delegated to approve purchases. PUT replaces the named configuration atomically and requires the current version. The example is structural; retain the settings keys populated by the existing form. purchasing and finance-chart use arrays. finance, finance-chart, purchasing and executive-report-reviews require administration; system/ui-controls require systemCustomization. finance-links additionally checks each party link and posted entry. print-defaults also allows HR/sales editors.
- Request body: None.
- Example request: `GET /api/settings/purchasing`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "value": {},
    "_version": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PUT /settings/purchasing — Settings: purchasing

- Authentication: Session.
- Required permission/scope: admin settings permission.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing settings/configuration controls. Trigger: Save configuration.
- Backend behavior/validation: Array of active employee IDs delegated to approve purchases. PUT replaces the named configuration atomically and requires the current version. The example is structural; retain the settings keys populated by the existing form. purchasing and finance-chart use arrays. finance, finance-chart, purchasing and executive-report-reviews require administration; system/ui-controls require systemCustomization. finance-links additionally checks each party link and posted entry. print-defaults also allows HR/sales editors.
- Request body: 
```json
{
  "value": {},
  "_version": 1
}
```
- Example request: `PUT /api/settings/purchasing` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "value": {},
    "_version": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /settings/finance — Settings: finance

- Authentication: Session.
- Required permission/scope: accounting settings permission.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing settings/configuration controls. Trigger: Open settings.
- Backend behavior/validation: lockedThrough: valid date or empty; administration-only changes. PUT replaces the named configuration atomically and requires the current version. The example is structural; retain the settings keys populated by the existing form. purchasing and finance-chart use arrays. finance, finance-chart, purchasing and executive-report-reviews require administration; system/ui-controls require systemCustomization. finance-links additionally checks each party link and posted entry. print-defaults also allows HR/sales editors.
- Request body: None.
- Example request: `GET /api/settings/finance`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "value": {},
    "_version": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PUT /settings/finance — Settings: finance

- Authentication: Session.
- Required permission/scope: accounting settings permission.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing settings/configuration controls. Trigger: Save configuration.
- Backend behavior/validation: lockedThrough: valid date or empty; administration-only changes. PUT replaces the named configuration atomically and requires the current version. The example is structural; retain the settings keys populated by the existing form. purchasing and finance-chart use arrays. finance, finance-chart, purchasing and executive-report-reviews require administration; system/ui-controls require systemCustomization. finance-links additionally checks each party link and posted entry. print-defaults also allows HR/sales editors.
- Request body: 
```json
{
  "value": {},
  "_version": 1
}
```
- Example request: `PUT /api/settings/finance` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "value": {},
    "_version": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /settings/finance-links — Settings: finance-links

- Authentication: Session.
- Required permission/scope: accounting settings permission.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing settings/configuration controls. Trigger: Open settings.
- Backend behavior/validation: Unposted financial document → existing matching-kind party; administration only. PUT replaces the named configuration atomically and requires the current version. The example is structural; retain the settings keys populated by the existing form. purchasing and finance-chart use arrays. finance, finance-chart, purchasing and executive-report-reviews require administration; system/ui-controls require systemCustomization. finance-links additionally checks each party link and posted entry. print-defaults also allows HR/sales editors.
- Request body: None.
- Example request: `GET /api/settings/finance-links`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "value": {},
    "_version": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PUT /settings/finance-links — Settings: finance-links

- Authentication: Session.
- Required permission/scope: accounting settings permission.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing settings/configuration controls. Trigger: Save configuration.
- Backend behavior/validation: Unposted financial document → existing matching-kind party; administration only. PUT replaces the named configuration atomically and requires the current version. The example is structural; retain the settings keys populated by the existing form. purchasing and finance-chart use arrays. finance, finance-chart, purchasing and executive-report-reviews require administration; system/ui-controls require systemCustomization. finance-links additionally checks each party link and posted entry. print-defaults also allows HR/sales editors.
- Request body: 
```json
{
  "value": {},
  "_version": 1
}
```
- Example request: `PUT /api/settings/finance-links` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "value": {},
    "_version": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /settings/print-defaults — Settings: print-defaults

- Authentication: Session.
- Required permission/scope: accounting settings permission.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing settings/configuration controls. Trigger: Open settings.
- Backend behavior/validation: Print family → existing same-family layout ID. PUT replaces the named configuration atomically and requires the current version. The example is structural; retain the settings keys populated by the existing form. purchasing and finance-chart use arrays. finance, finance-chart, purchasing and executive-report-reviews require administration; system/ui-controls require systemCustomization. finance-links additionally checks each party link and posted entry. print-defaults also allows HR/sales editors.
- Request body: None.
- Example request: `GET /api/settings/print-defaults`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "value": {},
    "_version": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PUT /settings/print-defaults — Settings: print-defaults

- Authentication: Session.
- Required permission/scope: accounting settings permission.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing settings/configuration controls. Trigger: Save configuration.
- Backend behavior/validation: Print family → existing same-family layout ID. PUT replaces the named configuration atomically and requires the current version. The example is structural; retain the settings keys populated by the existing form. purchasing and finance-chart use arrays. finance, finance-chart, purchasing and executive-report-reviews require administration; system/ui-controls require systemCustomization. finance-links additionally checks each party link and posted entry. print-defaults also allows HR/sales editors.
- Request body: 
```json
{
  "value": {},
  "_version": 1
}
```
- Example request: `PUT /api/settings/print-defaults` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "value": {},
    "_version": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /settings/ui-controls — Settings: ui-controls

- Authentication: Session.
- Required permission/scope: systemCustomization settings permission.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing settings/configuration controls. Trigger: Open settings.
- Backend behavior/validation: Existing control color settings from script 25. PUT replaces the named configuration atomically and requires the current version. The example is structural; retain the settings keys populated by the existing form. purchasing and finance-chart use arrays. finance, finance-chart, purchasing and executive-report-reviews require administration; system/ui-controls require systemCustomization. finance-links additionally checks each party link and posted entry. print-defaults also allows HR/sales editors.
- Request body: None.
- Example request: `GET /api/settings/ui-controls`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "value": {},
    "_version": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PUT /settings/ui-controls — Settings: ui-controls

- Authentication: Session.
- Required permission/scope: systemCustomization settings permission.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing settings/configuration controls. Trigger: Save configuration.
- Backend behavior/validation: Existing control color settings from script 25. PUT replaces the named configuration atomically and requires the current version. The example is structural; retain the settings keys populated by the existing form. purchasing and finance-chart use arrays. finance, finance-chart, purchasing and executive-report-reviews require administration; system/ui-controls require systemCustomization. finance-links additionally checks each party link and posted entry. print-defaults also allows HR/sales editors.
- Request body: 
```json
{
  "value": {},
  "_version": 1
}
```
- Example request: `PUT /api/settings/ui-controls` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "value": {},
    "_version": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

### GET /settings/finance-chart — Settings: finance-chart

- Authentication: Session.
- Required permission/scope: accounting settings permission.
- Headers: Accept: application/json.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing settings/configuration controls. Trigger: Open settings.
- Backend behavior/validation: Custom chart of accounts; four to ten digit unique code, name and accounting type. Administration may add accounts; used accounts cannot be changed. PUT replaces the named configuration atomically and requires the current version. The example is structural; retain the settings keys populated by the existing form. purchasing and finance-chart use arrays. finance, finance-chart, purchasing and executive-report-reviews require administration; system/ui-controls require systemCustomization. finance-links additionally checks each party link and posted entry. print-defaults also allows HR/sales editors.
- Request body: None.
- Example request: `GET /api/settings/finance-chart`.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "value": {},
    "_version": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 422, 429, 500; standard error bodies in §2.

### PUT /settings/finance-chart — Settings: finance-chart

- Authentication: Session.
- Required permission/scope: accounting settings permission.
- Headers: Accept: application/json; Content-Type: application/json; X-CSRF-TOKEN; Idempotency-Key as specified in §4.
- Path parameters: None; exact existing identifiers, scoped as above.
- Query parameters: None.
- Frontend: Existing settings/configuration controls. Trigger: Save configuration.
- Backend behavior/validation: Custom chart of accounts; four to ten digit unique code, name and accounting type. Administration may add accounts; used accounts cannot be changed. PUT replaces the named configuration atomically and requires the current version. The example is structural; retain the settings keys populated by the existing form. purchasing and finance-chart use arrays. finance, finance-chart, purchasing and executive-report-reviews require administration; system/ui-controls require systemCustomization. finance-links additionally checks each party link and posted entry. print-defaults also allows HR/sales editors.
- Request body: 
```json
{
  "value": {},
  "_version": 1
}
```
- Example request: `PUT /api/settings/finance-chart` using the JSON body above.
- Success: HTTP 200.
```json
{
  "success": true,
  "data": {
    "value": {},
    "_version": 1
  }
}
```
- Errors/status codes: 400, 401, 403, 404, 409, 419, 422, 429, 500; standard error bodies in §2.

## 8. Nested records and workflow contracts

- Customer `secondaryContacts`: array of `{id?,name,jobTitle?,phone?,email?,notes?}`; nonempty rows require name and valid email when present.
- Quotation `lines`: ordered product/section/note records; product fields `type,product,description,qty,price,discount,tax,cost`; section/note `type,description`. `optional`: product/qty/price. `quoteBuilder`: header/footer selections. Follow-ups preserve `id,text,kind` and use server author/time.
- Task `workChat`: ordered `{id,kind,text?,key?,name?,mime?,size?,by,time,system?}`. kind text/image/file/audio; visible user must have task access; new message authors/times are replaced by the authenticated actor/server time. `attachments` are `{key,name,mime,size,kind}` links to uploaded files. `workTiming` is a server-derived duration/session/activity object compatible with the existing UI; client heartbeat/idle classifications are inputs, not trusted elapsed totals.
- Task state rules: `new → received → working ↔ paused → submitted`; v48 start may combine new→working. Only assigned employee can receive/start/pause/submit. Manager return: submitted→paused with returnedForRevision. Manager completion changes finished/status and hands eligible single task to awaiting_invoice. Shared/packaged parents require all children complete; accounting alone sends packages to billing. Final archive types invoiced/no_invoice require invoice reference or reason. Restore resets assignment/review and retains audit.
- Employee leave: `{id,type,startDate,endDate,days,hours,fromTime,toTime,workdayHours,deductAnnual,status,note,overrideRequested,approvalId?}`. Types follow existing Arabic options. The HR editor calculates duration and accrued balance, sends an override approval when needed, and submits its staged records atomically. The server validates dates and overlap; final request approval effects are generated on the server.
- Attendance: `{id,date,inTime,outTime,breakMinutes,delayMinutes,note,source,status}` with legacy start/end aliases; duplicate uncancelled date/in/out combinations are rejected; times and break bounds are validated. The existing editor calculates overnight hours; payroll recomputes payable hours/amounts from the approved sheet.
- Disciplinary: `{id,level,reason,incidentDate,issueDate,employeeResponse,expiresAt,status,approvalId}`. Rewards: `{id,rewardType,achievement,amount,currency,status,paymentStatus,approvalId}`. Evaluations: `{id,date,score,note}`. Status/approval/payment transitions require their responsible actor; linked approval records cannot be silently deleted.
- Employee documents: `{id,key,name,title,type/category,issueDate?,expiryDate?,note?,mime,size}`. Staged uploads/metadata commit only on Save and Close. Expiry and category values follow the current document form. Delete validates parent authorization and immutable references.
- Employee assets: `{id,name,type,serial,quantity,issuedDate,status,notes,source?,movementId?}`. Warehouse-derived assets are read-only projections of custody movements; editing an HR profile cannot invent or erase warehouse custody.
- Employment contract signatures: `{employer?:{name,at,recordedBy,strokes},employee?:{...}}`; each stroke is a bounded list of numeric 2D coordinates. The existing signature dialog requires consent; the server requires an authenticated permitted recorder, side/name and bounded stroke coordinates; signed text is frozen. Clause records require nonempty title/body, unique stable string IDs and ordered arrays. New contracts start at version 1. A successor references an existing contract for the same employee, increments its version by one, clears signatures, and cannot duplicate an existing successor.
- HR request `data`: validated by type: leave requires startDate/endDate (hourly uses date/fromTime/toTime); attendance correction date/fromTime/toTime; finance requests amount > 0 and currency; transfer target existing department; promotion jobTitle; recruitment jobTitle/headcount > 0; salary certificate language/target; document update docType and owned file links; termination endDate/target/reason. Routes are server-derived, not editable employee input.
- Purchase `operation18`: `{phase,version,lines,quotes,receipts,history,kind,destination,linkedLogisticsId,requiresManagerApproval,directManagerId,managerApproval,recommendedId,recommendation,submittedVersion,approval,approvalHistory,orderNo,assignedId,expectedDate,supplierOrderRef,deferUntil,deferredFrom,start,end,location,notes,proof}`. Preserve source history as server audit. Phase draft/new/pricing/review/returned/deferred/approved/ordered/partial/completed/cancelled.
- Purchase line: `{id,name,spec,qty,unit,kind}`; qty>0, kind goods/service. Supplier offer: `{id,supplierId,reference,date,validUntil,currency,deliveryDays,paymentTerms,warranty,notes,conformity,shipping,lines,attachments,needsReview}`; each offer line references a request line with matching qty/unit/kind, price ≥0, discount/tax 0–100. Expiry ≥ offer date; only active supplier; approved copy immutable. Server calculates subtotals/tax/shipping/total.
- Receipt: `{id,number,date,receiver,reference,notes,attachments,lines}`. Each line `{lineId,qty,warehouseId?,itemId?,destination}`; positive qty ≤ remaining approved qty. Services cannot enter stock; stocked units must match, and corresponding purchase_receipt movements are required in the same transaction.
- Logistics scheduling: operation18 assignedId/start/end/resources represented as reservation rows. End>start, no employee overlap, no resource overbooking. Completion `proof` requires receiver/note and optional uploaded files. Deferred/cancelled/completed operations release unfulfilled reservations.
- Invoice `finance21`: `{id,kind,status,currency,date,dueDate,lines,net,tax,total,partyId,sourceId,sourceLabel,taskIds,notes,files,opening22?,postedAt?,postedBy?}`. Server builds `INV:<id>` identity. Financial rows use currency USD/SYP/EUR/AED/SAR/LBP/JOD/TRY/EGP and the prototype precision. Do not aggregate unrelated currencies.
- Financial line: `{name,qty,price,discount,tax,net,taxAmount,total}`. Only the first five are monetary inputs; the server recomputes the latter three using exact decimal arithmetic. No negative totals; supported minor-unit limit is <9×10^13. dueDate≥date. Posted/paid source data is immutable.
- Journal line: `{account,debit,credit,party?,memo?}`; debit/credit integer minor units, one nonzero side per line, sum debit=sum credit>0. Account and party type must match; currency-specific cash account must match entry currency. Automatic postings derive from immutable source documents/payments, including reversal and opening records.
- Payroll run line: `{employeeId,hoursId,docId,calculation}`; the existing transaction supplies stable IDs and a snapshot; the server recomputes the approved calculation and validates employee/hour/document linkage and identical status for every line. Do not pass unapproved hours or arbitrary payables.
- Marketing profile: `discoveryQuestions[{id,question,answer,internalNote,custom}]`, `guide{audience,brandEssence,tone,keyMessages,likes,dislikes,competitors,colors,fonts,brandGuideRef,logoRef,references}`, `plans[]`, `notes[]`, `interactions[]`. Plans have title/objective/audience/positioning/message/channels/content/cadence/deliverables/timeline/startDate/endDate/budget/kpis/notes/status/approvalNote; review requires title/objective/audience/message, decisions require marketing manager, rejection needs a note. Notes have type/text/pinned/followUp. Interactions have type/occurredAt/contactPerson/summary/status/nextAction/followUpAt/source; summary and valid occurrence time required. Audit actors/times are derived.
- Print layout: exact source fields font,size,width,height,margin,color,line,headBg,padding,header,footer,columns,blocks. size9–24,width148–420,height148–594,margin5–35,padding3–20; page printable width sufficient; block alignment left/center/right,size0 or8–48,gap0–100. No arbitrary HTML/script execution.

## 9. HR request routes

| Type | Existing label | Ordered approval route |
|---|---|---|
| annual_leave | إجازة سنوية | المدير المباشر → الموارد البشرية |
| hourly_leave | إجازة ساعية / إذن خروج | المدير المباشر → الموارد البشرية |
| sick_leave | إجازة مرضية | المدير المباشر → الموارد البشرية |
| attendance_correction | تصحيح حضور / انصراف | المدير المباشر → الموارد البشرية |
| advance | طلب سلفة | المدير المباشر → الموارد البشرية → المحاسبة |
| salary_certificate | شهادة راتب / تعريف | الموارد البشرية |
| document_update | تحديث بيانات أو وثيقة | الموارد البشرية |
| recruitment | طلب توظيف | الموارد البشرية → الإدارة |
| promotion | ترقية | الموارد البشرية → الإدارة → المحاسبة |
| transfer | نقل موظف | الموارد البشرية → مدير القسم الحالي → مدير القسم الجديد |
| secondment | انتداب / مهمة عمل | المدير المباشر → الموارد البشرية |
| reward | مكافأة | الموارد البشرية → الإدارة → المحاسبة |
| deduction | خصم | الموارد البشرية → الإدارة → المحاسبة |
| warning | إنذار / لفت نظر | الموارد البشرية |
| appreciation | تقدير موظف | الموارد البشرية |
| star_month | نجم الشهر | الموارد البشرية → الإدارة |
| termination | إنهاء خدمة | الموارد البشرية → الإدارة → اللوجستيات → المحاسبة |

## 10. Complete source coverage and frontend integration rules

Every source file is represented in the coverage appendix. The original stylesheet, DOM layout, Arabic labels, responsive behavior, controls, modal/navigation order and print layout remain the baseline. Integrate calls at persistence/auth/file/query boundaries; do not replace the application with a different frontend.

| Source group | Data/API coverage |
|---|---|
| 01,43 | Auth gate, users, roles, login policies, password change, security audit |
| 02 | Sales/customer/service/configuration/contracts, all task variants, manager workflow, timers/chat/files, core HR, archive, local assistant |
| 03,05 | Client clock and dashboard visibility; data comes from dashboard/bootstrap |
| 04,06–08,16 | HR/self service, recruitment, attendance, requests, alerts, dashboards |
| 09,15 | Work presence, employee daily hub and own task records |
| 10–13 | Executive/design/sales/department reporting and filtered statistics |
| 14,19 | Notices, recipient snapshots, personal archives, read receipts, shared clause templates and candidates |
| 17,18 | Staged employee documents/records, contracts/signatures/versions, evaluations and disciplinary records |
| 20 | Administrative decisions/meetings, executive report review, legacy approvals |
| 21 | Static handbook; local search/topic selection/print, no invented content API |
| 22 | Purchasing, suppliers/offers/approvals/receipts, logistics/reservations, warehouses/barcodes/custody/movements |
| 23,25,27,29,38,39,42,46–49,52 | Existing presentation/order/safety/link reconciliation wrappers; preserve behavior and use authorized server identities |
| 24 | Invoices/payables/payments/cash/party ledger/journal/reconciliation/payroll/layouts |
| 26,28 | Wisdom records and shared rotation configuration; derived banner selection remains local |
| 30–33 | Manager queues, stage routing, final request outcomes and own acknowledgement |
| 34,40,41 | Current marketing discovery/guide/plans/notes/contact history; later implementations take precedence |
| 35,36 | Field work templates, assigned employee activities/status and administrative live view |
| 37 | Shared root/department/member task distribution and completion aggregation |
| 44,45,50,51 | Enforced employee task scope, stable employee linkage, overlay and final start/pause/finish flow |

The MOSH MEDIA page is an existing placeholder. No nonexistent media CRUD is invented. Dropdown choices, statistics and reports use real authorized records. Browser storage may retain only non-sensitive presentation preferences and remembered username; it is not business persistence or authentication. All task/file/HR/finance data is refreshed from APIs; failure never silently selects mock data.

Pagination/search/filter controls retain their visible options and results. API filters are validated and scoped, with totals across the complete filtered dataset. Printing uses full filtered authorized records rather than the visible page. No live email or third-party messaging was sent during verification; mail was faked. SMTP delivery requires your configured provider. Search/filter/pagination render the complete authorized API cache using the existing JavaScript; navigation and existing Refresh controls reload it from Laravel. Direct API clients can use paginated resource/report queries.

## 11. Backend audit clarifications

- GET /auth/me adds role, effectivePermissions.modules, effectivePermissions.globals and effectiveTaskScope to the public user document. Stored taskScope may remain inherit; effectiveTaskScope is the resolved value.
- Every user/role/security PATCH preserves omitted fields. User/role versions remain required. Password changes must differ from the current password.
- All 13 settings GETs and their bootstrap values require the same named settings-management permission. No implicit public-settings exception exists. A caller without that permission receives no setting value in bootstrap.
- Linked files require current detail access to a visible parent. Uploader-only access applies to unlinked staged uploads. Unsafe original paths/names and script extensions are rejected; oversized files return 413.
- Shared task containers may use shared_container only with sharedTeamContainer=true and no assignee. Shared children keep sharedRootTaskId, sharedNodeType and their root relationship; package billing requires accounting approval.
- Announcement DELETE returns data:null, retains a soft-deleted master/audit record and marks employee archive copies deleted. Alert creation creates the existing employee archive copy shape server-side. Read acknowledgements cannot erase another recipient's entry.
- Legacy HR sourceId must match the employee's leave/reward/disciplinary record. A termination approval uses its unique termination-request sourceId plus validated lastWorkDay/reason in payload; it has no separate nested employee source row in the original prototype.
- Employment clauses use the array order and unique string id; optional ordering metadata cannot substitute for a valid array. employment-contract-templates versions increment server-side.
- finance-links changes require administration and an unposted document without an existing journal entry. A posted document's canonical party is derived by journal posting and must not be written back as a frontend cache operation.
- Print family permissions: sales manages عرض مبيعات/quotation/sales/service-contract; HR manages كشف رواتب/قسيمة راتب/payroll/payslip/hr/employment-contract; accounting manages other financial families. systemCustomization/root retain full customization access. The same family rules apply to default selection and deletion.
- Query sorting/filtering validates scalar fields before reading results. Finance and ledger report search/filters operate on authorized data, including opening balances where a date range applies.

## 12. Verification and implementation files

`VERIFICATION.md` records the automated API and browser scenarios, route parity, migrations, seeders and UI preservation checks. `backend/resources/api-spec.json` is the compact source for the 37 record schemas. `routes/web.php` registers the stateful `/api` routes with Laravel session/CSRF middleware; `routes/api.php` is intentionally unused. Business tables preserve the original form structures in per-record JSON columns plus foreign keys, indexed status/department and optimistic versions. No entire-company JSON state is accepted for writes. The 52 original scripts retain their order and use `api-client.js`, `api-boot.js` and the single `config.js` base URL.
