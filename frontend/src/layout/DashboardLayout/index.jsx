import React from 'react';
import { Layout } from 'antd';

const { Content } = Layout;

export default function DashboardLayout({ children }) {
  return (
    <Layout
      style={{
        minHeight: '100vh',
        background: '#020617',
      }}
    >
      <Content
        style={{
          marginLeft: 140,
          background: '#020617',
        }}
      >
        {children}
      </Content>
    </Layout>
  );
}