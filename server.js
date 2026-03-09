const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(express.json());

// ---------- Hyperswitch Configuration ----------
const HYPERSWITCH_API_KEY = 'snd_vh8blUJfyKM9ajHm3HaqLuuJk4kiktyewF9Pua7V5CrRjeTVlnDlvpxk7uE1YNvl';        // Replace with your sandbox secret key
const HYPERSWITCH_PUBLISHABLE_KEY = 'pk_snd_24a92d39a6a14c36ab6bd247cdf7d5d4';   // Replace with your sandbox publishable key
const HYPERSWITCH_URL = 'https://sandbox.hyperswitch.io';      // Sandbox environment

function getHyperswitchHeaders() {
    return {
        'Content-Type': 'application/json',
        'api-key': HYPERSWITCH_API_KEY,
    };
}

// Create a payment intent
app.post('/api/create-payment', async (req, res) => {
    try {
        const { amount, currency, customerId, email } = req.body;
        const paymentData = {
            amount: amount * 100, // cents
            currency: currency || 'USD',
            confirm: false,
            capture_method: 'automatic',
            customer_id: customerId || `cust_${Date.now()}`,
            email: email || 'customer@example.com',
            metadata: { order_id: `order_${Date.now()}` }
        };

        const response = await axios.post(`${HYPERSWITCH_URL}/payments`, paymentData, {
            headers: getHyperswitchHeaders()
        });
        const data = response.data;
        res.json({
            clientSecret: data.client_secret,
            paymentId: data.id
        });
    } catch (err) {
        console.error('Payment creation error:', err.response?.data || err.message);
        res.status(500).json({ error: err.message });
    }
});

// ---------- Ethereum RPC Proxy (Sepolia) ----------
app.post('/rpc', async (req, res) => {
    try {
        const endpoints = [
            'https://ethereum-sepolia.publicnode.com',
            'https://rpc.sepolia.org',
            'https://sepolia.gateway.tenderly.co',
            'https://sepolia.infura.io/v3/40544311a68c4b4e83ae8ffb74aedaba'
        ];
        let response;
        for (const endpoint of endpoints) {
            try {
                response = await axios.post(endpoint, req.body, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 5000
                });
                break;
            } catch (e) { /* try next */ }
        }
        if (!response) throw new Error('All RPC endpoints failed');
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---------- Socket.io Signaling ----------
let users = [];

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    socket.on('join', (data) => {
        users.push({ id: socket.id, username: data.username, publicKey: data.publicKey });
        io.emit('user-list', users.map(u => ({ id: u.id, username: u.username, publicKey: u.publicKey })));
    });
    socket.on('signal', (data) => {
        io.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
    });
    socket.on('disconnect', () => {
        users = users.filter(u => u.id !== socket.id);
        io.emit('user-list', users.map(u => ({ id: u.id, username: u.username, publicKey: u.publicKey })));
        console.log('User disconnected:', socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));