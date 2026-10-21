# Asset Rental Management — Step 09: Renter Returns the Asset

**Actor:** Renter (initiates return), Admin/Warehouse or Delivery Agent (acknowledges physical receipt).  
**Input:** Active rental and allocated units from Steps 07–08, with expected return date/location and handover checklist.  
**Output:** Verified physical return receipt with actual receipt timestamp and item counts; assets in inspection custody, **not yet available to other renters**.

## 1. Objective

Record the actual transfer of custody back from renter to rental company and hand the items to Step 10 for professional condition inspection and financial settlement. Customer clicking **I Returned It** or delivery pickup being scheduled must **not** by itself release inventory.

## 2. Return Workflow

1. Customer opens active rental, reviews return due date/location, items, accessories and policies.
2. Renter selects `Return Asset` or `Schedule Return`, chooses permitted location/drop-off or company collection slot, optionally submits notes/photos.
3. Server checks active rental, renter ownership, cancellation restrictions, and fulfillment availability.
4. Create `RETURN_REQUESTED` / `RETURN_SCHEDULED` return case and display instructions/reference or QR.
5. Renter brings items to the selected company site or delivery agent collects them; unverified self-report does not change custody.
6. Receiving staff opens return case/booking ID, verifies actual units by tag/serial and accessory quantities.
7. Staff records actual physical receipt timestamp, location, staff, item count and a preliminary discrepancy note; capture evidence where appropriate.
8. Mark received units `RETURN_RECEIVED_AWAITING_INSPECTION`; custody transfers back to company under an inspection/quarantine location.
9. Produce acknowledgment of **physical receipt only**—explicitly state final damage/late charges are subject to inspection.
10. Notify renter and create inspection task for Step 10. Do not release refundable deposit or mark booking completed yet.

### Return Scenarios

| Scenario | System behavior |
|---|---|
| On-time full return | All units received; awaiting inspection |
| Early return | Record actual receipt; refund/credit only if policy allows and reviewed later |
| Late return | Actual timestamp recorded; Step 10 computes fees from applicable policy |
| Partial return | Received lines tracked; rental stays active for unreturned quantity |
| Missing unit/accessory | Discrepancy and open return case; not silently closed |
| Different serial returned | Exception/investigation; verify ownership and original allocation |
| Courier handoff without warehouse receipt | `IN_TRANSIT`, not `RECEIVED` until trusted receipt confirmation |
| Wrong return location | Controlled transfer/exception; don't lose custody chain |
| Renter no return by due | Keep active/overdue; escalate reminders |

## 3. UI Requirements

### Renter: Return Initiation

- Booking and unit summary with current due date and method.
- Allowed return locations and opening hours; or available collection slots.
- Checklist: asset, charger, case/remote/manual, and other accessories.
- Report damage/missing items honestly; optional note/photos.
- Return reference and instructions; status timeline `Requested → Scheduled/In Transit → Received → Inspection → Completed`.
- Once staff verifies receipt, show actual receipt timestamp and downloadable acknowledgment.

### Admin: Return Queue

List Today / Scheduled / In Transit / Awaiting Receipt / Partially Received / Overdue / Awaiting Inspection; filters by location, renter, booking and serial. Prioritize overdue and high-value inventory.

### Admin: Receive Asset Screen

1. Scan booking reference/asset tag.
2. Display expected serials, quantities, accessories and handover condition snapshots.
3. Match physically received items to issued items; validate whether any are missing.
4. Enter actual receipt date/time (server default; authorized corrections require reason).
5. Record observed problems, missing parts and photos; avoid final damage fee assessment here.
6. Press `Confirm Physical Receipt`, generating itemized receipt and an inspection task.

## 4. Data Model

| Table | Main fields |
|---|---|
| `rental_return_case` | `id, reservation_id, requested_by, method, requested_at, scheduled_at, status, return_location_id` |
| `rental_return_line` | `return_case_id, allocated_unit_id, expected_qty, received_qty, receipt_status, received_at` |
| `rental_return_accessory` | Expected/received quantity and preliminary discrepancies |
| `rental_return_receipt` | Receipt number, actual receipt timestamp, receiving staff, location, signature, PDF |
| `rental_custody_event` | From renter/courier to company inspection site, actor/time |
| `rental_return_evidence` | Photos/notes, media checksum, captured by/time |
| `rental_inspection_task` | Unit(s), due priority, assignment, created after verified physical receipt |
| `rental_event` | Return requested, scheduled, received, partial or failed with audit |

Keep return **requests**, **courier transit**, **actual warehouse receipt** and **inspection** independent. This distinguishes who currently bears physical custody and when an item became available for quality checks.

## 5. Status Semantics

```text
ACTIVE RENTAL
   ↓ Renter requests/arranges return
RETURN_REQUESTED / RETURN_SCHEDULED
   ↓ Warehouse/authorized agent physically accepts item
RETURN_RECEIVED_AWAITING_INSPECTION
   ↓ Inspection and settlement handled in Step 10
```

