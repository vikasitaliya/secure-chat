// ====================== CONFIGURATION ======================
const socket = io(window.location.origin);

// ====================== STATE ======================
let myUsername = null;
let myKeyPair = null;
let peers = {}; // { peerId: { encryptionKey, dataChannel, peerConnection, walletAddress, pendingInvites, username }}
let groups = {}; // { groupId: { name, members, key }}
let currentGroupId = null;
let currentPeerId = null; // ID of the currently selected one-to-one chat partner
let receivingFile = null; // file reception state
let receivingFileChatId = null; // which chat the incoming file belongs to
let lastUserList = [];
let typingTimeout = null;

// BLE
let bleEnabled = false;
let bleAdvertising = false;
let bleScanning = false;
let bleConnectedDeviceId = null;
const peerKeys = {};
const BLE_SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
const BLE_CHARACTERISTIC_UUID = 'abcdef01-1234-1234-1234-123456789abc';

// Payments
let userWallet = null;
let provider = null;
const currentNetwork = { chainId: 11155111, name: 'Sepolia', rpcUrl: '/rpc' };

// Hyperswitch
const HYPERSWITCH_PUBLISHABLE_KEY = 'pk_snd_24a92d39a6a14c36ab6bd247cdf7d5d4';
let hyperscriptInstance = null;
let hyperscriptElements = null;

// DOM Elements
const loginDiv = document.getElementById('login');
const mainDiv = document.getElementById('main');
const usernameInput = document.getElementById('username');
const joinBtn = document.getElementById('joinBtn');
const userList = document.getElementById('userList');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const fileInput = document.getElementById('fileInput');
const sendFileBtn = document.getElementById('sendFileBtn');
const progressDiv = document.getElementById('progress');
const enableBLEBtn = document.getElementById('enableBLEBtn');
const disableBLEBtn = document.getElementById('disableBLEBtn');
const nearbyDevicesDiv = document.getElementById('nearbyDevices');
const walletAddressSpan = document.getElementById('wallet-address');
const networkNameSpan = document.getElementById('network-name');
const tokenSelect = document.getElementById('token-select');
const paymentAmountInput = document.getElementById('payment-amount');
const recipientAddressInput = document.getElementById('recipient-address');
const sendPrivatePaymentBtn = document.getElementById('send-private-payment');
const paymentStatusDiv = document.getElementById('payment-status');
const balanceListDiv = document.getElementById('balance-list');
const refreshBalancesBtn = document.getElementById('refresh-balances');
const hyperswitchPayBtn = document.getElementById('hyperswitch-pay-button');
const hyperswitchStatus = document.getElementById('hyperswitch-status');
const hyperswitchElementDiv = document.getElementById('hyperswitch-payment-element');
const typingIndicator = document.getElementById('typing-indicator');

// Group elements
const createGroupBtn = document.getElementById('createGroupBtn');
const groupListDiv = document.getElementById('groupList');
const groupChatHeader = document.getElementById('groupChatHeader');
const currentGroupNameSpan = document.getElementById('currentGroupName');
const leaveGroupBtn = document.getElementById('leaveGroupBtn');
const groupModal = document.getElementById('groupModal');
const modalUserList = document.getElementById('modalUserList');
const groupNameInput = document.getElementById('groupNameInput');
const createGroupConfirm = document.getElementById('createGroupConfirm');
const cancelGroupModal = document.getElementById('cancelGroupModal');

// ==================== PERSISTENT STORAGE ====================
const db = localforage.createInstance({
  name: 'nexusChat'
});

async function saveMessage(chatId, message) {
  let messages = await db.getItem(chatId) || [];
  messages.push(message);
  await db.setItem(chatId, messages);
}

async function loadMessages(chatId) {
  return await db.getItem(chatId) || [];
}

// Helper to generate a stable chat ID for one-to-one chats
function getOneToOneChatId(peerUsername) {
  const participants = [myUsername, peerUsername].sort();
  return `chat:${participants[0]}:${participants[1]}`;
}

