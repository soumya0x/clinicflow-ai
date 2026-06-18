# API Reference

All responses use a consistent envelope:

```jsonc
// success
{ "data": <payload> }
// error
{ "error": { "message": "…", "details": <optional> } }
```

Authenticated routes require a valid Supabase session cookie and are **tenant-scoped**: you can
only read/write rows for your own clinic (enforced by RLS + server checks). Validation failures
return `422` with field details. Rate-limited routes return `429`.

List endpoints accept `?page` and `?pageSize` (max 100) and return:

```jsonc
{ "data": { "items": [...], "page": 1, "pageSize": 20, "total": 42, "totalPages": 3 } }
```

---

## Appointments — `/api/appointments`

| Method | Description | Body / Query |
|--------|-------------|--------------|
| `GET` | List appointments | `?status` `?date` `?from` `?to` `?page` `?pageSize` |
| `POST` | Create appointment | see below |
| `PATCH` | Update appointment | `{ id, appointment_date?, appointment_time?, status?, reason?, estimated_value?, notes? }` |
| `DELETE` | Delete appointment | `?id=<uuid>` |

**POST body**
```jsonc
{
  "patient_id": "uuid",            // OR patient_name + patient_phone
  "patient_name": "Asha Rao",
  "patient_phone": "+919999999999",
  "appointment_date": "2026-07-01", // YYYY-MM-DD
  "appointment_time": "14:30",      // HH:MM 24h
  "reason": "Cleaning",
  "booking_source": "manual",       // ai_voice | missed_call_recovery | human_callback | manual
  "status": "scheduled"
}
```
Returns `409` if the slot is already booked (double-booking prevention).

## Patients — `/api/patients`

| Method | Description | Body / Query |
|--------|-------------|--------------|
| `GET` | List/search patients | `?search` (name or phone) `?page` `?pageSize` |
| `POST` | Create/upsert patient (by phone) | `{ name, phone, email?, notes? }` |

## Calls — `/api/calls`

| Method | Description | Body / Query |
|--------|-------------|--------------|
| `GET` | List calls | `?outcome` `?search` `?page` `?pageSize` |
| `POST` | Log a call | `{ caller_phone, transcript?, duration?, outcome?, vapi_call_id?, recording_url? }` |

## Missed calls — `/api/missed-calls`

| Method | Description | Body / Query |
|--------|-------------|--------------|
| `GET` | List missed calls | `?filter=recovered\|pending\|failed` `?page` `?pageSize` |
| `POST` | Create a missed call | `{ caller_phone, missed_at? }` |
| `PATCH` | Update status/outcome | `{ id, callback_status?, final_outcome?, appointment_id?, estimated_revenue? }` |

### `POST /api/missed-calls/:id/callback`
Manually trigger a callback attempt for a missed call (admin/receptionist). Runs the recovery
workflow (place outbound call, log attempt, schedule retry or escalate).

## Analytics — `GET /api/analytics?days=30`
```jsonc
{ "data": {
  "kpis": { "totalCalls", "totalAppointments", "callsToday", "appointmentsToday",
            "conversionRate", "averageCallDuration" },
  "series": [ { "date": "2026-06-01", "calls": 12, "appointments": 4 }, ... ]
} }
```

## Revenue — `GET /api/revenue?months=6`
All figures are **estimated** (`summary.label === "Estimated Revenue"`).
```jsonc
{ "data": {
  "summary": { "estimatedRevenueGenerated", "estimatedRevenueRecovered",
               "appointmentsBooked", "recoveredAppointments", "missedCalls",
               "recoveryConversionRate", "averageAppointmentValue", "bySource" },
  "monthly": [ { "month": "Jan 2026", "estimatedRevenue": 0, "recoveredRevenue": 0 }, ... ]
} }
```

## Settings — `/api/settings`

| Method | Description |
|--------|-------------|
| `GET` | Current clinic settings |
| `PATCH` | Update clinic settings/branding (**admin only** → `403` otherwise) |

## Notifications — `/api/notifications`

| Method | Description |
|--------|-------------|
| `GET` | List notifications (`?unread=true`) |
| `PATCH` | Mark read — `{ id }` or `{ all: true }` |

---

## Webhooks & workers (no user session)

### `POST /api/vapi/webhook`
Receives Vapi events. Verified via `x-vapi-secret` (or `x-vapi-signature` HMAC). Handles:
- `tool-calls` / `function-call` → executes voice tools, returns `{ results: [{ toolCallId, result }] }`.
- `status-update` → creates a missed call on no-answer end reasons.
- `end-of-call-report` → logs the call; updates missed-call recovery if `metadata.missed_call_id` is present.

Voice tools: `get_clinic_info`, `check_availability`, `book_appointment`,
`reschedule_appointment`, `cancel_appointment`, `transfer_to_human`.

### `GET|POST /api/cron/process-callbacks`
Missed-call recovery worker. Protected by `Authorization: Bearer $CRON_SECRET`. Processes due
callbacks (next attempt time reached, status pending/in-progress).

### `GET /api/google/connect` · `GET /api/google/callback`
Google Calendar OAuth (admin connects; callback stores the refresh token for the tenant).
