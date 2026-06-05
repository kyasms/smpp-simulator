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

// ── Menu (kebab dropdown) ──────────────────────────────────────────────────

const MenuWrap = styled.div`
  position: relative;
  display: flex;
  align-items: stretch;
  border-left: 1px solid ${p => p.theme.border};
`;

const MenuTrigger = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  border: 0;
  background: ${p => p.$open ? p.theme.surfaceAlt : 'transparent'};
  color: ${p => p.theme.muted};
  cursor: pointer;
  font-family: inherit;
  &:hover { color: ${p => p.theme.ink}; }
`;

const MenuPanel = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  right: 4px;
  min-width: 190px;
  background: ${p => p.theme.surface};
  border: 1px solid ${p => p.theme.border};
  border-radius: 6px;
  box-shadow: 0 10px 30px -10px rgba(0,0,0,0.25), 0 4px 12px -4px rgba(0,0,0,0.15);
  padding: 4px;
  z-index: 50;
  font-family: ${p => p.theme.fontUI};
`;

const MenuItem = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 10px;
  border: 0;
  background: transparent;
  color: ${p => p.theme.ink};
  font-size: 12.5px;
  font-family: inherit;
  text-align: left;
  border-radius: 4px;
  cursor: pointer;
  &:hover:not(:disabled) { background: ${p => p.theme.surfaceAlt}; }
  &:disabled { color: ${p => p.theme.muted}; cursor: default; opacity: 0.55; }
`;

const MenuGlyph = styled.span`
  display: inline-flex;
  width: 16px;
  justify-content: center;
  color: ${p => p.theme.muted};
  font-size: 13px;
`;

const MenuSeparator = styled.div`
  height: 1px;
  background: ${p => p.theme.borderSoft};
  margin: 4px 2px;
`;

// ── Component ──────────────────────────────────────────────────────────────

export default function OperatorStrip({ operators, activeId, onPick, onAdd, onRemove, onRename, onReorder, darkMode, onToggleDark, onOpenOptions }) {
  const [adding, setAdding] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState('');
  const renameRef = useRef(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [dropIdx, setDropIdx] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (renamingId) renameRef.current?.select();
  }, [renamingId]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

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
    // Find a free port (next available after the source).
    const usedPorts = operators.map(o => o.port);
    let port = op.port + 1;
    while (usedPorts.includes(port)) port++;

    // Find a free `_n` name. Strip any existing trailing _<digits> from the
    // source so duplicating "MTN_2" still yields "MTN_3" (not "MTN_2_1").
    const base = op.name.replace(/_\d+$/, '');
    const usedNames = new Set(operators.map(o => o.name.toLowerCase()));
    let n = 1;
    while (usedNames.has(`${base}_${n}`.toLowerCase())) n++;

    onAdd({ name: `${base}_${n}`, port });
  };

  const activeOp = operators.find(o => o.id === activeId);

  return (
    <>
      <Strip>
        <Tabs
          onDragOver={e => e.preventDefault()}
          onDoubleClick={e => { if (e.target === e.currentTarget) setAdding(true); }}
        >
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

        <MenuWrap ref={menuRef}>
          <MenuTrigger
            $open={menuOpen}
            onClick={() => setMenuOpen(o => !o)}
            title="Menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <svg width="14" height="4" viewBox="0 0 14 4" fill="currentColor" aria-hidden="true">
              <circle cx="2"  cy="2" r="1.4" />
              <circle cx="7"  cy="2" r="1.4" />
              <circle cx="12" cy="2" r="1.4" />
            </svg>
          </MenuTrigger>

          {menuOpen && (
            <MenuPanel role="menu">
              <MenuItem onClick={() => { setMenuOpen(false); setAdding(true); }}>
                <MenuGlyph>+</MenuGlyph> New server
              </MenuItem>
              <MenuItem
                disabled={!activeOp}
                onClick={() => { if (!activeOp) return; setMenuOpen(false); handleDuplicate(activeOp); }}
              >
                <MenuGlyph>⎘</MenuGlyph> Duplicate active
              </MenuItem>
              <MenuSeparator />
              <MenuItem onClick={() => { setMenuOpen(false); onToggleDark?.(); }}>
                <MenuGlyph>{darkMode ? '☀' : '◑'}</MenuGlyph>
                {darkMode ? 'Light mode' : 'Dark mode'}
              </MenuItem>
              <MenuSeparator />
              <MenuItem
                disabled={!onOpenOptions}
                onClick={() => { setMenuOpen(false); onOpenOptions?.(); }}
              >
                <MenuGlyph>⚙</MenuGlyph> Options…
              </MenuItem>
            </MenuPanel>
          )}
        </MenuWrap>
      </Strip>

      {adding && (
        <AddOperatorDialog
          onClose={() => setAdding(false)}
          onAdd={op => { onAdd(op); setAdding(false); }}
          usedPorts={operators.map(o => o.port)}
          usedNames={operators.map(o => o.name)}
        />
      )}
    </>
  );
}
