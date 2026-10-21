# Asset Rental Management — Step 05: Rental Payment and Security Deposit

**Actor:** Renter (payment), Admin/Finance (manual verification and exception resolution), Payment Provider (automated events).  
**Input:** Approved request `APPROVED_AWAITING_PAYMENT`, valid quoted amount and active short-lived inventory hold from Step 04.  
**Output:** Verified financial payment state, stored receipt/ledger entries and a finalization event for Step 06.  
**Warning:** Showing a payment success screen is **not** sufficient evidence that the payment was settled.

## 1. Scope and Decisions

Payment here covers the **rental charge** and any **refundable security deposit**, plus approved taxes, mandatory service/delivery fees. The company must select locally supported payment providers and business/legal policy before integration; do not assume any specific international gateway serves the company's market.

### Supported Payment Modes

| Mode | Flow | MVP choice |
|---|---|---|
| Online processor | Provider checkout → verified callback/webhook → reconcile | Choose one supported gateway |
| Bank transfer / QR | Display reference → admin or trusted bank feed verifies funds | Optional MVP fallback |
| Cash at counter | Staff records receipt after actually receiving cash | Only if pickup policy permits |
| Deposit charge then refund | Collect refundable deposit as distinct liability | Recommended simple deposit model |
| Card authorization hold | Authorize funds without capture and release later | Later; auth expiry rules complicate long rentals |

**Do not confuse the project's inventory hold with a card authorization hold.** They are separate and have different expirations. Refundable deposit accounting must distinguish company revenue from money owed back to renter.

## 2. Renter Payment Flow

1. Renter opens approved request from My Requests or approval notification.
2. UI displays asset, dates/qty, **payment deadline** and exact immutable quote snapshot.
3. System verifies request remains payable and inventory hold unexpired; declines payment initialization otherwise.
4. Show total with rental subtotal, tax, fees and refundable deposit **as separate lines**.
5. Renter selects supported payment method; app creates server-side payment attempt with unique reference and idempotency key.
6. Redirect to hosted checkout / authorized provider UI, or display verified manual-transfer instructions. Never collect raw card credentials in first-party app if hosted integration is available.
7. Provider reports `processing`, `succeeded` or `failed` asynchronously; server verifies signature/authenticity and correlates provider payment ID and amount/currency to request.
8. If verified payment is fully received and hold is valid, transition finance record to `PAID` and request to `PAYMENT_CONFIRMED` (or equivalent), emit reservation-finalization event to Step 06.
9. Show renter a status page: Payment Processing, Confirmed, Failed, Expired or Requires Help; generate receipt after verified payment.

### Manual Payment Branch

Admin/Finance sees proof/reference, compares bank receipt with actual bank statement/provider feed, records amount/date/channel, and confirms payment with permitted role. Uploaded screenshot alone is not definitive proof. Ensure two-person review for high-value manual adjustments if the company requires it.

## 3. Screen Specifications

### A. Payment Checkout

- Request number, asset details, rental period, quote details and full itemized amount.
- Distinct presentation: `Rental Charges` vs `Refundable Security Deposit`.
- Countdown or absolute local pay-by time; do not promise available stock beyond hold expiry.
- Payment method selector and clear payment instructions.
- `Pay Now` action with disable-on-submit and processing indicator.
- Terms about when a deposit is refundable and potential deductions.
- Failure/retry and support actions; never show `Paid` from redirect query parameters alone.

### B. Payment Result / Status

`UNPAID`, `PROCESSING`, `PAID`, `PARTIAL`, `FAILED`, `EXPIRED`, `REQUIRES_REVIEW`, `REFUNDED` (later). Show exact status, receipt/reference, amount, timestamp, and next action. Poll/subscribe to **server** verified state when provider events are delayed.

### C. Admin Payment Center

