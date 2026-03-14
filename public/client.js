// ==================== CONFIGURATION ====================
const socket = io(window.location.origin);

// ==================== STATE ====================
let myUsername = null;
let myKeyPair = null;
let peers = {};               // { peerId: { encryptionKey, dataChannel, peerConnection, walletAddress, pendingInvites, username } }
let groups = {};              // { groupId: { name, members, key, messages } }
let currentGroupId = null;
let currentPeerId = null;     // ID of the currently selected one‑to‑one chat partner
let receivingFile = null;
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
let hyperswitchInstance = null;
let hyperswitchElements = null;

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

// ==================== HELPER FUNCTIONS ====================
async function importPublicKey(base64Key) {
  const binary = atob(base64Key);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
  return await crypto.subtle.importKey('raw', buffer, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
}

function appendMessage(text, sender, isGroup = false, chatId = null) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${sender}`;
  const prefix = isGroup ? '[Group] ' : '';
  msgDiv.innerHTML = `<div>${prefix}${text}</div><div class="timestamp">${new Date().toLocaleTimeString()}</div>`;
  messagesDiv.appendChild(msgDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  if (chatId) {
    const messageObj = {
      text,
      sender,
      isGroup,
      timestamp: Date.now()
    };
    saveMessage(chatId, messageObj);
  }
}

function appendSystemMessage(text, sender) {
  appendMessage(text, sender, false);
}

function handleGroupInvite(data) {
  const { groupId, groupName, key, members } = data;
  if (groups[groupId]) return;
  groups[groupId] = { name: groupName, members, key, messages: [] };
  renderGroupList();
  appendSystemMessage(`Added to group "${groupName}"`, 'them');
}

function renderGroupList() {
  if (!groupListDiv) return;
  groupListDiv.innerHTML = '';
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
  // Leave one‑to‑one chat
  currentPeerId = null;
  currentGroupId = groupId;
  const group = groups[groupId];
  if (!group) return;
  currentGroupNameSpan.textContent = group.name;
  groupChatHeader.classList.remove('hidden');
  messagesDiv.innerHTML = '';

  const storedMessages = await loadMessages(groupId);
  storedMessages.forEach(msg => {
    appendMessage(msg.text, msg.sender, true, groupId);
  });

  group.messages.forEach(msg => {
    appendMessage(msg.text, msg.sender === myUsername ? 'me' : 'them', true, groupId);
  });
}

async function selectPeer(peerId, peerUsername) {
  // Leave group chat if active
  if (currentGroupId) {
    groupChatHeader.classList.add('hidden');
    currentGroupId = null;
  }
  currentPeerId = peerId;
  messagesDiv.innerHTML = '';
  const chatId = getOneToOneChatId(peerUsername);
  const storedMessages = await loadMessages(chatId);
  storedMessages.forEach(msg => {
    appendMessage(msg.text, msg.sender, false, chatId);
  });
}

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
      const obj = JSON.parse(event.data);

      if (obj.type === 'group-invite') {
        handleGroupInvite(obj);
        return;
      }

      if (obj.type === 'group-text') {
        const group = groups[obj.groupId];
        if (group) {
          const bytes = CryptoJS.AES.decrypt(obj.data, group.key);
          const plaintext = bytes.toString(CryptoJS.enc.Utf8);
          if (plaintext) {
            group.messages.push({ text: plaintext, sender: 'Them', timestamp: Date.now() });
            if (currentGroupId === obj.groupId) {
              appendMessage(plaintext, 'them', true, obj.groupId);
            } else {
              saveMessage(obj.groupId, { text: plaintext, sender: 'them', isGroup: true, timestamp: Date.now() });
            }
          }
        }
        return;
      }

      // File transfer
      if (obj.type === 'file-meta') {
        receivingFile = { name: obj.name, size: obj.size, mime: obj.mime, received: 0, chunks: [] };
        progressDiv.innerHTML += `<div>📥 Receiving file: ${obj.name}</div>`;
        return;
      }

      if (obj.type === 'file-chunk') {
        const decrypted = CryptoJS.AES.decrypt(obj.data, encryptionKey);
        const decryptedBytes = new Uint8Array(decrypted.sigBytes);
        for (let i = 0; i < decrypted.sigBytes; i++) {
          decryptedBytes[i] = (decrypted.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        }
        receivingFile.chunks.push(decryptedBytes);
        receivingFile.received += decryptedBytes.length;
        const percent = Math.min(100, Math.round((receivingFile.received / receivingFile.size) * 100));
        progressDiv.innerHTML = `📦 Receiving ${receivingFile.name}: ${percent}%`;
        if (receivingFile.received >= receivingFile.size) {
          const blob = new Blob(receivingFile.chunks, { type: receivingFile.mime });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = receivingFile.name;
          a.click();
          URL.revokeObjectURL(url);
          progressDiv.innerHTML += `<div>✅ File "${receivingFile.name}" received.</div>`;
          receivingFile = null;
        }
        return;
      }

      if (obj.type === 'wallet-address') {
        peer.walletAddress = obj.address;
        const peerUsername = peer.username || targetId;
        const chatId = getOneToOneChatId(peerUsername);
        appendMessage('🔗 Peer wallet address received', 'them', false, chatId);
        updateRecipientField();
        return;
      }
    } catch (e) {
      // Not JSON – assume encrypted one‑on‑one text
      try {
        const bytes = CryptoJS.AES.decrypt(event.data, encryptionKey);
        const plaintext = bytes.toString(CryptoJS.enc.Utf8);
        if (plaintext) {
          const peerUsername = peer.username || targetId;
          const chatId = getOneToOneChatId(peerUsername);
          appendMessage(plaintext, 'them', false, chatId);
        }
      } catch (decryptErr) {
        console.error('Decryption error:', decryptErr);
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
    // Already connected – just select the chat
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

// ==================== BLE FUNCTIONS ====================
async function getBLEPlugin() {
  if (typeof Capacitor === 'undefined' || !Capacitor.isNative) return null;
  try {
    const module = await import('@capgo/capacitor-bluetooth-low-energy');
    return module.BluetoothLowEnergy;
  } catch (err) {
    console.error('Failed to load BLE plugin:', err);
    return null;
  }
}

async function startBLEAdvert() {
  const ble = await getBLEPlugin();
  if (!ble || !myUsername || bleAdvertising) return;
  try {
    await ble.startAdvertising({
      deviceName: `Chat_${myUsername}`,
      services: [BLE_SERVICE_UUID],
      characteristics: [{
        uuid: BLE_CHARACTERISTIC_UUID,
        properties: ['Read', 'Write', 'Notify'],
        permissions: ['Readable', 'Writable'],
        value: ''
      }]
    });
    bleAdvertising = true;
  } catch (err) { console.error('Start advertising failed:', err); }
}

async function stopBLEAdvert() {
  const ble = await getBLEPlugin();
  if (!ble || !bleAdvertising) return;
  try { await ble.stopAdvertising(); bleAdvertising = false; } catch (err) { console.error('Stop advertising failed:', err); }
}

async function startBLEScan() {
  const ble = await getBLEPlugin();
  if (!ble || bleScanning) return;
  try {
    await ble.startScan({ services: [BLE_SERVICE_UUID] });
    bleScanning = true;
    ble.addListener('deviceScanned', (device) => addDeviceToList(device));
  } catch (err) { console.error('Start scan failed:', err); }
}

async function stopBLEScan() {
  const ble = await getBLEPlugin();
  if (!ble || !bleScanning) return;
  try { await ble.stopScan(); bleScanning = false; } catch (err) { console.error('Stop scan failed:', err); }
}

function addDeviceToList(device) {
  if (!nearbyDevicesDiv) return;
  if (document.getElementById(`device-${device.deviceId}`)) return;
  const btn = document.createElement('button');
  btn.id = `device-${device.deviceId}`;
  btn.textContent = device.name || device.deviceId;
  btn.onclick = () => connectToBLEDevice(device.deviceId);
  nearbyDevicesDiv.appendChild(btn);
}

async function connectToBLEDevice(deviceId) {
  const ble = await getBLEPlugin();
  if (!ble || bleConnectedDeviceId) return;
  try {
    await ble.connect({ deviceId });
    bleConnectedDeviceId = deviceId;
    await ble.discoverServices({ deviceId });
    ble.addListener('characteristicChanged', ({ characteristic, value }) => {
      if (characteristic === BLE_CHARACTERISTIC_UUID) {
        const encrypted = new TextDecoder().decode(value);
        const key = getKeyForPeer(deviceId);
        if (key) {
          const bytes = CryptoJS.AES.decrypt(encrypted, key);
          const plaintext = bytes.toString(CryptoJS.enc.Utf8);
          displayBLEChatMessage(deviceId, plaintext, 'them');
        }
      }
    });
  } catch (err) { console.error('BLE connect error:', err); }
}

async function disconnectBLEDevice() {
  const ble = await getBLEPlugin();
  if (!ble || !bleConnectedDeviceId) return;
  try { await ble.disconnect({ deviceId: bleConnectedDeviceId }); bleConnectedDeviceId = null; } catch (err) { console.error('Disconnect error:', err); }
}

function storeKeyForPeer(peerId, key) { peerKeys[peerId] = key; }
function getKeyForPeer(peerId) { return peerKeys[peerId]; }

function displayBLEChatMessage(peerId, text, sender) {
  const shortId = peerId.substring(0, 6);
  appendMessage(`[BLE ${shortId}] ${sender}: ${text}`, 'them');
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

sendBtn.onclick = () => {
  const text = messageInput.value.trim();
  if (!text) return;

  if (currentGroupId) {
    const group = groups[currentGroupId];
    if (!group) return;
    const encrypted = CryptoJS.AES.encrypt(text, group.key).toString();
    const groupMsg = { type: 'group-text', groupId: currentGroupId, data: encrypted };
    group.members.forEach(memberId => {
      if (memberId === socket.id) return;
      const peer = peers[memberId];
      if (peer && peer.dataChannel && peer.dataChannel.readyState === 'open') {
        peer.dataChannel.send(JSON.stringify(groupMsg));
      }
    });
    group.messages.push({ text, sender: myUsername, timestamp: Date.now() });
    appendMessage(text, 'me', true, currentGroupId);
  } else if (currentPeerId) {
    const peer = peers[currentPeerId];
    if (peer && peer.dataChannel && peer.dataChannel.readyState === 'open') {
      try {
        const encrypted = CryptoJS.AES.encrypt(text, peer.encryptionKey).toString();
        peer.dataChannel.send(encrypted);
        const chatId = getOneToOneChatId(peer.username || currentPeerId);
        appendMessage(text, 'me', false, chatId);
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

sendFileBtn.addEventListener('click', () => {
  const file = fileInput.files[0];
  if (!file) { alert('Choose a file first'); return; }
  for (let targetId in peers) {
    const channel = peers[targetId].dataChannel;
    const key = peers[targetId].encryptionKey;
    if (channel && channel.readyState === 'open') sendFileViaChannel(channel, file, key);
  }
});

function sendFileViaChannel(channel, file, encryptionKey) {
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
    else progressDiv.innerHTML += `<div>✅ File "${file.name}" sent.</div>`;
    const percent = Math.min(100, Math.round((offset / file.size) * 100));
    progressDiv.innerHTML = `📤 Sending ${file.name}: ${percent}%`;
  };
  function readNext() {
    const slice = file.slice(offset, offset + CHUNK_SIZE);
    reader.readAsArrayBuffer(slice);
  }
  readNext();
}

// ==================== GROUP MODAL ====================
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
}

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
      key: groupKey,
      messages: []
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
    groupNameInput.value = '';
  });
}

if (cancelGroupModal) {
  cancelGroupModal.addEventListener('click', () => {
    groupModal.classList.add('hidden');
    groupNameInput.value = '';
  });
}

window.addEventListener('click', (e) => {
  if (e.target === groupModal) {
    groupModal.classList.add('hidden');
    groupNameInput.value = '';
  }
});

if (leaveGroupBtn) {
  leaveGroupBtn.addEventListener('click', () => {
    currentGroupId = null;
    groupChatHeader.classList.add('hidden');
    messagesDiv.innerHTML = '';
  });
}

// ==================== BLE EVENT LISTENERS ====================
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
}

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
  if (chainId === 11155111) {
    const addresses = {
      usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      usdt: '',
      dai: ''
    };
    return addresses[token];
  }
  const addresses = {
    usdc: '0x07865c6E87B9F70255377e024ace6630C1Eaa37F',
    usdt: '0x7D4CcE7fB4cDBb702F134e284FfDC8D80B0BF720',
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
  if (!provider || !userWallet || !balanceListDiv) return;
  balanceListDiv.innerHTML = '';
  const tokens = [
    { symbol: 'USDC', address: getTokenAddress('usdc', currentNetwork.chainId) },
    { symbol: 'USDT', address: getTokenAddress('usdt', currentNetwork.chainId) },
    { symbol: 'DAI', address: getTokenAddress('dai', currentNetwork.chainId) }
  ];
  for (const token of tokens) {
    if (!token.address) continue;
    try {
      const tokenContract = new ethers.Contract(
        token.address,
        ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
        provider
      );
      const balance = await tokenContract.balanceOf(userWallet.address);
      const decimals = await tokenContract.decimals();
      const formatted = ethers.utils.formatUnits(balance, decimals);
      const div = document.createElement('div');
      div.className = 'balance-item';
      div.innerHTML = `<span>${token.symbol}</span><span>${formatted}</span>`;
      balanceListDiv.appendChild(div);
    } catch (err) {
      const div = document.createElement('div');
      div.className = 'balance-item';
      div.innerHTML = `<span>${token.symbol}</span><span>Error</span>`;
      balanceListDiv.appendChild(div);
    }
  }
  try {
    const ethBalance = await provider.getBalance(userWallet.address);
    const ethFormatted = ethers.utils.formatEther(ethBalance);
    const div = document.createElement('div');
    div.className = 'balance-item';
    div.innerHTML = `<span>ETH</span><span>${ethFormatted}</span>`;
    balanceListDiv.appendChild(div);
  } catch (err) { console.error('Error fetching ETH balance:', err); }
}

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

// ==================== HYPERSWITCH ====================
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
      hyperswitchStatus.textContent = '';

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