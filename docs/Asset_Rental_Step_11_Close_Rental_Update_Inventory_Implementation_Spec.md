# Asset Rental Management — Step 11: Close Rental and Update Inventory

**Actor:** Rental Admin / Finance (exception oversight), System (transactional closure and reporting), Renter (views completion/receipts).  
**Input:** Returned asset(s), completed inspection and approved settlement from Steps 09–10; verified financial state.  
**Output:** Rental `COMPLETED`, final documents and audit history, reconciliation record, and correct per-unit inventory disposition (`AVAILABLE` or `MAINTENANCE`, etc.).  
**Critical:** Closing a booking must never release an asset that still needs repair, is missing, or is still physically held by the renter.

## 1. Business Objective

Perform the final safe transition from an active rental lifecycle into an auditable closed transaction while returning reusable inventory to stock **only when actually safe**. Completion should be reproducible in financial reports and available to customer service later.

## 2. Closure Preconditions

A normal successful closure requires:

1. All allocated units have documented physical return/custody disposition, or a formally approved loss/write-off case.
2. Every returned unit has a final inspection verdict (or authorized, documented inspection waiver under policy).
3. All contracted rental charges, approved late/damage/cleaning adjustments and tax records are finalized.
4. Security deposit refund/deduction has a documented ledger outcome. If provider refund is still processing, company policy defines whether status is `CLOSURE_PENDING_REFUND` until confirmed.
5. No unresolved damage/customer dispute or outstanding receivable that normal closure policy forbids; exceptions use an explicit `CLOSED_WITH_BALANCE` / `CLOSED_WITH_DISPUTE` state if authorized.
6. Unit-level availability disposition is known: healthy/clean → `AVAILABLE`; damaged/safety concern → `MAINTENANCE`; missing → `LOST`; end-of-life → `RETIRED`.
7. All monetary transactions reference the underlying booking/request, and audit history is intact.

## 3. End-to-End Finalization Flow

1. System identifies reservations eligible for closure after Step 10; admin opens `Ready to Close` queue.
2. Check item-by-item return/inspection, refunds, charges, disputes, payments and custody.
3. Show closure preview: renter, booking, total charges, amount paid, deposit returned/deducted, unit disposition, notes.
4. If an invariant is missing, show blocking reason and link to the responsible stage rather than hiding it.
5. Admin/system initiates `Finalize Rental` with expected reservation version and idempotency key.
6. Transaction locks reservation and relevant unit/custody/settlement records, rechecks preconditions and marks workflow `COMPLETED` (or approved exception state).
7. Publish new inventory eligibility from unit disposition; any `MAINTENANCE`, `LOST`, `RETIRED` unit remains unavailable, and repair tasks remain open.
8. Save final billing/receipt references, closure actor/timestamp, settlement totals and immutable audit event.
9. After transaction commit, generate/send final receipt and completion notice; refresh reporting/analytics asynchronously.
10. Renter sees completed rental in Rental History with invoice/receipt, settlement and deposit outcome.

**Close is final, not delete.** Any later issue is a correction/amendment with a visible history, never a silent rewrite of the completed contract.

## 4. Admin and Renter UI

### Admin: Closeout Queue

Filters: `READY_TO_CLOSE`, `PENDING_REFUND`, `PENDING_PAYMENT`, `MISSING_ITEMS`, `INSPECTION_HOLD`, `DISPUTED`, `COMPLETED`. Cards or table with Booking No., Renter, Returned Date, Inspection, Finance, Inventory, Blocking Reason, Last Activity, Actions.

### Admin: Closure Detail

- Step timeline from request to payment/approval/reservation/handover/return/inspection.
- Item-level custody and final disposition with ready/maintenance badges.
- Itemized financial reconciliation: rent, tax, fees, held deposit, paid, refunded, outstanding.
- Open repair/loss/dispute links; no premature checkbox overrides.
- Preview Final Statement / Close Rental. Show explicit warning on authorized exceptions.
- Audit and who closed; later adjustments in a separate post-close corrections view.

