const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const FloodWatchSimulation = require('./src/simulation');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let simulation = null;

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('start-simulation', (config) => {
    if (simulation) {
      simulation.stop();
    }
    simulation = new FloodWatchSimulation(config, io);
    simulation.start();
    socket.emit('simulation-started');
  });

  socket.on('stop-simulation', () => {
    if (simulation) {
      simulation.stop();
      simulation = null;
    }
    socket.emit('simulation-stopped');
  });

  socket.on('trigger-flood', (data) => {
    if (simulation) {
      simulation.triggerFlood(data.x, data.y, data.waterLevel);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Flood Watch Simulation running on port ${PORT}`);
});