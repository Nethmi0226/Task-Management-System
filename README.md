# 📋Task Management System (TMS)

A full-stack task management application built with a Node.js/Express backend and a React (Vite) frontend. Organize, track, and manage your tasks with ease.
Department of Industrial Management - University of Kelaniya
INTE 21323 - Web Application Development (Level 2, Semester 1)

## Project Overview

The Task Management System (TMS) is a full-stack web application designed to help teams organize, track, and manage their daily tasks efficiently. The project follows a modern three-tier architecture using the Node.js, Express, React, and MySQL stack with a Cloud Database.

### Technical Stack

- Frontend: React.js with Vite (ESM)
- Backend: Node.js & Express.js
- Database: Azure Database for MySQL (Flexible Server)
- ORM: Sequelize
- Authentication: JSON Web Tokens (JWT) & Bcrypt for password hashing

## 🚀 Features

- Create, read, update, and delete tasks
- File attachment support via uploads
- Environment-based configuration (.env)
- Fast frontend powered by Vite + React
- RESTful API backend with Express
- Modular component-based UI architecture
- Context API for global state management
- Custom React hooks for reusable logic

## 🗂️ Project Structure

The repository is organized into a Monorepo structure for independent scaling of the frontend and backend.

```
task-management-system/
│
├── backend/
│ ├── src/
│ │ ├── config/ # DB connection & app config
│ │ ├── controllers/ # Route handler logic
│ │ ├── middleware/ # Auth & role-guard middleware
│ │ ├── models/ # Sequelize models (DB schema)
│ │ ├── routes/ # Express route definitions
│ │ └── utils/ # Helper functions & utilities
│ ├── uploads/ # Uploaded file storage
│ ├── seedAdmin.ts # Admin user seeder script
│ ├── server.ts # App entry point
│ ├── .env # Backend environment variables
│ ├── package.json
│ └── tsconfig.json
│
├── frontend/
│ ├── public/ # Static assets
│ ├── src/
│ │ ├── api/ # Axios/fetch API service functions
│ │ ├── assets/ # Images, icons, fonts
│ │ ├── components/ # Reusable UI components
│ │ ├── context/ # React Context providers (Auth, Role)
│ │ ├── hooks/ # Custom React hooks
│ │ ├── pages/
│ │ │ ├── AnalyticsPage.jsx
│ │ │ ├── ChangePasswordPage.jsx
│ │ │ ├── ForgotPasswordPage.jsx
│ │ │ ├── HomePage.jsx
│ │ │ ├── IntroPage.jsx
│ │ │ ├── LoginPage.jsx
│ │ │ ├── NotFoundPage.jsx
│ │ │ ├── ResetPasswordPage.jsx
│ │ │ ├── TaskDetailPage.jsx
│ │ │ ├── TasksPage.jsx
│ │ │ ├── TeamPage.jsx
│ │ │ └── UsersPage.jsx
│ │ ├── App.jsx
│ │ ├── main.jsx
│ │ └── index.css
│ ├── .env
│ ├── index.html
│ └── vite.config.js
│
├── .gitignore
├── LICENSE
└── README.md
```



## 🔐 Security & Performance

- Passwords hashed with Bcrypt (configurable rounds via BCRYPT_ROUNDS)
- Routes protected via JWT middleware
- Role-based authorization enforced on every protected endpoint
- SSL/TLS enforced on all Azure MySQL connections (DB_SSL=true)
- Sensitive credentials stored in .env and excluded via .gitignore



## Getting Started

### 1. Prerequisites

- Node.js (v24 or higher)
- npm
- MySQL (or Azure Access)

### 2. Clone the Repository

- git clone https://github.com/your-username/task-management-sys.git
- cd task-management-sys

### 3. Backend Setup

- cd backend
- npm install
- npm start
- (A .env file is required in the backend folder with Azure DB credentials)

### 4. Frontend Setup

- cd frontend
- npm install
npm run dev

Note on ports: Both the frontend and backend ports are configurable via .env files.
The frontend reads VITE_PORT and the backend reads PORT.
If you change the backend port, make sure to update VITE_API_BASE_URL in frontend/.env accordingly.

---

## 🔑 Role-Based Access Control (RBAC)

The system implements three user roles with different levels of access.

### Roles Overview

| Role        | Description                                              |
| ----------- | -------------------------------------------------------- |
| **Admin**   | Full system access — manages users, teams, and all tasks |
| **Manager** | Creates and manages tasks; oversees team members         |
| **Member**  | Views and updates tasks assigned to them only            |

### Permission Matrix

| Action                  | Admin | Manager | Member |
| ----------------------- | :---: | :-----: | :----: |
| View all tasks          |  ✅   |   ✅    |   ❌   |
| View assigned tasks     |  ✅   |   ✅    |   ✅   |
| Create tasks            |  ✅   |   ✅    |   ❌   |
| Edit any task           |  ✅   |   ❌    |   ❌   |
| Edit own/assigned task  |  ✅   |   ✅    |   ❌   |
| Delete tasks            |  ✅   |   ✅    |   ❌   |
| Upload file attachments |  ✅   |   ✅    |   ✅   |
| View analytics          |  ✅   |   ❌    |   ❌   |
| Manage users            |  ✅   |   ❌    |   ❌   |
| Manage teams            |  ✅   |   ✅    |   ❌   |
| Change own password     |  ✅   |   ✅    |   ✅   |

## 🤝 Contributing

1. Fork the repository
2. Create a branch: git checkout -b feature/your-feature
3. Commit your changes: git commit -m "feat: add your feature"
4. Push: git push origin feature/your-feature
5. Open a Pull Request