### Renter: Completed Rental History

Shows completed status, exact rental duration, returned date, finalized amounts and downloadable receipts/statement. Deposit refund may be processing—state this clearly rather than implying money was returned. Optional feedback/rating is a later enhancement and must not gate closure.

## 5. Final Inventory Disposition Rules

| Inspection result | Inventory result | Public availability |
|---|---|---|
| Pass, clean and ready | Unit base `ACTIVE`, location warehouse; free for future dates subject to commitments | Available when not already booked |
| Needs cleaning | `MAINTENANCE` until cleaning confirmed | Not available |
| Repair/safety fault | `MAINTENANCE` with work order | Not available |
| Missing or lost | `LOST`, investigation/write-off record | Not available |
| Retired/end of life | `RETIRED` | Not available |
| Inspection incomplete | Still inspection/quarantine | Not available |

**Important:** The fact that a rental closed does not automatically erase future reservations. Recompute availability from committed allocations, maintenance blocks and buffer rules; release only the completed reservation's occupancy, with no impact on unrelated future orders.

## 6. Database / Reports

| Entity | Fields and responsibility |
|---|---|
| `rental_closure` | `id, reservation_id UNIQUE, closed_at, closed_by, closure_type, final_status, version` |
| `rental_closure_snapshot` | Final financial/item/timestamp/terms summary, immutable after closure |
| `rental_unit_disposition` | `unit_id, rental_id, inspected_at, final_condition, target_status, location, released_at, maintenance_task_id` |
| `rental_final_document` | Receipt/invoice/settlement document keys, generated time and version |
| `inventory_movement` | Custody/location movement from inspection to available/maintenance/loss |
| `financial_reconciliation` | Captures, fees, approved credits, deposit liabilities, refunds and outstanding |
| `rental_audit_event` | `COMPLETED`, authorized override and later correction events |
| `notification_outbox` | Completion and final receipt delivery |
| `rental_reporting_fact` (derived) | Duration, asset category, rental revenue, late days, utilization, downtime |

Preserve original request, rate snapshot, handover/return conditions, settlement evidence and financial transaction IDs as the auditable source of truth. Reporting fact tables can be rebuilt from source records; never use them to decide physical stock.

## 7. Proposed APIs

```http
GET  /api/admin/rentals/ready-to-close?status=&page=
GET  /api/admin/rentals/{id}/closure-preview
POST /api/admin/rentals/{id}/close
GET  /api/admin/rentals/{id}/final-statement
GET  /api/me/rentals/history
GET  /api/me/rentals/{id}/final-documents
POST /api/admin/rentals/{id}/post-close-adjustments
GET  /api/admin/reports/rental-summary?from=&to=&locationId=
GET  /api/admin/reports/asset-utilization?from=&to=
```

The close endpoint should be role-restricted, idempotent and transactional. For automatic close, use trusted internal job/service role with the same precondition validator. Document/API access uses renter ownership authorization.

## 8. Reporting and KPIs

### Admin Dashboard Metrics

- Completed rentals by day/week/month, count and currency-consistent revenue.
- Gross rental charges, discounts, fees and taxes, **separate from refundable security deposits**.
- Utilization per listing/unit = rented time ÷ eligible rentable time, excluding maintenance intervals (define formula and reporting window).
- Average rental duration and actual late returns.
- Average turnaround time between physical receipt and ready-for-rent.
- Damages/repair expense, units under maintenance, lost/retired assets.
- Customer repeat rentals, dispute count, refund processing time.
- Outstanding receivables or disputed amounts, not hidden by normal completion status.

Do not add USD and KHR amounts without conversion at a documented rate/date. Distinguish cash flow from recognized rental revenue and from deposit liabilities; consult company finance policy for reporting/recognition.

## 9. Security, Audit and Correction Policy

