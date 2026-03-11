// public/client.js - with GROUP CHATS
const socket = io('https://secure-chat-jqnr.onrender.com'); // Your live URL

let myUsername = null;
let myKeyPair = null;
let peers = {};               // one‑on‑one connections
let groups = {};              // { groupId: { name, members, key, messages } }
let currentGroupId = null;    // which group is currently open
let receivingFile = null;
let lastUserList = [];
let typingTimeout = null;

// BLE (unchanged)
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

// DOM Elements (new ones added)
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

// NEW group elements
const createGroupBtn = document.getElementById('createGroupBtn');
const groupListDiv = document.getElementById('groupList');
const groupChatHeader = document.getElementById('groupChatHeader');
const currentGroupNameSpan = document.getElementById('currentGroupName');
const leaveGroupBtn = document.getElementById('leaveGroupBtn');

// ------------------------------------------------------------
// 1. Key generation & wallet derivation (unchanged)
// ------------------------------------------------------------
joinBtn.addEventListener('click', async () => {
  const name = usernameInput.value.trim();
  if (!name) return;
  myUsername = name;

  myKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
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

  const publicKeyBuffer = await crypto.subtle.exportKey("raw", myKeyPair.publicKey);
  const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));
  socket.emit('join', { username: name, publicKey: publicKeyBase64 });

  loginDiv.style.display = 'none';
  mainDiv.style.display = 'grid';
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

// ... (keep all existing functions: importPublicKey, startChat, WebRTC signaling, etc.)
// For brevity, I'm not repeating all the existing code here – you must keep it.
// Instead, I'll provide the new group functions and indicate where to insert them.

// ========== NEW GROUP CHAT FUNCTIONS ==========

// Generate a random AES key for a group
function generateGroupKey() {
  return CryptoJS.lib.WordArray.random(32).toString(); // 256-bit key as hex string
}

// Create a new group
createGroupBtn.addEventListener('click', () => {
  // Show a modal/dialog to select members (we'll use a simple prompt for now)
  const memberIds = prompt('Enter member IDs (comma‑separated) from the user list:');
  if (!memberIds) return;
  const selectedIds = memberIds.split(',').map(id => id.trim()).filter(id => id);
  if (selectedIds.length === 0) return;

  const groupName = prompt('Enter group name:') || 'Unnamed Group';
  const groupId = 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  const groupKey = generateGroupKey();

  // Store group locally
  groups[groupId] = {
    name: groupName,
    members: selectedIds,
    key: groupKey,
    messages: []
  };

  // Send group key to each member via their peer channel
  selectedIds.forEach(targetId => {
    const peer = peers[targetId];
    if (peer && peer.dataChannel && peer.dataChannel.readyState === 'open') {
      const inviteMsg = {
        type: 'group-invite',
        groupId: groupId,
        groupName: groupName,
        key: groupKey,
        members: selectedIds
      };
      peer.dataChannel.send(JSON.stringify(inviteMsg));
    } else {
      console.warn(`Peer ${targetId} not connected, cannot invite.`);
    }
  });

  renderGroupList();
  openGroupChat(groupId);
});

// Handle group invite received via data channel
function handleGroupInvite(data) {
  const { groupId, groupName, key, members } = data;
  if (groups[groupId]) return; // already have it
  groups[groupId] = {
    name: groupName,
    members: members,
    key: key,
    messages: []
  };
  renderGroupList();
  // Optionally auto‑join or notify
  appendSystemMessage(`You were added to group "${groupName}"`, 'them');
}

// Render the list of groups in the left panel
function renderGroupList() {
  groupListDiv.innerHTML = '';
  Object.keys(groups).forEach(groupId => {
    const group = groups[groupId];
    const div = document.createElement('div');
    div.textContent = group.name;
    div.style.padding = '10px';
    div.style.margin = '5px 0';
    div.style.background = 'rgba(255,255,255,0.05)';
    div.style.borderRadius = '20px';
    div.style.cursor = 'pointer';
    div.addEventListener('click', () => openGroupChat(groupId));
    groupListDiv.appendChild(div);
  });
}

// Open a group chat
function openGroupChat(groupId) {
  currentGroupId = groupId;
  const group = groups[groupId];
  currentGroupNameSpan.textContent = group.name;
  groupChatHeader.style.display = 'block';
  // Clear messages and display group messages
  messagesDiv.innerHTML = '';
  group.messages.forEach(msg => {
    appendMessage(msg.text, msg.sender === myUsername ? 'me' : 'them', true);
  });
}

// Leave current group
leaveGroupBtn.addEventListener('click', () => {
  currentGroupId = null;
  groupChatHeader.style.display = 'none';
  messagesDiv.innerHTML = ''; // clear chat area
});