// ==================== MESSAGE RENDERING ====================
function appendMessage(text, sender, senderName, isGroup = false, chatId = null, delivered = false, read = false) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${sender}`;
  let statusIcon = '';
  if (sender === 'me') {
    if (read) statusIcon = ' ✓✓';
    else if (delivered) statusIcon = ' ✓';
    // else nothing (sending)
  }
  let displayName = sender === 'me' ? 'You' : senderName;
  if (isGroup) {
    msgDiv.innerHTML = `<div><strong>${displayName}:</strong> ${text} <span class="status">${statusIcon}</span></div><div class="timestamp">${new Date().toLocaleTimeString()}</div>`;
  } else {
    msgDiv.innerHTML = `<div>${text} <span class="status">${statusIcon}</span></div><div class="timestamp">${new Date().toLocaleTimeString()}</div>`;
  }
  messagesDiv.appendChild(msgDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function appendFileMessage(metadata, sender, senderName, isGroup, chatId, delivered = false, read = false) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${sender}`;
  const fileSize = (metadata.size / 1024).toFixed(1) + ' KB';
  let icon = ' 📄';
  if (metadata.mime.startsWith('image/')) icon = ' 🖼️';
  else if (metadata.mime.startsWith('video/')) icon = ' 🎥';
  else if (metadata.mime.startsWith('audio/')) icon = ' 🎵';

  let statusIcon = '';
  if (sender === 'me') {
    if (read) statusIcon = ' ✓✓';
    else if (delivered) statusIcon = ' ✓';
  }

  let displayName = sender === 'me' ? 'You' : senderName;
  if (isGroup) {
    msgDiv.innerHTML = `<div><strong>${displayName}:</strong> ${icon} ${metadata.name} (${fileSize}) <span class="status">${statusIcon}</span></div><div class="timestamp">${new Date().toLocaleTimeString()}</div>`;
  } else {
    msgDiv.innerHTML = `<div>${icon} ${metadata.name} (${fileSize}) <span class="status">${statusIcon}</span></div><div class="timestamp">${new Date().toLocaleTimeString()}</div>`;
  }
  messagesDiv.appendChild(msgDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ==================== CHAT RENDERING (REFRESH CURRENT) ====================
async function renderCurrentChat() {
  if (currentGroupId) {
    const group = groups[currentGroupId];
    if (!group) return;
    messagesDiv.innerHTML = "";
    const storedMessages = await loadMessages(currentGroupId);
    storedMessages.forEach(msg => {
      if (msg.type === 'file') {
        appendFileMessage(msg, msg.sender, msg.senderName, true, currentGroupId, msg.delivered, msg.read);
      } else {
        appendMessage(msg.text, msg.sender, msg.senderName, true, currentGroupId, msg.delivered, msg.read);
      }
    });
  } else if (currentPeerId) {
    const peer = peers[currentPeerId];
    if (!peer) return;
    messagesDiv.innerHTML = "";
    const chatId = getOneToOneChatId(peer.username);
    const storedMessages = await loadMessages(chatId);
    storedMessages.forEach(msg => {
      if (msg.type === 'file') {
        appendFileMessage(msg, msg.sender, msg.senderName, false, chatId, msg.delivered, msg.read);
      } else {
        appendMessage(msg.text, msg.sender, msg.senderName, false, chatId, msg.delivered, msg.read);
      }
    });
  }
}

// ==================== UPDATE MESSAGE STATUS ====================
async function updateMessageStatus(chatId, msgId, updates) {
  let messages = await loadMessages(chatId);
  let changed = false;
  for (let m of messages) {
    if (m.msgId === msgId) {
      Object.assign(m, updates);
      changed = true;
      break;
    }
  }
  if (changed) {
    await db.setItem(chatId, messages);
    // If this chat is currently open, refresh the view
    await renderCurrentChat();
  }
}

// ==================== CRYPTO HELPERS ====================
async function importPublicKey(base64Key) {
  const binary = atob(base64Key);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
  return await crypto.subtle.importKey('raw', buffer, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
}

// ==================== GROUP FUNCTIONS ====================
function handleGroupInvite(data) {
  const { groupId, groupName, key, members } = data;
  if (groups[groupId]) return;
  groups[groupId] = { name: groupName, members, key };
  renderGroupList();
}

function renderGroupList() {
  if (!groupListDiv) return;
  groupListDiv.innerHTML = "";
  Object.keys(groups).forEach(groupId => {
    const group = groups[groupId];
    const div = document.createElement('div');
    div.className = 'group-item';
    div.textContent = group.name;
    div.setAttribute('data-group-id', groupId);
    div.addEventListener('click', () => openGroupChat(groupId));
    groupListDiv.appendChild(div);
  });
}

async function openGroupChat(groupId) {
  console.log('Opening group chat:', groupId);
  currentPeerId = null;
  currentGroupId = groupId;
  const group = groups[groupId];
  if (!group) return;
  currentGroupNameSpan.textContent = group.name;
  groupChatHeader.classList.remove('hidden');
  await renderCurrentChat();
}

async function selectPeer(peerId, peerUsername) {
  console.log('Selecting peer:', peerUsername);
  if (currentGroupId) {
    groupChatHeader.classList.add('hidden');
    currentGroupId = null;
  }
  currentPeerId = peerId;
  await renderCurrentChat();

  // Send read receipts for all unread messages from this peer
  const peer = peers[peerId];
  if (peer && peer.dataChannel && peer.dataChannel.readyState === 'open') {
    const chatId = getOneToOneChatId(peerUsername);
    const storedMessages = await loadMessages(chatId);
    const unread = storedMessages.filter(m => m.sender === 'them' && !m.read);
    if (unread.length > 0) {
      for (let msg of unread) {
        msg.read = true;
      }
      await db.setItem(chatId, storedMessages);
      // Re-render to show double ticks
      await renderCurrentChat();

      // Send read ack for the latest unread message
      const latest = unread[unread.length - 1];
      const ack = {
        type: 'read-ack',
        msgId: latest.msgId
      };
      peer.dataChannel.send(JSON.stringify(ack));
    }
  }
}

// ==================== WEBRTC & DATA CHANNEL ====================
function setupDataChannel(channel, targetId) {
  if (channel._messageHandlerAttached) return;
  channel._messageHandlerAttached = true;

  channel.onopen = () => {
    console.log(`Data channel opened with ${targetId}`);
    peers[targetId].dataChannel = channel;
    if (peers[targetId].pendingInvites && peers[targetId].pendingInvites.length) {
      peers[targetId].pendingInvites.forEach(invite => {
        channel.send(JSON.stringify(invite));
      });
      peers[targetId].pendingInvites = [];
    }
    if (userWallet) {
      channel.send(JSON.stringify({ type: 'wallet-address', address: userWallet.address }));
    }
  };

  channel.onclose = () => {
    delete peers[targetId];
  };

  channel.onerror = (err) => console.error(`Data channel error with ${targetId}:`, err);

  const messageHandler = (event) => {
    const peer = peers[targetId];
    if (!peer) return;
    const encryptionKey = peer.encryptionKey;

    try {
      // First, try to parse as JSON (new format)
      const obj = JSON.parse(event.data);

      // --- Group invites ---
      if (obj.type === 'group-invite') {
        handleGroupInvite(obj);
        return;
      }

      // --- Group text ---
      if (obj.type === 'group-text') {
        const group = groups[obj.groupId];
        if (group) {
          const bytes = CryptoJS.AES.decrypt(obj.data, group.key);
          const plaintext = bytes.toString(CryptoJS.enc.Utf8);
          if (plaintext) {
            const messageObj = {
              type: 'text',
              text: plaintext,
              sender: 'them',
              senderName: obj.senderName || 'Unknown',
              isGroup: true,
              timestamp: Date.now()
            };
            saveMessage(obj.groupId, messageObj);
            if (currentGroupId === obj.groupId) {
              appendMessage(plaintext, 'them', obj.senderName, true, obj.groupId);
            }
          }
        }
        return;
      }

      // --- Group file meta ---
      if (obj.type === 'group-file-meta') {
        receivingFile = {
          name: obj.name,
          size: obj.size,
          mime: obj.mime,
          received: 0,
          chunks: [],
          groupId: obj.groupId,
          isGroup: true,
          senderName: obj.senderName
        };
        receivingFileChatId = obj.groupId;
        progressDiv.innerHTML += `<div>📥 Receiving file: ${obj.name} in group</div>`;
        return;
      }

      // --- Group file chunk ---
      if (obj.type === 'group-file-chunk') {
        const group = groups[obj.groupId];
        if (!group) return;
        if (!receivingFile || receivingFile.groupId !== obj.groupId) {
          console.warn('No active file reception for this group');
          return;
        }
        const decrypted = CryptoJS.AES.decrypt(obj.data, group.key);
        const decryptedBytes = new Uint8Array(decrypted.sigBytes);
        for (let i = 0; i < decrypted.sigBytes; i++) {
          decryptedBytes[i] = (decrypted.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        }
        receivingFile.chunks.push(decryptedBytes);
        receivingFile.received += decryptedBytes.length;
        const percent = Math.min(100, Math.round((receivingFile.received / receivingFile.size) * 100));
        progressDiv.innerHTML = `Receiving ${receivingFile.name} in group: ${percent}%`;
        if (receivingFile.received >= receivingFile.size) {
          const blob = new Blob(receivingFile.chunks, { type: receivingFile.mime });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = receivingFile.name;
          a.click();
          URL.revokeObjectURL(url);
          progressDiv.innerHTML += `<div>✅ File "${receivingFile.name}" received in group.</div>`;
          const messageObj = {
            type: 'file',
            name: receivingFile.name,
            size: receivingFile.size,
            mime: receivingFile.mime,
            sender: 'them',
            senderName: receivingFile.senderName,
            isGroup: true,
            timestamp: Date.now()
          };
          saveMessage(receivingFile.groupId, messageObj);
          if (currentGroupId === receivingFile.groupId) {
            appendFileMessage(messageObj, 'them', receivingFile.senderName, true, receivingFile.groupId);
          }
          receivingFile = null;
          receivingFileChatId = null;
        }
        return;
      }

      // --- One-to-one file meta ---
      if (obj.type === 'file-meta') {
        receivingFile = {
          name: obj.name,
          size: obj.size,
          mime: obj.mime,
          received: 0,
          chunks: [],
          isGroup: false,
          senderName: peer.username
        };
        receivingFileChatId = getOneToOneChatId(peer.username || targetId);
        progressDiv.innerHTML += `<div>📥 Receiving file: ${obj.name}</div>`;
        return;
      }

      // --- One-to-one file chunk ---
      if (obj.type === 'file-chunk') {
        const decrypted = CryptoJS.AES.decrypt(obj.data, encryptionKey);
        const decryptedBytes = new Uint8Array(decrypted.sigBytes);
        for (let i = 0; i < decrypted.sigBytes; i++) {
          decryptedBytes[i] = (decrypted.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        }
        receivingFile.chunks.push(decryptedBytes);
        receivingFile.received += decryptedBytes.length;
        const percent = Math.min(100, Math.round((receivingFile.received / receivingFile.size) * 100));
        progressDiv.innerHTML = `Receiving ${receivingFile.name}: ${percent}%`;
        if (receivingFile.received >= receivingFile.size) {
          const blob = new Blob(receivingFile.chunks, { type: receivingFile.mime });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = receivingFile.name;
          a.click();
          URL.revokeObjectURL(url);
          progressDiv.innerHTML += `<div>✅ File "${receivingFile.name}" received.</div>`;
          const messageObj = {
            type: 'file',
            name: receivingFile.name,
            size: receivingFile.size,
            mime: receivingFile.mime,
            sender: 'them',
            senderName: receivingFile.senderName,
            isGroup: false,
            timestamp: Date.now()
          };
          const chatId = getOneToOneChatId(peer.username);
          saveMessage(chatId, messageObj);
          if (currentPeerId === targetId) {
            appendFileMessage(messageObj, 'them', receivingFile.senderName, false, chatId);
          }
          receivingFile = null;
          receivingFileChatId = null;
        }
        return;
      }

      // --- One-to-one text message (encrypted, new format) ---
      if (obj.type === 'text') {
        // Decrypt
        const bytes = CryptoJS.AES.decrypt(obj.data, encryptionKey);
        const plaintext = bytes.toString(CryptoJS.enc.Utf8);
        if (!plaintext) return;

        // Save message with delivered = true (we just received it)
        const messageObj = {
          type: 'text',
          text: plaintext,
          sender: 'them',
          senderName: peer.username,
          isGroup: false,
          timestamp: Date.now(),
          msgId: obj.msgId,
          delivered: true,
          read: false
        };
        const chatId = getOneToOneChatId(peer.username);
        saveMessage(chatId, messageObj);

        // Show if this chat is open
        if (currentPeerId === targetId && !currentGroupId) {
          appendMessage(plaintext, 'them', peer.username, false, chatId, true, false);
        }

        // Send delivery acknowledgment
        const ack = {
          type: 'delivery-ack',
          msgId: obj.msgId
        };
        channel.send(JSON.stringify(ack));
        return;
      }

      // --- Delivery acknowledgment ---
      if (obj.type === 'delivery-ack') {
        const chatId = getOneToOneChatId(peer.username);
        updateMessageStatus(chatId, obj.msgId, { delivered: true });
        return;
      }

      // --- Read acknowledgment ---
      if (obj.type === 'read-ack') {
        const chatId = getOneToOneChatId(peer.username);
        updateMessageStatus(chatId, obj.msgId, { read: true });
        return;
      }

      // --- Wallet address (legacy, but keep) ---
      if (obj.type === 'wallet-address') {
        if (peers[targetId]) peers[targetId].walletAddress = obj.address;
        return;
      }

      // If we get here, it's an unknown type – ignore
    } catch (err) {
      // Failed to parse JSON: assume it's a legacy plain encrypted message
      console.log('Received legacy message, attempting to decrypt');
      try {
        const bytes = CryptoJS.AES.decrypt(event.data, encryptionKey);
        const plaintext = bytes.toString(CryptoJS.enc.Utf8);
        if (plaintext) {
          // No msgId for legacy messages, so we generate one for internal use
          const msgId = 'legacy-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
          const messageObj = {
            type: 'text',
            text: plaintext,
            sender: 'them',
            senderName: peer.username,
            isGroup: false,
            timestamp: Date.now(),
            msgId: msgId,
            delivered: true,
            read: false
          };
          const chatId = getOneToOneChatId(peer.username);
          saveMessage(chatId, messageObj);

          if (currentPeerId === targetId && !currentGroupId) {
            appendMessage(plaintext, 'them', peer.username, false, chatId, true, false);
          }

          // For legacy messages, we don't send acks (peer may not support them)
        }
      } catch (legacyErr) {
        console.error('Failed to decrypt legacy message:', legacyErr);
      }
    }
  };

  channel.addEventListener('message', messageHandler);
}

function createPeerConnection(targetId, isReceiver) {
  const config = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
    ]
  };

  const peer = new RTCPeerConnection(config);

  peer.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('signal', { to: targetId, signal: event.candidate });
    }
  };

  peer.oniceconnectionstatechange = () => {
    console.log('ICE connection state:', peer.iceConnectionState);
  };

  if (!isReceiver) {
    const channel = peer.createDataChannel('chat');
    setupDataChannel(channel, targetId);
  } else {
    peer.ondatachannel = (event) => setupDataChannel(event.channel, targetId);
  }

  peers[targetId].peerConnection = peer;
  return peer;
}

