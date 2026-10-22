const { SignJWT } = require('jose');

const secretKey = new TextEncoder().encode('renthub-super-secret-jwt-key-2026-production-ready');

async function createClientToken(payload, exp = '24h') {
  return new SignJWT({ ...payload, sessionType: 'client' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(secretKey);
}

async function createAdminToken(payload, exp = '8h') {
  return new SignJWT({ ...payload, sessionType: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(secretKey);
}

async function runTests() {
  const baseUrl = 'http://127.0.0.1:3000';

  console.log('=== TEST 1: Admin attempts to log in via Client Portal (/api/auth/login) ===');
  const adminOnClientRes = await fetch(baseUrl + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin@renthub.app',
      password: 'AdminPassword123!'
    })
  });
  const adminOnClientData = await adminOnClientRes.json();
  console.log('Status:', adminOnClientRes.status, '(Expected 403)');
  console.log('Error message:', adminOnClientData.error);
  if (adminOnClientRes.status !== 403) throw new Error('Test 1 failed: Admin should be rejected on client login');

  console.log('\n=== TEST 2: Client attempts to log in via Admin Portal (/api/admin/login) ===');
  const clientOnAdminRes = await fetch(baseUrl + '/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'you@renthub.app',
      password: 'RenterPassword123!'
    })
  });
  const clientOnAdminData = await clientOnAdminRes.json();
  console.log('Status:', clientOnAdminRes.status, '(Expected 403)');
  console.log('Error message:', clientOnAdminData.error);
  if (clientOnAdminRes.status !== 403) throw new Error('Test 2 failed: Client should be rejected on admin login');

  console.log('\n=== TEST 3: Admin logs in -> Verify /api/me does NOT detect admin account ===');
  const adminLoginRes = await fetch(baseUrl + '/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin@renthub.app',
      password: 'AdminPassword123!'
    })
  });
  const adminCookie = adminLoginRes.headers.get('set-cookie');
  console.log('Admin login status:', adminLoginRes.status);

  // Calling /api/admin/me with admin cookie -> should succeed
  const adminMeRes = await fetch(baseUrl + '/api/admin/me', {
    headers: { cookie: adminCookie || '' }
  });
  const adminMeData = await adminMeRes.json();
  console.log('Admin Me User:', adminMeData.user?.email, 'Role:', adminMeData.user?.role);
  if (adminMeData.user?.role !== 'admin') throw new Error('Test 3a failed');

  // Calling /api/me (customer portal) with admin cookie -> MUST NOT detect admin account!
  const customerMeWithAdminCookie = await fetch(baseUrl + '/api/me', {
    headers: { cookie: adminCookie || '' }
  });
  const custMeData = await customerMeWithAdminCookie.json();
  console.log('/api/me response when logged in as admin:', custMeData.user);
  if (custMeData.user !== null) throw new Error('Test 3b failed: Customer portal must NOT detect admin account');

  console.log('\n=== TEST 4: Client logs in -> Verify client session & admin protection ===');
  const clientLoginRes = await fetch(baseUrl + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'you@renthub.app',
      password: 'RenterPassword123!'
    })
  });
  const clientCookie = clientLoginRes.headers.get('set-cookie');
  console.log('Client login status:', clientLoginRes.status);

  // Calling /api/me with client cookie -> should return client user
  const clientMeRes = await fetch(baseUrl + '/api/me', {
    headers: { cookie: clientCookie || '' }
  });
  const clientMeData = await clientMeRes.json();
  console.log('/api/me response for client:', clientMeData.user?.email, 'Role:', clientMeData.user?.role);
  if (!clientMeData.user || clientMeData.user.role === 'admin') throw new Error('Test 4a failed');

  // Calling /api/admin/me with client cookie -> MUST BE REJECTED
  const adminMeWithClient = await fetch(baseUrl + '/api/admin/me', {
    headers: { cookie: clientCookie || '' }
  });
  console.log('/api/admin/me with client cookie - Status:', adminMeWithClient.status, '(Expected 401)');
  if (adminMeWithClient.status !== 401) throw new Error('Test 4b failed');

  console.log('\n=== TEST 5: Session Expiration Handling ===');
  // Generate expired client token
  const expiredClientToken = await createClientToken({
    sub: 'cmvfhto7r0000xb7wpol6kv1h',
    email: 'you@renthub.app',
    name: 'You (Demo)',
    role: 'client'
  }, '0s');

  // Wait 100ms to ensure expiration
  await new Promise(r => setTimeout(r, 100));

  const expiredClientRes = await fetch(baseUrl + '/api/me', {
    headers: { cookie: `renthub_client_session=${expiredClientToken}` }
  });
  const expiredClientData = await expiredClientRes.json();
  console.log('Expired client /api/me status:', expiredClientRes.status, '(Expected 401)');
  console.log('Expired client error:', expiredClientData.error);
  if (expiredClientRes.status !== 401 || expiredClientData.error !== 'SESSION_EXPIRED') {
    throw new Error('Test 5a failed: Expired client session should return 401 SESSION_EXPIRED');
  }

  // Generate expired admin token
  const expiredAdminToken = await createAdminToken({
    sub: 'cmvfg4j1x0001xbsgogeds5vv',
    email: 'admin@renthub.app',
    name: 'Admin',
    role: 'admin'
  }, '0s');

  await new Promise(r => setTimeout(r, 100));

  const expiredAdminRes = await fetch(baseUrl + '/api/admin/me', {
    headers: { cookie: `renthub_admin_session=${expiredAdminToken}` }
  });
  const expiredAdminData = await expiredAdminRes.json();
  console.log('Expired admin /api/admin/me status:', expiredAdminRes.status, '(Expected 401)');
  console.log('Expired admin error:', expiredAdminData.error);
  if (expiredAdminRes.status !== 401 || expiredAdminData.error !== 'SESSION_EXPIRED') {
    throw new Error('Test 5b failed: Expired admin session should return 401 SESSION_EXPIRED');
  }

  console.log('\n=== TEST 6: Concurrent Independent Sessions ===');
  // Combine both client and admin cookies in one header
  const combinedCookies = `${clientCookie}; ${adminCookie}`;

  const cMe = await fetch(baseUrl + '/api/me', { headers: { cookie: combinedCookies } }).then(r => r.json());
  const aMe = await fetch(baseUrl + '/api/admin/me', { headers: { cookie: combinedCookies } }).then(r => r.json());

  console.log('Client portal user in concurrent session:', cMe.user?.email, '(Role: ' + cMe.user?.role + ')');
  console.log('Admin portal user in concurrent session:', aMe.user?.email, '(Role: ' + aMe.user?.role + ')');

  if (cMe.user?.email !== 'you@renthub.app' || aMe.user?.email !== 'admin@renthub.app') {
    throw new Error('Test 6 failed: Sessions should be completely isolated and concurrent');
  }

  console.log('\nALL SEPARATION & EXPIRATION TESTS PASSED PERFECTLY! ✅');
}

runTests().catch(err => {
  console.error('\n❌ ERROR:', err);
  process.exit(1);
});
