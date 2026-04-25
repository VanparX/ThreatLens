import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { Layout, Button } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';

import { logout } from '@/redux/auth/actions';

export default function HeaderContent() {
  const { Header } = Layout;
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <Header
      style={{
        padding: '0 20px',
        background: '#020617',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        borderBottom: '1px solid #1e293b',
      }}
    >
      {/* 🔥 ONLY LOGOUT BUTTON */}
      <Button
        type="primary"
        danger
        icon={<LogoutOutlined />}
        onClick={handleLogout}
        style={{
          background: '#ef4444',
          border: 'none',
          fontWeight: 500,
        }}
      >
        Logout
      </Button>
    </Header>
  );
}