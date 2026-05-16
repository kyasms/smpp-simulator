import { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import AddOperatorDialog from './modals/AddOperatorDialog';

// ── Styled ─────────────────────────────────────────────────────────────────

const Strip = styled.div`
  display: flex;
  align-items: stretch;
  background: ${p => p.theme.surfaceAlt};
  border-bottom: 1px solid ${p => p.theme.border};
  height: 38px;
  flex-shrink: 0;
  padding: 0 8px;
`;

const LogoZone = styled.div`
  display: flex;
  align-items: center;
  padding: 0 14px 0 8px;
  gap: 10px;
  margin-right: 4px;
`;

const AppLabel = styled.div`
  font-size: 14px;
  color: ${p => p.theme.muted};
  text-transform: uppercase;
`;

const Tabs = styled.div`
  display: flex;
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
`;

const Tab = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  cursor: grab;
  border-right: 1px solid ${p => p.theme.border};
  border-top: 2px solid ${p => p.$active ? p.theme.ink : 'transparent'};
  border-bottom: ${p => p.$active ? `1px solid ${p.theme.bg}` : 'none'};
  background: ${p => p.$active ? p.theme.bg : 'transparent'};
  margin-bottom: -1px;
  position: relative;
  font-family: ${p => p.theme.fontUI};
  box-shadow: ${p => p.$dropBefore ? `inset 3px 0 0 ${p.theme.ink}` : 'none'};
  opacity: ${p => p.$dragging ? 0.4 : 1};
  user-select: none;
`;

const StatusDot = styled.span`
  display: inline-block;
  width: 7px; height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${p => p.$running ? p.theme.success : p.theme.muted};
  color: ${p => p.$running ? p.theme.success : p.theme.muted};
  animation: ${p => p.$running ? 'kya-pulse 2s ease-out infinite' : 'none'};
`;

const TabName = styled.span`
  font-size: 12.5px;
  font-weight: ${p => p.$active ? 500 : 400};
  color: ${p => p.theme.ink};
`;

const RenameInput = styled.input`
  font-size: 12.5px;
  font-weight: 500;
  color: ${p => p.theme.ink};
  font-family: ${p => p.theme.fontUI};
  background: transparent;
  border: none;
  border-bottom: 1px solid ${p => p.theme.ink};
  outline: none;
  padding: 0;
  width: 90px;
`;

const TabPort = styled.span`
  font-size: 11px;
  color: ${p => p.theme.muted};
  font-family: ${p => p.theme.fontMono};
`;

const GhostBtn = styled.button`
  border: 0;
  background: transparent;
  color: ${p => p.theme.muted};
  cursor: pointer;
  line-height: 1;
  padding: 0 2px;
  font-size: 16px;
  margin-left: 4px;
`;

const StripBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  border: 0;
  border-left: 1px solid ${p => p.theme.border};
  background: transparent;
  color: ${p => p.$muted ? p.theme.muted : p.theme.ink};
  cursor: pointer;
  font-size: ${p => p.$icon ? '14px' : '12px'};
  font-family: inherit;
  justify-content: ${p => p.$icon ? 'center' : 'flex-start'};
`;

// ── Component ──────────────────────────────────────────────────────────────

export default function OperatorStrip({ operators, activeId, onPick, onAdd, onRemove, onRename, onReorder, darkMode, onToggleDark }) {
  const [adding, setAdding] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState('');
  const renameRef = useRef(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [dropIdx, setDropIdx] = useState(null);

  useEffect(() => {
    if (renamingId) renameRef.current?.select();
  }, [renamingId]);

  const handleDragStart = (e, idx) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (idx !== dragIdx) setDropIdx(idx);
  };

  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null);
      setDropIdx(null);
      return;
    }
    const next = [...operators];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    onReorder(next);
    setDragIdx(null);
    setDropIdx(null);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDropIdx(null);
  };

  const startRename = (op) => {
    setRenamingId(op.id);
    setRenameVal(op.name);
  };

  const commitRename = () => {
    if (renamingId && renameVal.trim()) onRename(renamingId, renameVal.trim());
    setRenamingId(null);
  };

  const handleDuplicate = (op) => {
    const usedPorts = operators.map(o => o.port);
    let port = op.port + 1;
    while (usedPorts.includes(port)) port++;
    onAdd({ name: op.name, port });
  };

  const activeOp = operators.find(o => o.id === activeId);

  return (
    <>
      <Strip>
        <Tabs onDragOver={e => e.preventDefault()}>
          {operators.map((op, idx) => {
            const active = op.id === activeId;
            const running = op.status === 'running';
            const isRenaming = renamingId === op.id;
            return (
              <Tab
                key={op.id}
                $active={active}
                $dragging={dragIdx === idx}
                $dropBefore={dropIdx === idx && dragIdx !== idx}
                draggable
                onDragStart={e => handleDragStart(e, idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDrop={e => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                onClick={() => onPick(op.id)}
                onDoubleClick={e => { e.stopPropagation(); startRename(op); }}
              >
                <StatusDot $running={running} />

                {isRenaming ? (
                  <RenameInput
                    ref={renameRef}
                    value={renameVal}
                    onChange={e => setRenameVal(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') setRenamingId(null);
                      e.stopPropagation();
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <TabName $active={active}>{op.name}</TabName>
                )}

                <TabPort>:{op.port}</TabPort>

                {operators.length > 1 && (
                  <GhostBtn onClick={e => { e.stopPropagation(); onRemove(op.id); }} title="Remove">
                    ×
                  </GhostBtn>
                )}
              </Tab>
            );
          })}
        </Tabs>

        {activeOp && (
          <StripBtn onClick={() => handleDuplicate(activeOp)} title="Duplicate active operator">
            ⎘ <span style={{ fontSize: 11.5 }}>Duplicate</span>
          </StripBtn>
        )}

        <StripBtn onClick={() => setAdding(true)}>
          + <span style={{ fontSize: 11.5 }}>New server</span>
        </StripBtn>

        <StripBtn $icon $muted onClick={onToggleDark} title={darkMode ? 'Light mode' : 'Dark mode'}>
          {darkMode ? '☀' : '◑'}
        </StripBtn>
      </Strip>

      {adding && (
        <AddOperatorDialog
          onClose={() => setAdding(false)}
          onAdd={op => { onAdd(op); setAdding(false); }}
          usedPorts={operators.map(o => o.port)}
        />
      )}
    </>
  );
}
