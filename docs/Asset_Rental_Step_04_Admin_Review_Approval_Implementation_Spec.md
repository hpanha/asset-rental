# Asset Rental Management — Step 04: Admin Reviews and Approves Rental Request

**Actor:** Rental Admin / authorized Rental Manager.  
**Input:** Submitted request `PENDING_APPROVAL` from Step 03.  
**Output:** `APPROVED_AWAITING_PAYMENT` with short-lived inventory hold **or** `REJECTED` / `CHANGE_REQUESTED` / `CANCELLED`.  
**Important:** Approval is not a completed booking and does not represent paid rental income.

## 1. Purpose

Allow the rental company to decide whether it can honor a customer's request based on inventory, schedule, identity/eligibility, policy, delivery capacity, asset condition and pricing. The admin's decision must be traceable, communicated to the renter, and safe under multiple concurrent requests for limited stock.

## 2. Admin Workflow

1. Admin opens `Rental Requests` → `Pending Approval` queue with counts and urgency.
2. Select request and inspect renter, requested listing/quantity, dates/timezone, location, terms accepted, quote, prior rental issues (only where authorized).
3. System refreshes real-time availability, maintenance blocks and existing holds/reservations.
4. Admin checks any verification requirement, contract restrictions, fulfillment staff/location schedule and risk flags.
5. Admin chooses:
   - **Approve** if business rules pass;
   - **Reject** with categorized reason;
   - **Request Changes** (dates/quantity/location) with new quote, subject to customer's acceptance;
   - **Escalate** to a senior admin if permission/exception approval is required.
6. On Approve, server obtains transaction-safe temporary hold for required inventory quantity and requested interval; set hold expiry (e.g., 30 minutes, configurable).
7. Server transitions request to `APPROVED_AWAITING_PAYMENT` and emits payment invitation with amount, currency, deadline, request number.
8. Renter proceeds to Step 05; admin sees approval timestamp, hold expiry and pending payment.
9. If payment deadline passes with no eligible payment, hold expires and request becomes `PAYMENT_EXPIRED`; an explicit reapproval/requote may be offered.

### Decision Matrix

| Condition | Action |
|---|---|
| Exact inventory, policy and schedule available | Approve + hold |
| No stock across requested interval | Reject / propose alternate dates |
| Invalid identity/eligibility | Reject or request verification, with privacy-safe reason |
| Price, dates, quantity changed | Change proposal + customer acceptance; never silently rewrite |
| Competing admin approves same last unit | Exactly one transaction obtains hold; other receives conflict |
| Customer cancelled while admin reviewing | Approval fails with state conflict |
| Manual override requested | Elevated permission, documented reason; no bypass of physical stock invariant |

## 3. UI Specification

### Screen A — Approval Queue

Filters: Pending, Needs Info, Approved/Awaiting Payment, Rejected, Expired; date range, category, pickup date, requester. Columns: Request No., Renter, Asset, Qty, Dates, Quote/Deposit, Age, Stock Availability, Status, Actions. Urgent pickups and conflicts clearly identified without false "guaranteed" stock.

### Screen B — Request Review Detail

- Header: request number, status chip, created timestamp, renter link.
- Left: asset/units requested, interval, pickup/return, address and notes.
- Right: pricing/deposit, customer eligibility, terms accepted, inventory check, conflict warnings.
- Bottom: timeline of every transition and review comment; `Approve`, `Reject`, `Request Changes`, `Back`.
- Reapproval/quote recalculation shown explicitly; confirmation modal summarizes exact next status and hold expiry.

### Modal C — Approve

Show requested assets, quantity, rental dates, payable amount, payment deadline and required stock hold. Button only enabled if latest server validation passes. UI cannot be the sole source of truth.

### Modal D — Reject / Changes

Require `reason_code` and short customer-friendly reason. For change proposal, select alternate dates, quantity or location; calculate a new price and require renter acceptance before payment. Redact sensitive internal fraud/risk notes.

## 4. Data Model

| Table | Fields |
|---|---|
| `rental_approval_decision` | `id, request_id, reviewer_id, decision, reason_code, public_reason, internal_notes, decided_at, request_version` |
| `rental_inventory_hold` | `id, request_id, listing_id, location_id, quantity, start_at, end_at, expires_at, status, created_by` |
| `rental_hold_unit` | `hold_id, asset_unit_id` if units assigned provisionally |
| `rental_change_proposal` | `id, request_id, proposed_item_snapshot, proposed_quote_snapshot, status, expires_at` |
| `rental_request_event` | Old/new status, actor, timestamp, explanation |
| `notification_outbox` | Approval, rejection, proposed change, expiry messages |

**Hold statuses:** `ACTIVE`, `CONSUMED`, `EXPIRED`, `RELEASED`. A hold is not an asset state. Only unexpired active holds reduce date-range stock; TTL expiry job and availability query must agree. Use UTC timestamps and server authoritative clock.

### Approval Atomicity

Within one transactional operation:

