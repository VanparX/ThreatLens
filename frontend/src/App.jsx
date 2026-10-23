import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import CommandHub from './pages/CommandHub';
import Dashboard from './pages/Dashboard';
import LogExplorer from './pages/LogExplorer';
import AlertCenter from './pages/AlertCenter';
import IncidentResponse from './pages/IncidentResponse';
import RulesManager from './pages/RulesManager';
import NotificationSettingsPage from './pages/NotificationSettingsPage';
import AuditLogs from './pages/AuditLogs';
import Login from './pages/Login';

const PAGE_TITLES = {
  hub:           'Command Hub',
  dashboard:     'Security Overview',
  logs:          'Security Logs',
  alerts:        'Detections & Alerts',
  incidents:     'Incident Response',
  rules:         'Detection Rules',
  notifications: 'Notifications',
  audit:         'Audit Trail',
};

export default function App() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('hub');

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'hub':           return <CommandHub onNavigate={setActiveTab} />;
      case 'dashboard':     return <Dashboard onNavigate={setActiveTab} />;
      case 'logs':          return <LogExplorer />;
      case 'alerts':        return <AlertCenter onNavigate={setActiveTab} />;
      case 'incidents':     return <IncidentResponse />;
      case 'rules':         return <RulesManager />;
      case 'notifications': return <NotificationSettingsPage />;
      case 'audit':         return <AuditLogs />;
      default:              return <CommandHub onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="app-shell">
      <Navbar onNavigate={setActiveTab} activeTab={activeTab} pageTitles={PAGE_TITLES} />
      <div className="app-body">
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />
        <main className="main-content" role="main" aria-label={PAGE_TITLES[activeTab] || 'Content'}>
          <div className="page-enter" key={activeTab}>
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
