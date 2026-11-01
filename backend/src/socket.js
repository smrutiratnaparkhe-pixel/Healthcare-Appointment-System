const { Server } = require('socket.io');
const config = require('./config');
const jwt = require('jsonwebtoken');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: config.server.frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      socket.userId = decoded.userId;
      // Rooms can be user ID based for direct notifications
      socket.join(`user_${decoded.userId}`);
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.userId}`);
    
    // Join a hospital room to get specific hospital updates
    socket.on('join_hospital', (hospitalId) => {
      if (hospitalId) {
        socket.join(`hospital_${hospitalId}`);
        console.log(`[Socket] User ${socket.userId} joined hospital_${hospitalId}`);
      }
    });

    // Leave a hospital room
    socket.on('leave_hospital', (hospitalId) => {
      if (hospitalId) {
        socket.leave(`hospital_${hospitalId}`);
        console.log(`[Socket] User ${socket.userId} left hospital_${hospitalId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.userId}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized!');
  }
  return io;
};

// Emit event helper
const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user_${userId}`).emit(event, data);
  }
};

const emitToHospital = (hospitalId, event, data) => {
  if (io) {
    io.to(`hospital_${hospitalId}`).emit(event, data);
  }
};

const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitToHospital,
  emitToAll
};
