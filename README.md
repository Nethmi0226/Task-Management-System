# Task Management System (TMS)
Department of Industrial Management - University of Kelaniya
INTE 21323 - Web Application Development (Level 2, Semester 1)

## Project Overview
The Task Management System (TMS) is a full-stack web application designed to help teams organize, track, and manage their daily tasks efficiently. The project follows a modern three-tier architecture using the Node.js, Express, React, and MySQL stack with a Cloud Database.

### Technical Stack
* Frontend: React.js with Vite (ESM)
* Backend: Node.js & Express.js
* Database: Azure Database for MySQL (Flexible Server)
* ORM: Sequelize
* Authentication: JSON Web Tokens (JWT) & Bcrypt for password hashing

---

## Project Structure
The repository is organized into a Monorepo structure for independent scaling of the frontend and backend.

tms-project/
├── backend/            # Express API & Azure DB Connection
│   ├── config/         # Database configuration (Sequelize)
│   ├── models/         # Database Schemas
│   ├── controllers/    # Business Logic
│   └── routes/         # API Endpoints
└── frontend/           # React Client (Vite)
    ├── src/api/        # Centralized Axios calls
    ├── src/components/ # Reusable UI components
    ├── src/pages/      # Individual screen views
    └── src/context/    # Global state management

---

## Security & Performance
* Credential Protection: Sensitive data is decoupled using .env files (ignored via .gitignore).
* Data Integrity: Implemented SSL/TLS encryption for all Azure MySQL connections.
* Responsive UI: Built with Vite for Hot Module Replacement (HMR) and optimized build times.

---

## Getting Started

### 1. Prerequisites
* Node.js (v18 or higher)
* MySQL (or Azure Access)

### 2. Backend Setup
cd backend
npm install
npm start
(A .env file is required in the backend folder with Azure DB credentials)

### 3. Frontend Setup
cd frontend
npm install
npm run dev

---

