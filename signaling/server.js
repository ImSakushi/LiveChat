const http = require('http');
const server = http.createServer();
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } });

const port = process.env.PORT || 3001;

io.on('connection', (socket) => {
  socket.on('join', (room) => {
    socket.join(room);
    const clients = Array.from(io.sockets.adapter.rooms.get(room) || []);
    const otherClients = clients.filter((id) => id !== socket.id);
    socket.emit('peers', otherClients);
    socket.to(room).emit('peer:join', socket.id);
  });

  socket.on('signal', ({ to, data }) => {
    io.to(to).emit('signal', { from: socket.id, data });
  });

  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.to(room).emit('peer:leave', socket.id);
      }
    }
  });
});

server.listen(port, () => {
  console.log(`Signaling server listening on port ${port}`);
});