async function startChat(targetId, targetUsername, targetPublicKeyBase64) {
  if (peers[targetId]) {
    await selectPeer(targetId, targetUsername);
    return;
  }

  try {
    const targetPublicKey = await importPublicKey(targetPublicKeyBase64);
    const sharedSecretBits = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: targetPublicKey },
      myKeyPair.privateKey,
      256
    );
    const sharedSecretBase64 = btoa(String.fromCharCode(...new Uint8Array(sharedSecretBits)));

    peers[targetId] = {
      encryptionKey: sharedSecretBase64,
      dataChannel: null,
      peerConnection: null,
      walletAddress: null,
      pendingInvites: [],
      username: targetUsername
    };

    const peer = createPeerConnection(targetId, false);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit('signal', { to: targetId, signal: offer });

    await selectPeer(targetId, targetUsername);
  } catch (err) {
    console.error('Error in startChat:', err);
  }
}

// ==================== BLE FUNCTIONS (stubs) ====================
async function getBLEPlugin() { /* implementation unchanged */ }
async function startBLEAdvert() { /* ... */ }
async function stopBLEAdvert() { /* ... */ }
async function startBLEScan() { /* ... */ }
async function stopBLEScan() { /* ... */ }
function addDeviceToList(device) { /* ... */ }
async function connectToBLEDevice(deviceId) { /* ... */ }
async function disconnectBLEDevice() { /* ... */ }
function storeKeyForPeer(peerId, key) { peerKeys[peerId] = key; }
function getKeyForPeer(peerId) { return peerKeys[peerId]; }
function displayBLEChatMessage(peerId, text, sender) { /* ... */ }

