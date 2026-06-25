# Project 8 - Badminton Class Booking System

Fullstack MERN application for managing and booking badminton classes. Admin users can create classes, manage students, and control class capacity. Regular users can browse upcoming classes, enroll, cancel enrollments, and manage their registered classes.

This project focuses on connecting a React frontend with a custom Node.js/Express backend, including authentication, authorization, protected APIs, and real deployment configuration.

## Tech Stack

- Frontend: React, Vite, React Router, Axios, TanStack React Query
- Backend: Node.js, Express, MongoDB, Mongoose
- Auth: JWT, bcrypt
- Deployment: Vercel for frontend, Render for backend

## Main Entities

### User

- `role`: `admin` | `user`

### Class

- `title`
- `description`
- `coachName`
- `level`: `beginner` | `intermediate` | `advanced`
- `startDate`
- `schedule`
- `location`
- `maxStudents`
- `createdBy`: reference to `User`

### Enrollment

- `class`: reference to `Class`
- `user`: reference to `User`
- `enrolledAt`

## Features

### Public

- View upcoming badminton classes
- Search classes by name, coach, or description
- Filter classes by level
- View class details
- See current enrollment count and maximum capacity

### User

- Register and log in
- Enroll in a class after login
- Cancel enrollment
- View registered classes
- Access protected user routes with JWT

### Admin

- Create new classes
- Edit class information
- Delete classes
- View the student list for each class
- Access admin routes only when the user role is `admin`

## Business Rules

- A user cannot enroll in the same class twice.
- A user cannot enroll when the class is full.
- Only admins can create, edit, or delete classes.
- Each class displays both current student count and maximum capacity.
- Protected APIs require a valid JWT.
- Admin APIs require both authentication and admin role authorization.

## Project Structure

```text
.
|-- backend/
|   |-- src/
|   |   |-- controllers/
|   |   |-- middleware/
|   |   |-- models/
|   |   |-- routes/
|   |   |-- app.js
|   |   `-- server.js
|   `-- package.json
|-- frontend/
|   |-- public/
|   |-- src/
|   |   |-- api/
|   |   |-- components/
|   |   |-- hooks/
|   |   |-- pages/
|   |   `-- utils/
|   `-- package.json
`-- package.json
```

## API Overview

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Classes

- `GET /api/classes`
- `GET /api/classes/:id`
- `POST /api/classes` - admin only
- `PATCH /api/classes/:id` - admin only
- `DELETE /api/classes/:id` - admin only
- `GET /api/classes/:id/students` - admin only

### Enrollments

- `POST /api/classes/:id/enroll`
- `DELETE /api/classes/:id/enroll`
- `GET /api/classes/my/enrollments`

## Environment Variables

Do not commit real `.env` files or secrets.

### Backend `.env`

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_strong_jwt_secret
CLIENT_URL=http://localhost:5173
```

Optional for local development without MongoDB:

```env
USE_MEMORY_DB=true
```

### Frontend `.env`

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

## Local Setup

Install all dependencies:

```bash
npm run install:all
```

Seed demo data:

```bash
npm run seed --prefix backend
```

Start backend and frontend together:

```bash
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

## Demo Accounts

After running the seed script:

```text
Admin
Email: admin@example.com
Password: password123

User
Email: user@example.com
Password: password123
```

## Deployment

### Frontend - Vercel

1. Create a Vercel project from the `frontend/` folder.
2. Set build command:

```bash
npm run build
```

3. Set output directory:

```text
dist
```

4. Add environment variable:

```env
VITE_API_URL=https://your-render-backend.onrender.com/api
```

### Backend - Render

1. Create a Render Web Service from the `backend/` folder.
2. Set build command:

```bash
npm install
```

3. Set start command:

```bash
npm start
```

4. Add environment variables:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_strong_jwt_secret
CLIENT_URL=https://your-vercel-frontend.vercel.app
```

`CLIENT_URL` supports comma-separated origins if multiple frontend URLs are needed.

## Topics Learned

- Axios `GET`, `POST`, `PATCH`, and `DELETE` from React
- Attaching JWT to request headers
- React Query caching, refetching, and mutations
- Authentication and role-based authorization
- CORS configuration
- Environment variables on frontend and backend
- End-to-end authentication flow: login, save token, call protected API
- Many-to-many relationship through the `Enrollment` model
- Search, filter, and pagination
- Loading states, empty states, and error states
- Protected routes
- Deploying frontend to Vercel and backend to Render

## Done Criteria

- [x] Class list displays correctly with loading state
- [x] Search and level filter work
- [x] Enroll and cancel enrollment work with React Query updates
- [x] Duplicate enrollment is blocked
- [x] Enrollment is blocked when class capacity is full
- [x] User can view registered classes
- [x] Only admins can create, edit, and delete classes
- [x] Student list displays for each class
- [x] CORS is configured
- [ ] Frontend deployed to Vercel and backend deployed to Render
- [x] No API keys or secrets are committed in source code

## Security Notes

- Keep `backend/.env` private.
- Use a strong `JWT_SECRET` in production.
- Restrict `CLIENT_URL` to the deployed frontend domain in production.
- Only expose frontend-safe variables that start with `VITE_`.