1. Lock/request-version-check the `PENDING_APPROVAL` request.
2. Lock eligible units or capacity representation consistently by listing/location/date.
3. Recompute overlapping commitments and select provisional units (or capacity reservation).
4. Create hold and decision record; update request status/version; write audit/outbox.
5. Commit all together; if any invariant fails, rollback and return a conflict. Do not approve in DB first and allocate hold later asynchronously.

For PostgreSQL serialized units, use transactional row locking; for quantity pools, serialize capacity checks per listing/location/interval with a suitable lock/advisory lock and transactional exclusion logic. Simply doing `SELECT COUNT(*)` then inserting hold without serialization is race-prone.

## 5. Business Rules

- Only authorized roles may approve/reject. Reviewers cannot change submitted customer consent details.
- Approval requires a valid current quote; if repriced, customer must accept change explicitly.
- Deadline is a **payment hold expiry** based on configuration; it must be visible to renter.
- Approval may create a provisional physical-unit assignment, but Step 06 owns **final allocation**.
- Reject must supply a reason; history retained. Do not soft-hide rejected records from admin audit.
- Change proposal must not become approved until customer accepts and stock/rate are rechecked.
- Only one final approval decision per active request revision. Repeated approve API must be idempotent.
- A renter cancellation or higher-priority stock conflict invalidates stale review screens.
- Existing paid reservations have precedence over new approval requests; cannot override casually.
- Expiration releases hold but does not erase the payment attempt/history; late payment is handled by Step 05 exception workflow.

## 6. API Contracts

```http
GET  /api/admin/rental-requests?status=PENDING_APPROVAL&page=
GET  /api/admin/rental-requests/{id}
POST /api/admin/rental-requests/{id}/availability-refresh
POST /api/admin/rental-requests/{id}/approve
POST /api/admin/rental-requests/{id}/reject
POST /api/admin/rental-requests/{id}/propose-changes
POST /api/me/rental-requests/{id}/accept-proposal
POST /api/me/rental-requests/{id}/decline-proposal
POST /internal/jobs/expire-rental-holds
```

Approval request body (illustrative):

```json
{
  "expected_version": 3,
  "approval_note": "ID and pickup schedule verified.",
  "hold_minutes": 30,
  "idempotency_key": "approve-REQ-000123-v3"
}
```

Server decides effective TTL under policy; do not permit arbitrary user-supplied hold durations or unauthorized overrides. Responses include request status, hold reference, `payment_due_at`, computed commercial snapshot, new row version.

## 7. Notifications and Audit

**To renter:** approved and pay-by date; rejection reason; change proposal and accept/decline action; payment-window expiration.  
**To admin:** pending queue notifications, approval conflict, stale/expired holds, elevated-review request.  
Use durable outbox retries; avoid sending duplicate messages when retrying approval. Log who decided, what quote/version they saw, stock check evidence and reason code.

## 8. Edge Cases

1. Renter selects a unit available at browse but booked elsewhere before approval → reject/alternate offer.
2. Two admins click approve simultaneously → one successful operation; other gets updated state.
3. Last unit is `MAINTENANCE` by review time → approval blocked.
4. Approval succeeds but message provider is down → state/hold remain, outbox retries.
5. Payment deadline passes during gateway processing → hold expiry/late settlement compensation defined with Step 05/06.
6. Admin approves an old request version → HTTP 409 and refreshed review.
7. Renter declines change proposal → request rejected/cancelled according to policy; no pay invitation.
8. Held inventory is changed by asset admin → deny incompatible maintenance/retirement without deliberate resolution.

## 9. UAT Matrix

| ID | Test | Expected |
|---|---|---|
| A01 | Approve valid pending request | Hold + awaiting-payment status together |
| A02 | Reject with reason | Rejected, reason visible to renter |
| A03 | Reject without reason | Validation error |
| A04 | Two approvals of last unit | At most one active hold |
| A05 | Approve stale request version | Conflict, no new hold |
| A06 | Renter cancelled during review | Cannot approve |
| A07 | Maintenance overlaps requested dates | Approval blocked |
| A08 | Payment deadline expires | Hold released, request expired |
| A09 | Duplicate approval retry | Original result returned |
| A10 | Unauthorized staff approves | Access denied |
| A11 | Requote/change proposal | Renter consent before payable state |
| A12 | Customer declines proposal | No active hold or payment invite |
| A13 | Notification failure | Approval remains; retry queued |
| A14 | Audit history | Actor, decision, reason, quote version recorded |
| A15 | Different timezone display | Same UTC instant, correct local deadline |
| A16 | Reserved asset conflicts with approval | Existing reservation protected |

## 10. Definition of Done

- [ ] Approval queue, detail view and decision modals functional.
- [ ] Request state transitions authorized and version-checked.
- [ ] Short-lived holds created atomically with approval and released on expiry/cancellation.
- [ ] Stock conflicts cannot double-approve limited inventory.
- [ ] Rejections and change proposals handled and visible to renter.
- [ ] Audit and notification outbox deliver reliable history.
- [ ] Tests A01–A16 pass.

**Handoff Step 05:** approved request, valid quote, payable amount/currency and a still-active hold with expiration. Payment is an independent transaction; do not treat admin approval as money received.
