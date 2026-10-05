# Lakshya Training Partner Portal — Module 1

Stack:
- Frontend: React + Vite + React Router
- Backend: Node.js + Express
- Database: MySQL
- Auth: JWT + bcrypt
- DB access: mysql2

## Module 1 implemented

1. Lakshya Admin can log in.
2. Lakshya Admin can create/activate/deactivate Training Partner HO accounts.
3. HO can log in.
4. HO can create training centres.
5. HO can activate/deactivate centre users.
6. HO can create courses and map courses to centres.
7. HO can see all centres.
8. Centre login is restricted to its own centre.
9. Centre users can view their mapped courses.
10. Role-based API protection.

This follows the uploaded specification's Module 1: Lakshya creates the TP account; HO manages centres, centre users, and course mapping; each centre sees only its own scope.

## Prerequisites

- Node.js 18+
- MySQL 8+

## 1. Database

Create the database:

```sql
CREATE DATABASE lakshya_tp;
```

Then run:

```bash
mysql -u root -p lakshya_tp < backend/sql/schema.sql
```

After the schema, create the initial admin:
```bash
cd backend
npm install
npm run seed:admin
```
Initial admin:
- Email: admin@lakshya.local
- Password: Admin@123

Change this password before real use.

## 2. Backend

```bash
cd backend
npm install
```

Copy `.env.example` to `.env` and update MySQL credentials.

```bash
npm run dev
```

Backend runs on `http://localhost:5000`.

## 3. Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on the Vite URL, normally `http://localhost:5173`.

## API summary

### Auth
POST `/api/auth/login`
GET `/api/auth/me`

### Admin
POST `/api/admin/training-partners`
GET `/api/admin/training-partners`
PATCH `/api/admin/training-partners/:id/status`

### HO
POST `/api/ho/centres`
GET `/api/ho/centres`
PATCH `/api/ho/centres/:id/status`
POST `/api/ho/centres/:id/users`
PATCH `/api/ho/users/:id/status`
POST `/api/ho/courses`
GET `/api/ho/courses`
POST `/api/ho/centres/:centreId/courses/:courseId`
DELETE `/api/ho/centres/:centreId/courses/:courseId`

### Centre
GET `/api/centre/me`
GET `/api/centre/courses`

## Module 1 data relationship

Training Partner
  -> Training Centre
      -> Centre User
      -> Course mappings

The later Lead/Application/Loan/Attendance modules are intentionally not implemented in this version.
