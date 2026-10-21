# Asset Rental Management — Step 08: Active Rental Monitoring and Extensions

**Actor:** Renter (uses asset, views due time, reports issues and requests extensions); Admin (monitors, approves extension, supports customer); System (time-based reminders and overdue detection).  
**Input:** `ACTIVE` rental with actual handover evidence from Step 07.  
**Output:** Rental remains controlled through usage period; extension amendments and reminders are tracked; asset is ready for Step 09 return.

## 1. Objective

Make active rentals visible, accountable and manageable without disrupting future reservations. Primary capabilities: countdown/due-date display, reminders, authorized rental extensions, damage/incident reporting, customer support, late tracking and admin dashboards.

**Physical custody remains with renter** during this step. Admin cannot mark an item returned simply because the due date passed.

## 2. Active Rental Workflow

1. Handover from Step 07 creates `ACTIVE` rental and actual custodian record.
2. Renter opens `My Rentals` → `Active`; sees equipment, photos/checklist link, due time, contact, return location and payment/deposit information.
3. System schedules reminder notifications based on configured policy (e.g., 24 hours and 2 hours before due date) without hardcoding these examples.
4. Renter may report an issue, damage or loss, attaching description/photos; admin triages urgently when safety-related.
5. Renter may submit extension request for new end date/time; system previews additional quote and availability.
6. Admin approves/rejects extension according to policy and future commitments; renter accepts new charges/terms and pays incremental amount if required.
7. Once approved and financial conditions satisfied, system atomically extends the reservation interval and updates billing snapshot and due date.
8. When current time passes due time, system derives `OVERDUE` status/flag and notifies both parties; applies late fee only under configured policy and eventually confirmed settlement.
9. On return arrangement or customer request, proceed to Step 09; keep original due date and amendments for audit.

## 3. UI Specification

### Renter: My Active Rentals

List active rentals with photos, booking ID, start/due date, time remaining, location, payment summary. Quick actions `View Details`, `Request Extension`, `Report Problem`, `Start Return`. Overdue badge must show elapsed time but should not automatically claim exact fees until rules are applied and posted.

### Renter: Extension Modal

- Existing due date and proposed new due date/time.
- Server result: available/unavailable and reason (e.g., next booking conflict).
- Itemized extra amount, taxes/deposit adjustments and updated terms.
- Confirm extension request; distinguish **Requested**, **Approved—Awaiting Payment**, **Confirmed**, **Rejected**, **Expired**.
- Warn that an extension is not effective until approved and any required payment has been verified.

### Renter: Report Issue

Issue category: malfunction, safety concern, accidental damage, missing accessory, lost/stolen, other. Text/photos, contact preferences and immediate safety instructions where needed. Never encourage use of unsafe equipment.

### Admin: Active Rental Dashboard

Cards: Active, Due Today, Due Soon, Overdue, Extensions Pending, Incidents Open. List by booking, renter, actual assets/serial, due, days active, location, contact, outstanding amounts, issue status. Calendar of future occupancy and exception reports.

## 4. Data Model

| Table | Key fields |
|---|---|
| `rental_contract` or `rental_reservation` | `id, active_at, current_due_at, original_due_at, status, version` |
| `rental_extension_request` | `id, rental_id, requested_end_at, state, quote_snapshot_id, requested_by, requested_at, decision_actor, decision_at, expires_at` |
| `rental_amendment` | Immutable old/new dates, amended pricing, deposit changes, approval/acceptance evidence |
| `rental_incident` | `id, rental_id, unit_id, category, description, evidence_ids, severity, status, reported_at, resolved_at` |
| `rental_reminder_schedule` | `rental_id, rule_id, due_at, sent_at, status, unique_key` |
| `rental_late_event` | Due timestamp, overdue observed, policy version, billed/unbilled note |
| `rental_event` | All changes, actors and reason |
| `financial_adjustment` | Additional charge or deposit change references Step 05 ledger |

Status can be modeled with **one main lifecycle** `ACTIVE` and derived flags (`OVERDUE`, `ISSUE_OPEN`, `EXTENSION_PENDING`). Avoid making `OVERDUE` a conflicting terminal lifecycle status; a rental remains active and in customer custody while late.

## 5. Extension Policy

Before approving extension:

1. Check rental is active, not in return/inspection process, and requester is authorized.
2. Proposed due time must be later than current due and within configured maximum duration.
3. Recheck no overlap with another company's reserved rental, active hold or maintenance block for every allocated unit.
4. Confirm future pickup preparation/turnaround buffers remain valid.
5. Compute prorated or extra rate from the contract's documented pricing rules; capture customer agreement to new price.
6. Secure extra payment or approved credit terms if required.
7. Atomically extend allocation intervals and contract due time with version lock; create immutable amendment and event.

