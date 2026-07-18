# ChatGeniusX

ChatGeniusX is a private real-time MERN chat application built with React, Zustand, Express, MongoDB, Cloudinary, JWT cookies, and Socket.IO.

## Requirements

- Node.js 20.19 or newer (below Node 23)
- npm 10 or newer
- MongoDB Atlas or another MongoDB deployment
- Cloudinary credentials for profile and message media

## Local development

```bash
npm install
npm run install:all
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run dev
```

The frontend defaults to `http://localhost:5173`; the backend defaults to `http://localhost:5002`.

## Commands

```bash
npm run dev          # frontend and backend
npm run dev:frontend
npm run dev:backend
npm run lint
npm run build
npm start            # production backend process
```

## Environment variables

Backend variables: `NODE_ENV`, `PORT`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL`, `FRONTEND_URLS`, `CORS_ORIGIN`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.

Frontend variables: `VITE_API_URL` and `VITE_SOCKET_URL`. Both are build-time variables. `VITE_API_URL` must include `/api`; `VITE_SOCKET_URL` must be the backend origin without `/api`.

## Production deployment

- Deploy `frontend/` to a static SPA host such as Netlify or Vercel.
- Deploy `backend/` to a persistent Node.js host that supports WebSockets, such as Render or Railway.
- Do not deploy Socket.IO as a short-lived serverless function.
- Use HTTPS for both applications. Cross-domain production authentication requires `Secure` cookies with `SameSite=None`.
- Configure the frontend origin in `FRONTEND_URLS` and configure the backend URLs in the frontend build environment.
- Use `/health` for liveness and `/ready` for database-aware readiness checks.

Real `.env` files are ignored by Git. Never commit or share credentials.
