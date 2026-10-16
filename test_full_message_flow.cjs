const io = require('socket.io-client');
const http = require('http');
const jwt = require('../../file-suite-backend/node_modules/jsonwebtoken');

const JWT_SECRET = 'filesuite123';
const BACKEND_URL = 'http://localhost:3005';

const USER_A = {
  id: '6a71071b1ef2b200bcfa4180',
  name: 'vaishnavi',
  email: 'vaish@gmail.com'
};

const USER_B = {
  id: '6a74196907bce4f712ac0d4d',
  name: 'jay',
  email: 'jay@gmail.com'
};

const tokenA = jwt.sign({ id: USER_A.id }, JWT_SECRET, { expiresIn: '1d' });
const tokenB = jwt.sign({ id: USER_B.id }, JWT_SECRET, { expiresIn: '1d' });

function apiRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BACKEND_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('=== STARTING FULL END-TO-END VERIFICATION ===\n');

  // Connect sockets
  console.log('Connecting Socket A (User A: vaishnavi)...');
  const socketA = io(BACKEND_URL, { auth: { token: tokenA } });
  
  console.log('Connecting Socket B (User B: jay)...');
  let socketB = io(BACKEND_URL, { auth: { token: tokenB } });

  await new Promise((resolve, reject) => {
    let aConnected = false;
    let bConnected = false;
    socketA.on('connect', () => {
      console.log('Socket A connected');
      socketA.emit('join_user_room', USER_A.id);
      aConnected = true;
      if (aConnected && bConnected) resolve();
    });
    socketB.on('connect', () => {
      console.log('Socket B connected');
      socketB.emit('join_user_room', USER_B.id);
      bConnected = true;
      if (aConnected && bConnected) resolve();
    });
    setTimeout(() => {
      if (!aConnected || !bConnected) reject(new Error('Socket connection timed out'));
    }, 5000);
  });

  await delay(500);

  // -------------------------------------------------------------
  // TEST A: Message Persistence (Send & Save & Refresh/Load)
  // -------------------------------------------------------------
  console.log('\n--- TEST A: Message Persistence ---');
  const testAMsgText = `Test A persistence msg ${Date.now()}`;
  const localIdA = `local-test-a-${Date.now()}`;

  let testAMessageReceivedByB = null;
  const receivePromiseA = new Promise((resolve) => {
    socketB.once('receive_private_message', (msg) => {
      console.log('User B received private message:', msg.text, 'id:', msg._id);
      testAMessageReceivedByB = msg;
      resolve(msg);
    });
  });

  console.log('User A sending private message...');
  const ackResultA = await new Promise((resolve) => {
    socketA.emit('send_private_message', {
      senderId: USER_A.id,
      receiverId: USER_B.id,
      text: testAMsgText,
      localId: localIdA
    }, (res) => {
      console.log('User A received send acknowledgment:', res);
      resolve(res);
    });
  });

  if (!ackResultA || !ackResultA.success || !ackResultA.message) {
    throw new Error('Test A FAILED: Acknowledgment not successful: ' + JSON.stringify(ackResultA));
  }
  const savedMsgA = ackResultA.message;
  console.log('Message saved with DB _id:', savedMsgA._id, 'localId reconciled:', ackResultA.localId);

  await receivePromiseA;
  if (!testAMessageReceivedByB || testAMessageReceivedByB._id !== savedMsgA._id) {
    throw new Error('Test A FAILED: User B did not receive the expected saved message');
  }

  const getMsgList = (res) => (res.data?.messages || res.data || []);

  // Simulate refresh for User A (Fetch via REST API)
  const chatId = [USER_A.id, USER_B.id].sort().join('_');
  console.log(`Simulating User A refresh: GET /api/messages/${chatId}`);
  const fetchResA = await apiRequest('GET', `/api/messages/${chatId}`, null, tokenA);
  const foundInA = getMsgList(fetchResA).find(m => m._id === savedMsgA._id);
  if (!foundInA) {
    throw new Error('Test A FAILED: Message not found in User A message history after refresh');
  }
  console.log('Test A Verified: Message persisted and visible to User A after simulated refresh');

  // Simulate refresh for User B (Fetch via REST API)
  console.log(`Simulating User B refresh: GET /api/messages/${chatId}`);
  const fetchResB = await apiRequest('GET', `/api/messages/${chatId}`, null, tokenB);
  const foundInB = getMsgList(fetchResB).find(m => m._id === savedMsgA._id);
  if (!foundInB) {
    throw new Error('Test A FAILED: Message not found in User B message history after refresh');
  }
  console.log('Test A Verified: Message persisted and visible to User B after simulated refresh');
  console.log('>>> TEST A PASSED! <<<\n');

  // -------------------------------------------------------------
  // TEST B: Delivery Ticks (1 grey tick -> 2 grey ticks upon delivery)
  // -------------------------------------------------------------
  console.log('--- TEST B: Delivery Ticks ---');
  let statusUpdateDelivered = null;
  const statusDeliveredPromise = new Promise((resolve) => {
    socketA.on('message_status_updated', function onDelivered(update) {
      if (update.messageId === savedMsgA._id || update.localId === localIdA) {
        console.log('User A received status update:', update);
        statusUpdateDelivered = update;
        socketA.off('message_status_updated', onDelivered);
        resolve(update);
      }
    });
  });

  console.log('User B sending message_delivered acknowledgment for message:', savedMsgA._id);
  socketB.emit('message_delivered', {
    messageId: savedMsgA._id,
    conversationId: savedMsgA.conversationId,
    senderId: USER_A.id,
    receiverId: USER_B.id,
    localId: localIdA
  });

  await statusDeliveredPromise;
  if (!statusUpdateDelivered || statusUpdateDelivered.status !== 'delivered') {
    throw new Error('Test B FAILED: Did not receive status: delivered on User A');
  }

  // Verify DB state
  const checkDeliveredDB = await apiRequest('GET', `/api/messages/${chatId}`, null, tokenA);
  const dbMsgB = getMsgList(checkDeliveredDB).find(m => m._id === savedMsgA._id);
  if (!dbMsgB || dbMsgB.status !== 'delivered') {
    throw new Error('Test B FAILED: Status in DB is not delivered, got: ' + (dbMsgB ? dbMsgB.status : 'null'));
  }
  console.log('Test B Verified: DB status updated to "delivered" (2 grey ticks)');
  console.log('>>> TEST B PASSED! <<<\n');

  // -------------------------------------------------------------
  // TEST C: Read Ticks (2 grey ticks -> 2 blue ticks)
  // -------------------------------------------------------------
  console.log('--- TEST C: Read Ticks ---');
  let statusUpdateRead = null;
  const statusReadPromise = new Promise((resolve) => {
    socketA.on('message_status_updated', function onRead(update) {
      if (update.messageId === savedMsgA._id || update.localId === localIdA) {
        if (update.status === 'read') {
          console.log('User A received read status update:', update);
          statusUpdateRead = update;
          socketA.off('message_status_updated', onRead);
          resolve(update);
        }
      }
    });
  });

  console.log('User B opening conversation and emitting mark_messages_read...');
  socketB.emit('mark_messages_read', {
    conversationId: savedMsgA.conversationId,
    readerId: USER_B.id,
    otherUserId: USER_A.id
  });

  await statusReadPromise;
  if (!statusUpdateRead || statusUpdateRead.status !== 'read') {
    throw new Error('Test C FAILED: User A did not receive status: read');
  }

  // Verify DB state
  const checkReadDB = await apiRequest('GET', `/api/messages/${chatId}`, null, tokenA);
  const dbMsgC = getMsgList(checkReadDB).find(m => m._id === savedMsgA._id);
  if (!dbMsgC || dbMsgC.status !== 'read') {
    throw new Error('Test C FAILED: Status in DB is not read, got: ' + (dbMsgC ? dbMsgC.status : 'null'));
  }
  console.log('Test C Verified: DB status updated to "read" (2 blue ticks)');
  console.log('>>> TEST C PASSED! <<<\n');

  // -------------------------------------------------------------
  // TEST D: Offline & Reconnect Pending Messages
  // -------------------------------------------------------------
  console.log('--- TEST D: Offline & Reconnect Pending Delivery ---');
  console.log('Disconnecting User B socket (simulating offline)...');
  socketB.disconnect();
  await delay(1000);

  const testDMsgText = `Test D offline msg ${Date.now()}`;
  const localIdD = `local-test-d-${Date.now()}`;

  console.log('User A sending message while User B is offline...');
  const ackResultD = await new Promise((resolve) => {
    socketA.emit('send_private_message', {
      senderId: USER_A.id,
      receiverId: USER_B.id,
      text: testDMsgText,
      localId: localIdD
    }, (res) => {
      resolve(res);
    });
  });

  const savedMsgD = ackResultD.message;
  console.log('Offline message saved. Initial DB status:', savedMsgD.status);
  if (savedMsgD.status !== 'sent') {
    throw new Error(`Test D FAILED: Initial status when offline should be 'sent' (1 grey tick), got ${savedMsgD.status}`);
  }

  // Reconnect User B
  console.log('Reconnecting User B socket...');
  socketB = io(BACKEND_URL, { auth: { token: tokenB } });

  let pendingMsgReceived = null;
  const pendingPromise = new Promise((resolve) => {
    socketB.on('receive_private_message', (msg) => {
      if (msg._id === savedMsgD._id) {
        console.log('User B received pending message upon reconnection:', msg._id);
        pendingMsgReceived = msg;
        // User B acknowledges delivery immediately
        socketB.emit('message_delivered', {
          messageId: msg._id,
          conversationId: msg.conversationId,
          senderId: USER_A.id,
          receiverId: USER_B.id,
          localId: localIdD
        });
        resolve(msg);
      }
    });
  });

  let statusDeliveredD = null;
  const statusDeliveredDPromise = new Promise((resolve) => {
    socketA.on('message_status_updated', function onDelivD(update) {
      if (update.messageId === savedMsgD._id || update.localId === localIdD) {
        if (update.status === 'delivered') {
          console.log('User A received status update -> delivered for reconnected message');
          statusDeliveredD = update;
          socketA.off('message_status_updated', onDelivD);
          resolve(update);
        }
      }
    });
  });

  socketB.emit('join_user_room', USER_B.id);

  await pendingPromise;
  await statusDeliveredDPromise;

  // Disconnect User B again to ensure already-delivered status does NOT revert to sent!
  console.log('Disconnecting User B again to test persistence of delivered status...');
  socketB.disconnect();
  await delay(1000);

  const checkDelivPersistDB = await apiRequest('GET', `/api/messages/${chatId}`, null, tokenA);
  const dbMsgD = getMsgList(checkDelivPersistDB).find(m => m._id === savedMsgD._id);
  if (!dbMsgD || dbMsgD.status !== 'delivered') {
    throw new Error('Test D FAILED: Delivered status reverted or lost after disconnect: ' + (dbMsgD ? dbMsgD.status : 'null'));
  }
  console.log('Test D Verified: Message status remains "delivered" (2 grey ticks) even after recipient disconnects');
  console.log('>>> TEST D PASSED! <<<\n');

  // -------------------------------------------------------------
  // TEST E: REST Send Fallback & Rapid Sending
  // -------------------------------------------------------------
  console.log('--- TEST E: REST Fallback & Rapid Sending ---');
  // Reconnect B
  socketB = io(BACKEND_URL, { auth: { token: tokenB } });
  await new Promise(r => socketB.on('connect', () => {
    socketB.emit('join_user_room', USER_B.id);
    r();
  }));

  const testEMsgText1 = `Test E rapid 1 ${Date.now()}`;
  const testEMsgText2 = `Test E rapid 2 ${Date.now()}`;

  let bReceivedE1 = null;
  let bReceivedE2 = null;
  socketB.on('receive_private_message', (msg) => {
    if (msg.text === testEMsgText1) bReceivedE1 = msg;
    if (msg.text === testEMsgText2) bReceivedE2 = msg;
  });

  console.log('Sending message 1 via REST API POST /api/messages...');
  const restRes1 = await apiRequest('POST', '/api/messages', {
    receiverId: USER_B.id,
    conversationId: chatId,
    text: testEMsgText1,
    localId: `local-rest-1-${Date.now()}`
  }, tokenA);

  console.log('REST Response 1:', restRes1.status, restRes1.data?.message?.text);
  if (restRes1.status !== 201 && restRes1.status !== 200) {
    throw new Error('Test E FAILED: REST send returned status ' + restRes1.status);
  }

  console.log('Sending message 2 via REST API POST /api/messages...');
  const restRes2 = await apiRequest('POST', '/api/messages', {
    receiverId: USER_B.id,
    conversationId: chatId,
    text: testEMsgText2,
    localId: `local-rest-2-${Date.now()}`
  }, tokenA);

  console.log('REST Response 2:', restRes2.status, restRes2.data?.message?.text);

  await delay(1000);

  if (!bReceivedE1 || !bReceivedE2) {
    throw new Error('Test E FAILED: Recipient did not receive REST-sent messages via socket broadcast');
  }
  console.log('Test E Verified: Both REST messages delivered via socket to recipient in real time');

  // Verify message history order
  const checkHistory = await apiRequest('GET', `/api/messages/${chatId}`, null, tokenA);
  const msgs = getMsgList(checkHistory);
  const idx1 = msgs.findIndex(m => m.text === testEMsgText1);
  const idx2 = msgs.findIndex(m => m.text === testEMsgText2);
  if (idx1 === -1 || idx2 === -1 || idx1 > idx2) {
    throw new Error(`Test E FAILED: Incorrect message order: idx1=${idx1}, idx2=${idx2}`);
  }
  console.log(`Test E Verified: Correct message order preserved (msg1 at index ${idx1}, msg2 at index ${idx2})`);
  console.log('>>> TEST E PASSED! <<<\n');

  // Clean up sockets
  socketA.disconnect();
  socketB.disconnect();

  console.log('====================================================');
  console.log('ALL INTEGRATION TESTS PASSED SUCCESSFULLY! (TESTS A, B, C, D, E)');
  console.log('====================================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ INTEGRATION TEST FAILED:', err);
  process.exit(1);
});
