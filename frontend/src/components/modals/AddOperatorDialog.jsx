import { useState, useEffect } from 'react';
import styled from '@emotion/styled';

const Backdrop = styled.div`
  position: fixed; inset: 0; z-index: 60;
  background: rgba(0,0,0,0.32);
  backdrop-filter: blur(2px);
  display: flex; align-items: center; justify-content: center;
`;

const Panel = styled.div`
  width: 440px;
  max-height: 90vh;
  background: ${p => p.theme.surface};
  border: 1px solid ${p => p.theme.border};
  border-radius: 8px;
  color: ${p => p.theme.ink};
  box-shadow: 0 24px 60px -20px rgba(0,0,0,0.35);
  display: flex; flex-direction: column;
`;

const PanelHead = styled.div`
  padding: 20px 28px 14px;
  border-bottom: 1px solid ${p => p.theme.border};
`;

const PanelLabel = styled.div`
  font-size: 11px;
  color: ${p => p.theme.muted};
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 4px;
`;

const PanelTitle = styled.div`
  display: flex; justify-content: space-between; align-items: baseline;
`;

const TitleText = styled.span`
  font-family: ${p => p.theme.fontDisplay};
  font-size: 24px;
  letter-spacing: -0.02em;
  line-height: 1.1;
`;

const CloseBtn = styled.button`
  border: 0; background: transparent;
  color: ${p => p.theme.muted};
  font-size: 18px; cursor: pointer; padding: 0 4px;
`;

const PanelBody = styled.div`
  padding: 20px 28px;
  display: grid;
  grid-template-columns: 1fr 140px;
  gap: 14px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`;

const FieldLabel = styled.label`
  display: flex; flex-direction: column; gap: 6px;
`;

const FieldHint = styled.span`
  font-size: 11.5px;
  color: ${p => p.theme.inkSoft};
`;

const Input = styled.input`
  padding: 8px 10px;
  font-family: ${p => p.$mono ? p.theme.fontMono : p.theme.fontUI};
  font-size: 13px;
  border: 1px solid ${p => p.theme.border};
  background: ${p => p.theme.bg};
  color: ${p => p.theme.ink};
  border-radius: 4px;
  outline: none;
`;

const ErrorMsg = styled.p`
  grid-column: 1 / -1;
  margin: 0;
  font-size: 11.5px;
  color: ${p => p.theme.danger};
`;

const PanelFoot = styled.div`
  padding: 12px 22px;
  border-top: 1px solid ${p => p.theme.border};
  background: ${p => p.theme.surfaceAlt};
  display: flex; justify-content: flex-end; gap: 8px;
`;

const BtnOutline = styled.button`
  padding: 7px 14px;
  border: 1px solid ${p => p.theme.border};
  background: transparent;
  color: ${p => p.theme.ink};
  border-radius: 4px;
  font-size: 12.5px;
  font-family: inherit;
  cursor: pointer;
`;

const BtnPrimary = styled.button`
  padding: 7px 18px;
  border: 1px solid ${p => p.theme.ink};
  background: ${p => p.theme.ink};
  color: ${p => p.theme.bg};
  border-radius: 4px;
  font-size: 12.5px;
  font-family: inherit;
  cursor: pointer;
  opacity: ${p => p.disabled ? 0.5 : 1};
`;

export default function AddOperatorDialog({ onClose, onAdd, usedPorts }) {
  const [name, setName] = useState('');
  const [port, setPort] = useState('2778');

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const portNum = Number(port);
  const portTaken = usedPorts.includes(portNum);
  const valid = name.trim() && portNum > 0 && portNum < 65536 && !portTaken;

  return (
    <Backdrop onClick={onClose}>
      <Panel onClick={e => e.stopPropagation()}>
        <PanelHead>
          <PanelLabel>New SMPP server</PanelLabel>
          <PanelTitle>
            <TitleText>Operator</TitleText>
            <CloseBtn onClick={onClose}>×</CloseBtn>
          </PanelTitle>
        </PanelHead>

        <PanelBody>
          <FieldLabel>
            <FieldHint>Operator name</FieldHint>
            <Input value={name} onChange={e => setName(e.target.value)} autoFocus />
          </FieldLabel>
          <FieldLabel>
            <FieldHint>Port</FieldHint>
            <Input $mono value={port} onChange={e => setPort(e.target.value)} />
          </FieldLabel>
          {portTaken && <ErrorMsg>Port {portNum} is already in use.</ErrorMsg>}
        </PanelBody>

        <PanelFoot>
          <BtnOutline onClick={onClose}>Cancel</BtnOutline>
          <BtnPrimary
            disabled={!valid}
            onClick={() => valid && onAdd({ name: name.trim(), port: portNum })}
          >
            Add server
          </BtnPrimary>
        </PanelFoot>
      </Panel>
    </Backdrop>
  );
}
