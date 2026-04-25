import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import useLanguage from '@/locale/useLanguage';
import { Form, Button } from 'antd';

import { login } from '@/redux/auth/actions';
import { selectAuth } from '@/redux/auth/selectors';

import LoginForm from '@/forms/LoginForm';
import Loading from '@/components/Loading';

const LoginPage = () => {
  const translate = useLanguage();
  const { isLoading, isSuccess } = useSelector(selectAuth);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const onFinish = (values) => {
    dispatch(login({ loginData: values }));
  };

  useEffect(() => {
    if (isSuccess) navigate('/');
  }, [isSuccess, navigate]);

  return (
    <div style={styles.layout}>
      {/* ================= LEFT DARK PANEL ================= */}
      <div style={styles.leftPanel}></div>

      {/* ================= RIGHT WHITE PANEL ================= */}
      <div style={styles.rightPanel}>
        <Loading isLoading={isLoading}>
          <div style={styles.container}>
            {/* HEADER */}
            <div style={styles.header}>
              <div style={styles.title}>ThreatLens Secure Login</div>
              <div style={styles.subtitle}>
                Cybersecurity Monitoring Platform
              </div>
            </div>

            {/* FORM */}
            <Form
              layout="vertical"
              name="login_form"
              initialValues={{
                remember: true,
                email: 'admin@admin.com',
                password: 'admin123',
              }}
              onFinish={onFinish}
              style={styles.form}
            >
              <LoginForm />

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isLoading}
                  size="large"
                  block
                  style={styles.button}
                >
                  {translate('Log in')}
                </Button>
              </Form.Item>

              <div style={styles.demo}>
                Demo: admin@admin.com / admin123
              </div>
            </Form>
          </div>
        </Loading>
      </div>
    </div>
  );
};

export default LoginPage;

/* ================= CLEAN UI STYLES ================= */

const styles = {
  layout: {
    display: 'flex',
    height: '100vh',
    width: '100%',
    overflow: 'hidden',
  },

  /* LEFT PANEL (20%) */
  leftPanel: {
    width: '20%',
    background: '#020617',
    borderRight: '1px solid #1e293b',
  },

  /* RIGHT PANEL (80%) */
  rightPanel: {
    width: '80%',
    background: '#ffffff',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* LOGIN WRAPPER (CENTER BOX) */
  container: {
    width: 380,
    padding: 10,
    textAlign: 'center',
  },

  header: {
    marginBottom: 25,
    textAlign: 'center',
  },

  title: {
    fontSize: 26,
    fontWeight: 600,
    color: '#111827',
    letterSpacing: 0.3,
  },

  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 6,
  },

  form: {
    textAlign: 'left',
  },

  button: {
    height: 42,
    background: '#14b8a6',
    border: 'none',
    fontWeight: 600,
    borderRadius: 6,
  },

  demo: {
    marginTop: 12,
    fontSize: 12,
    textAlign: 'center',
    color: '#6b7280',
  },
};