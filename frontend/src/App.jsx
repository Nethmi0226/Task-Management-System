import TaskForm from "./components/tasks/TaskForm.jsx";
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import PrivateRoute from './components/common/PrivateRoute.jsx';

import IntroPage from './pages/IntroPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import HomePage from './pages/HomePage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import TaskDetailPage from './pages/TaskDetailPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import TeamPage from './pages/TeamPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import ChangePasswordPage from './pages/ChangePasswordPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';

function AppRoutes() {
  const [showIntro, setShowIntro] = useState(
    () => !sessionStorage.getItem('tms_intro_shown')
  );

  const handleIntroComplete = () => {
    sessionStorage.setItem('tms_intro_shown', 'true');
    setShowIntro(false);
  };

  if (showIntro) {
    return <IntroPage onComplete={handleIntroComplete} />;
  }

  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route path="/home" element={
          <PrivateRoute><HomePage /></PrivateRoute>
        } />
        <Route path="/tasks" element={
          <PrivateRoute><TasksPage /></PrivateRoute>
        } />
        <Route path="/tasks/new" element={
          <PrivateRoute><TaskForm /></PrivateRoute>
        } />
        <Route path="/tasks/edit/:id" element={
          <PrivateRoute><TaskForm /></PrivateRoute>
        } />
        <Route path="/tasks/:id" element={
          <PrivateRoute><TaskDetailPage /></PrivateRoute>
        } />
        <Route path="/users" element={
          <PrivateRoute roles={['Admin']}><UsersPage /></PrivateRoute>
        } />
        <Route path="/team" element={
          <PrivateRoute roles={['ProjectManager']}><TeamPage /></PrivateRoute>
        } />
        <Route path="/change-password" element={
          <PrivateRoute><ChangePasswordPage /></PrivateRoute>
        } />

        <Route path="/analytics" element={
  <PrivateRoute roles={['Admin']}>
    <AnalyticsPage />
  </PrivateRoute>
} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}