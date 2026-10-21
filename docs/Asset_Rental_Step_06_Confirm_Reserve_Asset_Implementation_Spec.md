# Asset Rental Management — Step 06: Confirm Booking and Reserve the Asset

**Actor:** Backend reservation service (automatic); Admin (exception/reallocation oversight).  
**Input:** Request approved in Step 04, verified payment from Step 05, and matching unexpired inventory hold.  
**Output:** Booking reference, **committed reservation** and assigned physical unit(s) or reserved pool capacity, with renter confirmation and handover preparation task.  
**Boundary:** Reserved means committed for a future handover; not yet `ACTIVE/RENTED`.

## 1. Objective

Convert a paid approved request into an unambiguous, reliable inventory commitment. This step must prevent **double-booking** under concurrency, link payment to reserved stock, assign real inventory and recover safely when external financial events arrive late or out of order.

### Required Invariants

1. Each confirmed booking has a valid eligible request and payment, unless an explicitly approved pay-on-pickup policy exists.
2. One serialized unit cannot be committed to overlapping buffered rental periods.
3. Quantity pools cannot commit more units than minimum free capacity across the interval.
4. Active hold can be consumed **at most once**; a request can produce **at most one active confirmed booking** for the same revision.
5. Final reservation must be a transactionally durable operation, not a UI flag change.

## 2. Reservation Workflow

1. Receive verified `PAYMENT_CONFIRMED` event from Step 05 or trusted internal trigger.
2. Load request, payment order and active hold with lock/version check.
3. Validate request/hold intervals, quantity, location, company, currency and commercial snapshot match payment.
4. Check hold hasn't expired and no conflicting unit retirement/maintenance or new commitments exist.
5. If serialized, finalize provisional unit IDs or allocate deterministic eligible units under database lock.
6. If quantity pool, atomically transfer held quantity into committed reservation quantity for requested interval.
7. Create reservation and line allocations; change hold `ACTIVE → CONSUMED` and request `PAYMENT_CONFIRMED → RESERVED` atomically; record event/audit/outbox.
8. Issue unique booking reference and **reservation confirmation**, not a handover receipt.
9. Generate fulfillment/pickup task with required items, serials, location and planned window.
10. Notify renter (booking number, dates/location, pickup instructions) and admin/warehouse staff.

### Exception Branches

| Problem | Required response |
|---|---|
| Hold expired before capture confirmation | Recheck stock/offer new hold or refund; no forced overbooking |
| Payment not verified | Deny reservation; remain unpaid/processing |
| Unit became unavailable | Safe reallocation if equivalent and valid; otherwise exception |
| Duplicate paid event | Return existing booking; do not allocate twice |
| Partial payment when full payment required | Deny reservation; follow finance policy |
| Fulfillment location closed | Block confirmation or route authorized alternative with renter consent |
| Notification fails | Booking stays valid; outbox retries |

## 3. Admin and Renter UI

### Admin — Confirmed Reservations

List upcoming reserved orders: booking number, renter, asset, allocated units, quantity, pickup date/time, location, payment status, fulfillment readiness. Filters for `RESERVED`, `PICKUP_TODAY`, `READY_FOR_HANDOVER`, `EXCEPTION`, `CANCELLED`. Calendar view visualizes inventory occupancy; overlapping reservations never shown for same serialized unit.

### Admin — Reservation Detail

- Request and quote history, verified payment reference (non-sensitive), quantity/assigned unit tags.
- Allocation view and current eligibility/maintenance flags.
- Pickup task owner, scheduled location, special handling instructions.
- `Print Reservation Slip`, `Mark Ready`, `Propose Reassignment` (permission-controlled), `Open Exception`.
- Audit timeline; cannot silently switch units or dates if it changes rental agreement/availability.

### Renter — Booking Confirmation

- Green **Booking Confirmed / Reserved** status, booking number, full interval/timezone.
- Asset name, quantity, pickup address/map, collection instructions, contact number.
- Payment confirmation link/receipt, expected handover requirements, rental terms.
- `My Rentals` view shows upcoming booking. No active-use timer until Step 07 handover.

## 4. Data Model

| Table | Fields |
|---|---|
| `rental_reservation` | `id, booking_no, request_id UNIQUE, renter_id, status, start_at, end_at, location_id, confirmed_at, version` |
| `rental_reservation_line` | `reservation_id, listing_id, quantity, rate_snapshot_id, fulfillment_mode` |
| `rental_unit_allocation` | `id, reservation_line_id, asset_unit_id, start_at, end_at, allocation_status, assigned_at` |
| `rental_pool_allocation` | `id, reservation_line_id, stock_pool_id, quantity, start_at, end_at` |
| `rental_inventory_hold` | Existing Step 04 hold, now `CONSUMED` |
| `rental_fulfillment_task` | `id, reservation_id, pickup_at, location_id, assigned_staff_id, status` |
| `reservation_event` | Actor, old/new status, allocation evidence, timestamp |
| `notification_outbox` | Booking confirmation and warehouse notice |

**Current inventory availability** must query committed allocations, active holds and maintenance blocks across the selected interval. A physical unit's base status is not sufficient to determine time-based availability. Create an indexed overlap query. Enforce no-double-booking with transactional locks/exclusion strategies appropriate to the database, including timezone/buffer normalization.

