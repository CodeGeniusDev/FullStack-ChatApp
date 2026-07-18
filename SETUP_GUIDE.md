# Setup and verification

## Start locally

1. Install dependencies with `npm run install:all`.
2. Populate `backend/.env` and `frontend/.env` from their example files.
3. Run `npm run dev`.
4. Confirm `GET http://localhost:5002/health` reports `database: connected`.

Socket.IO authenticates with the HTTP-only JWT cookie. No user ID belongs in the socket query string.

## Verification

```bash
npm run lint
npm run build
npm start --prefix backend
npm run preview --prefix frontend
```

In two separate browser profiles:

1. Create or sign in to two accounts.
2. Send text, emoji, long-text, and image messages in both directions.
3. Refresh and confirm persistence and chronological order.
4. Send rapid messages and confirm no duplicates.
5. Verify online, typing, delivered, and read states.
6. Open one account in multiple tabs; closing one tab must not mark it offline.
7. Test pin, mute, profile update, clear chat, logout, and reconnect behavior.

## Troubleshooting

- A database readiness failure means MongoDB must be fixed before the backend listens.
- A browser CORS failure means the exact frontend origin is missing from `FRONTEND_URLS`, `FRONTEND_URL`, or `CORS_ORIGIN`.
- A production socket failure usually indicates an incorrect `VITE_SOCKET_URL`, missing WebSocket support, or cookie/origin mismatch.
- Media failures require valid Cloudinary variables and an attachment below the configured request limit.
