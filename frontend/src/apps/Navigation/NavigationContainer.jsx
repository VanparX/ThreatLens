import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Drawer, Layout, Menu } from 'antd';

import useResponsive from '@/hooks/useResponsive';
import {
  ContainerOutlined,
  DashboardOutlined,
  CreditCardOutlined,
  MenuOutlined,
} from '@ant-design/icons';

const { Sider } = Layout;

export default function Navigation() {
  const { isMobile } = useResponsive();
  return isMobile ? <MobileSidebar /> : <Sidebar collapsible={false} />;
}

function Sidebar({ collapsible, isMobile = false }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [currentPath, setCurrentPath] = useState(location.pathname.slice(1));

  // 🔥 CLEAN SOC NAVIGATION (NO USERS)
  const items = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/">Dashboard</Link>,
    },
    {
      key: 'invoice',
      icon: <ContainerOutlined />,
      label: <Link to="/invoice">Threat Reports</Link>,
    },
    {
      key: 'logout',
      icon: <CreditCardOutlined />,
      label: <Link to="/logout">Logout</Link>,
    },
  ];

  useEffect(() => {
    if (location.pathname === '/') {
      setCurrentPath('dashboard');
    } else {
      setCurrentPath(location.pathname.slice(1));
    }
  }, [location.pathname]);

  return (
    <Sider
      collapsible={collapsible}
      width={256}
      className="navigation"
      style={{
        overflow: 'auto',
        height: '100vh',
        position: isMobile ? 'absolute' : 'relative',
        background: '#020617',
        borderRight: '1px solid #1e293b',
        boxShadow: '2px 0 20px rgba(0,0,0,0.7)',
      }}
      theme="dark"
    >
      {/* HEADER */}
      <div
        onClick={() => navigate('/')}
        style={{
          cursor: 'pointer',
          padding: '20px',
          fontWeight: '600',
          fontSize: '18px',
          color: '#f1f5f9',
          borderBottom: '1px solid #1e293b',
        }}
      >
        ThreatLens
        <div style={{ fontSize: '12px', color: '#64748b' }}>
          Cyber Defense
        </div>
      </div>

      {/* MENU */}
      <Menu
        items={items}
        mode="inline"
        selectedKeys={[currentPath]}
        theme="dark"
        style={{
          background: '#020617',
          borderRight: 'none',
          color: '#94a3b8',
        }}
      />
    </Sider>
  );
}

function MobileSidebar() {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Button
        type="text"
        size="large"
        onClick={() => setVisible(true)}
        style={{ marginLeft: 25, color: '#fff' }}
      >
        <MenuOutlined style={{ fontSize: 18 }} />
      </Button>

      <Drawer
        width={250}
        placement="left"
        closable={false}
        onClose={() => setVisible(false)}
        open={visible}
        bodyStyle={{ background: '#020617', padding: 0 }}
      >
        <Sidebar collapsible={false} isMobile={true} />
      </Drawer>
    </>
  );
}