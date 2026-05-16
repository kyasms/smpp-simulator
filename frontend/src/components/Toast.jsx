import { useEffect } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';

const slideIn = keyframes`
  from { transform: translateY(12px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
`;

const Wrap = styled.div`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  background: ${p => p.theme.surface};
  border: 1px solid ${p => p.$danger ? p.theme.danger : p.theme.border};
  border-left: 3px solid ${p => p.$danger ? p.theme.danger : p.theme.accent};
  border-radius: 6px;
  box-shadow: 0 8px 24px -8px rgba(0,0,0,0.35);
  max-width: 380px;
  animation: ${slideIn} 160ms ease-out;
`;

const Msg = styled.span`
  font-size: 12.5px;
  font-family: ${p => p.theme.fontMono};
  color: ${p => p.$danger ? p.theme.danger : p.theme.ink};
  line-height: 1.5;
  word-break: break-all;
`;

const Close = styled.button`
  border: 0;
  background: transparent;
  color: ${p => p.theme.muted};
  font-size: 16px;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  flex-shrink: 0;
`;

const DURATION = 5000;

export default function Toast({ message, danger = true, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, DURATION);
    return () => clearTimeout(t);
  }, [message, onClose]);

  return (
    <Wrap $danger={danger}>
      <Msg $danger={danger}>{message}</Msg>
      <Close onClick={onClose}>×</Close>
    </Wrap>
  );
}
