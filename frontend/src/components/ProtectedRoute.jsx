import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AccessDenied from './AccessDenied';

export default function ProtectedRoute({ children, requiredRole, message }) {
  const { isAuthenticated, isAdmin, canWrite, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh'
      }}>
        <div className="skeleton" style={{ width: '280px', height: '40px' }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requiredRole === 'ADMIN' && !isAdmin) {
    return <AccessDenied requiredRole="ADMIN" message={message || "Administrative clearance is required to access this resource."} />;
  }

  if (requiredRole === 'ANALYST' && !canWrite) {
    return <AccessDenied requiredRole="SECURITY_ANALYST or ADMIN" message={message || "Security analyst or administrator role is required for this operation."} />;
  }

  return children ? children : <Outlet />;
}

