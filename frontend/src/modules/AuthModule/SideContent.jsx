import { Layout, Typography } from 'antd';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function SideContent() {
  return (
    <Content
      style={{
        padding: '150px 30px 30px',
        width: '100%',
        maxWidth: '450px',
        margin: '0 auto',
      }}
      className="sideContent"
    >
      <div style={{ width: '100%', textAlign: 'center' }}>
        
        {/* ✅ REMOVED LOGO */}

        <Title level={1} style={{ fontSize: 28 }}>
          ThreatLens Dashboard
        </Title>

        <Text>
          Cybersecurity Monitoring & Threat Analysis Platform
        </Text>

        <div className="space20"></div>
      </div>
    </Content>
  );
}