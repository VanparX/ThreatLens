import React from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AuthTransitionProvider, useAuthTransition } from './context/AuthTransitionContext';
import { AuthTransition } from './components/auth';
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
  const { isTransitioning, transitionMode } = useAuthTransition();
  const location = useLocation();

  // If already authenticated and not playing the login transition sequence, redirect
  if (isAuthenticated && !(isTransitioning && transitionMode === 'login')) {
    const from = location.state?.from;
    const dest = from?.pathname && from.pathname !== '/login'
      ? `${from.pathname}${from.search || ''}${from.hash || ''}`
      : (typeof from === 'string' && from !== '/login' ? from : '/command-hub');
    return <Navigate to={dest} replace />;
  }
  return <Login />;
}

function AuthTransitionOverlay() {
  const { isTransitioning, transitionMode, handleAnimationComplete } = useAuthTransition();
  if (!isTransitioning || !transitionMode) return null;
  return (
    <AuthTransition
      mode={transitionMode}
      onComplete={handleAnimationComplete}
    />
  );
}

function AppShell() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(() => {
    try {
      return localStorage.getItem('threatlens_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('threatlens_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Close mobile navigation drawer whenever route location changes
  React.useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Optional keyboard shortcut: Ctrl+B / Cmd+B to toggle sidebar
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="app-shell">
      <Navbar
        onToggleMobileNav={() => setMobileOpen(prev => !prev)}
        mobileNavOpen={mobileOpen}
      />
      <div className="app-body">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
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
    <AuthTransitionProvider>
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

      {/* Global Hardware-Accelerated Authentication Transition Overlay */}
      <AuthTransitionOverlay />
    </AuthTransitionProvider>
  );
}
