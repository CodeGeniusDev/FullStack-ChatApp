import express from "express";
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import dotenv from "dotenv";
import { connectDB } from "./lib/db.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import User from "./models/user.model.js";

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 5002;

// Store for tracking online users and their socket IDs
const userSocketMap = {}; // {userId: socketId}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;
    console.log(`User ${userId} connected with socket ${socket.id}`);
    
    // Update user's lastSeen to current time (online)
    User.findByIdAndUpdate(userId, { lastSeen: new Date() }).catch(err => 
      console.error('Error updating lastSeen on connect:', err)
    );
  }

  // Emit online users to all connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Handle typing indicator
  socket.on('typing', ({ receiverId, isTyping }) => {
    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('userTyping', {
        senderId: userId,
        isTyping,
      });
    }
  });

  // Handle voice call signaling
  socket.on('callUser', ({ userToCall, signalData, from, name }) => {
    const receiverSocketId = userSocketMap[userToCall];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('incomingCall', {
        signal: signalData,
        from,
        name,
      });
    }
  });

  socket.on('answerCall', ({ signal, to }) => {
    const callerSocketId = userSocketMap[to];
    if (callerSocketId) {
      io.to(callerSocketId).emit('callAccepted', signal);
    }
  });

  socket.on('rejectCall', ({ to }) => {
    const callerSocketId = userSocketMap[to];
    if (callerSocketId) {
      io.to(callerSocketId).emit('callRejected');
    }
  });

  socket.on('endCall', ({ to }) => {
    const otherUserSocketId = userSocketMap[to];
    if (otherUserSocketId) {
      io.to(otherUserSocketId).emit('callEnded');
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (userId) {
      delete userSocketMap[userId];
      
      // Update user's lastSeen to current time (offline)
      User.findByIdAndUpdate(userId, { lastSeen: new Date() }).catch(err => 
        console.error('Error updating lastSeen on disconnect:', err)
      );
      
      // Emit updated online users list
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }
  });
});

// Store io instance and userSocketMap in app for use in routes
app.set('io', io);
app.set('userSocketMap', userSocketMap);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});