// ==================== PAYMENT FUNCTIONS ====================
async function deriveWalletFromMasterKey(privateKey) {
  const jwk = await crypto.subtle.exportKey('jwk', privateKey);
  const privateBase64Url = jwk.d;
  const privateBase64 = privateBase64Url.replace(/-/g, '+').replace(/_/g, '/');
  const privateKeyRaw = Uint8Array.from(atob(privateBase64), c => c.charCodeAt(0));
  const seed = await crypto.subtle.digest('SHA-256', privateKeyRaw);
  const privateKeyHex = Array.from(new Uint8Array(seed.slice(0, 32)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return new ethers.Wallet('0x' + privateKeyHex);
}

function getTokenAddress(token, chainId) {
  if (chainId === 11155111) { // Sepolia
    const addresses = {
      usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      usdt: '', // not available on Sepolia? Add if needed
      dai: ''
    };
    return addresses[token];
  }
  // mainnet addresses (fallback)
  const addresses = {
    usdc: '0x07865c6E87B9F70255377e024ace6630C1Eaa37F',
    usdt: '0x7D4CcE7fB4cDBb702F134e284fFDC8D80B0BF720',
    dai: '0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5a5e8'
  };
  return addresses[token];
}

function updateRecipientField() {
  const connected = Object.keys(peers).filter(id => peers[id]?.walletAddress);
  if (connected.length > 0) {
    recipientAddressInput.value = peers[connected[0]].walletAddress;
  }
}

async function refreshBalances() {
  // ... unchanged ...
}

// ==================== EVENT LISTENERS ====================
joinBtn.addEventListener('click', async () => {
  const name = usernameInput.value.trim();
  if (!name) return;
  myUsername = name;

  myKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );

  try {
    userWallet = await deriveWalletFromMasterKey(myKeyPair.privateKey);
    walletAddressSpan.textContent = userWallet.address;
    networkNameSpan.textContent = currentNetwork.name;
    provider = new ethers.providers.JsonRpcProvider(currentNetwork.rpcUrl);
    await refreshBalances();
  } catch (err) {
    console.error('Wallet derivation failed:', err);
    walletAddressSpan.textContent = 'Error';
  }

  const publicKeyBuffer = await crypto.subtle.exportKey('raw', myKeyPair.publicKey);
  const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));
  socket.emit('join', { username: name, publicKey: publicKeyBase64 });

  loginDiv.classList.add('hidden');
  setTimeout(() => {
    loginDiv.style.display = 'none';
    mainDiv.classList.remove('hidden');
  }, 500);
});