Filters by unpaid, awaiting manual verification, paid, partial, expired, refunds, disputes. Detail: gateway transaction references, attempts, verified evidence, breakdown, ledger and audit trail. Actions: `Verify Manual Payment`, `Reject Proof`, `Flag Review`, `Initiate Refund` (later, restricted), `Export Receipt`.

## 4. Financial Data Model

| Table | Purpose and main fields |
|---|---|
| `rental_payment_order` | `id, request_id, currency, rental_amount, tax, delivery_fee, deposit_amount, total_due, payment_status, due_at` |
| `rental_payment_attempt` | `id, payment_order_id, method, provider, provider_reference, attempt_no, status, amount, currency, idempotency_key, created_at` |
| `payment_provider_event` | `provider_event_id (unique), provider, payload_reference, verified_at, processed_at, processing_status` |
| `rental_payment_receipt` | `id, payment_order_id, receipt_no, captured_amount, issued_at, file_key` |
| `rental_deposit_ledger` | `id, request_id, collected, held, deducted, refunded, liability_balance, currency` |
| `financial_ledger_entry` | Immutable double-entry or balanced transaction reference: charge, capture, refund, adjustment |
| `manual_payment_verification` | Staff actor, evidence reference, bank confirmation info, decision/time |
| `notification_outbox` | Payment confirmed/failure/deadline/exception notifications |

**Avoid representing all financial operations as one mutable `payment_status` field.** An order can be rental-paid while a deposit remains held or partially refunded. Use amount and transaction-ledger states alongside high-level statuses.

### Money Rules

- Store money using fixed decimals or integer minor units, never binary float.
- Associate every monetary entry with a currency, reference and source transaction.
- Quote snapshot is authoritative unless explicit customer-approved adjustment is recorded.
- Prevent over-collection and duplicate capture. Refunds must refer to original capture/ledger.
- Do not report security deposit as rental revenue merely because funds were received.
- Provider webhooks should be verified, idempotent and tolerant of out-of-order/duplicate events.

## 5. Payment States and Cross-Step Transition

```text
Payment order: UNPAID → PROCESSING → PAID
                              ↘ FAILED → RETRY
                  ↘ EXPIRED / REQUIRES_REVIEW

Inventory hold: ACTIVE → CONSUMED (Step 06)
                    ↘ EXPIRED / RELEASED

Rental request: APPROVED_AWAITING_PAYMENT
                → PAYMENT_CONFIRMED → RESERVED (Step 06)
```

Do not create `RESERVED` solely from the user-facing payment redirect. Successful payment must be matched to the valid request, exact currency and allowed amount; final reservation is separate Step 06 transaction.

### Late / Asynchronous Payment

If provider confirms payment **after the inventory hold expired**, do not reserve stock automatically. Run reavailability check and exception/reconciliation workflow: reallocate only if a new valid hold can be obtained and the customer accepts any changed terms, otherwise refund and notify. A background job reconciles payment attempts stuck in `PROCESSING`.

## 6. API Endpoints

```http
GET  /api/me/rental-requests/{id}/payment-summary
POST /api/me/rental-requests/{id}/payment-attempts
GET  /api/me/rental-requests/{id}/payment-status
GET  /api/me/rental-requests/{id}/payment-receipt
POST /api/payment-providers/{provider}/webhook
GET  /api/admin/payments?status=&page=
POST /api/admin/payments/{id}/verify-manual
POST /api/admin/payments/{id}/reject-manual-proof
POST /internal/jobs/reconcile-payments
```

**Payment create:** server accepts selected method and opaque request ID; calculates amount itself. Keep client secrets private. Provider-specific token/details must not leak into logs.

**Webhook handler:** authenticate signature against raw body per provider contract, deduplicate provider event ID, retrieve payment if necessary, validate amount/currency/request, update ledger/status in a transaction, enqueue event. Return appropriate success only after durable acceptance; retry safe.

## 7. Security / Compliance Requirements

