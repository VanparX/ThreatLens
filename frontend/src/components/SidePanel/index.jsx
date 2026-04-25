import { Drawer } from 'antd';
import { useCrudContext } from '@/context/crud';

export default function SidePanel({ config, topContent, bottomContent }) {
  const { state, crudContextAction } = useCrudContext();
  const { isPanelClose } = state;
  const { panel } = crudContextAction;

  const closePanel = () => {
    panel.collapse();
  };

  return (
    <Drawer
      title={
        <span style={{ color: '#e2e8f0' }}>
          {config?.PANEL_TITLE || 'Panel'}
        </span>
      }
      placement="right"
      onClose={closePanel}
      open={!isPanelClose}
      width={420}
      bodyStyle={{
        background: '#020617',
        color: '#e2e8f0',
        padding: '16px',
      }}
      headerStyle={{
        background: '#020617',
        borderBottom: '1px solid #1e293b',
      }}
    >
      {/* CONTENT AREA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {topContent}

        {bottomContent}
      </div>
    </Drawer>
  );
}