socket.on('user-list', (users) => {
  lastUserList = users;
  const others = users.filter(u => u.id !== socket.id);
  userList.innerHTML = '';
  if (others.length === 0) {
    userList.innerHTML = '<li>No other users online</li>';
    return;
  }
  others.forEach(user => {
    const li = document.createElement('li');
    li.textContent = user.username;
    li.setAttribute('data-id', user.id);
    li.setAttribute('data-publickey', user.publicKey);
    li.addEventListener('click', () => startChat(user.id, user.username, user.publicKey));
    userList.appendChild(li);
  });
});

socket.on('signal', async (data) => {
  const { from, signal } = data;
  if (!peers[from]) {
    let userInfo = lastUserList.find(u => u.id === from);
    let retries = 0;
    while (!userInfo && retries < 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      userInfo = lastUserList.find(u => u.id === from);
      retries++;
    }
    if (userInfo && userInfo.publicKey) {
      const targetPublicKey = await importPublicKey(userInfo.publicKey);
      const sharedSecretBits = await crypto.subtle.deriveBits(
        { name: 'ECDH', public: targetPublicKey },
        myKeyPair.privateKey,
        256
      );
      const sharedSecretBase64 = btoa(String.fromCharCode(...new Uint8Array(sharedSecretBits)));
      peers[from] = {
        encryptionKey: sharedSecretBase64,
        dataChannel: null,
        peerConnection: null,
        walletAddress: null,
        pendingInvites: [],
        username: userInfo.username
      };
      createPeerConnection(from, true);
    } else {
      console.warn('Cannot create peer: no public key for', from);
      return;
    }
  }
  const peer = peers[from].peerConnection;
  if (!peer) return;
  if (signal.type === 'offer') {
    await peer.setRemoteDescription(new RTCSessionDescription(signal));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socket.emit('signal', { to: from, signal: answer });
  } else if (signal.type === 'answer') {
    await peer.setRemoteDescription(new RTCSessionDescription(signal));
  } else if (signal.candidate) {
    await peer.addIceCandidate(new RTCIceCandidate(signal));
  }
});

