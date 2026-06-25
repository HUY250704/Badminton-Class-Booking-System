# Badminton Class Booking System

Local run (backend + frontend):

Backend

```bash
cd backend
cp .env.example .env
# edit .env to set MONGO_URI and JWT_SECRET
npm install
npm run seed   # optional - creates demo users and classes
npm run dev
```

Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Deployment notes

- Frontend (Vercel):
	1. Create a new Vercel project and point it at the `frontend` folder.
	2. Set environment variable `VITE_API_URL` to your backend API URL (e.g. `https://your-backend.onrender.com/api`).
	3. Build command: `npm run build`. Output directory: `dist`.

- Backend (Render):
	1. Create a new Web Service on Render (or similar on Heroku).
	2. Set the build/start commands: `npm install` and `npm start` (or use `npm run dev` for development).
	3. Add environment variables: `MONGO_URI`, `JWT_SECRET`, and `CLIENT_URL` (comma-separated allowed origins).

Security

- Never commit real secrets to the repo. Use environment variables for `MONGO_URI` and `JWT_SECRET`.
- For production, use a strong `JWT_SECRET` and restrict `CLIENT_URL` to your deployed frontend domain.

# Badminton Class Booking System

Fullstack MERN app for managing badminton classes, enrollments, and admin workflows.

## Tech Stack

- Backend: Node.js, Express, MongoDB, Mongoose, JWT
- Frontend: React, Vite, Axios, TanStack React Query, React Router

## Local Setup

1. Install dependencies:

```bash
npm run install:all
```

2. Create backend env:

```bash
cp backend/.env.example backend/.env
```

3. Create frontend env:

```bash
cp frontend/.env.example frontend/.env
```

4. Start both apps:

```bash
npm run dev
```

Backend runs on `http://localhost:5000`; frontend runs on `http://localhost:5173`.

## Default Admin

Register normally, then set one user's role to `admin` directly in MongoDB for first-time setup:

```js
db.users.updateOne({ email: "admin@example.com" }, { $set: { role: "admin" } })
```

## Deployment

- Deploy `frontend/` to Vercel. Set `VITE_API_URL` to the Render backend URL plus `/api`.
- Deploy `backend/` to Render. Set `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, and optional `PORT`.

Never commit real `.env` files.
