const io = require('socket.io-client');
const http = require('http');
const path = require('path');
const jwt = require('../../file-suite-backend/node_modules/jsonwebtoken');

// Test utilities from client code
const { appendUniqueMessage, resolveMessageStatus } = require('./src/utils/chatUtils');

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
const chatId = [USER_A.id, USER_B.id].sort().join('_');

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

// Client simulator mimicking Chat.jsx state and handlers
class ClientSimulator {
  constructor(user, token) {
    this.user = user;
    this.token = token;
    this.messages = [];
    this.isChatOpen = false;
    this.socket = null;
    this.receivedStatusUpdates = [];
  }

  connect() {
    this.socket = io(BACKEND_URL, {
      auth: { token: this.token },
      transports: ['websocket']
    });

    this.socket.on('receive_private_message', (message) => {
      const isReceiver = String(message.receiverId) === String(this.user.id);
      const isSender = String(message.senderId) === String(this.user.id);

      // 1. Immediately acknowledge delivery if this client is the receiver
      if (isReceiver && message._id && !String(message._id).startsWith('local-')) {
        this.socket.emit('message_delivered', {
          messageId: String(message._id),
          conversationId: message.conversationId,
          chatId: message.chatId
        });
      }

      // 2. If chat is actively open on receiver, immediately mark as read
      if (this.isChatOpen && isReceiver && message.conversationId) {
        this.socket.emit('mark_messages_read', {
          conversationId: message.conversationId
        });
      }

      // 3. Append/reconcile in local messages
      const incomingStatus = (this.isChatOpen && isReceiver)
        ? 'read'
        : (message.status || (isSender ? 'sent' : 'delivered'));

      const newMessage = {
        ...message,
        type: isSender ? 'sent' : 'received',
        status: incomingStatus
      };

      this.messages = appendUniqueMessage(this.messages, newMessage);
    });

    this.socket.on('message_status_updated', (update) => {
      this.receivedStatusUpdates.push(update);
      this.messages = this.messages.map((m) => {
        const matchesId = String(m._id) === String(update.messageId);
        const matchesLocalId = Boolean(update.localId && m.localId === update.localId);
        if (matchesId || matchesLocalId) {
          return {
            ...m,
            _id: matchesId ? m._id : update.messageId,
            status: resolveMessageStatus(m.status, update.status),
            deliveredAt: update.deliveredAt || m.deliveredAt,
            readAt: update.readAt || m.readAt
          };
        }
        return m;
      });
    });

    this.socket.on('messages_read', (payload) => {
      this.messages = this.messages.map((m) => {
        const isSentByMe = String(m.senderId) === String(this.user.id);
        if (isSentByMe && m.status !== 'read') {
          return {
            ...m,
            status: 'read',
            readAt: payload.readAt || new Date()
          };
        }
        return m;
      });
    });

    return new Promise((resolve) => {
      this.socket.on('connect', () => {
        resolve();
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  async sendMessage(toUserId, text) {
    const localId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const optimisticMessage = {
      _id: localId,
      localId,
      chatId,
      senderId: this.user.id,
      receiverId: toUserId,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'sent',
      status: 'sending'
    };

    this.messages = appendUniqueMessage(this.messages, optimisticMessage);

    const payload = {
      chatId,
      senderId: this.user.id,
      receiverId: toUserId,
      text,
      time: optimisticMessage.time,
      localId
    };

    return new Promise((resolve, reject) => {
      this.socket.emit('send_private_message', payload, (res) => {
        if (res && res.success) {
          // Reconcile saved message in local state
          const savedMsg = res.message || {
            _id: res.messageId,
            conversationId: res.conversationId,
            status: res.status || 'sent',
            chatId,
            senderId: this.user.id,
            receiverId: toUserId,
            text,
            time: optimisticMessage.time
          };

          this.messages = appendUniqueMessage(this.messages, {
            ...savedMsg,
            localId,
            type: 'sent',
            status: savedMsg.status || 'sent'
          });
          resolve(savedMsg);
        } else {
          reject(new Error(res?.reason || 'Send failed'));
        }
      });
    });
  }

  openChat(conversationId) {
    this.isChatOpen = true;
    if (this.socket && conversationId) {
      this.socket.emit('mark_messages_read', { conversationId });
    }
  }

  async fetchHistory() {
    const res = await apiRequest('GET', `/api/messages/${chatId}`, null, this.token);
    const serverMessages = res.data?.messages || [];
    this.messages = serverMessages.map(m => ({
      ...m,
      type: String(m.senderId) === String(this.user.id) ? 'sent' : 'received',
      status: m.status || 'sent'
    }));

    // If this client is receiver, confirm delivery for unconfirmed messages
    const unconfirmed = serverMessages.filter(m => String(m.receiverId) === String(this.user.id) && m.status === 'sent');
    if (unconfirmed.length > 0 && this.socket) {
      this.socket.emit('messages_delivered', { messageIds: unconfirmed.map(m => m._id) });
    }

    return this.messages;
  }
}

async function runVerification() {
  console.log('====================================================');
  console.log('STARTING THOROUGH 2-ACCOUNT MESSAGE TICK VERIFICATION');
  console.log('====================================================\n');

  const clientA = new ClientSimulator(USER_A, tokenA);
  const clientB = new ClientSimulator(USER_B, tokenB);

  console.log('1. Connecting Client A (vaishnavi) and Client B (jay)...');
  await clientA.connect();
  await clientB.connect();
  console.log('✓ Both clients connected successfully via socket.\n');

  await delay(300);

  // -------------------------------------------------------------
  // TEST 1: ONLINE DELIVERY & READ TICK LIFECYCLE
  // -------------------------------------------------------------
  console.log('--- TEST 1: Online Message Lifecycle (1 grey -> 2 grey -> 2 blue) ---');
  clientB.isChatOpen = false; // B has chat NOT yet open (in other view)

  const text1 = `Hello B online ${Date.now()}`;
  console.log('Account A sending message to B:', text1);
  const savedMsg1 = await clientA.sendMessage(USER_B.id, text1);

  // Step 1: Confirm 1 grey tick immediately upon save
  const msgStateOnAAfterSave = clientA.messages.find(m => m._id === savedMsg1._id || m.localId === savedMsg1.localId);
  console.log('Account A local status after save:', msgStateOnAAfterSave?.status);
  if (!msgStateOnAAfterSave) {
    throw new Error('TEST 1 FAILED: Message not found in Client A local state');
  }

  // Step 2: Confirm 2 grey ticks after B receives it
  console.log('Waiting for Client B delivery acknowledgment and real-time status update on A...');
  await delay(500);

  const msgStateOnAAfterDelivery = clientA.messages.find(m => m._id === savedMsg1._id);
  console.log('Account A real-time status after delivery:', msgStateOnAAfterDelivery?.status);
  if (msgStateOnAAfterDelivery?.status !== 'delivered') {
    throw new Error(`TEST 1 FAILED: Expected status "delivered" (2 grey ticks), got "${msgStateOnAAfterDelivery?.status}"`);
  }
  console.log('✓ Step 2 Verified: Two grey ticks confirmed in real time on Sender A without refresh.');

  // Verify DB state for delivered
  const dbCheck1 = await apiRequest('GET', `/api/messages/${chatId}`, null, tokenA);
  const dbMsg1 = (dbCheck1.data?.messages || []).find(m => m._id === savedMsg1._id);
  if (dbMsg1?.status !== 'delivered') {
    throw new Error(`TEST 1 FAILED: Database status is not delivered, got "${dbMsg1?.status}"`);
  }
  console.log('✓ Database confirmed status: "delivered" (persisted).');

  // Step 3: Account B opens conversation -> 2 blue ticks on A
  console.log('Account B opening conversation (reading message)...');
  clientB.openChat(savedMsg1.conversationId);
  await apiRequest('POST', `/api/messages/conversation/${savedMsg1.conversationId}/read`, null, tokenB);

  await delay(500);

  const msgStateOnAAfterRead = clientA.messages.find(m => m._id === savedMsg1._id);
  console.log('Account A real-time status after read:', msgStateOnAAfterRead?.status);
  if (msgStateOnAAfterRead?.status !== 'read') {
    throw new Error(`TEST 1 FAILED: Expected status "read" (2 blue ticks), got "${msgStateOnAAfterRead?.status}"`);
  }
  console.log('✓ Step 3 Verified: Two blue ticks confirmed in real time on Sender A without refresh.');

  // Step 4: Refresh both accounts and verify persisted status remains "read"
  console.log('Refreshing both accounts (simulating full page reload)...');
  await clientA.fetchHistory();
  await clientB.fetchHistory();

  const msgOnARefreshed = clientA.messages.find(m => m._id === savedMsg1._id);
  const msgOnBRefreshed = clientB.messages.find(m => m._id === savedMsg1._id);
  if (msgOnARefreshed?.status !== 'read' || msgOnBRefreshed?.status !== 'read') {
    throw new Error(`TEST 1 FAILED: Status not persisted after refresh: A=${msgOnARefreshed?.status}, B=${msgOnBRefreshed?.status}`);
  }
  console.log('✓ Step 4 Verified: Persisted "read" status remains after refresh on both accounts.');
  console.log('>>> TEST 1 PASSED! <<<\n');

  // -------------------------------------------------------------
  // TEST 2: OFFLINE & RECONNECT DELIVERY & READ LIFECYCLE
  // -------------------------------------------------------------
  console.log('--- TEST 2: Recipient Offline -> Reconnect -> Read Lifecycle ---');
  console.log('Disconnecting Client B (simulating B going offline)...');
  clientB.disconnect();
  clientB.isChatOpen = false;
  await delay(600);

  const text2 = `Hello B while offline ${Date.now()}`;
  console.log('Account A sending message while B is offline:', text2);
  const savedMsg2 = await clientA.sendMessage(USER_B.id, text2);

  // Initial status must be "sent" (1 grey tick)
  const msg2AAfterSave = clientA.messages.find(m => m._id === savedMsg2._id);
  console.log('Account A status while B is offline:', msg2AAfterSave?.status);
  if (msg2AAfterSave?.status !== 'sent') {
    throw new Error(`TEST 2 FAILED: Expected initial status "sent" (1 grey tick), got "${msg2AAfterSave?.status}"`);
  }
  console.log('✓ Step 1 Verified: One grey tick confirmed while recipient is offline.');

  // Confirm DB has status: "sent"
  const dbCheck2 = await apiRequest('GET', `/api/messages/${chatId}`, null, tokenA);
  const dbMsg2 = (dbCheck2.data?.messages || []).find(m => m._id === savedMsg2._id);
  if (dbMsg2?.status !== 'sent' || dbMsg2?.deliveredAt !== null) {
    throw new Error(`TEST 2 FAILED: DB status must be "sent" with null deliveredAt, got: ${JSON.stringify(dbMsg2)}`);
  }
  console.log('✓ Database confirmed status: "sent" and deliveredAt is null.');

  // Reconnect Client B
  console.log('Reconnecting Client B (B comes back online)...');
  await clientB.connect();
  console.log('Client B reconnected. B fetching/receiving pending messages...');
  await clientB.fetchHistory();

  await delay(600);

  // A must now see "delivered" (2 grey ticks) in real time without refreshing
  const msg2AAfterBOnline = clientA.messages.find(m => m._id === savedMsg2._id);
  console.log('Account A status after B reconnected and confirmed delivery:', msg2AAfterBOnline?.status);
  if (msg2AAfterBOnline?.status !== 'delivered') {
    throw new Error(`TEST 2 FAILED: Expected "delivered" (2 grey ticks) after reconnect, got "${msg2AAfterBOnline?.status}"`);
  }
  console.log('✓ Step 2 Verified: Two grey ticks confirmed in real time after B reconnects.');

  // Disconnect B again to verify delivery status NEVER regresses
  console.log('Disconnecting B again to ensure "delivered" status does NOT revert...');
  clientB.disconnect();
  await delay(500);

  const msg2APersistCheck = clientA.messages.find(m => m._id === savedMsg2._id);
  if (msg2APersistCheck?.status !== 'delivered') {
    throw new Error(`TEST 2 FAILED: Delivered status regressed after recipient disconnected: ${msg2APersistCheck?.status}`);
  }
  console.log('✓ Delivered status stably maintained while recipient disconnected.');

  // Reconnect B and open chat -> 2 blue ticks on A
  console.log('Reconnecting B and B opens chat...');
  await clientB.connect();
  clientB.openChat(savedMsg2.conversationId);
  await apiRequest('POST', `/api/messages/conversation/${savedMsg2.conversationId}/read`, null, tokenB);

  await delay(600);

  const msg2AAfterRead = clientA.messages.find(m => m._id === savedMsg2._id);
  console.log('Account A status after B opens chat:', msg2AAfterRead?.status);
  if (msg2AAfterRead?.status !== 'read') {
    throw new Error(`TEST 2 FAILED: Expected "read" (2 blue ticks), got "${msg2AAfterRead?.status}"`);
  }
  console.log('✓ Step 3 Verified: Two blue ticks confirmed in real time after B reads message.');

  // Refresh both accounts
  await clientA.fetchHistory();
  await clientB.fetchHistory();
  const msg2ARefresh = clientA.messages.find(m => m._id === savedMsg2._id);
  if (msg2ARefresh?.status !== 'read') {
    throw new Error(`TEST 2 FAILED: Status did not persist as "read" after refresh: ${msg2ARefresh?.status}`);
  }
  console.log('✓ Step 4 Verified: Persisted "read" status remains after refresh on both accounts.');
  console.log('>>> TEST 2 PASSED! <<<\n');

  // -------------------------------------------------------------
  // TEST 3: SENDER OPENING CHAT DOES NOT MARK OUTGOING MESSAGES READ
  // -------------------------------------------------------------
  console.log('--- TEST 3: Sender opening chat does NOT mark outgoing messages as read ---');
  clientB.disconnect();
  clientB.isChatOpen = false;
  await delay(400);

  const text3 = `Test sender open chat ${Date.now()}`;
  const savedMsg3 = await clientA.sendMessage(USER_B.id, text3);

  // Sender A opens their own conversation
  console.log('Sender A opening conversation...');
  clientA.openChat(savedMsg3.conversationId);
  await apiRequest('POST', `/api/messages/conversation/${savedMsg3.conversationId}/read`, null, tokenA);

  await delay(400);

  // Message must STILL be "sent" (1 grey tick), NOT "read"!
  const checkMsg3 = await apiRequest('GET', `/api/messages/${chatId}`, null, tokenA);
  const dbMsg3 = (checkMsg3.data?.messages || []).find(m => m._id === savedMsg3._id);
  console.log('Status of message after sender opened conversation:', dbMsg3?.status);
  if (dbMsg3?.status !== 'sent') {
    throw new Error(`TEST 3 FAILED: Sender opening chat marked their own outgoing message as "${dbMsg3?.status}"! Must remain "sent".`);
  }
  console.log('✓ TEST 3 Verified: Sender opening conversation does NOT mark outgoing messages as read.');
  console.log('>>> TEST 3 PASSED! <<<\n');

  // -------------------------------------------------------------
  // TEST 4: REST DELIVERY CONFIRMATION & NO DUPLICATION
  // -------------------------------------------------------------
  console.log('--- TEST 4: Batch REST delivery acknowledgment and no duplication ---');
  await clientB.connect();
  const delivRes = await apiRequest('POST', '/api/messages/delivered', {
    messageIds: [savedMsg3._id]
  }, tokenB);

  console.log('REST delivered endpoint response:', delivRes.status, delivRes.data);
  if (delivRes.status !== 200 || !delivRes.data?.success) {
    throw new Error(`TEST 4 FAILED: REST delivery confirmation failed: ${JSON.stringify(delivRes)}`);
  }

  await delay(400);

  // Verify DB state is now "delivered"
  const checkMsg3AfterDeliv = await apiRequest('GET', `/api/messages/${chatId}`, null, tokenA);
  const updatedMsg3 = (checkMsg3AfterDeliv.data?.messages || []).find(m => m._id === savedMsg3._id);
  if (updatedMsg3?.status !== 'delivered') {
    throw new Error(`TEST 4 FAILED: Message status not updated to delivered via REST endpoint: ${updatedMsg3?.status}`);
  }
  console.log('✓ TEST 4 Verified: REST delivery confirmation endpoint updated message to "delivered"');

  // Verify uniqueness / no duplicates in message history
  const allHistory = (checkMsg3AfterDeliv.data?.messages || []);
  const ids = allHistory.map(m => String(m._id));
  const uniqueIds = new Set(ids);
  if (ids.length !== uniqueIds.size) {
    throw new Error(`TEST 4 FAILED: Duplicate messages found in history: total=${ids.length}, unique=${uniqueIds.size}`);
  }
  console.log(`✓ TEST 4 Verified: All ${ids.length} messages in history are unique with no duplication.`);
  console.log('>>> TEST 4 PASSED! <<<\n');

  // Clean up
  clientA.disconnect();
  clientB.disconnect();

  console.log('====================================================');
  console.log('ALL VERIFICATION TESTS PASSED SUCCESSFULLY! (TESTS 1, 2, 3, 4)');
  console.log('====================================================');
  process.exit(0);
}

runVerification().catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
