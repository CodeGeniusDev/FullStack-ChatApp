# 💬 Modern Chat Application - WhatsApp Clone

A full-featured real-time chat application built with **MERN stack** and **Socket.IO**, featuring WhatsApp-like capabilities including message status indicators, reactions, replies, editing, typing indicators, and more!

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Status](https://img.shields.io/badge/status-production--ready-green.svg)
![Features](https://img.shields.io/badge/features-15+-brightgreen.svg)

---

## ✨ Key Features

### 📨 Messaging
- ✅ Real-time messaging with Socket.IO
- ✅ Message status (Sent ✓, Delivered ✓✓, Read ✓✓)
- ✅ Reply/Quote messages
- ✅ Edit messages (15-minute window)
- ✅ Delete messages (for me / for everyone)
- ✅ Image sharing with preview
- ✅ Multi-line text support
- ✅ Emoji picker integration

### 💬 Interactions
- ✅ Message reactions (6 quick reactions + unlimited)
- ✅ Typing indicators
- ✅ Context menu (right-click actions)
- ✅ Copy message text
- ✅ Reply to specific messages
- ✅ Hover effects with quick reactions

### 📊 Status & Notifications
- ✅ Online/Offline indicators
- ✅ Unread message badges
- ✅ Message count per conversation
- ✅ Real-time status updates
- ✅ Auto-scroll to latest messages

### 🎨 User Experience
- ✅ Clean, modern UI (DaisyUI + Tailwind)
- ✅ Responsive design (mobile-friendly)
- ✅ Dark/light theme support
- ✅ Smooth animations
- ✅ Loading skeletons
- ✅ Profile pictures
- ✅ User avatars

---

## 🛠️ Tech Stack

### Frontend
- **React** 18+ - UI framework
- **Zustand** - State management
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP client
- **React Hot Toast** - Notifications
- **Lucide React** - Icons
- **Emoji Picker React** - Emoji selector
- **Tailwind CSS** - Styling
- **DaisyUI** - UI components

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **Socket.IO** - WebSocket server
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Cloudinary** - Image storage
- **Cookie Parser** - Cookie handling
- **CORS** - Cross-origin support

---

## 🚀 Quick Start

### Prerequisites
```bash
Node.js >= 16.x
MongoDB >= 5.x
npm or yarn
```

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd Chat-App
```

### 2. Backend Setup
```bash
cd backend
npm install

# Create .env file
cat > .env << EOF
MONGODB_URI=your_mongodb_connection_string
PORT=5002
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
EOF

npm start
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Access Application
```
Frontend: http://localhost:5173
Backend:  http://localhost:5002
```

---

## 📁 Project Structure

```
Chat-App/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   └── message.controller.js
│   │   ├── models/
│   │   │   ├── user.model.js
│   │   │   └── message.model.js
│   │   ├── routes/
│   │   │   ├── auth.route.js
│   │   │   └── message.route.js
│   │   ├── middleware/
│   │   │   └── auth.middleware.js
│   │   ├── lib/
│   │   │   ├── db.js
│   │   │   ├── cloudinary.js
│   │   │   └── utils.js
│   │   └── index.js
│   ├── .env
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatContainer.jsx      ⭐ Enhanced
│   │   │   ├── MessagesInput.jsx      ⭐ Enhanced
│   │   │   ├── Sidebar.jsx             ⭐ Enhanced
│   │   │   ├── ChatHeader.jsx
│   │   │   ├── Navbar.jsx
│   │   │   └── skeletons/
│   │   ├── store/
│   │   │   ├── useChatStore.js        ⭐ Enhanced
│   │   │   ├── useAuthStore.js
│   │   │   └── useThemeStore.js
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── Profile.jsx
│   │   │   └── Setting.jsx
│   │   ├── lib/
│   │   │   ├── axios.js
│   │   │   └── utils.js               ⭐ New
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── FIX_SUMMARY.md           📄 Technical fixes
├── WHATSAPP_FEATURES.md     📄 Feature guide
├── COMPARISON.md            📄 Before/After
├── SETUP_GUIDE.md           📄 Testing guide
└── README.md                📄 This file
```

---

## 🎯 Feature Deep Dive

### 1. Message Status System
```javascript
// Three-tier status system
"sent"      → ✓   Single check (gray)
"delivered" → ✓✓  Double check (gray)
"read"      → ✓✓  Double check (blue)

// Auto-updates via Socket.IO
socket.on("messagesDelivered", updateStatus);
socket.on("messagesRead", updateStatus);
```

### 2. Reply System
```javascript
// Right-click message → Reply
// Shows preview in input area
// Sent with reference to original message

{
  text: "Response text",
  replyTo: originalMessageId  // Reference
}
```

### 3. Reactions
```javascript
// Hover over message → Quick reactions appear
// Click emoji → Added to message
// Multiple users can react

reactions: [
  { userId: "user1", emoji: "👍" },
  { userId: "user2", emoji: "❤️" }
]
```

### 4. Message Editing
```javascript
// Can edit within 15 minutes
// Shows "(edited)" indicator
// Real-time update for receiver

isEdited: true,
editedAt: Date
```

### 5. Message Deletion
```javascript
// Two modes:
// 1. Delete for me (local removal)
// 2. Delete for everyone (1 hour limit)

deletedFor: [userId1, userId2]  // Soft delete
```

### 6. Typing Indicator
```javascript
// Emits typing status
// 3-second debounce
// Shows "..." animation

socket.emit("typing", { 
  receiverId, 
  isTyping: true 
});
```

---

## 🔌 API Documentation

### Authentication
```
POST   /api/auth/signup        - Register new user
POST   /api/auth/login         - Login user
POST   /api/auth/logout        - Logout user
GET    /api/auth/check         - Verify authentication
PUT    /api/auth/update-profile - Update user profile
```

### Messages
```
GET    /api/messages/user           - Get all users
GET    /api/messages/user/:id       - Get messages with user
POST   /api/messages/send/:id       - Send message
PUT    /api/messages/read/:id       - Mark as read
DELETE /api/messages/:id            - Delete message
PUT    /api/messages/edit/:id       - Edit message
POST   /api/messages/reaction/:id   - Add reaction
GET    /api/messages/unread/count   - Get unread counts
```

---

## 🔊 Socket.IO Events

### Client → Server
```javascript
socket.emit("typing", { receiverId, isTyping });
```

### Server → Client
```javascript
socket.on("getOnlineUsers", (userIds) => {...});
socket.on("newMessage", (message) => {...});
socket.on("userTyping", ({ senderId, isTyping }) => {...});
socket.on("messagesDelivered", ({ userId }) => {...});
socket.on("messagesRead", ({ userId }) => {...});
socket.on("messageDeleted", ({ messageId, deleteForEveryone }) => {...});
socket.on("messageEdited", (message) => {...});
socket.on("reactionAdded", ({ messageId, reactions }) => {...});
```

---

## 🗄️ Database Schema

### User Model
```javascript
{
  email: String (unique),
  fullName: String,
  password: String (hashed),
  profilePic: String (Cloudinary URL),
  createdAt: Date,
  updatedAt: Date
}
```

### Message Model
```javascript
{
  senderId: ObjectId → User,
  receiverId: ObjectId → User,
  text: String,
  image: String (Cloudinary URL),
  status: "sent" | "delivered" | "read",
  replyTo: ObjectId → Message,
  reactions: [{
    userId: ObjectId → User,
    emoji: String
  }],
  deletedFor: [ObjectId → User],
  isEdited: Boolean,
  editedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🎨 UI Components

### ChatContainer
- Message display with status icons
- Reply previews
- Reaction displays
- Context menu (right-click)
- Typing indicator
- Auto-scroll

### MessagesInput
- Multi-line textarea (auto-expanding)
- Emoji picker
- Image upload
- Reply preview
- Edit mode
- Send on Enter, new line on Shift+Enter

### Sidebar
- User list with avatars
- Online/offline indicators
- Unread message badges
- Message counts
- Real-time updates

---

## 🧪 Testing Guide

### Manual Testing
1. **Open two browsers** (or incognito + normal)
2. **Create two accounts**
3. **Test each feature:**
   - Send messages
   - Check status updates (✓ → ✓✓ → ✓✓ blue)
   - Reply to messages
   - Add reactions
   - Edit messages (within 15 min)
   - Delete messages
   - Type and see typing indicator
   - Upload images
   - Check unread badges

### Test Scenarios
```
✅ User A sends message → User B sees ✓✓
✅ User B opens chat → User A sees ✓✓ (blue)
✅ User A types → User B sees "..."
✅ User B replies → Quote shows correctly
✅ User A reacts → User B sees reaction
✅ User A edits → User B sees "(edited)"
✅ User A deletes → User B's view updates
✅ New message → Unread badge appears
✅ Open chat → Badge disappears
```

---

## 🚨 Troubleshooting

### Common Issues

#### 1. Emoji Picker Not Showing
```bash
cd frontend
npm install emoji-picker-react
# or
npm install emoji-picker-react --force
```

#### 2. Socket.IO Connection Failed
```javascript
// Check CORS settings in backend/src/index.js
origin: "http://localhost:5173"

// Verify frontend axios config
baseURL: "http://localhost:5002/api"
```

#### 3. Messages Not Delivering
- Ensure both backend and frontend are running
- Check browser console for Socket.IO errors
- Verify MongoDB connection
- Check authentication token

#### 4. Images Not Uploading
- Verify Cloudinary credentials in .env
- Check image size (limit: 10MB)
- Ensure proper CORS configuration

---

## 📈 Performance Tips

### Frontend
```javascript
// Debounced typing indicator (3s)
// Batched unread count updates (30s)
// Lazy load images
// Virtual scrolling for large chat histories
```

### Backend
```javascript
// Index on frequently queried fields
// Populate only required fields
// Use lean() for read-only queries
// Implement pagination for message history
```

---

## 🔐 Security Features

- ✅ JWT authentication
- ✅ Bcrypt password hashing
- ✅ HTTP-only cookies
- ✅ CORS protection
- ✅ Input validation
- ✅ XSS protection
- ✅ Rate limiting ready
- ✅ Secure image uploads

---

## 🎯 Roadmap

### v2.1 (Next)
- [ ] Voice messages
- [ ] Video calls (WebRTC)
- [ ] File sharing
- [ ] Message search
- [ ] Group chats

### v2.2 (Future)
- [ ] Message forwarding
- [ ] Star/favorite messages
- [ ] Custom chat wallpapers
- [ ] Message encryption
- [ ] Read receipts toggle

---

## 📝 Environment Variables

### Backend (.env)
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp
PORT=5002
JWT_SECRET=your_very_long_random_secret_key_here
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Frontend (automatically uses)
```bash
VITE_API_URL=http://localhost:5002
```

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com

---

## 🙏 Acknowledgments

- Socket.IO for real-time capabilities
- Cloudinary for image hosting
- MongoDB for database
- DaisyUI for UI components
- React community for amazing tools

---

## 📞 Support

If you encounter any issues or have questions:
1. Check the documentation files in the repo
2. Search existing issues on GitHub
3. Create a new issue with detailed information

---

## ⭐ Show Your Support

If you found this project helpful, please give it a ⭐️!

---

**Happy Chatting! 💬✨**