messageInput.addEventListener('input', () => {
  if (!myUsername) return;
  clearTimeout(typingTimeout);
  socket.emit('typing', { username: myUsername });
  typingTimeout = setTimeout(() => {
    socket.emit('stop-typing');
  }, 1000);
});

socket.on('typing', (data) => {
  typingIndicator.classList.remove('hidden');
});

socket.on('stop-typing', () => {
  typingIndicator.classList.add('hidden');
});

// ======== SEND MESSAGE ========
sendBtn.onclick = async () => {
  const text = messageInput.value.trim();
  if (!text) return;

  if (currentGroupId) {
    const group = groups[currentGroupId];
    if (!group) return;
    const encrypted = CryptoJS.AES.encrypt(text, group.key).toString();
    const groupMsg = {
      type: 'group-text',
      groupId: currentGroupId,
      data: encrypted,
      senderName: myUsername
    };
    group.members.forEach(memberId => {
      if (memberId === socket.id) return;
      const peer = peers[memberId];
      if (peer && peer.dataChannel && peer.dataChannel.readyState === 'open') {
        peer.dataChannel.send(JSON.stringify(groupMsg));
      }
    });
    const messageObj = {
      type: 'text',
      text,
      sender: 'me',
      senderName: myUsername,
      isGroup: true,
      timestamp: Date.now()
    };
    await saveMessage(currentGroupId, messageObj);
    appendMessage(text, 'me', myUsername, true, currentGroupId);
  } else if (currentPeerId) {
    const peer = peers[currentPeerId];
    if (peer && peer.dataChannel && peer.dataChannel.readyState === 'open') {
      try {
        const encrypted = CryptoJS.AES.encrypt(text, peer.encryptionKey).toString();
        const msgId = Date.now() + '-' + Math.random().toString(36).substr(2, 6);
        const envelope = {
          type: 'text',
          data: encrypted,
          msgId
        };
        peer.dataChannel.send(JSON.stringify(envelope));

        const chatId = getOneToOneChatId(peer.username || currentPeerId);
        const messageObj = {
          type: 'text',
          text,
          sender: 'me',
          senderName: myUsername,
          isGroup: false,
          timestamp: Date.now(),
          msgId,
          delivered: false,
          read: false
        };
        await saveMessage(chatId, messageObj);
        appendMessage(text, 'me', myUsername, false, chatId, false, false);
      } catch (err) {
        console.error('Send error:', err);
        alert('Failed to send message.');
      }
    } else {
      alert('Not connected to this user.');
    }
  } else {
    alert('Please select a user or group to chat with.');
  }
  messageInput.value = '';
};

// ======== SEND FILE ========
sendFileBtn.addEventListener('click', () => {
  const file = fileInput.files[0];
  if (!file) {
    alert('Choose a file first');
    return;
  }

  if (currentGroupId) {
    const group = groups[currentGroupId];
    if (!group) return;
    const reader = new FileReader();
    let offset = 0;
    const CHUNK_SIZE = 64 * 1024;
    const metadata = {
      type: 'group-file-meta',
      groupId: currentGroupId,
      name: file.name,
      size: file.size,
      mime: file.type,
      senderName: myUsername
    };
    group.members.forEach(memberId => {
      if (memberId === socket.id) return;
      const peer = peers[memberId];
      if (peer && peer.dataChannel && peer.dataChannel.readyState === 'open') {
        peer.dataChannel.send(JSON.stringify(metadata));
      }
    });

    reader.onload = (e) => {
      const chunkData = e.target.result;
      const wordArray = CryptoJS.lib.WordArray.create(chunkData);
      const encrypted = CryptoJS.AES.encrypt(wordArray, group.key).toString();
      const chunkMsg = {
        type: 'group-file-chunk',
        groupId: currentGroupId,
        data: encrypted,
        offset,
        total: file.size
      };
      group.members.forEach(memberId => {
        if (memberId === socket.id) return;
        const peer = peers[memberId];
        if (peer && peer.dataChannel && peer.dataChannel.readyState === 'open') {
          peer.dataChannel.send(JSON.stringify(chunkMsg));
        }
      });
      offset += CHUNK_SIZE;
      if (offset < file.size) readNext();
      else {
        progressDiv.innerHTML += `<div>✅ File "${file.name}" sent to group.</div>`;
        const messageObj = {
          type: 'file',
          name: file.name,
          size: file.size,
          mime: file.type,
          sender: 'me',
          senderName: myUsername,
          isGroup: true,
          timestamp: Date.now()
        };
        saveMessage(currentGroupId, messageObj);
        appendFileMessage(messageObj, 'me', myUsername, true, currentGroupId);
      }
      const percent = Math.min(100, Math.round((offset / file.size) * 100));
      progressDiv.innerHTML = `Sending ${file.name} to group: ${percent}%`;
    };

    function readNext() {
      const slice = file.slice(offset, offset + CHUNK_SIZE);
      reader.readAsArrayBuffer(slice);
    }
    readNext();

  } else if (currentPeerId) {
    const peer = peers[currentPeerId];
    if (!peer || !peer.dataChannel || peer.dataChannel.readyState !== 'open') {
      alert('Not connected to this user.');
      return;
    }
    const chatId = getOneToOneChatId(peer.username || currentPeerId);
    sendFileViaChannel(peer.dataChannel, file, peer.encryptionKey, chatId);
  } else {
    alert('Please select a user or group to chat with.');
  }
});

