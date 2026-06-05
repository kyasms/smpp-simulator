import { useState, useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import KyaMark from './atoms/KyaMark';
import Dot from './atoms/Dot';
import Sparkline from './atoms/Sparkline';
import SessionDetail from './SessionDetail';
import useSparkline from '../hooks/useSparkline';
import { formatRelative } from '../dataHelpers';
import { SmppService } from '../../bindings/kyasmpp/services';

// ── Stat ───────────────────────────────────────────────────────────────────

const StatWrap = styled.div`
  display: flex;
  flex-direction: column;
  line-height: 1.1;
`;
const StatLabel = styled.span`
  font-size: 10px;
  color: ${p => p.theme.muted};
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;
const StatValue = styled.span`
  font-size: 13px;
  font-family: ${p => p.theme.fontMono};
  color: ${p => p.$danger ? p.theme.danger : p.theme.ink};
  margin-top: 3px;
`;
const StatUnit = styled.span`
  color: ${p => p.theme.muted};
  font-size: 10.5px;
  margin-left: 3px;
`;

function Stat({ label, value, unit, tone }) {
  return (
    <StatWrap>
      <StatLabel>{label}</StatLabel>
      <StatValue $danger={tone === 'danger'}>
        {value}
        {unit && <StatUnit>{unit}</StatUnit>}
      </StatValue>
    </StatWrap>
  );
}

// ── StateChip ──────────────────────────────────────────────────────────────

const ChipWrap = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: ${p => p.theme.fontMono};
  font-size: 11.5px;
`;

const STATE_MAP = {
  bound_trx: { label: 'bound trx', tone: 'accent' },
  bound_tx: { label: 'bound tx', tone: 'accent' },
  bound_rx: { label: 'bound rx', tone: 'accent' },
  open: { label: 'open', tone: 'warn' },
  closed: { label: 'closed', tone: 'muted' },
};

function StateChip({ t, state }) {
  const m = STATE_MAP[state] || { label: state, tone: 'muted' };
  return (
    <ChipWrap>
      <Dot tone={m.tone} t={t} pulse={m.tone === 'accent'} />
      {m.label}
    </ChipWrap>
  );
}

// ── SessionRow ─────────────────────────────────────────────────────────────

const RowWrap = styled.div`
  padding: 12px 18px;
  border-bottom: 1px solid ${p => p.theme.borderSoft};
  cursor: pointer;
  background: ${p => p.$active ? p.theme.surfaceAlt : 'transparent'};
  border-left: 2px solid ${p => p.$active ? p.theme.accent : 'transparent'};
`;
const RowHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 4px;
`;
const RowSystemId = styled.span`
  font-size: 13px;
  font-weight: ${p => p.$active ? 500 : 400};
`;
const RowTime = styled.span`
  font-size: 10.5px;
  color: ${p => p.theme.muted};
  font-family: ${p => p.theme.fontMono};
`;
const RowFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;
const RowRecent = styled.span`
  font-size: 10.5px;
  color: ${p => p.theme.muted};
  font-family: ${p => p.theme.fontMono};
`;

function SessionRow({ t, s, active, onClick }) {
  return (
    <RowWrap $active={active} onClick={onClick}>
      <RowHeader>
        <RowSystemId $active={active}>{s.systemId || '(unknown)'}</RowSystemId>
        <RowTime>{formatRelative(s.boundAt)}</RowTime>
      </RowHeader>
      <RowFooter>
        <StateChip t={t} state={s.state} />
        <RowRecent>{s.clientIp}:{s.clientPort}</RowRecent>
      </RowFooter>
    </RowWrap>
  );
}

// ── KyaShell ───────────────────────────────────────────────────────────────

// ── IpSelect combo ─────────────────────────────────────────────────────────

const BindControls = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const IpComboWrap = styled.div`
  position: relative;
`;

const IpComboInput = styled.input`
  padding: 5px 22px 5px 8px;
  font-family: ${p => p.theme.fontMono};
  font-size: 12px;
  border: 1px solid ${p => p.theme.border};
  background: ${p => p.theme.bg};
  color: ${p => p.theme.ink};
  border-radius: 4px;
  outline: none;
  width: 148px;
  opacity: ${p => p.disabled ? 0.45 : 1};
`;

const IpComboArrow = styled.span`
  position: absolute;
  right: 7px;
  top: 50%;
  transform: translateY(-50%);
  color: ${p => p.theme.muted};
  pointer-events: none;
  display: flex;
  align-items: center;
`;

const IpDropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 100%;
  background: ${p => p.theme.surface};
  border: 1px solid ${p => p.theme.border};
  border-radius: 4px;
  box-shadow: 0 8px 24px -8px rgba(0,0,0,0.3);
  z-index: 100;
  overflow: hidden;
`;

const IpGroup = styled.div`
  padding: 5px 0 2px;
  & + & { border-top: 1px solid ${p => p.theme.borderSoft}; }
`;

const IpOption = styled.div`
  padding: 5px 10px;
  font-family: ${p => p.theme.fontMono};
  font-size: 12px;
  cursor: pointer;
  color: ${p => p.$active ? p.theme.bg : p.theme.ink};
  background: ${p => p.$active ? p.theme.ink : 'transparent'};
  &:hover { background: ${p => p.$active ? p.theme.ink : p.theme.surfaceAlt}; }
`;

const PortInput = styled.input`
  padding: 5px 8px;
  font-family: ${p => p.theme.fontMono};
  font-size: 12px;
  border: 1px solid ${p => p.theme.border};
  background: ${p => p.theme.bg};
  color: ${p => p.theme.ink};
  border-radius: 4px;
  outline: none;
  width: 68px;
  opacity: ${p => p.disabled ? 0.45 : 1};
  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button { -webkit-appearance: none; }
  -moz-appearance: textfield;
`;

function IpSelect({ value, onChange, ips, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pick = ip => { onChange(ip); setOpen(false); };

  return (
    <IpComboWrap ref={ref}>
      <IpComboInput
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => !disabled && setOpen(true)}
        disabled={disabled}
        placeholder="0.0.0.0"
        spellCheck={false}
      />
      <IpComboArrow>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </IpComboArrow>
      {open && ips.length > 0 && (
        <IpDropdown>
          <IpGroup>
            {ips.map(ip => (
              <IpOption key={ip} $active={ip === value} onMouseDown={() => pick(ip)}>{ip}</IpOption>
            ))}
          </IpGroup>
        </IpDropdown>
      )}
    </IpComboWrap>
  );
}

const Shell = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: ${p => p.theme.bg};
  color: ${p => p.theme.ink};
  font-family: ${p => p.theme.fontUI};
  font-size: 13px;
  letter-spacing: -0.005em;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 8px 24px;
  border-bottom: 1px solid ${p => p.theme.border};
  background: ${p => p.theme.surface};
  flex-shrink: 0;
`;

const ServerBadge = styled.span`
  font-size: 11.5px;
  font-family: ${p => p.theme.fontMono};
  padding: 3px 8px;
  background: ${p => p.theme.surfaceAlt};
  border: 1px solid ${p => p.theme.border};
  border-radius: 3px;
`;
const BadgePort = styled.span`
  color: ${p => p.theme.muted};
`;

const HDivider = styled.div`
  height: 18px;
  width: 1px;
  background: ${p => p.theme.border};
  flex-shrink: 0;
`;

const StartBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  border: 1px solid ${p => p.theme.border};
  border-radius: 4px;
  background: transparent;
  color: ${p => p.theme.ink};
  font-size: 12.5px;
  cursor: pointer;
`;

const StatsRow = styled.div`
  display: flex;
  gap: 22px;
  align-items: center;
  margin-left: 4px;
`;

const HeaderRight = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Body = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: ${p => p.$sidebar}px 1fr;
  min-height: 0;
  position: relative;
`;

const ResizeHandle = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 9px;
  margin-left: -4px;
  cursor: col-resize;
  z-index: 20;
  user-select: none;
  touch-action: none;
  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 4px;
    width: 2px;
    background: ${p => (p.$active ? p.theme.accent : 'transparent')};
    transition: background 120ms;
  }
  &:hover::after {
    background: ${p => p.theme.accent};
  }
`;

const SessionsPane = styled.div`
  border-right: 1px solid ${p => p.theme.border};
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const SessionsPaneHead = styled.div`
  padding: 10px 18px 8px;
  border-bottom: 1px solid ${p => p.theme.border};
  flex-shrink: 0;
`;

const SessionsPaneTitle = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 10px;
`;

const SessionsTitle = styled.span`
  font-family: ${p => p.theme.fontDisplay};
  font-size: 22px;
  letter-spacing: -0.01em;
`;

const SessionCount = styled.span`
  font-size: 11px;
  color: ${p => p.theme.muted};
  font-family: ${p => p.theme.fontMono};
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 6px 10px;
  font-size: 12.5px;
  border: 1px solid ${p => p.theme.border};
  background: ${p => p.theme.bg};
  color: ${p => p.theme.ink};
  border-radius: 4px;
  outline: none;
  box-sizing: border-box;
`;

const SessionsList = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const EmptyState = styled.div`
  padding: 24px 18px;
  color: ${p => p.theme.muted};
  font-size: 12px;
  text-align: center;
`;

const SessionsFooter = styled.div`
  padding: 12px;
  border-top: 1px solid ${p => p.theme.border};
  font-size: 11px;
  color: ${p => p.theme.muted};
  display: flex;
  justify-content: space-between;
  flex-shrink: 0;
`;

const FooterValue = styled.span`
  font-family: ${p => p.theme.fontMono};
  color: ${p => p.theme.ink};
`;

const RightPane = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;

const RightPaneEmpty = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: ${p => p.theme.muted};
  font-size: 12px;
`;

// ── Export ─────────────────────────────────────────────────────────────────

const SIDEBAR_MIN = 240;
const SIDEBAR_MAX = 640;
const SIDEBAR_DEFAULT = 320;
const SIDEBAR_KEY = 'kya.sidebarWidth';

export default function KyaShell({
  t, operator, running, stats, sessions, messages,
  config, onStart, onStop, onSend, onDrop,
}) {
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [localIPs, setLocalIPs] = useState([]);
  const [bindIp, setBindIp] = useState('0.0.0.0');
  const [bindPort, setBindPort] = useState(operator?.port || 2775);
  const spark = useSparkline(messages);

  // ── Resizable sidebar ───────────────────────────────────────────────────
  const bodyRef = useRef(null);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = Number(localStorage.getItem(SIDEBAR_KEY));
    return saved >= SIDEBAR_MIN && saved <= SIDEBAR_MAX ? saved : SIDEBAR_DEFAULT;
  });
  const [resizing, setResizing] = useState(false);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  const startResize = (e) => {
    e.preventDefault();
    setResizing(true);
    let raf = 0;
    const onMove = (ev) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const rect = bodyRef.current?.getBoundingClientRect();
        if (!rect) return;
        const w = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, ev.clientX - rect.left));
        setSidebarWidth(w);
      });
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      setResizing(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', stop);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', stop);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  useEffect(() => {
    SmppService.GetLocalIPs().then(ips => setLocalIPs(ips ?? []));
  }, []);

  useEffect(() => {
    if (!running) setBindPort(operator?.port || 2775);
  }, [operator?.port]);

  const sess = sessions.find(s => s.id === selectedId)
    || sessions.find(s => s.state !== 'closed')
    || sessions[0]
    || null;
  const sessMsgs = sess
    ? [...messages].filter(m => m.sessionId === sess.id).slice(-40).reverse()
    : [];

  const sentPerSec = stats?.sentPerSecond != null ? stats.sentPerSecond.toFixed(1) : '0.0';
  const recvPerSec = stats?.receivedPerSecond != null ? stats.receivedPerSecond.toFixed(1) : '0.0';
  const failCount = messages.filter(m => m.state === 'failed').length;
  const failureRate = messages.length ? (failCount / messages.length * 100).toFixed(1) : '0.0';

  const filtered = sessions.filter(s =>
    !search ||
    (s.systemId || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.clientIp || '').includes(search)
  );

  // Active sessions first, closed (extinguished) ones last — stable within each group.
  const orderedSessions = [
    ...filtered.filter(s => s.state !== 'closed'),
    ...filtered.filter(s => s.state === 'closed'),
  ];

  const liveCount = sessions.filter(s => s.state !== 'closed').length;
  const closedCount = sessions.length - liveCount;

  const port = operator?.port || stats?.port || 2775;

  return (
    <Shell>
      <Header>
        <BindControls>
          {!running && <>
            <IpSelect
              value={bindIp}
              onChange={setBindIp}
              ips={localIPs}
              disabled={running}
            />
            <PortInput
              type="number"
              value={bindPort}
              onChange={e => setBindPort(Number(e.target.value))}
              disabled={running}
              min={1}
              max={65535}
            />
          </>}

          <StartBtn $running={running} onClick={running ? onStop : () => onStart(bindPort, bindIp)}>
            {running
              ? <Dot tone="accent" t={t} pulse />
              : <svg width="9" height="12" viewBox="0 0 9 12" fill="none" strokeWidth="1.3" strokeLinejoin="round" style={{stroke: t.muted}}><path d="M1 1l7 5-7 5V1z"/></svg>
            }
            {running ? <>Listening <b>{bindIp}:{port}</b></> : 'Start'}
          </StartBtn>
        </BindControls>

        <HDivider />

        <StatsRow>
          <Stat label="Sent" value={sentPerSec} unit="msg/s" />
          <Stat label="Recv" value={recvPerSec} unit="msg/s" />
          <Stat label="Failure" value={failureRate} unit="%" tone={parseFloat(failureRate) > 5 ? 'danger' : ''} />
        </StatsRow>

        <HeaderRight>
          <Sparkline points={spark} t={t} width={140} height={28} />
        </HeaderRight>
      </Header>

      <Body ref={bodyRef} $sidebar={sidebarWidth}>
        <SessionsPane>
          <SessionsPaneHead>
            <SessionsPaneTitle>
              <SessionsTitle>Sessions</SessionsTitle>
              <SessionCount>{liveCount} live{closedCount > 0 ? ` · ${closedCount} closed` : ''}</SessionCount>
            </SessionsPaneTitle>
            <SearchInput
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by system ID, IP…"
            />
          </SessionsPaneHead>

          <SessionsList>
            {orderedSessions.length === 0 ? (
              <EmptyState>{running ? 'No sessions connected.' : 'Server is stopped.'}</EmptyState>
            ) : (
              orderedSessions.map(s => (
                <SessionRow
                  key={s.id}
                  t={t}
                  s={s}
                  active={s.id === sess?.id}
                  onClick={() => setSelectedId(s.id)}
                />
              ))
            )}
          </SessionsList>

          <SessionsFooter>
            <span>
              auth:{' '}
              <FooterValue>
                {config?.authRequired ? `${config.systemId || '—'} / ***` : 'any'}
              </FooterValue>
            </span>
            <span>tcp · ipv4</span>
          </SessionsFooter>
        </SessionsPane>

        <ResizeHandle
          style={{ left: sidebarWidth }}
          $active={resizing}
          onMouseDown={startResize}
          onDoubleClick={() => setSidebarWidth(SIDEBAR_DEFAULT)}
          title="Drag to resize · double-click to reset"
        />

        <RightPane>
          {sess ? (
            <SessionDetail t={t} sess={sess} messages={sessMsgs} config={config} onSend={onSend} onDrop={onDrop} />
          ) : (
            <RightPaneEmpty>
              {running ? 'Select a session from the list.' : 'Start the server to accept connections.'}
            </RightPaneEmpty>
          )}
        </RightPane>
      </Body>
    </Shell>
  );
}
