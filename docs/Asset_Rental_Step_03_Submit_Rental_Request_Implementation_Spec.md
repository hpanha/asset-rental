# Asset Rental Management — Step 03: Submit a Rental Request

**Actor:** Renter/customer.  
**Trigger:** Customer clicks **Request Rental** on a published asset selected in Step 02.  
**Input:** Listing, rental dates/times, quantity, pickup/delivery choice and server quote reference.  
**Output:** Durable request in `PENDING_APPROVAL` with immutable request/quote snapshot and customer confirmation.  
**Not yet:** Approved, charged, or reserved.

## 1. Business Outcome

Create a trustworthy record of **who** wants to rent **what**, **how many**, **when**, **where**, and under **which estimated commercial terms**. The renter may save a draft or submit once; Step 04 decides whether the company accepts. A submitted request is **not a guaranteed booking**.

## 2. Detailed User Flow

1. Load selection from Step 02; require login (or complete account registration/verification).
2. Verify account is active and eligible; direct suspended accounts to support instead of allowing submission.
3. Review listing and selected rental dates/time, timezone, quantity, rates, pickup and return location.
4. Enter/confirm contact information, renter or organization name, phone/email, and optional notes/purpose.
5. For delivery, capture address and contact instructions; validate coverage if delivery is supported.
6. Display pricing breakdown, deposit, estimated taxes/fees, return and cancellation rules.
7. Recheck availability/rate snapshot on the server; if stale, show what changed and require explicit reconfirmation.
8. Present required terms acknowledgment and privacy notice; do not precheck consent.
9. Renter clicks **Submit Rental Request**. Button is disabled during submission; send a unique idempotency key.
10. In one database transaction, validate the final request, save customer/selection/quote snapshot, generate request number, set `PENDING_APPROVAL`, create audit/outbox notification.
11. Show Request Submitted page: number, status, submitted time, estimated total, admin review expectations, and My Requests link.

### Branches

- **No stock / expired quote:** Do not submit; show revised availability/price and return to Step 02.
- **Missing documents or data:** Mark form invalid and focus the field; do not create partially submitted order.
- **Network timeout:** Renter may retry with same idempotency key; response returns original request instead of duplicate.
- **Cancellation before approval:** Renter may withdraw; preserve history and notify admin.
- **Account/terms not eligible:** Block with reason and suggested support action.

## 3. User Interface

### Screen A — Rental Request Form

Recommended vertical wizard/sections:

| Section | Elements | Notes |
|---|---|---|
| 1. Asset summary | Photo, code/name, quantity | Read-only selection with Edit link |
| 2. Rental schedule | Start/end, duration, timezone | Revalidate dates and buffer rules |
| 3. Fulfillment | Pickup/return location or delivery address | Dependent fields |
| 4. Renter details | Account, legal/contact name, verified phone/email | Reuse known data, minimize PII |
| 5. Optional details | Purpose, special handling notes | Length limits; internal notes separate |
| 6. Quote summary | Rental, tax, delivery, deposit, total | State "Estimate—pending approval" |
| 7. Agreements | Terms/privacy links and checkbox | Record version and timestamp |
| Actions | Back, Save Draft (optional), Submit Request | Double-submit protection |

On mobile: sticky cost/action footer, no hidden totals; clear completion markers.

### Screen B — Submission Success

Display `REQ-YYYY-000001`, `Pending Approval`, requested dates and delivery/pickup, estimated quote, next action, timeline link, and Cancel Request if policy allows. Do **not** display Approved or Reserved.

### Screen C — My Requests

List request ID, asset, period, quote, submitted date, status, and actions. Pending requests permit cancel; rejected requests show admin reason; approved requests link to payment in Step 05.

## 4. Required Request Data

| Field | Required | Validation / storage rule |
|---|:---:|---|
| `request_id`, `request_no` | Generated | Unique human-readable code |
| `renter_id` | Yes | Authenticated owner, never client-overridden |
| `listing_id` | Yes | Published/rentable at submission |
| `company_id` | Derived | From listing, no cross-company leakage |
| `quantity` | Yes | Positive integer, within listing rules |
| `start_at`, `end_at`, `timezone` | Yes | Valid full interval; UTC storage |
| `pickup_location_id`, `return_location_id` | If pickup | Must be permitted for listing |
| `delivery_address_id/snapshot` | If delivery | Valid and permitted delivery area |
| `contact_name`, `contact_phone`, `contact_email` | Yes | Format and verification rules |
| `customer_notes` | Optional | Sanitized, bounded text |
| `quote_version_id` / `quote_snapshot` | Yes | Immutable rate, tax and deposit breakdown |
| `terms_version_id`, `terms_accepted_at` | Yes | Proof of accepted policy |
| `status` | Yes | `DRAFT` or `PENDING_APPROVAL` |
| `submitted_at`, `created_at` | Auto | Server clock |
| `idempotency_key`, `revision` | Yes | Safe retries and concurrency |

Collect identity documents **only if necessary**, with a separate secure storage/retention policy. Do not store payment card numbers here.

## 5. Request and Quote State

Step 03 owns: `DRAFT → PENDING_APPROVAL` and optionally `DRAFT → ABANDONED`, `PENDING_APPROVAL → CANCELLED_BY_RENTER` (if no admin decision yet).

Later transitions are owned by subsequent stages: Step 04 `APPROVED_AWAITING_PAYMENT` or `REJECTED`; Step 05 payment attempts; Step 06 `RESERVED`; Steps 07–11 active/return/completed. **Payment state, inventory hold state, and request state are distinct.**

