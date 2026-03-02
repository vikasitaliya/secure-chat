// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the "public" folder
app.use(express.static('public'));

// Store connected users with their public keys
let users = [];

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // When a user joins, expect { username, publicKey }
  socket.on('join', (data) => {
    users.push({ id: socket.id, username: data.username, publicKey: data.publicKey });
    // Broadcast updated user list (including public keys)
    io.emit('user-list', users.map(u => ({ id: u.id, username: u.username, publicKey: u.publicKey })));
  });

  // Relay WebRTC signaling messages
  socket.on('signal', (data) => {
    io.to(data.to).emit('signal', {
      from: socket.id,
      signal: data.signal
    });
  });

  // When a user disconnects
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