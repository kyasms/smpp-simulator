import { useState } from 'react';
import Dot from './atoms/Dot';
import TimelineTab from './tabs/TimelineTab';
import SessionTab from './tabs/SessionTab';
import SendMessageModal from './modals/SendMessageModal';
import { formatRelative } from '../dataHelpers';

function Stat({ t, label, value, unit }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
      <span style={{ fontSize: 10, color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: t.fontMono, color: t.ink, marginTop: 3 }}>
        {value}
        {unit && <span style={{ color: t.muted, fontSize: 10.5, marginLeft: 3 }}>{unit}</span>}
      </span>
    </div>
  );
}

const STATE_MAP = {
  bound_trx: { label: 'bound trx', tone: 'accent' },
  bound_tx:  { label: 'bound tx',  tone: 'accent' },
  bound_rx:  { label: 'bound rx',  tone: 'accent' },
  open:      { label: 'open',      tone: 'warn'   },
  closed:    { label: 'closed',    tone: 'muted'  },
};

const TABS = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'session',  label: 'Session'  },
];

export default function SessionDetail({ t, sess, messages, config, onSend, onDrop }) {
  const [tab, setTab] = useState('timeline');
  const [sendOpen, setSendOpen] = useState(false);

  const stateInfo = STATE_MAP[sess.state] || { label: sess.state, tone: 'muted' };
  const isClosed = sess.state === 'closed';

  const handleDrop = () => onDrop(sess.id);

  const handleSend = req => {
    onSend({ ...req, sessionId: Number(sess.id) });
    setSendOpen(false);
  };

  return (
    <>
      {/* Session header */}
      <div style={{ padding: '8px 28px 14px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
          <span style={{ fontFamily: t.fontDisplay, fontSize: 30, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {sess.systemId || '(unknown)'}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: t.fontMono, fontSize: 11.5 }}>
            <Dot tone={stateInfo.tone} t={t} pulse={stateInfo.tone === 'accent'} />
            {stateInfo.label}
          </span>
        </div>
        <div style={{ fontSize: 12, color: t.muted, fontFamily: t.fontMono, marginBottom: 12 }}>
          {sess.id} · {sess.clientIp}:{sess.clientPort} · bound {formatRelative(sess.boundAt)}
        </div>
        <div style={{ display: 'flex', gap: 26, alignItems: 'center' }}>
          <Stat t={t} label="Msg in"  value={sess.msgIn.toLocaleString()} />
          <Stat t={t} label="Msg out" value={sess.msgOut.toLocaleString()} />
          <Stat t={t} label="Window"  value="10" unit="frames" />
          <Stat t={t} label="RTT"     value="—"  unit="ms" />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button
              onClick={() => setSendOpen(true)}
              disabled={isClosed}
              title={isClosed ? 'Session closed — cannot send' : undefined}
              style={{ padding: '5px 10px', border: `1px solid ${t.border}`, background: 'transparent', color: t.ink, borderRadius: 3, fontSize: 12, cursor: isClosed ? 'not-allowed' : 'pointer', opacity: isClosed ? 0.45 : 1 }}>
              Send
            </button>
            <button
              onClick={handleDrop}
              title={isClosed ? 'Remove this closed session from the list' : 'Disconnect this session'}
              style={{ padding: '5px 10px', border: `1px solid ${t.border}`, background: 'transparent', color: t.danger, borderRadius: 3, fontSize: 12, cursor: 'pointer' }}>
              {isClosed ? 'Remove' : 'Drop'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${t.border}`, padding: '0 28px', flexShrink: 0 }}>
        {TABS.map(x => (
          <button
            key={x.id}
            onClick={() => setTab(x.id)}
            style={{
              padding: '10px 14px', border: 0, background: 'transparent',
              color: tab === x.id ? t.ink : t.muted, fontSize: 12.5,
              cursor: 'pointer', borderBottom: `2px solid ${tab === x.id ? t.ink : 'transparent'}`,
              marginBottom: -1,
            }}
          >
            {x.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'timeline' && <TimelineTab t={t} messages={messages} />}
        {tab === 'session'  && <SessionTab t={t} sess={sess} config={config} />}
      </div>

      {sendOpen && (
        <SendMessageModal
          t={t}
          sess={sess}
          onSend={handleSend}
          onClose={() => setSendOpen(false)}
        />
      )}
    </>
  );
}