## 6. Database Design

| Table | Fields / responsibility |
|---|---|
| `renter_profile` | `user_id, display_name, contact, eligibility_status` |
| `rental_request` | `id, request_no, renter_id, company_id, status, submitted_at, version, quote_snapshot_id` |
| `rental_request_item` | `request_id, listing_id, quantity, unit, start_at, end_at, fulfillment` |
| `rental_request_address` | Address snapshot for delivery/return |
| `rental_quote_snapshot` | Unit rate, rate version, duration, subtotal, taxes, fees, deposit, currency, total, captured timestamp |
| `rental_terms_acceptance` | `request_id, terms_version_id, accepted_at, actor_id` |
| `rental_request_event` | Actor, transition, reason, timestamp |
| `request_submission_key` | Unique `(renter_id, idempotency_key)` and original response/reference |
| `notification_outbox` | Durable event for admin/customer notification |

Request rows should reference immutable commercial snapshots so price edits to Step 01 don't rewrite earlier quotes. Persist server-side currency minor units or fixed-precision decimal; enforce consistency of currency across line items and fees.

### Example Submit Payload

```json
{
  "listing_id": "asset_001",
  "start_at": "2026-10-21T09:00:00+07:00",
  "end_at": "2026-10-23T09:00:00+07:00",
  "quantity": 1,
  "fulfillment": "PICKUP",
  "pickup_location_id": "loc_pp_01",
  "return_location_id": "loc_pp_01",
  "quote_reference": "quote_abc",
  "contact_phone": "+85512345678",
  "terms_version_id": "rental-terms-v1",
  "terms_accepted": true,
  "customer_notes": "Need a charger."
}
```

**Do not submit a client-provided total as the payable amount.** Server resolves quote and verifies all pricing inputs.

## 7. Proposed APIs

```http
GET    /api/me/rental-requests
POST   /api/me/rental-request-drafts
PATCH  /api/me/rental-request-drafts/{id}
POST   /api/me/rental-requests
GET    /api/me/rental-requests/{id}
POST   /api/me/rental-requests/{id}/cancel
GET    /api/me/rental-requests/{id}/timeline
```

Require authentication, object ownership, CSRF protection where cookie sessions are used, idempotency on submit, optimistic version checks on edits, and structured validation errors (`field`, `code`, `message`).

## 8. Core Business Rules / Edge Cases

- Validate request dates and quantity again **on submit**; preview is not a hold.
- Same customer clicking twice must create **exactly one** request per idempotency key.
- A renter may make multiple legitimate requests; do not globally reject all same-asset requests without business reason.
- Every revision to an already-submitted request requires a controlled change flow and renewed price/stock checks, not an in-place silent edit.
- Admin cannot reject a request by deleting it; preserve event and reason.
- Cancellation rule and permission depend on lifecycle status; do not allow unilateral cancellation after handover.
- Email/notification failure must not roll back an otherwise committed request; retry via outbox.
- The request must never promise an inventory unit before Step 04 hold and Step 06 reservation.
- Sensitive contact data stays private and access-controlled; redact logs/analytics.
- Support an expired quote with fresh quote/reconfirmation, not silently charge a new amount.

## 9. UAT Tests

| ID | Scenario | Expected |
|---|---|---|
| R01 | Guest clicks request | Auth required, selection preserved |
| R02 | Valid signed-in user submits | One `PENDING_APPROVAL` request |
| R03 | Duplicate click / network retry | Same request ID returned |
| R04 | Invalid time or end before start | Field error, no submission |
| R05 | Availability lost before submit | Clear conflict, no request or explicitly non-guaranteed waitlist policy |
| R06 | Changed rate after quote | Requote and renter reconfirmation |
| R07 | Customer enters private total | Ignored; server recomputes |
| R08 | Required terms not accepted | Submission blocked |
| R09 | Delivery outside supported zone | Specific rejection |
| R10 | Pickup option not supported | Validation failure |
| R11 | Account suspended | Cannot submit |
| R12 | User tries reading another request ID | 403/404 safe response |
| R13 | Notification provider offline | Request persists; notification retries |
| R14 | Cancel pending request | Cancel status, audit and admin notification |
| R15 | Price edited after submission | Snapshot unchanged |
| R16 | Mobile checkout, normal zoom | Every action and total visible |
| R17 | Unicode customer name or notes | Stored safely; no HTML execution |
| R18 | Refresh success page | No duplicate request |
| R19 | Request list pagination/filter | Own requests only |
| R20 | Audit event | Submitted actor/time and consent version recorded |

## 10. Definition of Done

- [ ] Request form + success + My Requests screens implemented.
- [ ] Authentication and renter ownership enforced.
- [ ] Server revalidates all availability, price, dates and fulfillment inputs.
- [ ] Request ID, quote snapshot and terms acceptance stored durably.
- [ ] Repeated submit is idempotent; cannot double-create under retry.
- [ ] Status begins at `PENDING_APPROVAL`, never `RESERVED`.
- [ ] Admin review event delivered reliably (outbox/retry).
- [ ] UAT R01–R20 pass.

**Handoff to Step 04:** a full request record with renter identity, requested stock/time/location, commercial snapshot, submission timestamp and eligibility data. Admin approval will be an auditable decision, not an edit to the original quote.

## Reference

- [Odoo 19 — Create a rental order](https://www.odoo.com/documentation/19.0/applications/sales/rental/rental_orders/create_rental_order.html) (external reference for order/quotation lifecycle; this project adds a required manual approval step).