- Use reputable hosted checkout or tokenized provider SDK; avoid processing/storing card numbers/CVV directly.
- HTTPS, CSRF protections for session APIs, least-privilege admin roles and restricted finance actions.
- Verify provider callback cryptographic signature; never trust `?success=true` URL.
- Idempotency on payment initialization and webhook event processing.
- Restrict payment data access to the renter and authorized finance staff; redact PII/payment tokens in logs.
- Retain auditable receipts/refunds and follow Cambodia-specific tax, invoicing and data-retention requirements as confirmed by the business's accountant/legal team.
- Check provider and local-bank availability/compliance before selecting integration.
- Timeouts, manual evidence, and provider outages should fail safely without duplicating charges.

## 8. Edge Cases and Compensation

1. **Two clicks on Pay:** reuse current active payment attempt/idempotency key; do not charge twice.
2. **Browser closes during checkout:** server/webhook still settles and updates app status.
3. **Wrong currency/amount callback:** quarantine for review; do not reserve.
4. **Duplicate webhook:** processed once; acknowledge retry.
5. **Out-of-order webhooks:** reconcile current provider payment object, not event arrival order.
6. **Partial manual transfer:** mark partial, do not mark fully paid unless configured policy allows it.
7. **Payment after inventory expiry:** Step 06 availability exception; refund or reapproval.
8. **Manual verification mistake:** reversal requires authorized compensating ledger entry, not deleted history.
9. **Payment succeeded but reservation fails:** maintain paid-but-unfulfilled exception queue and refund/reallocate safely.
10. **Customer changes rental after paying:** create separate adjustment and refund/additional-payment flow; no rewrite of original capture.

## 9. UAT Checklist

| ID | Test | Expected |
|---|---|---|
| P01 | Approved request within deadline | Can start payment |
| P02 | Pending/rejected/expired request | Cannot initialize payment |
| P03 | Gateway success callback | Verified PAID, ledger, event to Step 06 |
| P04 | Browser redirects success without webhook | Remains processing until verified |
| P05 | Double-click payment | One active charge attempt |
| P06 | Duplicate provider webhook | One financial effect |
| P07 | Out-of-order events | Correct final state |
| P08 | Wrong amount/currency | Requires review; no reservation |
| P09 | Provider downtime | Recoverable status/retry |
| P10 | Bank proof without bank confirmation | Not paid |
| P11 | Authorized manual verification | Paid with audit evidence |
| P12 | Unauthorized manual verification | Access denied |
| P13 | Deposit and rental charge | Separate ledger components |
| P14 | Late payment after hold expiry | Refund/reavailability exception |
| P15 | Multiple payment retries | No duplicate collection |
| P16 | Payment received + reservation fails | Paid-unfulfilled review/compensation |
| P17 | Charge stored in USD / KHR | Precision and currency preserved |
| P18 | Customer views another customer's payment | Access denied |
| P19 | Refund later references capture | Correct audit trail |
| P20 | Receipt issue after verified capture | Correct itemized details |

## 10. Definition of Done

- [ ] Payment checkout, result and admin verification UI done.
- [ ] Selected provider or approved manual workflow integrated and tested.
- [ ] Quote amount/currency enforced server-side, deposit separately accounted.
- [ ] Webhooks authenticated, deduplicated and safely retried.
- [ ] Ledger, receipts and audit records reliable.
- [ ] Timeout, delayed payment, double-charge and failed-reservation exceptions handled.
- [ ] Test P01–P20 pass.

**Handoff Step 06:** verified payment order, ledger and valid stock hold (or explicit paid-unfulfilled exception). Step 06 atomically creates the actual reservation.

## Primary References

- [Stripe webhook security and duplicate/out-of-order delivery](https://docs.stripe.com/webhooks) — provider-agnostic design principles illustrated by Stripe.
- [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests) — safe payment operation retries.
- [Stripe PaymentIntents lifecycle](https://docs.stripe.com/api/payment_intents) — example state model; not a requirement to select Stripe in Cambodia.