If payment succeeds but the extension can't be committed, follow a compensation/refund exception path. **Do not extend only the contract's display date while leaving inventory allocations unchanged.**

## 6. Reminders, Incident and Overdue Rules

- Use scheduled jobs and outbox notifications with unique `(rental_id, reminder_rule, due_at)` key to avoid duplicates.
- Job time based on UTC instants but display customer location timezone.
- Reminder cadence is configured by admin and respects notification preferences where permissible.
- Overdue begins after `current_due_at` (or separate configured grace policy for financial fines); it does not prove an item was not returned if admin receipt was delayed. Step 09 actual receipt time is authoritative for fees.
- Customer reports issue → ticket with priority and evidence; admin may arrange replacement, maintenance after return, or specific remedy.
- Critical loss/damage flags require controlled review; no speculative automatic deposit forfeiture.
- Keep original due date, extension timeline, payment confirmations, message delivery log and identity of approver.

## 7. API Endpoints

```http
GET  /api/me/rentals?status=ACTIVE
GET  /api/me/rentals/{id}
POST /api/me/rentals/{id}/extensions/quote
POST /api/me/rentals/{id}/extensions
GET  /api/me/rentals/{id}/extensions
POST /api/me/rentals/{id}/incidents
GET  /api/admin/active-rentals?due=&overdue=&locationId=
POST /api/admin/extensions/{id}/approve
POST /api/admin/extensions/{id}/reject
POST /internal/jobs/send-rental-reminders
POST /internal/jobs/reconcile-rental-overdue
```

For approved extensions requiring payment, send to a dedicated finance adjustment flow, then finalize inventory dates only after verification. Use idempotency, permission checks and expected rental version for all mutations.

## 8. Security, Operational and Edge Cases

- Only renter/authorized admin sees rental detail and incident photos.
- Existing future reservation **always blocks** an incompatible extension unless all affected bookings are explicitly reconciled.
- Two extension requests at once cannot both update due date; serialize against contract and allocation.
- Availability results can change between quote and approval; recompute under lock at finalization.
- A maintenance incident may require urgent staff contact, physical substitution, and later replacement record—do not just set asset `AVAILABLE`.
- If renter is unreachable, record reminders/contacts without exposing their information to other renters.
- If due date passes during an extension request, rental still becomes overdue until extension is finalized (or documented grace policy covers it).
- Support staff may add internal notes but not alter immutable handover evidence.
- Notification failure is retried; admin view remains correct.

## 9. UAT Tests

| ID | Scenario | Expected |
|---|---|---|
| M01 | Handover activates rental | Appears in renter/admin Active list |
| M02 | Due soon job runs | One reminder per rule/trigger |
| M03 | Job retries | No duplicate notification |
| M04 | Future booking conflicts with extension | Extension cannot be confirmed |
| M05 | Valid extension, payment settled | Due date and allocations update together |
| M06 | Approved but extra payment fails | Original due date unchanged |
| M07 | Two concurrent extension confirmations | At most one applied per version |
| M08 | Time crosses due date | Overdue correctly derived |
| M09 | Grace period | Fee follows configured policy |
| M10 | Customer reports malfunction | Incident ticket + evidence |
| M11 | Customer reports safety issue | Priority escalation and safety advice |
| M12 | Admin rejects extension | Renter receives reason, due unchanged |
| M13 | Incident photo unauthorized access | Blocked |
| M14 | Extension quote changed | Renter reconfirms difference |
| M15 | Delayed notification provider | Outbox retry |
| M16 | Server and user timezone differ | Same instant, correct local due |
| M17 | Rental enters return process | New extension blocked unless reversed under policy |
| M18 | Rate/deposit changes after handover | Agreed pricing snapshot preserved |
| M19 | Lost unit reported | Incident state, no free inventory |
| M20 | Full audit | Original due and all amendments retained |

## 10. Definition of Done

- [ ] Renter My Active Rentals view with due dates and actions.
- [ ] Admin dashboard for due, overdue, incidents and extension queue.
- [ ] Extension requests validated against full future occupancy and pricing.
- [ ] Paid extension finalized transactionally with allocation updates.
- [ ] Reminder jobs are deduplicated, timezone-safe and auditable.
- [ ] Incident reporting and permission controls tested.
- [ ] M01–M20 pass.

**Handoff Step 09:** active rental with current effective due date, original/amended contracts, unit custody, condition baseline, any incidents and outstanding billing flags.

## Reference

- [Odoo 19 rental order dashboard](https://www.odoo.com/documentation/19.0/applications/sales/rental/rental_orders/rental_order_dashboard.html) for upcoming pickup/return and overdue operational visibility.
