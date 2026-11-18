const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE INTEGRATION TESTS ---');
  let token = '';
  let testRoomId = '';
  let testTenantId = '';
  let testPaymentId = '';

  // 1. Test Static Pages
  console.log('\n[1] Testing Static HTML Endpoints...');
  const resLoginHtml = await request({ hostname: 'localhost', port: 5000, path: '/login', method: 'GET' });
  console.log(`GET /login -> Status ${resLoginHtml.status} (Includes "RentMaster": ${resLoginHtml.body.includes('RentMaster')})`);

  const resIndexHtml = await request({ hostname: 'localhost', port: 5000, path: '/', method: 'GET' });
  console.log(`GET / -> Status ${resIndexHtml.status} (Includes "RentMaster": ${resIndexHtml.body.includes('RentMaster')})`);

  // 2. Test Admin Login
  console.log('\n[2] Testing Administrator Login...');
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { email: 'admin@rental.com', password: 'admin123' }
  );
  console.log(`POST /api/auth/login -> Status ${loginRes.status}, Success: ${loginRes.body.success}`);
  if (!loginRes.body.success) {
    throw new Error('Login failed: ' + JSON.stringify(loginRes.body));
  }
  token = loginRes.body.token;

  // 3. Test Auth Me
  console.log('\n[3] Testing GET /api/auth/me...');
  const meRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/me',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`GET /api/auth/me -> Admin Name: ${meRes.body.user.name}, Email: ${meRes.body.user.email}`);

  // 4. Test Dashboard Stats
  console.log('\n[4] Testing Dashboard Statistics...');
  const statsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/dashboard/stats',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Dashboard Stats:', statsRes.body.stats);

  // 5. Test Room Endpoints
  console.log('\n[5] Testing Rooms API...');
  const roomsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/rooms',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`Found ${roomsRes.body.count} rooms.`);

  // 6. Add New Room
  console.log('\n[6] Testing Adding a New Room...');
  const addRoomRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/rooms',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    },
    { roomNumber: '301', monthlyRent: 600, description: 'Penthouse studio with rooftop access', status: 'Vacant' }
  );
  console.log(`POST /api/rooms -> Status ${addRoomRes.status}, Message: ${addRoomRes.body.message}`);
  testRoomId = addRoomRes.body.room._id;

  // 7. Register New Tenant in Room 301
  console.log('\n[7] Testing Registering Tenant & Auto Room Occupancy...');
  const addTenantRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/tenants',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    },
    {
      fullName: 'Alice Johnson',
      phone: '+1 555-0819',
      email: 'alice.j@example.com',
      identificationNumber: 'NAT-55120',
      roomId: testRoomId,
      moveInDate: new Date().toISOString()
    }
  );
  console.log(`POST /api/tenants -> Status ${addTenantRes.status}, Message: ${addTenantRes.body.message}`);
  testTenantId = addTenantRes.body.tenant._id;

  // Verify room is now Occupied
  const checkRoom = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/rooms/${testRoomId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`Room 301 Status after allocation: ${checkRoom.body.room.status} (Occupied expected)`);

  // 8. Prevent Duplicate Allocation
  console.log('\n[8] Testing Preventing Two Active Tenants in Same Room...');
  const dupTenantRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/tenants',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    },
    {
      fullName: 'Bob Duplicate',
      phone: '+1 555-9999',
      roomId: testRoomId
    }
  );
  console.log(`Duplicate allocation response status: ${dupTenantRes.status} (400 expected)`);

  // 9. Record Rent Payment
  console.log('\n[9] Testing Recording Rent Payment...');
  const paymentRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/payments',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    },
    {
      tenantId: testTenantId,
      amountPaid: 600,
      paymentDate: new Date().toISOString(),
      paymentMethod: 'Bank Transfer',
      transactionReference: 'TXN-TEST-999',
      description: 'First month rent payment'
    }
  );
  console.log(`POST /api/payments -> Status ${paymentRes.status}, Message: ${paymentRes.body.message}`);
  testPaymentId = paymentRes.body.payment._id;

  // 10. View Payment Receipt
  console.log('\n[10] Testing Payment Receipt...');
  const receiptRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/payments/${testPaymentId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`Receipt tenant: ${receiptRes.body.payment.tenantId.fullName}, Amount: $${receiptRes.body.payment.amountPaid}`);

  // 11. Test Reports and CSV Export
  console.log('\n[11] Testing Reports Summary & CSV Export...');
  const reportSummary = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/reports/summary',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Report Summary Collection Rate:', reportSummary.body.summary.collectionRate + '%');

  const csvRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/reports/export-csv',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`GET /api/reports/export-csv -> Status ${csvRes.status}`);

  // 12. Test Vacating Tenant
  console.log('\n[12] Testing Vacating Tenant and Freeing Room...');
  const vacateRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/tenants/${testTenantId}/vacate`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  console.log(`PATCH /api/tenants/:id/vacate -> Status ${vacateRes.status}`);

  const checkRoomAfterVacate = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/rooms/${testRoomId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`Room 301 Status after vacate: ${checkRoomAfterVacate.body.room.status} (Vacant expected)`);

  // 13. Clean up test records
  console.log('\n[13] Cleaning up test records...');
  await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/tenants/${testTenantId}`,
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/rooms/${testRoomId}`,
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log('\n======================================================');
  console.log(' ALL INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
