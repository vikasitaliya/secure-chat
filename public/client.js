// public/client.js – Fixed encryption key issue (using passphrase)
const socket = io('https://secure-chat-jqnr.onrender.com');

let myUsername = null;
let myKeyPair = null;          // ECDH key pair (private + public)
let peers = {};                // Map of peerId -> { dataChannel, encryptionKey (base64 string), peerConnection }
let receivingFile = null;      // State for incoming file
let lastUserList = [];         // Store the most recent user list (for auto peer creation)

// DOM elements
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

// ------------------------------------------------------------
// 1. Key generation & exchange (ECDH)
// ------------------------------------------------------------
joinBtn.addEventListener('click', async () => {
    const name = usernameInput.value.trim();
    if (!name) return;
    myUsername = name;

    // Generate ECDH key pair (P-256 curve)
    myKeyPair = await crypto.subtle.generateKey(
        {
            name: "ECDH",
            namedCurve: "P-256"
        },
        false,                // not extractable (private key stays in browser)
        ["deriveKey", "deriveBits"]
    );

    // Export the public key (raw format) to send to others
    const publicKeyBuffer = await crypto.subtle.exportKey("raw", myKeyPair.publicKey);
    // Convert to base64 for easy transport over socket
    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));

    socket.emit('join', { username: name, publicKey: publicKeyBase64 });
    loginDiv.style.display = 'none';
    chatDiv.style.display = 'block';
});

// Receive updated list of online users (including their public keys)
socket.on('user-list', (users) => {
    console.log('Received user list:', users);
    lastUserList = users;  // store for later use
    const others = users.filter(u => u.id !== socket.id);
    userList.innerHTML = '';
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

// Start a chat with a specific user (called when clicking on a name)
async function startChat(targetId, targetUsername, targetPublicKeyBase64) {
    console.log('Starting chat with', targetUsername, targetId);
    if (peers[targetId]) {
        alert(`Already connected to ${targetUsername}`);
        return;
    }

    // Import the target's public key
    const targetPublicKey = await importPublicKey(targetPublicKeyBase64);

    // Derive shared secret (256 bits) using our private key and their public key
    const sharedSecretBits = await crypto.subtle.deriveBits(
        {
            name: "ECDH",
            public: targetPublicKey
        },
        myKeyPair.privateKey,
        256
    );

    // Convert shared secret (ArrayBuffer) to a base64 string to use as passphrase
    const sharedSecretBase64 = btoa(String.fromCharCode(...new Uint8Array(sharedSecretBits)));
    console.log('Encryption key (base64) derived for', targetUsername, sharedSecretBase64.substring(0,10)+'...');

    // Create peer entry
    peers[targetId] = {
        encryptionKey: sharedSecretBase64,   // store as base64 string (passphrase)
        dataChannel: null,
        peerConnection: null
    };

    // Create WebRTC peer connection (as initiator)
    const peer = createPeerConnection(targetId, false); // returns the peer

    // Actually create and send an offer
    try {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit('signal', { to: targetId, signal: offer });
        console.log('Sent offer to', targetId);
    } catch (err) {
        console.error('Error creating offer:', err);
    }
}

// Import a base64-encoded public key
async function importPublicKey(base64Key) {
    const binary = atob(base64Key);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        buffer[i] = binary.charCodeAt(i);
    }
    return await crypto.subtle.importKey(
        "raw",
        buffer,
        {
            name: "ECDH",
            namedCurve: "P-256"
        },
        false,
        []
    );
}

// ------------------------------------------------------------
// 2. WebRTC signaling & peer connection
// ------------------------------------------------------------
socket.on('signal', async (data) => {
    const { from, signal } = data;
    console.log('Received signal from', from, 'type:', signal.type);

    // If we don't have a peer object yet, try to create it from stored user list
    if (!peers[from]) {
        console.log('No peer entry for', from, 'attempting to create from user list');
        const userInfo = lastUserList.find(u => u.id === from);
        if (userInfo && userInfo.publicKey) {
            console.log('Found public key for', from);
            // Import public key and derive encryption key
            const targetPublicKey = await importPublicKey(userInfo.publicKey);
            const sharedSecretBits = await crypto.subtle.deriveBits(
                { name: "ECDH", public: targetPublicKey },
                myKeyPair.privateKey,
                256
            );
            const sharedSecretBase64 = btoa(String.fromCharCode(...new Uint8Array(sharedSecretBits)));
            console.log('Auto-derived encryption key for', from);
            // Create peer entry
            peers[from] = {
                encryptionKey: sharedSecretBase64,
                dataChannel: null,
                peerConnection: null
            };
            console.log('Auto-created peer for', from);
            // Now create the peer connection as receiver (because we are receiving a signal)
            createPeerConnection(from, true);
        } else {
            console.warn('Cannot create peer: no public key for', from);
            return;
        }
    }

    const peer = peers[from].peerConnection;
    if (!peer) {
        console.warn('No peer connection for', from);
        return;
    }

    // Handle different signal types
    if (signal.type === 'offer') {
        await peer.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit('signal', { to: from, signal: answer });
        console.log('Sent answer to', from);
    } else if (signal.type === 'answer') {
        await peer.setRemoteDescription(new RTCSessionDescription(signal));
    } else if (signal.candidate) {
        await peer.addIceCandidate(new RTCIceCandidate(signal));
    }
});

function createPeerConnection(targetId, isReceiver) {
    console.log('Creating peer connection to', targetId, 'isReceiver=', isReceiver);
    const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    const peer = new RTCPeerConnection(config);

    peer.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('signal', { to: targetId, signal: event.candidate });
        }
    };

    if (!isReceiver) {
        // Initiator: create data channel
        const channel = peer.createDataChannel('chat');
        setupDataChannel(channel, targetId);
    } else {
        // Receiver: wait for data channel
        peer.ondatachannel = (event) => {
            setupDataChannel(event.channel, targetId);
        };
    }

    peers[targetId].peerConnection = peer;
    return peer;
}

