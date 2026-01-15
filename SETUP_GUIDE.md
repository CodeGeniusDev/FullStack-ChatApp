# Quick Setup & Verification Guide

## 1. Install Dependencies (if not already done)

### Backend:
```bash
cd backend
npm install
```

### Frontend:
```bash
cd frontend
npm install
```

## 2. Environment Variables

Make sure your backend `.env` file has:
```env
MONGODB_URI=your_mongodb_connection_string
PORT=5002
JWT_SECRET=your_jwt_secret
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 3. Start the Application

### Terminal 1 - Backend:
```bash
cd backend
npm start
# or
npm run dev
```

Expected output:
```
Server is running on port 5002
Connected to MongoDB
```

### Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

Expected output:
```
VITE v4.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

## 4. Quick Functionality Test

### A. Create Test Accounts:
1. Open http://localhost:5173
2. Create Account 1: Sign up with email/password
3. Open incognito/another browser
4. Create Account 2: Sign up with different email/password

### B. Test Messaging:
1. **Window 1 (Account 1):**
   - Should see Account 2 in sidebar
   - Click on Account 2
   - Type a message and press send
   
2. **Window 2 (Account 2):**
   - Should see Account 1 in sidebar
   - Should instantly see the message from Account 1 (real-time!)
   - Type a reply

3. **Verify:**
   - ✅ Messages appear instantly without refresh
   - ✅ Messages display in chronological order
   - ✅ Both users show as "Online"
   - ✅ Timestamps show correctly
   - ✅ Message bubbles align correctly (sent right, received left)

### C. Test Image Upload:
1. Click the image icon
2. Select an image
3. Send the message
4. Verify image displays correctly

### D. Test Online Status:
1. Close Window 2 (logout or close tab)
2. Check Window 1 - Account 2 should show "Offline"
3. Reopen Window 2 and login
4. Check Window 1 - Account 2 should show "Online"

## 5. Common Issues & Solutions

### Issue: 404 Errors in Console
**Solution:** Make sure backend is running on port 5002

### Issue: Socket connection failed
**Solution:** 
- Check if backend is running
- Verify CORS settings in backend/src/index.js
- Check frontend baseURL in frontend/src/lib/axios.js

### Issue: Messages not appearing in real-time
**Solution:**
- Check browser console for Socket.IO connection errors
- Verify Socket.IO is properly initialized in both frontend and backend
- Check if userId is being passed in socket handshake

### Issue: Images not uploading
**Solution:**
- Verify Cloudinary credentials in .env
- Check image size (might need to increase limit)
- Check browser console for errors

### Issue: Cannot login/signup
**Solution:**
- Verify MongoDB connection
- Check JWT_SECRET is set
- Verify auth routes are working

## 6. Browser Console Check

Open browser DevTools (F12) and check:

### Console tab should show:
```
Connected to socket server
Socket ID: xxxxx
```

### Network tab should show:
- WebSocket connection to ws://localhost:5002
- Status: 101 Switching Protocols (successful)

### Application tab → Storage:
- Cookies should contain authentication token

## 7. Backend Logs to Verify

Your backend terminal should show:
```
Server is running on port 5002
Connected to MongoDB
A user connected: [socket-id]
User [user-id] connected with socket [socket-id]
```

When messages are sent:
```
(No logs by default, but you can add console.logs if needed)
```

## 8. Success Indicators ✅

You've successfully set up the chat app if:
- ✅ Two users can see each other in sidebar
- ✅ Messages send and appear instantly
- ✅ Online/offline status updates automatically
- ✅ Images can be uploaded and displayed
- ✅ Chat history loads when selecting a user
- ✅ Messages stay in order (oldest to newest)
- ✅ No errors in browser console
- ✅ No errors in backend terminal

## 9. Performance Check

Monitor the following:
- Message send/receive latency should be < 100ms
- Image upload time depends on image size and internet speed
- Chat history should load in < 1 second
- Sidebar user list should load in < 1 second

---

## Need More Help?

If you encounter issues:
1. Check the FIX_SUMMARY.md for detailed technical information
2. Verify all dependencies are installed
3. Make sure MongoDB is accessible
4. Check Cloudinary credentials are correct
5. Ensure both frontend and backend are running simultaneously