// Override send button to handle group messages
const originalSendClick = sendBtn.onclick;
sendBtn.onclick = () => {
  const text = messageInput.value.trim();
  if (!text) return;

  if (currentGroupId) {
    // Send group message
    const group = groups[currentGroupId];
    const encrypted = CryptoJS.AES.encrypt(text, group.key).toString();
    const groupMsg = {
      type: 'group-text',
      groupId: currentGroupId,
      data: encrypted
    };
    // Broadcast to all group members via their peer channels
    group.members.forEach(memberId => {
      const peer = peers[memberId];
      if (peer && peer.dataChannel && peer.dataChannel.readyState === 'open') {
        peer.dataChannel.send(JSON.stringify(groupMsg));
      }
    });
    // Add to local messages
    group.messages.push({ text, sender: myUsername, timestamp: Date.now() });
    appendMessage(text, 'me', true);
  } else {
    // Original one‑on‑one send logic
    for (let targetId in peers) {
      const channel = peers[targetId].dataChannel;
      const key = peers[targetId].encryptionKey;
      if (channel && channel.readyState === 'open') {
        try {
          const encrypted = CryptoJS.AES.encrypt(text, key).toString();
          channel.send(encrypted);
        } catch (err) { console.error('Send error:', err); }
      }
    }
    appendMessage(text, 'me', false);
  }
  messageInput.value = '';
};

// Modify the message handler in setupDataChannel to handle group messages
// In the existing messageHandler, add a branch for 'group-text' and 'group-invite'
// You'll need to integrate this into your existing setupDataChannel function.
// Here's the updated messageHandler (replace the old one):

function setupDataChannel(channel, targetId) {
  if (channel._messageHandlerAttached) return;
  channel._messageHandlerAttached = true;
  channel.onopen = () => {
    peers[targetId].dataChannel = channel;
    if (userWallet) {
      channel.send(JSON.stringify({ type: 'wallet-address', address: userWallet.address }));
    }
  };
  channel.onclose = () => { delete peers[targetId]; };
  channel.onerror = (err) => console.error(`Data channel ERROR with ${targetId}:`, err);

  const messageHandler = (event) => {
    const peer = peers[targetId];
    if (!peer) return;
    const encryptionKey = peer.encryptionKey;

    try {
      const obj = JSON.parse(event.data);

      // ---- GROUP INVITE ----
      if (obj.type === 'group-invite') {
        handleGroupInvite(obj);
        return;
      }

      // ---- GROUP TEXT MESSAGE ----
      if (obj.type === 'group-text') {
        const group = groups[obj.groupId];
        if (group) {
          const bytes = CryptoJS.AES.decrypt(obj.data, group.key);
          const plaintext = bytes.toString(CryptoJS.enc.Utf8);
          if (plaintext) {
            group.messages.push({ text: plaintext, sender: 'Them', timestamp: Date.now() });
            if (currentGroupId === obj.groupId) {
              appendMessage(plaintext, 'them', true);
            }
          }
        }
        return;
      }

      // ---- FILE META ----
      if (obj.type === 'file-meta') {
        receivingFile = { name: obj.name, size: obj.size, mime: obj.mime, received: 0, chunks: [] };
        progressDiv.innerHTML += `<div>📥 Receiving file: ${obj.name}</div>`;
        return;
      }

      // ---- FILE CHUNK ----
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

      // ---- WALLET ADDRESS ----
      if (obj.type === 'wallet-address') {
        peer.walletAddress = obj.address;
        appendMessage('🔗 Peer wallet address received', 'them', false);
        updateRecipientField();
        return;
      }

    } catch (e) {
      // Not JSON – assume it's an encrypted one‑on‑one text message
      try {
        const bytes = CryptoJS.AES.decrypt(event.data, encryptionKey);
        const plaintext = bytes.toString(CryptoJS.enc.Utf8);
        if (plaintext) {
          appendMessage(plaintext, 'them', false);
        }
      } catch (decryptErr) { console.error('Decryption error:', decryptErr); }
    }
  };
  channel.addEventListener('message', messageHandler);
}

// Helper to append message (modified to optionally show group indicator)
function appendMessage(text, sender, isGroup = false) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${sender}`;
  const prefix = isGroup ? `[Group] ` : '';
  msgDiv.innerHTML = `<div>${prefix}${text}</div><div class="timestamp">${new Date().toLocaleTimeString()}</div>`;
  messagesDiv.appendChild(msgDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ------------------------------------------------------------
// 4. BLE Functions (unchanged – paste your existing BLE code here)
// ------------------------------------------------------------
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

async function initBLE() {
  const ble = await getBLEPlugin();
  if (!ble) return false;
  try { await ble.initialize(); return true; } catch (err) { console.error('BLE init error:', err); return false; }
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

// ------------------------------------------------------------
// 5. Payment Functions (USDC + Balances)
// ------------------------------------------------------------
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
    const addresses = { usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', usdt: '', dai: '' };
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
  if (connected.length > 0) recipientAddressInput.value = peers[connected[0]].walletAddress;
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

// ------------------------------------------------------------
// 6. Hyperswitch Global Payment Integration
// ------------------------------------------------------------
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
      if (!data.clientSecret) throw new Error('No client secret received');
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
            confirmParams: { return_url: window.location.origin + '/payment-success.html' },
          });
          if (error) {
            console.error('Payment error:', error);
            hyperswitchStatus.textContent = '❌ Payment failed: ' + error.message;
            confirmBtn.disabled = false;
          } else if (status) {
            console.log('Payment status:', status);
            if (status === 'succeeded') {
              hyperswitchStatus.textContent = '✅ Payment successful!';
            } else {
              hyperswitchStatus.textContent = `ℹ️ Payment status: ${status}`;
            }
            confirmBtn.remove();
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