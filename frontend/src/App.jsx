import React from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';

import CommandHub from './pages/CommandHub';
import Dashboard from './pages/Dashboard';
import LogExplorer from './pages/LogExplorer';
import AlertCenter from './pages/AlertCenter';
import IncidentResponse from './pages/IncidentResponse';
import RulesManager from './pages/RulesManager';
import NotificationSettingsPage from './pages/NotificationSettingsPage';
import AuditLogs from './pages/AuditLogs';
import UserManagement from './pages/UserManagement';
import DetectionCenter from './pages/DetectionCenter';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

function LoginRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    const from = location.state?.from;
    const dest = from?.pathname && from.pathname !== '/login'
      ? `${from.pathname}${from.search || ''}${from.hash || ''}`
      : (typeof from === 'string' && from !== '/login' ? from : '/command-hub');
    return <Navigate to={dest} replace />;
  }
  return <Login />;
}

function AppShell() {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="app-body">
        <Sidebar />
        <main className="main-content" role="main">
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public Login Route */}
      <Route path="/login" element={<LoginRoute />} />

      {/* Authenticated Application Shell */}
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route index element={<Navigate to="/command-hub" replace />} />
        <Route path="/command-hub" element={<CommandHub />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/logs" element={<LogExplorer />} />
        <Route path="/detections" element={<DetectionCenter />} />
        <Route path="/alerts" element={<AlertCenter />} />
        <Route path="/incidents" element={<IncidentResponse />} />
        <Route path="/rules" element={<RulesManager />} />
        <Route path="/notifications" element={<NotificationSettingsPage />} />
        
        {/* Admin-only Protected Route */}
        <Route
          path="/audit"
          element={
            <ProtectedRoute requiredRole="ADMIN" message="Administrative clearance is required to view the immutable audit trail.">
              <AuditLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute requiredRole="ADMIN" message="Administrative clearance is required to access the User Management workspace.">
              <UserManagement />
            </ProtectedRoute>
          }
        />

        {/* Fallback 404 Route within authenticated layout */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