## 5. Reservation Transaction Design

Pseudo-sequence:

```text
BEGIN TRANSACTION
  Lock request and hold; verify state/version and payment verified
  Lock eligible physical unit(s) or pool capacity ledger
  Check time-overlap commitments and maintenance blocks again
  Insert reservation + allocation rows
  Consume hold
  Transition request to RESERVED
  Insert audit + reliable outbox event
COMMIT

After commit:
  Publish notification / prepare warehouse task asynchronously
```

Do not publish an external event claiming confirmation before commit. Retry the whole transition with idempotency keyed to request/revision; return existing reservation when already committed. For a paid-but-unfulfillable request, create a **reconciliation exception** and arrange reapproval/reallocation or refund; never make stock negative.

## 6. Status, Timing and Cancellation

| Object | Before | After |
|---|---|---|
| Request | `PAYMENT_CONFIRMED` | `RESERVED` |
| Hold | `ACTIVE` | `CONSUMED` |
| Reservation | Not yet | `RESERVED` |
| Fulfillment task | Not yet | `SCHEDULED` |
| Unit physical state | `ACTIVE` base status | Still physically in warehouse; future interval committed |

Later transitions: `RESERVED → READY_FOR_HANDOVER → ACTIVE` in Step 07, `ACTIVE → RETURN_PENDING` in Step 09, `→ COMPLETED` in Step 11. A paid reservation cancelled before pickup requires explicit finance refund/deposit policy, inventory release, and audit; never delete reservation or silently undo payment.

## 7. Proposed APIs

```http
POST /internal/rental-reservations/finalize-payment/{paymentOrderId}
GET  /api/admin/reservations?status=&pickupDate=&page=
GET  /api/admin/reservations/{id}
GET  /api/me/reservations/{id}
POST /api/admin/reservations/{id}/mark-ready
POST /api/admin/reservations/{id}/propose-reallocation
POST /internal/rental-reservations/reconcile-unfulfilled
```

Step 06 finalization must be a trusted internal action / authenticated backend job, never a renter-callable endpoint saying “mark me paid and reserve.” `mark-ready` cannot issue a physical handover by itself.

## 8. Operational Rules

- Prefer assigning serialized units at reservation if exact condition/location matters; if operationally assigned at pickup, still reserve enough generic capacity without double use and lock exact unit at Step 07.
- Verify accessory bundles/kit completeness or raise warehouse task for preparation.
- Confirm pickup location calendar and adequate preparation time.
- If a unit breaks before handover, support equivalent substitution only if agreed; else reschedule/cancel with controlled financial remedy.
- Prevent normal asset edit/retirement actions from invalidating already allocated reservations.
- Generate QR/reference for booking lookup, not a token that grants unauthorized access.
- Use company-scoped unique booking numbers, exact currency and UTC timestamps.
- Do not conflate “paid,” “reserved,” “ready to collect,” and “collected.”

## 9. UAT Test Matrix

| ID | Scenario | Expected |
|---|---|---|
| C01 | Paid request with valid hold | Exactly one reserved booking |
| C02 | Duplicate finalization callback | Same booking, one allocation |
| C03 | Two requests race for final unit | Max one reservation per interval |
| C04 | Hold expired before paid confirmation | No blind reservation; exception |
| C05 | Wrong payment/request mapping | Rejected; audit incident |
| C06 | Underpaid attempt | No reservation unless policy permits |
| C07 | Quantity pool at limit | No negative/overcommitted capacity |
| C08 | Maintained unit provisionally assigned | Reallocation or failure, no conflict |
| C09 | Database transaction fails mid-way | No partial reservation or consumed hold |
| C10 | Notification send fails | Reservation persists; queued retry |
| C11 | Assigned unit already booked elsewhere | Block conflict |
| C12 | Admin marks ready | Fulfillment status only |
| C13 | Renter booking detail | Sees own booking; no confidential unit data |
| C14 | Renter attempts internal reserve endpoint | Unauthorized |
| C15 | Booking cancelled by valid policy | Allocations released and finance initiated |
| C16 | Scheduled pickup crosses timezone | Correct local display and UTC storage |
| C17 | Change rate after reservation | Agreed price remains snapshot |
| C18 | Late payment exception | Compensation without hidden overbooking |
| C19 | Historical booking audit | Actor/time/request/payment linkage present |
| C20 | QR code lookup | Does not expose renter details without authorization |

## 10. Definition of Done

- [ ] Trusted paid-event finalization exists and is idempotent.
- [ ] Atomic hold consumption, booking creation and stock allocation.
- [ ] Physical/quantity inventory never double-committed.
- [ ] Reservation confirmation and admin fulfillment views built.
- [ ] Paid-but-unfulfilled exceptions have safe reconciliation/refund flow.
- [ ] Ready-for-handover tasks and notifications generated reliably.
- [ ] C01–C20 pass.

**Handoff to Step 07:** a valid reserved order, allocated equipment, planned pickup/return schedule, associated payment and fulfillment task. Step 07 confirms the **actual physical custody transfer**.

## Reference

- [Odoo 19 — Rental orders](https://www.odoo.com/documentation/19.0/applications/sales/rental/rental_orders/create_rental_order.html) for scheduling and confirmed rental orders; the concurrency/hold model above is a proposed implementation design.