With a partial return, line items can be `RECEIVED` while other items remain `OUTSTANDING`; the parent rental stays active/partially received as appropriate. **Do not flip all inventory units to Available just because one item came back.**

### Actual Receipt and Late Fees

Use `actual_received_at` as the primary operational return timestamp, subject to a clear delivery/collection custody policy. A renter's click time is not proof the company physically received an item. Where courier carrier possession changes risk and charging policy, record both `courier_collected_at` and `warehouse_received_at` and define the contracted cutoff explicitly. Step 10 determines final fees.

## 6. Proposed APIs

```http
POST /api/me/rentals/{id}/returns
GET  /api/me/rentals/{id}/returns
POST /api/me/rentals/{id}/returns/{returnId}/reschedule
GET  /api/admin/returns?status=&locationId=&date=
GET  /api/admin/returns/{returnId}/receiving-checklist
POST /api/admin/returns/{returnId}/scan-item
POST /api/admin/returns/{returnId}/confirm-receipt
GET  /api/me/rentals/{id}/return-receipt
```

Use renter ownership for initiation, staff/location permissions for receipt, idempotency for receipt confirmation, and expected version to prevent two workers recording the same physical unit twice.

## 7. Business and Security Rules

- Renter may schedule return only for their own active rental; don't allow fake return on another user's order.
- Receiver must verify serial against issued allocation; misidentified unit causes manual exception.
- Mandatory accessories/quantities derive from original signed handover, not from editable current catalog.
- Actual receipt timestamp is server-generated by default; backdating requires permission, reason and audit.
- Capture evidence securely, with access limited to participants/staff authorized for case.
- Acknowledgment clearly distinguishes **received** from **passed inspection**.
- Return unit moves to `INSPECTION`/quarantine, so no fresh booking can consume it until Step 11 disposition.
- If a courier is used, track handoff events and chain of custody. Shipment label alone is not confirmed receipt.
- Duplicate return QR scans are idempotent and do not duplicate receipts/inspection tasks.
- Keep messages asynchronous; receipt confirmation must be durable before notification.

## 8. Edge Cases

1. Item arrives with a charger missing; record discrepancy, create inspection follow-up.
2. Staff finds unexpected extra item; quarantine, don't attach it blindly to a rental.
3. All units returned but renter still owes fees; receipt is valid; Step 10/11 financial state remains open.
4. Partial return across multiple days; preserve per-unit actual timestamps and late-fee basis.
5. Admin receives at different warehouse; update custody and return-site exception in audit.
6. Renter schedules return then cancels appointment; active rental and original due time remain.
7. Network failure after receipt; idempotent retry yields same receipt number.
8. Staff scans a previously returned unit; system prevents duplicate physical receipt.

## 9. UAT Matrix

| ID | Scenario | Expected |
|---|---|---|
| RT01 | Customer creates valid return request | Scheduled/requested state |
| RT02 | Customer taps "returned" only | Unit still in renter custody until verified |
| RT03 | Warehouse receives full set | Itemized receipt + inspection task |
| RT04 | Warehouse receives one of two units | Partial return; other remains active |
| RT05 | Wrong serial scanned | Receipt blocked/exemption flow |
| RT06 | Missing accessory | Logged discrepancy |
| RT07 | Actual receipt late | Late period based on policy timestamp |
| RT08 | Early physical return | Actual time captured; policy governs credit |
| RT09 | Courier label printed only | Not marked received |
| RT10 | Duplicate QR scan / retry | No duplicate receipt |
| RT11 | Unauthorized warehouse employee | Cannot confirm at restricted location |
| RT12 | Unauthorized renter | Cannot create other customer's return |
| RT13 | Receipt time correction | Permission + reason + history |
| RT14 | Item enters inspection | Not available to new rental |
| RT15 | Return confirmation notification fails | Durable receipt, notification retry |
| RT16 | Accessory checklist | Based on original handover, not changed catalog |
| RT17 | Return appointment cancelled | Rental original due unaffected |
| RT18 | Two staff attempt same item receipt | Version conflict; single custody event |
| RT19 | Download return receipt | Correct items and inspection-pending label |
| RT20 | Multi-timezone courier return | Timestamp/custody policy applied consistently |

## 10. Definition of Done

- [ ] Renter return request/scheduling and status tracking complete.
- [ ] Admin scan/receipt workflow verifies serials and accessory counts.
- [ ] Partial, late, early, courier and missing-item cases supported.
- [ ] Actual custody transfer recorded with evidence and exact timestamp.
- [ ] Returned units quarantined for inspection, not automatically released.
- [ ] Inspection tasks and notification outbox generated reliably.
- [ ] RT01–RT20 pass.

**Handoff Step 10:** actual received units and timestamps, return receipts, discrepancy/evidence records, handover baseline photos, contract/due times and deposits; inspection will decide charges and asset condition.

## Reference

- [Odoo 19 — Pickup and return products](https://www.odoo.com/documentation/19.0/applications/sales/rental/rental_orders/pickup_return.html) for validation of returned quantity/serial and return receipts.
