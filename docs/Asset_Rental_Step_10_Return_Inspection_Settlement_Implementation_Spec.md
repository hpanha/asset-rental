# Asset Rental Management — Step 10: Inspect Returned Asset and Settle Charges

**Actor:** Warehouse Inspector / Admin, Finance, Renter (views findings and dispute options).  
**Input:** Verified return receipts and custody transferred to company inspection area in Step 09.  
**Output:** Recorded condition verdict for each unit, justified fees/credits, deposit settlement instructions, repair/availability disposition; ready for Step 11 closeout.  
**Core principle:** Return receipt is not proof of good condition, and inspection is not the same as financial settlement.

## 1. Objective

Compare the returned physical equipment with its Step 07 handover baseline, identify real damage/missing components, determine late fees from contract and actual receipt timestamps, and settle payments/deposits fairly with traceable evidence. This is where the company protects inventory value **and** the renter's right to understand/contest fees.

## 2. Inspection Workflow

1. Staff opens `Returns → Awaiting Inspection` and accepts assigned task within configured service window.
2. Review booking terms, original handover/condition photos, original accessories list, active rental amendments, current return receipt and exact receipt timestamps.
3. Physically inspect each returned unit: model/tag/serial, cosmetic condition, functionality, safety, cleanliness and included accessories.
4. Upload side-by-side `OUT` vs `IN` condition photos, checklists and observed differences, distinguishing **pre-existing issues** from newly detected damage.
5. Select verdict for each unit: `PASS`, `CLEANING_REQUIRED`, `REPAIR_REQUIRED`, `DAMAGED`, `MISSING`, `NEEDS_REVIEW`.
6. Record potential monetary adjustments: late fees (if policy applies), confirmed replacement/accessory costs, contracted cleaning fee or repair estimate.
7. Calculate itemized proposed settlement: original captured rental, deposit held, additional charges, credit/refund and any outstanding balance.
8. If fees/damages exceed staff approval limit or evidence is weak, escalate for second review; do not automatically forfeit full deposit.
9. Send renter itemized findings and required supporting evidence/appeal period where applicable.
10. Authorize financial operations: collect outstanding balance via approved payment process, refund eligible deposit, record authorized deduction/credit. Track provider processing and final success separately.
11. Record final inspection decision and unit disposition: `READY` after checks/cleaning, `MAINTENANCE`, `QUARANTINE`, `RETIRED` or `LOST`. Step 11 owns final asset release and closeout.

## 3. Inspection and Settlement UI

### Admin: Inspection Queue

Filters: Awaiting Inspection, In Progress, Needs Manager Review, Disputed, Settlement Pending, Ready for Closure. Columns: Return Receipt No., Booking, Asset Unit, Returned At, Inspector, Days Waiting, Issue/Severity, Status.

### Admin: Condition Comparison Screen

- Left: issued-unit photo gallery/condition and original accessory checklist.
- Right: returned-unit current photos, findings and physical test checklist.
- Highlight each difference with evidence references and severity.
- `Inspection Verdict` per unit; repair/maintenance flag; inspector name and timestamp.
- Warning if actual serial differs from issued serial or a physical unit is still missing.
- Save Draft, Request Second Review, Complete Inspection.

### Admin/Finance: Settlement Builder

Line items: Original rent/tax already paid, previously held deposit, late charges, damage charge, missing accessory, cleaning, authorized goodwill credit/refund. Clearly split **money already collected**, **additional money owed**, **refundable liability**, and **money to refund**. Buttons require role-specific permission: Approve Charges, Request Customer Response, Issue Additional Invoice, Initiate Refund, Record Waiver.

### Renter: Inspection & Settlement Details

Shows neutral finding summary, before/after evidence permitted for sharing, policy references, itemized charge/refund, due date, review/dispute action and payment/refund status. Do not show private staff risk notes or third-party financial details.

## 4. Detailed Data Model

| Table | Important fields |
|---|---|
| `rental_inspection` | `id, return_case_id, inspector_id, started_at, completed_at, status, inspection_version` |
| `rental_inspection_item` | `inspection_id, asset_unit_id, condition_grade, function_result, verdict, disposition, notes` |
| `rental_inspection_finding` | `id, item_id, type, severity, evidence_in_id, evidence_out_id, preexisting_flag, estimated_cost` |
| `rental_inspection_evidence` | Secure photos, video/docs, checksum, capture provenance, `IN`/`OUT` stage |
| `rental_settlement` | `id, rental_id, status, currency, refundable_deposit, additional_due, net_refund, approved_by` |
| `rental_settlement_line` | `id, settlement_id, category, reference, amount, tax, policy_version, approval_status` |
| `rental_dispute` | `id, settlement_id, renter_id, reason, evidence_ids, status, resolution, resolved_by` |
| `rental_refund` | Deposit/capture reference, amount, provider, state, issued_at, completed_at |
| `rental_invoice_adjustment` | Charges/credits and payment attempt references; append-only |
| `rental_maintenance_task` | Unit, inspection finding, planned work, blocking status |
| `inspection_audit` | Changes, actor, evidence links, decisions and times |

## 5. Fee Calculation and Deposit Accounting

Illustrative formula (same currency):

```text
Confirmed extra charges = late fee + verified damage + missing accessories
                          + applicable cleaning/delivery adjustments
                          - approved credits

Deposit available for return = deposit actually held - authorized deductions

Additional amount due = max(0, confirmed extra charges - eligible deposit applied)
Refund amount         = max(0, eligible deposit balance + approved other refunds)
```

