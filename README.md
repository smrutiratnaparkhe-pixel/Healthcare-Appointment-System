# Healthcare Appointment and Report Storage System

📌 This repository is maintained for portfolio purposes based on a college team project.

A modern, scalable, modular, secure, responsive, and enterprise-grade healthcare web application built for patients, doctors, hospitals, and administrators.

## 🌟 Overview
This platform bridges the gap in the healthcare ecosystem by providing centralized appointment booking, decentralized doctor availability scheduling, secure HIPAA-oriented medical report storage using Firebase, and an interactive modern discovery map using Leaflet.

## 🛠️ Technology Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **UI Library:** React.js, Tailwind CSS, ShadCN UI
- **State Management:** Zustand
- **Data Fetching:** Axios (with interceptors & automatic token refresh)
- **Validation:** Zod + React Hook Form
- **Maps:** Leaflet + React-Leaflet (OpenStreetMap)
- **Styling:** Custom soft-mint/light-green theme with glassmorphism effects

### Backend
- **Environment:** Node.js + Express.js
- **Database:** MySQL (Fully normalized 1NF, 2NF, 3NF schema, raw queries via `mysql2`)
- **Authentication:** JWT, Refresh Tokens, HTTP-only Secure Cookies, bcrypt
- **Storage:** Firebase Storage (Secure temporary signed URLs)
- **Validation:** Zod Validation Middleware
- **Security:** Helmet, Express Rate Limit, RBAC Middleware
- **Logging:** Audit & Activity logging tables

## 🏗️ Architecture

### Database Schema (25+ Tables)
- **Auth & RBAC:** `user`, `role`, `permission`, `user_role`, `role_permission`, `session`, `refresh_token`
- **Profiles:** `patient`, `doctor`, `hospital_admin`
- **Hospital Data:** `hospital`, `hospital_location`, `department`, `specialty`, `doctor_specialty`
- **Scheduling:** `appointment`, `appointment_status`, `availability_slot`
- **Medical:** `medical_report`, `report_access`, `prescription`
- **System:** `notification`, `review`, `audit_log`, `activity_log`

### Role-Based Access Control (RBAC)
- **Patient:** Book appointments, upload/share reports, view nearby hospitals.
- **Doctor:** Manage schedule, view shared reports, update consultation status.
- **Hospital Admin:** Localized KPI dashboard, department management.
- **Super Admin:** System-wide audit logs, global analytics, user management.

## 🚀 Setup & Installation

### Prerequisites
- Node.js (v18+)
- MySQL Server (v8.0+)
- Firebase Account (for Storage)

### 1. Database Setup
Ensure MySQL is running, then configure your environment variables:
```bash
cd backend
npm install
# Update .env with DB credentials
npm run db:init   # Creates database and runs schema.sql
npm run db:seed   # Generates test hospitals, doctors, patients, and admins
```

### 2. Backend Server
```bash
cd backend
npm run dev
# Server starts on http://localhost:5000
```
*Note: Make sure to add Firebase service account credentials to the backend `.env` for report uploads to work correctly. A local development fallback is provided if Firebase is missing.*

### 3. Frontend Client
```bash
cd frontend
npm install
npm run dev
# Client starts on http://localhost:3000
```

## 🔐 Security & Compliance Features
1. **HIPAA-Oriented Logging:** All sensitive actions (Login, Upload, Share, Delete) write to `audit_log` and `activity_log`.
2. **Access Revocation:** Patients grant doctors access to medical reports for a defined expiration period (e.g., 7 days) and can manually revoke access anytime.
3. **Signed URLs:** Firebase objects are private. The backend generates expiring, signed read URLs preventing direct public file scraping.
4. **JWT Security:** Uses rotating refresh tokens stored securely alongside short-lived access tokens.

## 🚢 Deployment Strategies

### Frontend (Vercel)
Deploy the `frontend/` directory to Vercel. 
Ensure to set `NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api`.

### Backend (Railway / Render / VPS)
Deploy the Node.js `backend/` directory.
Ensure proper environmental configurations:
- Set `NODE_ENV=production`
- Add actual `JWT_SECRET` and `JWT_REFRESH_SECRET`
- Provide `FIREBASE_*` credentials as strings

### Database (AWS RDS / DigitalOcean / PlanetScale)
Host the MySQL instance on a managed database provider for automated backups and scaling. Update the backend connection pool to point to the remote host.

## 🧪 Testing
Run backend unit testing structure via `npm test` inside the backend directory. Focus areas for tests: API route validation, RBAC rejection on forbidden routes, File Upload size limitations, and Booking Slot conflict prevention logic.
