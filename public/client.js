// public/client.js – FINAL VERSION with all features
const socket = io('https://secure-chat-jqnr.onrender.com');

// ---------- Core Chat ----------
let myUsername = null;
let myKeyPair = null;
let peers = {};               // { peerId: { encryptionKey, dataChannel, peerConnection, walletAddress } }
let receivingFile = null;
let lastUserList = [];

// ---------- BLE ----------
let bleEnabled = false;
let bleAdvertising = false;
let bleScanning = false;
let bleConnectedDeviceId = null;
const peerKeys = {};
const BLE_SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
const BLE_CHARACTERISTIC_UUID = 'abcdef01-1234-1234-1234-123456789abc';

// ---------- Payments ----------
let userWallet = null;
let provider = null;
const currentNetwork = { chainId: 11155111, name: 'Sepolia', rpcUrl: '/rpc' };

// ---------- DOM Elements ----------
const loginDiv = document.getElementById('login');
const chatDiv = document.getElementById('chat');
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

// ---------- Hyperswitch Keys ----------
const HYPERSWITCH_PUBLISHABLE_KEY = 'pk_snd_24a92d39a6a14c36ab6bd247cdf7d5d4';

// ---------- Hyperswitch State ----------
let hyperswitchInstance = null;
let hyperswitchElements = null;

// ------------------------------------------------------------
// 1. Key generation & wallet derivation
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
  chatDiv.style.display = 'block';
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
    li.style.cursor = 'pointer';
    li.addEventListener('click', () => startChat(user.id, user.username, user.publicKey));
    userList.appendChild(li);
  });
});

async function importPublicKey(base64Key) {
  const binary = atob(base64Key);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
  return await crypto.subtle.importKey("raw", buffer, { name: "ECDH", namedCurve: "P-256" }, true, []);
}

async function startChat(targetId, targetUsername, targetPublicKeyBase64) {
  if (peers[targetId]) { alert(`Already connected to ${targetUsername}`); return; }
  const targetPublicKey = await importPublicKey(targetPublicKeyBase64);
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: targetPublicKey }, myKeyPair.privateKey, 256
  );
  const sharedSecretBase64 = btoa(String.fromCharCode(...new Uint8Array(sharedSecretBits)));
  peers[targetId] = { encryptionKey: sharedSecretBase64, dataChannel: null, peerConnection: null, walletAddress: null };
  const peer = createPeerConnection(targetId, false);
  try {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit('signal', { to: targetId, signal: offer });
  } catch (err) { console.error('Error creating offer:', err); }
}

// ------------------------------------------------------------
// 2. WebRTC Signaling
// ------------------------------------------------------------
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
        { name: "ECDH", public: targetPublicKey }, myKeyPair.privateKey, 256
      );
      const sharedSecretBase64 = btoa(String.fromCharCode(...new Uint8Array(sharedSecretBits)));
      peers[from] = { encryptionKey: sharedSecretBase64, dataChannel: null, peerConnection: null, walletAddress: null };
      createPeerConnection(from, true);
    } else { console.warn('Cannot create peer: no public key for', from); return; }
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
    if (event.candidate) socket.emit('signal', { to: targetId, signal: event.candidate });
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

function setupDataChannel(channel, targetId) {
  if (channel._messageHandlerAttached) { console.log(`⚠️ Handler already attached for ${targetId}, skipping`); return; }
  channel._messageHandlerAttached = true;
  channel.onopen = () => {
    peers[targetId].dataChannel = channel;
    if (userWallet) {
      channel.send(JSON.stringify({ type: 'wallet-address', address: userWallet.address }));
    }
  };
  channel.onclose = () => { delete peers[targetId]; };
  channel.onerror = (err) => console.error(`🔥 Data channel ERROR with ${targetId}:`, err);

  const messageHandler = (event) => {
    const peer = peers[targetId];
    if (!peer) return;
    const encryptionKey = peer.encryptionKey;
    try {
      const obj = JSON.parse(event.data);
      if (obj.type === 'file-meta') {
        receivingFile = { name: obj.name, size: obj.size, mime: obj.mime, received: 0, chunks: [] };
        progressDiv.innerHTML += `<div>Receiving file: ${obj.name} (${obj.size} bytes)</div>`;
      } else if (obj.type === 'file-chunk') {
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
          progressDiv.innerHTML += `<div>File "${receivingFile.name}" received.</div>`;
          receivingFile = null;
        }
      } else if (obj.type === 'wallet-address') {
        peer.walletAddress = obj.address;
        const msgDiv = document.createElement('div');
        msgDiv.textContent = `🔗 Peer's wallet address received.`;
        messagesDiv.appendChild(msgDiv);
        updateRecipientField();
      } else { console.log('Unknown JSON type', obj.type); }
    } catch (e) {
      // Text message
      try {
        const bytes = CryptoJS.AES.decrypt(event.data, encryptionKey);
        const plaintext = bytes.toString(CryptoJS.enc.Utf8);
        if (plaintext) {
          const msgDiv = document.createElement('div');
          msgDiv.textContent = `Them: ${plaintext}`;
          messagesDiv.appendChild(msgDiv);
        } else { console.warn('Decryption failed – wrong key?'); }
      } catch (decryptErr) { console.error('Decryption error:', decryptErr); }
    }
  };
  channel.addEventListener('message', messageHandler);
}

