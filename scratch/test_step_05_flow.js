const http = require('http');

function post(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(data);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port || 3000,
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch (e) {
            resolve({ status: res.statusCode, raw });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function get(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port || 3000,
        path: u.pathname + u.search,
        method: 'GET',
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch (e) {
            resolve({ status: res.statusCode, raw });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function createAndApproveRequest(name, email, notes, startOffsetDays = 30, endOffsetDays = 34) {
  const assetsRes = await get('http://localhost:3000/api/rental-assets');
  const asset = assetsRes.data.items[0];

  const startDate = new Date(Date.now() + startOffsetDays * 86400000);
  const endDate = new Date(Date.now() + endOffsetDays * 86400000);

  const createRes = await post('http://localhost:3000/api/me/rental-requests', {
    listing_id: asset.id,
    start_at: startDate.toISOString(),
    end_at: endDate.toISOString(),
    quantity: 1,
    fulfillment: 'PICKUP',
    pickup_location_id: asset.locations?.[0]?.id,
    contact_name: name,
    contact_phone: '+855 12 345 678',
    contact_email: email,
    customer_notes: notes,
    terms_accepted: true,
  });

  if (createRes.status !== 201) {
    throw new Error('Failed to create rental request: ' + JSON.stringify(createRes));
  }

  const reqId = createRes.data.request_id;
  const reqNo = createRes.data.request_no;

  // Approve via Step 04
  const approveRes = await post(`http://localhost:3000/api/admin/rental-requests/${reqId}/approve`, {
    reviewer_name: 'Finance Admin',
    review_notes: 'Approved for Step 05 verification',
    hold_duration_hours: 2,
  });

  if (approveRes.status !== 200) {
    throw new Error('Failed to approve rental request: ' + JSON.stringify(approveRes));
  }

  return { reqId, reqNo };
}

async function runTests() {
  console.log('=== STEP 05: RENTAL PAYMENT & SECURITY DEPOSIT VERIFICATION ===\n');

  // --- Part 1: Instant Card Settlement & Idempotency ---
  console.log('[Phase 1] Setup: Creating and approving fresh request for Card payment...');
  const { reqId: cardReqId, reqNo: cardReqNo } = await createAndApproveRequest(
    'Renter Card Test',
    'you@renthub.app',
    'Testing online card settlement',
    40,
    44
  );
  console.log(`[PASS] Approved request ready: ${cardReqNo} (${cardReqId})`);

  // Test 1: GET payment summary
  console.log('\n[Test 1] Testing GET /api/me/rental-requests/[id]/payment-summary');
  const summaryRes = await get(`http://localhost:3000/api/me/rental-requests/${cardReqId}/payment-summary`);
  console.log('Summary response status:', summaryRes.status);
  const cb = summaryRes.data?.commercial_breakdown;
  console.log(`Summary Breakdown: Currency=${cb?.currency}, Rental=${cb?.rental_charges?.subtotal_due}, Deposit=${cb?.refundable_deposit?.amount}, Total=${cb?.total_due}, HoldExpired=${summaryRes.data?.is_hold_expired}`);

  if (summaryRes.status !== 200 || !cb || summaryRes.data?.is_hold_expired) {
    throw new Error('Test 1 failed: Could not get valid active payment summary');
  }

  // Test 2: Instant Card Settlement
  console.log('\n[Test 2] Testing POST /api/me/rental-requests/[id]/payment-attempts (CARD)');
  const idempotencyKey = `idem-test-${Date.now()}`;
  const payRes1 = await post(
    `http://localhost:3000/api/me/rental-requests/${cardReqId}/payment-attempts`,
    {
      method: 'CARD',
      idempotency_key: idempotencyKey,
    }
  );
  console.log(`Payment status: ${payRes1.status}, Receipt issued: ${payRes1.data?.receipt_no}, Total Captured: $${payRes1.data?.total_captured}`);

  if (payRes1.status !== 200 || !payRes1.data?.receipt_no) {
    throw new Error('Test 2 failed: Card payment did not return valid receipt');
  }

  // Test 3: Idempotency Protection on Duplicate Pay Clicks
  console.log('\n[Test 3] Testing Idempotency on repeated payment attempt with same idempotency key');
  const payRes2 = await post(
    `http://localhost:3000/api/me/rental-requests/${cardReqId}/payment-attempts`,
    {
      method: 'CARD',
      idempotency_key: idempotencyKey,
    }
  );
  console.log(`Payment 2 status: ${payRes2.status}, Receipt: ${payRes2.data?.receipt_no}`);
  if (payRes2.data?.receipt_no !== payRes1.data?.receipt_no) {
    throw new Error('Test 3 failed: Idempotent call produced a different receipt or duplicated charge!');
  }
  console.log('[PASS] Idempotency protected: exact same receipt returned without duplicate capture.');

  // Test 4: Verify Printable Receipt Data
  console.log('\n[Test 4] Testing GET /api/me/rental-requests/[id]/payment-receipt');
  const receiptRes = await get(`http://localhost:3000/api/me/rental-requests/${cardReqId}/payment-receipt`);
  console.log(`Receipt endpoint status: ${receiptRes.status}, Receipt No: ${receiptRes.data?.receipt_no}`);
  console.log(`Receipt breakdown: Rental=$${receiptRes.data?.breakdown?.rental_subtotal}, Deposit Liability=$${receiptRes.data?.breakdown?.refundable_deposit}, Total=$${receiptRes.data?.breakdown?.total_captured}`);

  if (receiptRes.status !== 200 || !receiptRes.data?.receipt_no) {
    throw new Error('Test 4 failed: payment-receipt endpoint failed');
  }

  // --- Part 2: Manual Bank Wire & Admin Verification Flow ---
  console.log('\n[Phase 2] Setup: Creating and approving fresh request for Manual Bank Wire...');
  const { reqId: wireReqId, reqNo: wireReqNo } = await createAndApproveRequest(
    'Bank Wire Customer',
    'you@renthub.app',
    'Testing bank wire proof flow',
    50,
    54
  );
  console.log(`[PASS] Approved request ready: ${wireReqNo} (${wireReqId})`);

  // Test 5: Customer submits bank wire reference
  console.log('\n[Test 5] Customer submits bank wire transaction code');
  const wireAttemptRes = await post(
    `http://localhost:3000/api/me/rental-requests/${wireReqId}/payment-attempts`,
    {
      method: 'BANK_TRANSFER',
      bank_transfer_reference: 'ABA-REF-99887766',
    }
  );
  console.log(`Wire attempt status: ${wireAttemptRes.status}, State: ${wireAttemptRes.data?.status}`);
  if (wireAttemptRes.data?.status !== 'PROCESSING') {
    throw new Error('Test 5 failed: Wire attempt did not enter PROCESSING');
  }

  // Test 6: Admin checks payments queue and finds pending wire
  console.log('\n[Test 6] Admin checks payments queue: GET /api/admin/payments');
  const adminPaymentsRes = await get('http://localhost:3000/api/admin/payments');
  console.log(`Admin payments status: ${adminPaymentsRes.status}`);
  console.log('Metrics:', adminPaymentsRes.data?.metrics);

  const pendingWireOrder = adminPaymentsRes.data?.orders?.find((o) => o.requestId === wireReqId);
  if (!pendingWireOrder) {
    throw new Error('Test 6 failed: Could not find pending bank wire order in admin queue');
  }
  console.log(`[PASS] Found pending wire order: ID=${pendingWireOrder.id}, Status=${pendingWireOrder.status}`);

  // Test 7: Admin manually verifies bank wire with bank statement reference
  console.log('\n[Test 7] Admin verifies bank wire: POST /api/admin/payments/[id]/verify-manual');
  const adminVerifyRes = await post(
    `http://localhost:3000/api/admin/payments/${pendingWireOrder.id}/verify-manual`,
    {
      bank_statement_ref: 'ABA-REF-99887766',
      reviewer_name: 'Vannak Chen',
    }
  );
  console.log(`Admin verify status: ${adminVerifyRes.status}, Receipt issued: ${adminVerifyRes.data?.receipt_no}`);

  if (adminVerifyRes.status !== 200 || !adminVerifyRes.data?.receipt_no) {
    throw new Error('Test 7 failed: Admin manual verification failed');
  }

  // Test 8: Final Admin Metrics Check (Separate Rental Revenue vs. Refundable Security Deposit Liabilities)
  console.log('\n[Test 8] Checking final financial metrics in Admin Payment Center');
  const finalPaymentsRes = await get('http://localhost:3000/api/admin/payments');
  const finalMetrics = finalPaymentsRes.data?.metrics;
  console.log('Final Settled Revenue:', finalMetrics?.rental_revenue);
  console.log('Final Deposits Held (Liability):', finalMetrics?.held_deposits_liability);
  console.log('Final Total Collected:', finalMetrics?.total_collected);
  console.log('Pending Verifications:', finalMetrics?.pending_verifications);

  if (finalMetrics?.rental_revenue <= 0 || finalMetrics?.held_deposits_liability <= 0) {
    throw new Error('Test 8 failed: Financial segregation check failed');
  }

  console.log('\n======================================================');
  console.log('🎉 ALL STEP 05 FINANCIAL & VERIFICATION TESTS PASSED!');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
