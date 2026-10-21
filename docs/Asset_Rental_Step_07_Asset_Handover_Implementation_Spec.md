# Asset Rental Management — Step 07: Asset Handover and Renter Acknowledgment

**Actor:** Rental Admin/Warehouse Staff plus Renter; optional Delivery Agent.  
**Input:** Paid/confirmed reservation `RESERVED` or `READY_FOR_HANDOVER`, allocated physical asset(s), pickup appointment.  
**Output:** Documented custody transfer, signed/acknowledged checklist, `ACTIVE` rental and handover receipt.  
**Core rule:** Booking reservation is not proof that the renter has physically received the asset.

## 1. Objective

Transfer the **right physical unit**, in a recorded condition with all agreed accessories, to the **right authorized renter** at the proper time and location. Preserve evidence so both parties can agree on preexisting damage when the item returns.

## 2. Handover Workflow

1. Admin opens Today's Handovers queue, filters by location/date and finds booking or scans booking QR/reference.
2. Verify reservation is valid, not cancelled/expired and all company-required payment/contract conditions are satisfied.
3. Check renter identity/authorized representative per company policy; avoid retaining unnecessary identity document copies.
4. Retrieve allocated unit(s) from inventory; scan asset tags/serial numbers and confirm they match assigned booking.
5. Inspect each unit for working condition; run a short function test if appropriate (boot laptop, projector power-on, etc.).
6. Check all accessories against predefined kit list and physically count items.
7. Take timestamped photos of each unit's condition and record visible scratches, cracks and existing issues.
8. Show renter item list, condition, optional liability, rental dates/due time, pickup and return rules.
9. Renter signs/acknowledges handover digitally or via documented paper receipt; admin countersigns if required.
10. In one controlled operation, mark handover completed, allocate custody to renter, set rental `ACTIVE`, register actual handover time/location/staff and issue receipt.
11. Notify renter and display My Active Rentals with return due date and support/report issue actions.

### Handover Branches

| Problem | Required action |
|---|---|
| Renter no-show | Mark `NO_SHOW_PENDING` after policy cutoff, escalate/cancel according to approved terms |
| Wrong serial/unit scanned | Stop; authorized substitution must update allocation with audit |
| Unit damaged before pickup | Record, replace/repair or reschedule with consent; never hand out undisclosed damage |
| Missing accessory | Correct kit or record authorized shortage/price adjustment with renter acknowledgment |
| Customer refuses condition/signature | Do not activate rental; resolve/dispute/cancel per policy |
| Offline at warehouse | Keep local pending draft if needed; do not claim finalized until server sync confirms safely |
| Delivery | Proof of delivery, receiving person, address, timestamp and acknowledgment |

## 3. Screen Requirements

### Admin: Handover Queue

Cards/table: Booking No., Renter, Pickup Slot, Location, Unit Count, Payment, Preparation, Status, Assigned Staff. Filters `TODAY`, `UPCOMING`, `READY`, `OVERDUE_PICKUP`, `NO_SHOW`. Actions: Open Checklist, Assign Staff, Mark Ready, Contact Customer.

### Admin: Handover Checklist

1. Booking and renter verification panel.
2. List of each unit: asset tag, serial, condition, action to Scan/Confirm.
3. Accessories checkboxes, quantity, missing/damaged notes.
4. Condition checklist: exterior, functionality, safety, clean/dirty, existing damage.
5. Photo capture/upload with thumbnails, timestamps and optional annotations.
6. Start/due time, return location, payment/terms summary.
7. Renter acknowledgment, signature/checkbox and handover staff approval.
8. **Complete Handover** action enabled only when every mandatory check passes.

### Renter: Pickup Receipt

Shows booking ID, unit display descriptions (limited serial disclosure if necessary), handover date/time, acknowledged condition/photos or link, included accessories, return due date, contacts and complaint/report issue action. PDF download is optional but recommended.

## 4. Data Model

| Table | Key fields |
|---|---|
| `rental_handover` | `id, reservation_id UNIQUE, location_id, handover_at, staff_id, receiver_user_id, status, signature_ref, notes` |
| `rental_handover_item` | `handover_id, allocated_unit_id, scanned_tag, condition_grade, function_test, accepted` |
| `rental_handover_accessory` | `handover_item_id, accessory_name, expected_qty, actual_qty, condition, note` |
| `rental_condition_evidence` | `id, rental_id, unit_id, evidence_stage=OUT, media_key, captured_at, uploaded_by` |
| `rental_acknowledgement` | `handover_id, terms_version, signer_name, consent_method, signed_at, device_context` |
| `rental_custody_event` | Unit, from-location/custodian, to-renter, actual timestamp, actor |
| `rental_handover_receipt` | Booking, signed record/QR, generated file reference |
| `rental_event` | `RESERVED/READY → ACTIVE` transition and reason |

Signatures and photos may be sensitive personal data: access-control them, define retention/deletion policy, and store evidence with immutable references/checksums when feasible. Do not expose signature storage URLs to unrelated customers.

## 5. Critical Business Rules