// ------------------------------------------------------------
// 3. Sending messages & files
// ------------------------------------------------------------
sendBtn.addEventListener('click', () => {
  const text = messageInput.value.trim();
  if (!text) return;
  for (let targetId in peers) {
    const channel = peers[targetId].dataChannel;
    const key = peers[targetId].encryptionKey;
    if (channel && channel.readyState === 'open') {
      try {
        const encrypted = CryptoJS.AES.encrypt(text, key).toString();
        channel.send(encrypted);
      } catch (err) { console.error('Send error:', err); }
    } else { console.warn('❌ Channel not open for', targetId); }
  }
  const msgDiv = document.createElement('div');
  msgDiv.textContent = `Me: ${text}`;
  messagesDiv.appendChild(msgDiv);
  messageInput.value = '';
});
messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendBtn.click(); });

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
    else progressDiv.innerHTML += `<div>File "${file.name}" sent.</div>`;
    const percent = Math.min(100, Math.round((offset / file.size) * 100));
    progressDiv.innerHTML = `Sending ${file.name}: ${percent}%`;
  };
  function readNext() {
    const slice = file.slice(offset, offset + CHUNK_SIZE);
    reader.readAsArrayBuffer(slice);
  }
  readNext();
}

// ------------------------------------------------------------
// 4. BLE Functions (unchanged)
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
  const msgDiv = document.createElement('div');
  msgDiv.textContent = `[BLE ${shortId}] ${sender}: ${text}`;
  messagesDiv.appendChild(msgDiv);
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
  balanceListDiv.innerHTML = 'Loading balances...';
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
      balanceListDiv.appendChild(Object.assign(document.createElement('div'), { textContent: `${token.symbol}: ${formatted}` }));
    } catch (err) {
      balanceListDiv.appendChild(Object.assign(document.createElement('div'), { textContent: `${token.symbol}: Error` }));
    }
  }
  try {
    const ethBalance = await provider.getBalance(userWallet.address);
    const ethFormatted = ethers.utils.formatEther(ethBalance);
    balanceListDiv.appendChild(Object.assign(document.createElement('div'), { textContent: `ETH: ${ethFormatted}` }));
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
// 6. Hyperswitch – Full Payment Element (shows all enabled methods)
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

      // 1. Create payment intent
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

      // 2. Initialize Hyper (use default backend – sandbox automatically)
      hyperswitchInstance = Hyper(HYPERSWITCH_PUBLISHABLE_KEY);

      // 3. Create elements with the client secret
      hyperswitchElements = hyperswitchInstance.elements({ clientSecret: data.clientSecret });

      // 4. Create the FULL payment element – this shows all methods enabled in dashboard
      const paymentElement = hyperswitchElements.create('payment', {
        layout: 'tabs'   // 'tabs' or 'accordion' – whichever you like
      });
      paymentElement.mount('#hyperswitch-payment-element');

      // 5. Create confirm button
      const confirmBtn = document.createElement('button');
      confirmBtn.id = 'hyperswitch-confirm-button';
      confirmBtn.textContent = 'Confirm Payment';
      confirmBtn.style.marginTop = '10px';
      hyperswitchElementDiv.after(confirmBtn);

      // 6. Confirm payment
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