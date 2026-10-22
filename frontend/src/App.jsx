import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import LogExplorer from './pages/LogExplorer';
import AlertCenter from './pages/AlertCenter';
import IncidentResponse from './pages/IncidentResponse';
import RulesManager from './pages/RulesManager';
import NotificationSettingsPage from './pages/NotificationSettingsPage';
import AuditLogs from './pages/AuditLogs';
import Login from './pages/Login';

export default function App() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveTab} />;
      case 'logs':
        return <LogExplorer />;
      case 'alerts':
        return <AlertCenter onNavigate={setActiveTab} />;
      case 'incidents':
        return <IncidentResponse />;
      case 'rules':
        return <RulesManager />;
      case 'notifications':
        return <NotificationSettingsPage />;
      case 'audit':
        return <AuditLogs />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <Navbar onNavigate={setActiveTab} activeTab={activeTab} />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />
        <main style={{ flex: 1, padding: '1.75rem', overflowY: 'auto', maxHeight: 'calc(100vh - 64px)' }}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