function sendFileViaChannel(channel, file, encryptionKey, chatId) {
  const CHUNK_SIZE = 64 * 1024;
  const reader = new FileReader();
  let offset = 0;
  const metadata = { type: 'file-meta', name: file.name, size: file.size, mime: file.type };
  channel.send(JSON.stringify(metadata));

  reader.onload = (e) => {
    const chunkData = e.target.result;
    const wordArray = CryptoJS.lib.WordArray.create(chunkData);
    const encrypted = CryptoJS.AES.encrypt(wordArray, encryptionKey).toString();
    channel.send(JSON.stringify({ type: 'file-chunk', data: encrypted, offset, total: file.size }));
    offset += CHUNK_SIZE;
    if (offset < file.size) readNext();
    else {
      progressDiv.innerHTML += `<div>✅ File "${file.name}" sent.</div>`;
      const messageObj = {
        type: 'file',
        name: file.name,
        size: file.size,
        mime: file.type,
        sender: 'me',
        senderName: myUsername,
        isGroup: false,
        timestamp: Date.now()
      };
      saveMessage(chatId, messageObj);
      appendFileMessage(messageObj, 'me', myUsername, false, chatId);
    }
    const percent = Math.min(100, Math.round((offset / file.size) * 100));
    progressDiv.innerHTML = `Sending ${file.name}: ${percent}%`;
  };

  function readNext() {
    const slice = file.slice(offset, offset + CHUNK_SIZE);
    reader.readAsArrayBuffer(slice);
  }
  readNext();
}

// ======== GROUP MODAL ========
if (createGroupBtn) {
  createGroupBtn.addEventListener('click', () => {
    const others = lastUserList.filter(u => u.id !== socket.id);
    if (others.length === 0) {
      alert('No other users online to add to group.');
      return;
    }
    let html = '';
    others.forEach(user => {
      html += `
        <label>
          <input type="checkbox" value="${user.id}" data-username="${user.username}">
          <span>${user.username}</span>
        </label>
      `;
    });
    modalUserList.innerHTML = html;
    groupModal.classList.remove('hidden');
  });

  if (createGroupConfirm) {
    createGroupConfirm.addEventListener('click', () => {
      const checkboxes = document.querySelectorAll('#modalUserList input:checked');
      const groupName = groupNameInput.value.trim();
      if (checkboxes.length === 0) {
        alert('Please select at least one member.');
        return;
      }
      if (!groupName) {
        alert('Please enter a group name.');
        return;
      }
      const selectedIds = Array.from(checkboxes).map(cb => cb.value);
      const allMembers = [socket.id, ...selectedIds];
      const groupId = 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      const groupKey = CryptoJS.lib.WordArray.random(32).toString();

      groups[groupId] = {
        name: groupName,
        members: allMembers,
        key: groupKey
      };
      console.log('Group created:', groups[groupId]);

      selectedIds.forEach(targetId => {
        const peer = peers[targetId];
        const invite = {
          type: 'group-invite',
          groupId,
          groupName,
          key: groupKey,
          members: allMembers
        };
        if (peer && peer.dataChannel && peer.dataChannel.readyState === 'open') {
          peer.dataChannel.send(JSON.stringify(invite));
        } else if (peer) {
          if (!peer.pendingInvites) peer.pendingInvites = [];
          peer.pendingInvites.push(invite);
        }
      });

      renderGroupList();
      openGroupChat(groupId);
      groupModal.classList.add('hidden');
      groupNameInput.value = "";
    });
  }

  if (cancelGroupModal) {
    cancelGroupModal.addEventListener('click', () => {
      groupModal.classList.add('hidden');
      groupNameInput.value = "";
    });
  }

  window.addEventListener('click', (e) => {
    if (e.target === groupModal) {
      groupModal.classList.add('hidden');
      groupNameInput.value = "";
    }
  });

  if (leaveGroupBtn) {
    leaveGroupBtn.addEventListener('click', () => {
      currentGroupId = null;
      groupChatHeader.classList.add('hidden');
      messagesDiv.innerHTML = '';
    });
  }
}

