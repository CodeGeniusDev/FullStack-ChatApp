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

const PORT = process.env.PORT || 5002;

// Allowed origins for CORS
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  process.env.FRONTEND_URL, // Your production frontend URL
].filter(Boolean);

// CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store for tracking online users and their socket IDs
const userSocketMap = {}; // {userId: socketId}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(cookieParser());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Socket.IO connection handling with improved real-time messaging
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  const userId = socket.handshake.query.userId;
  if (userId && userId !== 'undefined') {
    userSocketMap[userId] = socket.id;
    console.log(`User ${userId} connected with socket ${socket.id}`);
    
    // Update user's lastSeen to current time (online)
    User.findByIdAndUpdate(userId, { lastSeen: new Date() }).catch(err => 
      console.error('Error updating lastSeen on connect:', err)
    );
    
    // Emit online users to all connected clients immediately
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  }

  // Handle typing indicator with immediate emission
  socket.on('typing', ({ receiverId, isTyping }) => {
    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) {
      // Send immediately, no buffering
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
    if (userId && userId !== 'undefined') {
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  connectDB();
});