function setupDataChannel(channel, targetId) {
    channel.onopen = () => {
        console.log(`Data channel open with ${targetId}`);
        peers[targetId].dataChannel = channel;
    };
    channel.onclose = () => {
        console.log(`Data channel closed with ${targetId}`);
        delete peers[targetId];
    };
    channel.onmessage = (event) => {
        const data = event.data;
        const encryptionKey = peers[targetId].encryptionKey;  // base64 string

        // Try to parse as JSON (for file transfers)
        try {
            const obj = JSON.parse(data);
            if (obj.type === 'file-meta') {
                // Prepare to receive a file
                receivingFile = {
                    name: obj.name,
                    size: obj.size,
                    mime: obj.mime,
                    received: 0,
                    chunks: []
                };
                progressDiv.innerHTML += `<div>Receiving file: ${obj.name} (${obj.size} bytes)</div>`;
            } else if (obj.type === 'file-chunk') {
                // Decrypt chunk using the encryption key (passphrase)
                const encrypted = obj.data;
                const decrypted = CryptoJS.AES.decrypt(encrypted, encryptionKey);
                // Convert WordArray to Uint8Array
                const decryptedBytes = new Uint8Array(decrypted.sigBytes);
                for (let i = 0; i < decrypted.sigBytes; i++) {
                    decryptedBytes[i] = (decrypted.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
                }
                receivingFile.chunks.push(decryptedBytes);
                receivingFile.received += decryptedBytes.length;
                const percent = Math.min(100, Math.round((receivingFile.received / receivingFile.size) * 100));
                progressDiv.innerHTML = `Receiving ${receivingFile.name}: ${percent}%`;

                // If complete, assemble and trigger download
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
            } else {
                console.log('Unknown message type', obj);
            }
        } catch (e) {
            // Not JSON -> assume encrypted text message
            console.log('Received encrypted message:', data.substring(0,50)+'...');
            const bytes = CryptoJS.AES.decrypt(data, encryptionKey);
            const plaintext = bytes.toString(CryptoJS.enc.Utf8);
            console.log('Decrypted text:', plaintext);
            if (plaintext) {
                const msgDiv = document.createElement('div');
                msgDiv.textContent = `Them: ${plaintext}`;
                messagesDiv.appendChild(msgDiv);
            } else {
                console.warn('Decryption failed – possibly wrong key');
            }
        }
    };
}

// ------------------------------------------------------------
// 3. Sending messages & files
// ------------------------------------------------------------
sendBtn.addEventListener('click', () => {
    const text = messageInput.value.trim();
    if (!text) return;

    for (let targetId in peers) {
        const channel = peers[targetId].dataChannel;
        const key = peers[targetId].encryptionKey; // base64 passphrase
        if (channel && channel.readyState === 'open') {
            if (!key) {
                console.error('Encryption key missing for', targetId);
                continue;
            }
            console.log('Encrypting message with key:', key.substring(0,10)+'...');
            const encrypted = CryptoJS.AES.encrypt(text, key).toString();
            channel.send(encrypted);
            console.log('Sent encrypted message to', targetId);
        }
    }

    const msgDiv = document.createElement('div');
    msgDiv.textContent = `Me: ${text}`;
    messagesDiv.appendChild(msgDiv);
    messageInput.value = '';
});

// Allow Enter to send
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendBtn.click();
});

// File sending
sendFileBtn.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (!file) {
        alert('Choose a file first');
        return;
    }

    for (let targetId in peers) {
        const channel = peers[targetId].dataChannel;
        const key = peers[targetId].encryptionKey; // base64 passphrase
        if (channel && channel.readyState === 'open') {
            sendFileViaChannel(channel, file, key);
        }
    }
});

function sendFileViaChannel(channel, file, encryptionKey) {
    const CHUNK_SIZE = 64 * 1024; // 64KB
    const reader = new FileReader();
    let offset = 0;

    // Send file metadata first
    const metadata = {
        type: 'file-meta',
        name: file.name,
        size: file.size,
        mime: file.type
    };
    channel.send(JSON.stringify(metadata));

    reader.onload = (e) => {
        // Encrypt the chunk
        const chunkData = e.target.result; // ArrayBuffer
        const wordArray = CryptoJS.lib.WordArray.create(chunkData);
        const encrypted = CryptoJS.AES.encrypt(wordArray, encryptionKey).toString();

        // Send as a special message
        channel.send(JSON.stringify({
            type: 'file-chunk',
            data: encrypted,
            offset: offset,
            total: file.size
        }));

        offset += CHUNK_SIZE;
        if (offset < file.size) {
            readNext();
        } else {
            progressDiv.innerHTML += `<div>File "${file.name}" sent.</div>`;
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