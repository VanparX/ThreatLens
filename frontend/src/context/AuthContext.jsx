import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('threatlens_token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('threatlens_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { username, password });
      const authData = res.data;
      setToken(authData.token);
      setUser({
        username: authData.username,
        email: authData.email,
        roles: authData.roles || []
      });
      localStorage.setItem('threatlens_token', authData.token);
      localStorage.setItem('threatlens_user', JSON.stringify({
        username: authData.username,
        email: authData.email,
        roles: authData.roles || []
      }));
      return authData;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('threatlens_token');
    localStorage.removeItem('threatlens_user');
  };

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('threatlens:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('threatlens:unauthorized', handleUnauthorized);
  }, []);

  const roles = user?.roles || [];
  const isAdmin = roles.includes('ADMIN') || roles.includes('ROLE_ADMIN');
  const isAnalyst = isAdmin || roles.includes('SECURITY_ANALYST') || roles.includes('ROLE_SECURITY_ANALYST');
  const isViewer = !isAdmin && !isAnalyst;
  const canWrite = isAdmin || isAnalyst;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAdmin,
        isAnalyst,
        isViewer,
        canWrite,
        isAuthenticated: !!token,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