- No normal delete of completed rentals, receipts or ledger transactions.
- Authorized corrections create reversal/adjustment records and optionally revised invoice versions.
- The admin cannot force a lost/damaged unit `AVAILABLE` without inspection or audited override.
- Refund pending must remain visible after rental is functionally complete if company chooses a separate financial status model.
- Closure history includes actor and UTC/local display time; generated documents record the version/source IDs.
- Customer can download only their own final documents, from expiring authenticated media links.
- Outbox notification is retryable; sending email does not decide whether transaction closed.
- Closeout jobs handle partial failures and retries without double-releasing stock or generating duplicate finance entries.

## 10. Exception Cases

1. **Rental fully returned, deposit refund delayed:** remain `PENDING_REFUND` or closed with explicit refund-in-progress status by policy; no false paid claim.
2. **Unpaid damage balance:** open receivable; require authorized exception if closing workflow despite balance.
3. **Returned asset damaged:** close rental if approved, but unit remains in maintenance until repaired.
4. **Missing item:** block normal closure; formal loss case/write-off can close with exception once authorized.
5. **Customer dispute unresolved:** block normal financial completion or use audited `CLOSED_WITH_DISPUTE` policy.
6. **Duplicate close API retry:** return existing closure; do not refund/release twice.
7. **Document generation fails after commit:** retry document job; do not roll back valid closure.
8. **Unit inspected but another future booking exists:** schedule still reflects that booking, not automatically available for overlapping use.
9. **Accounting adjustment discovered later:** issue new correction record, retain original snapshot.
10. **Different currencies across bookings:** reports group by currency or use explicit conversion rules.

## 11. UAT Matrix

| ID | Scenario | Expected |
|---|---|---|
| CL01 | Full return, pass, all paid/refunded | COMPLETED |
| CL02 | Missing unit | Normal close blocked |
| CL03 | Inspection incomplete | Close blocked |
| CL04 | Damage requires maintenance | Rental close allowed per policy; asset unavailable |
| CL05 | Cleaning incomplete | Asset not Available |
| CL06 | Deposit refund processing | Accurate pending state |
| CL07 | Outstanding charges | Requires exception/collection policy |
| CL08 | Open dispute | Normal closure blocked or explicit exception |
| CL09 | Duplicate close call | One closure, one inventory transition |
| CL10 | Unauthorized employee closes | Access denied |
| CL11 | Rate changed in catalog | Historical final statement unchanged |
| CL12 | Final receipt generated | Correct totals and dates |
| CL13 | Renter views history | Only own bookings accessible |
| CL14 | Final receipt email fails | Closure remains, retry scheduled |
| CL15 | Repairs completed later | Unit available only after maintenance clearance |
| CL16 | Future reservation exists | No mistaken release of overlapping commitment |
| CL17 | Post-close refund correction | Append-only adjustment, full audit |
| CL18 | Report aggregates USD and KHR | Separate or explicit conversion basis |
| CL19 | Utilization report | Uses eligible time and actual occupancy formula |
| CL20 | Concurrent admin close attempts | Exactly one successful closure |

## 12. Definition of Done

- [ ] Closeout queue identifies all blocking preconditions.
- [ ] Idempotent transactional completion and unit disposition implemented.
- [ ] Damaged, cleaning, lost, retired and pending-inspection assets remain unavailable.
- [ ] Final receipt/settlement documents generated and customer-visible.
- [ ] Accounting/reconciliation and deposit state agree with original ledger.
- [ ] Audit, reporting, exception and post-close correction workflows functional.
- [ ] CL01–CL20 pass.

**Project completion:** With this step, the main asset rental lifecycle is fully specified from catalog creation to renter browsing, submission, approval, payment, reservation, physical handover, active management, return, inspection and closure.

## Reference

- [Odoo 19 Rental](https://www.odoo.com/documentation/19.0/applications/sales/rental.html) for lifecycle and invoice/return records.
- [ERPNext Asset Maintenance](https://docs.frappe.io/erpnext/asset-maintenance) for post-return maintenance/disposition concepts.
