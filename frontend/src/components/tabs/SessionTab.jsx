import { formatRelative } from '../../dataHelpers';

const NPI_LABELS = { 0: 'NPI_UNKNOWN', 1: 'ISDN/E.164', 3: 'Data', 4: 'Telex', 8: 'National', 9: 'Private' };
const TON_LABELS = { 0: 'TON_UNKNOWN', 1: 'International', 2: 'National', 3: 'Network Specific', 5: 'Alphanumeric' };
const SMPP_VERSIONS = { 0x33: 'SMPP 3.3', 0x34: 'SMPP 3.4', 0x50: 'SMPP 5.0' };
const MULTIPART_LABELS = { 0: 'UDH', 1: 'UDH16', 2: 'SAR-TLV', 3: 'Payload-TLV' };

function Row({ t, k, v, last }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '220px 1fr', padding: '9px 16px',
      borderBottom: last ? 'none' : `1px solid ${t.borderSoft}`, fontSize: 12.5,
    }}>
      <span style={{ color: t.muted }}>{k}</span>
      <span style={{ fontFamily: t.fontMono, color: t.ink }}>{v}</span>
    </div>
  );
}

export default function SessionTab({ t, sess, config }) {
  const stateLabel = `SMPP_STATE_${(sess.state || '').toUpperCase().replace(/_/g, '')}`;

  const connection = [
    ['IP Address',        sess.clientIp],
    ['Port',              String(sess.clientPort)],
    ['Version',           SMPP_VERSIONS[sess.version] || `0x${(sess.version || 0).toString(16).padStart(2, '0')}`],
    ['SystemID',          sess.systemId || '—'],
    ['Password',          config?.password ? '***' : '—'],
    ['System Type',       sess.systemType || '—'],
    ['Address Range',     sess.addrRange || '—'],
    ['Address Range NPI', NPI_LABELS[sess.addrNpi] ?? String(sess.addrNpi ?? 0)],
    ['Address Range TON', TON_LABELS[sess.addrTon] ?? String(sess.addrTon ?? 0)],
    ['Connection State',  stateLabel],
  ];

  const liveStats = [
    ['Bound since',        formatRelative(sess.boundAt)],
    ['Bind type',          (sess.state || '').replace('bound_', '').replace('_', ' ') || '—'],
    ['Messages in',        sess.msgIn.toLocaleString()],
    ['Messages out',       sess.msgOut.toLocaleString()],
    ['Throughput sent',    '—'],
    ['Throughput recv',    '—'],
    ['Peak throughput',    '—'],
    ['Window in use',      '—'],
    ['Avg RTT',            '—'],
    ['p99 RTT',            '—'],
    ['enquire_link sent',  '—'],
    ['enquire_link missed','—'],
    ['Submit_sm OK',       sess.msgIn.toLocaleString()],
    ['Submit_sm rejected', '—'],
    ['DLRs delivered',     '—'],
    ['Reconnects',         '—'],
    ['Last error',         '—'],
    ['Last activity',      formatRelative(sess.boundAt)],
  ];

  const behavior = [
    ['Window size',       '10'],
    ['Throttle',          'unlimited'],
    ['Default encoding',  MULTIPART_LABELS[config?.multipartMode] || 'UDH'],
    ['Auto-respond DLR',  config?.echo ? 'enabled' : 'disabled'],
    ['Failure injection', '0%'],
    ['enquire_link',      (config?.enquireIntervalMs ?? 30000) > 0 ? `${Math.round((config.enquireIntervalMs ?? 30000) / 1000)}s` : 'off'],
  ];

  return (
    <div style={{ padding: '22px 28px 28px', height: '100%', overflowY: 'auto' }}>
      <div style={{ fontSize: 11, color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Connection</div>
      <div style={{ border: `1px solid ${t.border}`, borderRadius: 4, background: t.surface, marginBottom: 28 }}>
        {connection.map(([k, v], i) => <Row key={k} t={t} k={k} v={v} last={i === connection.length - 1} />)}
      </div>

      <div style={{ fontSize: 11, color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
        Live stats · {sess.systemId}
      </div>
      <div style={{ border: `1px solid ${t.border}`, borderRadius: 4, background: t.surface, marginBottom: 28 }}>
        {liveStats.map(([k, v], i) => <Row key={k} t={t} k={k} v={v} last={i === liveStats.length - 1} />)}
      </div>

      <div style={{ fontSize: 11, color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Behavior</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        {behavior.map(([k, v]) => (
          <div key={k} style={{ border: `1px solid ${t.border}`, borderRadius: 4, padding: 14, background: t.surface }}>
            <div style={{ fontSize: 10.5, color: t.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{k}</div>
            <div style={{ fontFamily: t.fontMono, fontSize: 14, color: t.ink }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
