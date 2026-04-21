const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { 
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

let messages = [];
let users = new Map(); // socket.id → username

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Send existing data to new user
  socket.emit('messageHistory', messages);
  socket.emit('usersList', Array.from(users.values()));

  socket.on('join', (username) => {
    users.set(socket.id, username);
    
    // Broadcast new user joined
    io.emit('userJoined', username);
    io.emit('usersList', Array.from(users.values()));

    console.log(`${username} joined the chat`);
  });

  socket.on('sendMessage', (data) => {
    const messageData = {
      id: Date.now(),
      username: data.username,
      text: data.text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      delivered: true
    };
    
    messages.push(messageData);
    io.emit('receiveMessage', messageData);
  });

  socket.on('typing', (data) => {
    socket.broadcast.emit('userTyping', data);
  });

  socket.on('stopTyping', () => {
    socket.broadcast.emit('userStoppedTyping');
  });

  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    if (username) {
      io.emit('userLeft', username);
      users.delete(socket.id);
      io.emit('usersList', Array.from(users.values()));
      console.log(`${username} left the chat`);
    }
  });
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`🚀 Backend server is running on http://localhost:${PORT}`);
});