- Only staff with appropriate location/custody permission may hand over.
- Cannot activate an unpaid/not-authorized booking except explicit pay-on-pickup policy and verified collection.
- Exactly the committed quantity must be handed over; partial handover needs its own partial-state policy and item-level due dates.
- A unit must be currently in company custody and not already checked out to another renter.
- Renter must acknowledge preexisting damage; photo evidence stored before custody transfer.
- Effective rental charging start must follow an explicit policy: scheduled start vs actual handover; do not silently change price.
- Equipment issued early/late requires either approved schedule adjustment or recorded operational exception.
- Final operation must be idempotent; staff double-click must not create duplicate custody events.
- Paper receipt/manual signature fallback requires admin scan/upload and staff attestation.
- If a unit is swapped, system updates allocation, inventory and receipt together; never merely edit the visible serial label.
- Do not move physical state to `RENTED` just because booking was marked ready.

## 6. API Contracts

```http
GET  /api/admin/handovers?date=&locationId=&status=
GET  /api/admin/handovers/{reservationId}/checklist
POST /api/admin/handovers/{reservationId}/unit-scan
POST /api/admin/handovers/{reservationId}/evidence
POST /api/admin/handovers/{reservationId}/finalize
GET  /api/me/reservations/{id}/handover-receipt
POST /api/admin/handovers/{reservationId}/report-no-show
POST /api/admin/handovers/{reservationId}/propose-substitution
```

Finalize request should contain expected reservation version, inspected unit IDs, checklist version, evidence IDs, receiver confirmation and idempotency key; server validates all fields and creates custody/status event transactionally.

### Example Evidence Bundle

```json
{
  "reservation_id": "res_001",
  "actual_handover_at": "2026-10-21T09:10:00+07:00",
  "unit_checks": [{
    "asset_unit_id": "unit_01",
    "condition_grade": "GOOD",
    "functional_check": "PASS",
    "accessories": [{"name":"Charger","quantity":1,"condition":"GOOD"}],
    "photo_ids": ["media_out_001"]
  }],
  "receiver_acknowledged": true,
  "expected_version": 5,
  "idempotency_key": "handover-res_001-v5"
}
```

Do not let client override `staff_id`, verified payment result or server timestamps without recorded correction privileges.

## 7. Failure / Exception Design

- Barcode scan unavailable → manual tag input with second verification for high-value units.
- Signature capture fails → save draft; keep booking `READY_FOR_HANDOVER`; no active rental.
- Media uploads fail → retry; prohibit completion if photos are mandatory for category.
- Multiple staff start same handover → row-version conflict and read-only view for second staff.
- Delivery attempted but no recipient → failed delivery event; do not mark handed over.
- Asset safety failure → quarantine unit (`MAINTENANCE`) and trigger reservation reallocation/customer contact.
- Admin modifies reservation mid-checklist → checklist requires refresh/revalidation.

## 8. UAT Matrix

| ID | Scenario | Expected |
|---|---|---|
| H01 | Valid paid reservation checkout | ACTIVE with one custody record |
| H02 | Wrong serial scanned | Cannot finalize |
| H03 | Missing required photo/check | Validation failure |
| H04 | Refused signature | No activation |
| H05 | Preexisting scratch captured | Stored in OUT evidence |
| H06 | Two staff finalize same reservation | Exactly one finalized handover |
| H07 | Unpaid reservation | Block unless explicit policy |
| H08 | Cancelled reservation | Block handover |
| H09 | Wrong renter/unauthorized collector | Block under identity rules |
| H10 | Damaged unit discovered | Swap or resolve; original quarantined |
| H11 | Unit substitution | Audit + allocation + receipt all match |
| H12 | Delivery no recipient | No completed handover |
| H13 | Receipt download | Accurate serial/accessories/condition |
| H14 | Renter privacy | Cannot see other renter signatures |
| H15 | Partial issue attempt | Supported only under explicit policy |
| H16 | Return due timezone | Correct date/time on receipt |
| H17 | Network loss before finalize | Safe retry; no duplicate custody |
| H18 | Staff lacks permission | Access denied |
| H19 | Rate policy scheduled vs actual | Consistent billed start |
| H20 | Audit | Staff, recipient, time, evidence and version recorded |

## 9. Definition of Done

- [ ] Admin handover queue and itemized checklist complete.
- [ ] Real unit identity, condition and accessories verified.
- [ ] Renter acknowledgment and condition photos stored securely.
- [ ] Exactly-once custody transfer and rental activation.
- [ ] Receipt and renter active-rental dashboard available.
- [ ] No-show, mismatch, damage and staff-conflict handling tested.
- [ ] H01–H20 pass.

**Handoff to Step 08:** active rental with actual custodian, handover evidence, verified unit(s), agreed due date and policy for reminders/extensions/overdue status.

## Reference

- [Odoo 19 — Pickup and return tracked physical rentals](https://www.odoo.com/documentation/19.0/applications/sales/rental/rental_orders/pickup_return.html): serial verification, pickup validation and receipts.
