// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(express.json());

// Proxy endpoint for Ethereum RPC calls (now using Sepolia)
app.post('/rpc', async (req, res) => {
    try {
        console.log('RPC request:', req.body.method);
        // List of reliable Sepolia endpoints
        const endpoints = [
            'https://ethereum-sepolia.publicnode.com',
            'https://rpc.sepolia.org',
            'https://sepolia.gateway.tenderly.co',
            'https://sepolia.infura.io/v3/40544311a68c4b4e83ae8ffb74aedaba'
        ];

        let response;
        for (const endpoint of endpoints) {
            try {
                console.log(`Trying ${endpoint}...`);
                response = await axios.post(endpoint, req.body, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 5000
                });
                console.log(`Success from ${endpoint}`);
                break;
            } catch (e) {
                console.log(`Endpoint ${endpoint} failed: ${e.message}`);
                if (e.response) {
                    console.log(`Status: ${e.response.status}, data:`, e.response.data.substring(0, 200));
                }
            }
        }

        if (!response) {
            throw new Error('All RPC endpoints failed');
        }

        res.json(response.data);
    } catch (err) {
        console.error('RPC proxy error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Socket.io signaling server (unchanged) vikasss

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
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});