// ======== BLE EVENT LISTENERS ========
if (enableBLEBtn) {
  enableBLEBtn.addEventListener('click', async () => {
    if (!myUsername) { alert('Please join the chat first.'); return; }
    const ble = await getBLEPlugin();
    if (!ble) { alert('BLE only works on real devices (not in browser)'); return; }
    const perm = await ble.requestPermissions();
    if (!perm) { alert('Bluetooth permissions required'); return; }
    await startBLEAdvert();
    await startBLEScan();
    enableBLEBtn.disabled = true;
    if (disableBLEBtn) disableBLEBtn.disabled = false;
    bleEnabled = true;
  });

  if (disableBLEBtn) {
    disableBLEBtn.addEventListener('click', async () => {
      await stopBLEAdvert();
      await stopBLEScan();
      await disconnectBLEDevice();
      enableBLEBtn.disabled = false;
      disableBLEBtn.disabled = true;
      bleEnabled = false;
    });
  }
}

// ======== PAYMENTS ========
if (sendPrivatePaymentBtn) {
  sendPrivatePaymentBtn.addEventListener('click', async () => {
    const amount = paymentAmountInput.value;
    const token = tokenSelect.value;
    const recipient = recipientAddressInput.value;
    if (!amount || !recipient) { alert('Please fill all fields'); return; }
    if (!provider || !userWallet) { paymentStatusDiv.textContent = 'Wallet not initialized'; return; }
    try {
      const decimals = token === 'usdc' ? 6 : 18;
      const parsedAmount = ethers.utils.parseUnits(amount, decimals);
      const tokenAddress = getTokenAddress(token, currentNetwork.chainId);
      const signer = userWallet.connect(provider);
      const abi = [
        'function transfer(address to, uint256 amount) returns (bool)',
        'function decimals() view returns (uint8)'
      ];
      const tokenContract = new ethers.Contract(tokenAddress, abi, signer);
      const tx = await tokenContract.transfer(recipient, parsedAmount);
      paymentStatusDiv.innerHTML = `⏳ Transaction sent: <a href="https://sepolia.etherscan.io/tx/${tx.hash}" target="_blank">${tx.hash}</a>`;
      await tx.wait();
      paymentStatusDiv.innerHTML = `✅ Payment confirmed! <a href="https://sepolia.etherscan.io/tx/${tx.hash}" target="_blank">View</a>`;
      setTimeout(refreshBalances, 5000);
    } catch (err) {
      console.error('Payment error:', err);
      paymentStatusDiv.textContent = `❌ Error: ${err.message}`;
    }
  });
}

if (refreshBalancesBtn) refreshBalancesBtn.addEventListener('click', refreshBalances);

// ======== HYPERSWITCH ========
if (hyperswitchPayBtn) {
  hyperswitchPayBtn.addEventListener('click', async () => {
    if (typeof Hyper === 'undefined') {
      hyperswitchStatus.textContent = '❌ Hyperswitch SDK not loaded.';
      return;
    }
    const amount = parseFloat(prompt('Enter amount in USD (e.g., 10):'));
    if (!amount || amount <= 0) { alert('Please enter a valid amount'); return; }
    if (!userWallet) { alert('Wallet not initialized'); return; }
    try {
      hyperswitchStatus.textContent = 'Creating payment...';
      const oldConfirm = document.getElementById('hyperswitch-confirm-button');
      if (oldConfirm) oldConfirm.remove();

      const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency: 'USD',
          customerId: `wallet_${userWallet.address}`,
          email: `${userWallet.address}@example.com`
        })
      });
      const data = await response.json();
      if (!data.clientSecret) {
        console.error('Server response:', data);
        throw new Error('No client secret received');
      }

      hyperswitchInstance = Hyper(HYPERSWITCH_PUBLISHABLE_KEY);
      hyperswitchElements = hyperswitchInstance.elements({ clientSecret: data.clientSecret });

      const paymentElement = hyperswitchElements.create('payment', { layout: 'tabs' });
      paymentElement.mount('#hyperswitch-payment-element');

      const confirmBtn = document.createElement('button');
      confirmBtn.id = 'hyperswitch-confirm-button';
      confirmBtn.textContent = 'Confirm Payment';
      confirmBtn.style.marginTop = '10px';
      hyperswitchElementDiv.after(confirmBtn);

      confirmBtn.addEventListener('click', async function confirmHandler() {
        confirmBtn.disabled = true;
        hyperswitchStatus.textContent = 'Processing...';
        try {
          const { error, status } = await hyperswitchInstance.confirmPayment({
            elements: hyperswitchElements,
            confirmParams: { return_url: window.location.origin + '/payment-success.html' }
          });
          if (error) {
            console.error('Payment error:', error);
            hyperswitchStatus.textContent = '❌ Payment failed: ' + error.message;
            confirmBtn.disabled = false;
          } else if (status) {
            console.log('Payment status:', status);
            if (status === 'succeeded') {
              hyperswitchStatus.textContent = '✅ Payment successful! Redirecting...';
            } else {
              hyperswitchStatus.textContent = `ℹ️ Payment status: ${status}`;
              confirmBtn.disabled = false;
            }
          }
        } catch (err) {
          console.error('Confirmation error:', err);
          hyperswitchStatus.textContent = '❌ Error: ' + err.message;
          confirmBtn.disabled = false;
        }
      }, { once: true });
    } catch (err) {
      console.error('Hyperswitch init error:', err);
      hyperswitchStatus.textContent = '❌ Error: ' + err.message;
    }
  });
}