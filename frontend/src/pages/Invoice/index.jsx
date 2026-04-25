import React, { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { Tag, Row, Col, Card, Table } from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export default function Invoice() {
  const [threats, setThreats] = useState([]);

  useEffect(() => {
    const fetchThreats = async () => {
      try {
        const res = await axios.get('http://localhost:8888/api/threat');
        setThreats(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchThreats();
  }, []);

  const data = threats.map((item) => ({
    key: item._id,
    ip: item.ipAddress,
    type: item.threatType,
    time: item.timestamp,
    risk: item.riskScore,
    status: item.status,
  }));

  const threatCount = {};
  threats.forEach((t) => {
    threatCount[t.threatType] = (threatCount[t.threatType] || 0) + 1;
  });

  const chartData = Object.keys(threatCount).map((key) => ({
    name: key,
    count: threatCount[key],
  }));

  const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'];

  const columns = [
    {
      title: 'IP Address',
      dataIndex: 'ip',
    },
    {
      title: 'Threat Type',
      dataIndex: 'type',
    },
    {
      title: 'Timestamp',
      dataIndex: 'time',
      render: (time) => dayjs(time).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Risk Score',
      dataIndex: 'risk',
      render: (risk) => {
        let color = 'green';
        if (risk === 'Medium') color = 'orange';
        if (risk === 'High') color = 'red';
        if (risk === 'Critical') color = 'volcano';
        return <Tag color={color}>{risk}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status) => {
        let color = status === 'Blocked' ? 'red' : 'blue';
        return <Tag color={color}>{status}</Tag>;
      },
    },
  ];

  return (
    <div
      style={{
        padding: 24,
        background: '#020617',
        minHeight: '100vh',
        color: '#e2e8f0',
      }}
    >
      {/* 🔥 HEADER */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ color: '#f1f5f9', fontWeight: 600, margin: 0 }}>
          ThreatLens
        </h1>
        <p style={{ color: '#94a3b8', margin: 0 }}>
          Cybersecurity Threat Monitoring Dashboard
        </p>
      </div>

      {/* 🔥 CARDS */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card
            style={{
              borderLeft: '5px solid #1890ff',
              background: '#0f172a',
              color: '#e2e8f0',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            }}
          >
            <h3>Total Threats</h3>
            <h1>{threats.length}</h1>
          </Card>
        </Col>

        <Col span={6}>
          <Card
            style={{
              borderLeft: '5px solid #f5222d',
              background: '#0f172a',
              color: '#e2e8f0',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            }}
          >
            <h3>Blocked Attacks</h3>
            <h1>
              {threats.filter((t) => t.status === 'Blocked').length}
            </h1>
          </Card>
        </Col>

        <Col span={6}>
          <Card
            style={{
              borderLeft: '5px solid #faad14',
              background: '#0f172a',
              color: '#e2e8f0',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            }}
          >
            <h3>Suspicious Activity</h3>
            <h1>{threats.length}</h1>
          </Card>
        </Col>

        <Col span={6}>
          <Card
            style={{
              borderLeft: '5px solid #52c41a',
              background: '#0f172a',
              color: '#e2e8f0',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            }}
          >
            <h3>Active Alerts</h3>
            <h1>
              {threats.filter((t) => t.status === 'Detected').length}
            </h1>
          </Card>
        </Col>
      </Row>

      {/* 🔥 CHART */}
      <Card
        title={<span style={{ color: '#e2e8f0' }}>Threat Distribution</span>}
        style={{
          marginBottom: 20,
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}
      >
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* 🔥 TABLE */}
      <Card
        title={<span style={{ color: '#e2e8f0' }}>Recent Threat Logs</span>}
        style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}
      >
        <Table
          columns={columns}
          dataSource={data}
          pagination={{ pageSize: 5 }}
        />
      </Card>
    </div>
  );
}