Do not blindly apply all damage charges to deposits without a valid contractual/legal policy. Track **proposed**, **approved**, **charged**, **collected**, **refunded** and **disputed** amounts separately. The settlement must reconcile to immutable payment/deposit ledger entries from Step 05. Avoid arithmetic from display strings; use fixed-precision monetary types.

### Late Fee Basis

- Read original/amended due time from Step 08 and actual valid receipt time from Step 09.
- Apply grace period, rounding unit and maximum caps from accepted terms version.
- Exclude periods covered by an approved extension or documented no-fee company-caused delay.
- For partial returns, compute per unit or per outstanding quantity under published policy.
- Present an itemized calculation so staff and renter understand why a charge exists.

## 6. Approval, Dispute and Safeguards

- All material charges must map to an evidence-backed finding, known policy or accepted service item.
- Inspector cannot unilaterally approve unusually high damage fees if finance/supervisor segregation is configured.
- Provide dispute status `OPEN → UNDER_REVIEW → RESOLVED/UPHELD/WAIVED` and preserve both original and final decision.
- On dispute, freeze disputed deduction/refund portion per approved policy; do not erase undisputed ledger.
- Refund provider status may be `REQUESTED`, `PROCESSING`, `SUCCEEDED`, `FAILED`; do not claim money returned from an API initiation alone.
- Actual repair invoice may differ from estimate; corrections must be visible and customer-notified if policy requires.
- Maintenance/disposition is separate from money: an asset can be damaged even if charges are waived.
- Keep inventory blocked during unresolved safety/repair issues.
- Retain evidence and consent only as needed under applicable local rules; define access and retention controls.

## 7. API Endpoints

```http
GET  /api/admin/inspections?status=&locationId=
GET  /api/admin/inspections/{id}
POST /api/admin/inspections/{id}/findings
POST /api/admin/inspections/{id}/evidence
POST /api/admin/inspections/{id}/complete
POST /api/admin/settlements/{id}/calculate-preview
POST /api/admin/settlements/{id}/approve
POST /api/admin/settlements/{id}/initiate-refund
POST /api/admin/settlements/{id}/post-adjustment
GET  /api/me/rentals/{id}/settlement
POST /api/me/rentals/{id}/settlement-disputes
POST /api/admin/settlement-disputes/{id}/resolve
```

Every write requires authenticated role, audit reason, version check, idempotency on financial operations and ownership checks. Backend recomputes all monetary adjustments; reject client-edited totals.

## 8. Exception Handling

| Exception | Resolution |
|---|---|
| Inspection reveals preexisting scratch | No new damage charge for that scratch |
| Missing serial / completely missing item | Open loss investigation, do not mark received or available |
| Late fee rule changed after booking | Apply accepted contract terms/snapshot |
| Renter contests fee | Enter dispute; preserve evidence and controlled timeline |
| Deposit less than approved damage | Partial deposit application + additional invoice if lawful/policy supported |
| Refund provider fails | Keep refund pending/error; finance retry with idempotency |
| Inspector updates photo after approval | New revision/re-review, preserve prior evidence |
| Cleaning required | Unit remains unavailable until work completed |
| Multiple inspectors edit same case | Optimistic version conflict / authorized reassignment |
| Early return with possible credit | Follow agreement; do not promise automatic refund |

## 9. UAT Matrix

| ID | Test | Expected |
|---|---|---|
| I01 | Return received | Inspection task visible |
| I02 | No damage, on time | PASS; full eligible deposit refund |
| I03 | Scratch already on OUT photo | Not charged as new damage |
| I04 | New documented damage | Finding + evidence + approval required |
| I05 | Missing charger | Itemized charge based on policy/evidence |
| I06 | Overdue rental | Fee uses effective due and actual receipt |
| I07 | Approved extension exists | No incorrect late fee for old due date |
| I08 | Partial return | Per-unit calculations and open remainder |
| I09 | Deposit smaller than fees | Correct additional due |
| I10 | Deposit larger than fees | Correct refund liability |
| I11 | Refund provider fails | Pending/failed, not labeled paid |
| I12 | Duplicate refund click/webhook | One refund financial effect |
| I13 | High charge approval limit | Requires senior reviewer |
| I14 | Renter disputes charge | Status/evidence/review preserved |
| I15 | Dispute resolved with waiver | Adjustment audit, correct new total |
| I16 | Maintenance required | Unit stays unavailable |
| I17 | Inspector unauthorized | Write denied |
| I18 | Wrong serial | Investigation, no valid PASS |
| I19 | Earlier inspection version overwritten | Conflict and audit protection |
| I20 | Customer settlement view | Only own data, itemized explanation |

## 10. Definition of Done

- [ ] Inspectors can check every returned unit/accessory against handover evidence.
- [ ] Condition verdict and maintenance disposition reliably recorded.
- [ ] Fee calculation tied to contract, return timestamps, policy and findings.
- [ ] Financial adjustment/deposit ledger balanced, refunds tracked to completion.
- [ ] Approval thresholds and dispute workflow implemented.
- [ ] Renter can view understandable findings and charges.
- [ ] I01–I20 pass.

**Handoff Step 11:** approved inspection results, unit readiness/maintenance decisions, accurate final settlement/deposit/refund states, any open disputes or outstanding balances and immutable documentary evidence.

## References

- [Odoo 19 — Rental pickup and return](https://www.odoo.com/documentation/19.0/applications/sales/rental/rental_orders/pickup_return.html) for receipt and physical return lifecycle.
- [Stripe PaymentIntents](https://docs.stripe.com/api/payment_intents) and [webhooks](https://docs.stripe.com/webhooks) as examples of asynchronous financial status verification; use only providers actually supported by the business.
