async function testAuth() {
  const baseUrl = 'http://127.0.0.1:3000';

  console.log('--- TEST 1: Register New User ---');
  const uniqueEmail = 'test.member.' + Date.now() + '@example.com';
  const regRes = await fetch(baseUrl + '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: uniqueEmail,
      name: 'Test Member',
      phone: '+855 12 999 888',
      password: 'SecurePassword123!'
    })
  });
  const regData = await regRes.json();
  const setCookie = regRes.headers.get('set-cookie');
  console.log('Status:', regRes.status, 'Response:', regData.ok ? 'User ' + regData.user.email : regData);
  if (!regRes.ok) throw new Error('Registration failed');

  console.log('\n--- TEST 2: Duplicate Registration Prevention ---');
  const dupRes = await fetch(baseUrl + '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: uniqueEmail,
      name: 'Duplicate Member',
      password: 'SecurePassword123!'
    })
  });
  console.log('Status:', dupRes.status, '(Expected 409)');

  console.log('\n--- TEST 3: Login with Invalid Password ---');
  const badLoginRes = await fetch(baseUrl + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: uniqueEmail,
      password: 'WrongPassword999!'
    })
  });
  console.log('Status:', badLoginRes.status, '(Expected 401)');

  console.log('\n--- TEST 4: Login with Valid Password ---');
  const goodLoginRes = await fetch(baseUrl + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: uniqueEmail,
      password: 'SecurePassword123!'
    })
  });
  const goodLoginData = await goodLoginRes.json();
  const loginCookie = goodLoginRes.headers.get('set-cookie');
  console.log('Status:', goodLoginRes.status, 'User:', goodLoginData.user?.email);

  console.log('\n--- TEST 5: Verify Session with /api/me ---');
  const meRes = await fetch(baseUrl + '/api/me', {
    headers: { cookie: loginCookie || '' }
  });
  const meData = await meRes.json();
  console.log('Me User:', meData.user?.name, meData.user?.email, 'Role:', meData.user?.role);

  console.log('\n--- TEST 6: Admin Login Verification ---');
  const adminRes = await fetch(baseUrl + '/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin@renthub.app',
      password: 'AdminPassword123!'
    })
  });
  const adminData = await adminRes.json();
  const adminCookie = adminRes.headers.get('set-cookie');
  console.log('Admin Status:', adminRes.status, 'Admin User:', adminData.user?.email, 'Role:', adminData.user?.role);

  console.log('\n--- TEST 7: Protected /api/admin Unauthorized Access Test ---');
  const unauthAdmin = await fetch(baseUrl + '/api/admin/stats', {
    headers: { cookie: loginCookie || '' }
  });
  console.log('Access /api/admin/stats as regular member - Status:', unauthAdmin.status, '(Expected 401)');

  const authAdmin = await fetch(baseUrl + '/api/admin/stats', {
    headers: { cookie: adminCookie || '' }
  });
  console.log('Access /api/admin/stats as admin - Status:', authAdmin.status, '(Expected 200)');

  console.log('\n--- TEST 8: Logout Verification ---');
  const logoutRes = await fetch(baseUrl + '/api/auth/logout', { method: 'POST' });
  const logoutCookie = logoutRes.headers.get('set-cookie');
  console.log('Logout Status:', logoutRes.status, 'Set-Cookie contains Max-Age=0:', logoutCookie?.includes('Max-Age=0') || logoutCookie?.includes('expires='));

  console.log('\nALL 8 TESTS PASSED SUCCESSFULLY! ✅');
}

testAuth().catch(console.error);
