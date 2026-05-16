import { useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import Dot from '../atoms/Dot';
import { formatClock } from '../../dataHelpers';

export default function TimelineTab({ t, messages }) {
  const [selectedId, setSelectedId] = useState(null);

  if (!messages.length) {
    return (
      <div style={{ padding: 28, color: t.muted, fontSize: 12, textAlign: 'center' }}>
        No messages on this session yet.
      </div>
    );
  }

  const sel = messages.find(m => m.id === selectedId) || null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: sel ? '1fr 1.4fr' : '1fr', height: '100%', minHeight: 0 }}>
      <TimelineList t={t} messages={messages} sel={sel} onSelect={setSelectedId} />
      {sel && <InspectorPane t={t} sel={sel} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function TimelineList({ t, messages, sel, onSelect }) {
  return (
    <div style={{ borderRight: `1px solid ${t.border}`, minHeight: 0, height: '100%' }}>
      <Virtuoso
        style={{ height: '100%' }}
        data={messages}
        overscan={400}
        itemContent={(_, m) => (
          <Row t={t} m={m} isSelected={m.id === sel?.id} onClick={() => onSelect(m.id)} />
        )}
      />
    </div>
  );
}

function Row({ t, m, isSelected, onClick }) {
  const isIn = m.dir === 'in';
  const stateTone = m.state === 'failed' ? 'danger' : m.state === 'delivered' ? 'accent' : 'warn';
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 22px',
        borderBottom: `1px solid ${t.borderSoft}`,
        cursor: 'pointer',
        background: isSelected ? t.surfaceAlt : 'transparent',
        borderLeft: `2px solid ${isSelected ? t.accent : 'transparent'}`,
        boxSizing: 'border-box',
        lineHeight: 1.35,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: t.fontMono, fontSize: 11 }}>
        <span style={{ color: isIn ? t.accent : t.inkSoft }}>
          {isIn ? '← submit_sm' : '→ deliver_sm'}
        </span>
        <span style={{ color: t.muted }}>{formatClock(m.t)}</span>
      </div>
      <div style={{ fontSize: 12, color: t.inkSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
        {m.body}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: t.fontMono, fontSize: 10.5, color: t.muted, gap: 12 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          ref {m.ref} · {m.to}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0, color: stateTone === 'danger' ? t.danger : stateTone === 'accent' ? t.accent : t.warn }}>
          <Dot tone={stateTone} t={t} />
          {m.state}
        </span>
      </div>
    </div>
  );
}

function InspectorPane({ t, sel, onClose }) {
  const isIn = sel.dir === 'in';
  const pdu = isIn ? 'submit_sm' : 'deliver_sm';

  const bytes = [];
  const cmdId = isIn ? 0x00000004 : 0x00000005;
  const cmdStatus = sel.state === 'failed' ? 0x0000000D : 0x00000000;
  const seq = sel.ref & 0xFFFFFFFF;
  bytes.push(
    0x00, 0x00, 0x00, 0x4C,
    (cmdId >>> 24) & 0xFF, (cmdId >>> 16) & 0xFF, (cmdId >>> 8) & 0xFF, cmdId & 0xFF,
    (cmdStatus >>> 24) & 0xFF, (cmdStatus >>> 16) & 0xFF, (cmdStatus >>> 8) & 0xFF, cmdStatus & 0xFF,
    (seq >>> 24) & 0xFF, (seq >>> 16) & 0xFF, (seq >>> 8) & 0xFF, seq & 0xFF,
  );
  for (let i = 0; i < (sel.body || '').length && bytes.length < 96; i++) {
    bytes.push(sel.body.charCodeAt(i) & 0xFF);
  }

  const fields = [
    ['command_id',       isIn ? '0x00000004' : '0x00000005'],
    ['command_status',   sel.state === 'failed' ? '0x0000000D' : '0x00000000'],
    ['sequence_number',  String(sel.ref)],
    ['source_addr',      isIn ? (sel.from || sel.to) : 'KYA'],
    ['destination_addr', sel.to],
    ['data_coding',      String(sel.dataCoding ?? 0)],
    ['short_message',    sel.body],
  ];

  return (
    <div style={{ overflowY: 'auto', minHeight: 0, padding: '18px 28px 28px', position: 'relative' }}>
      <button
        onClick={onClose}
        title="Close inspector"
        style={{
          position: 'absolute', top: 14, right: 18,
          border: 0, background: 'transparent',
          color: t.muted, fontSize: 18, cursor: 'pointer',
          padding: '2px 6px', lineHeight: 1, borderRadius: 4,
        }}
      >
        ×
      </button>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14, paddingRight: 28 }}>
        <span style={{ fontFamily: t.fontDisplay, fontSize: 22, letterSpacing: '-0.01em' }}>{pdu}</span>
        <span style={{ fontFamily: t.fontMono, fontSize: 11, color: t.muted }}>
          seq {sel.ref} · {bytes.length} bytes
        </span>
      </div>

      <div style={{ fontSize: 11, color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Fields</div>
      <div style={{ border: `1px solid ${t.border}`, borderRadius: 4, marginBottom: 22, background: t.surface }}>
        {fields.map(([k, v], i) => (
          <div key={k} style={{
            display: 'grid', gridTemplateColumns: '160px 1fr', gap: 14, padding: '8px 14px',
            borderBottom: i === fields.length - 1 ? 'none' : `1px solid ${t.borderSoft}`,
            fontFamily: t.fontMono, fontSize: 12,
          }}>
            <span style={{ color: t.muted }}>{k}</span>
            <span style={{ color: t.inkSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Hex dump</div>
      <div style={{ border: `1px solid ${t.border}`, borderRadius: 4, padding: '12px 14px', background: t.surface, fontFamily: t.fontMono, fontSize: 11.5, lineHeight: 1.7, color: t.inkSoft }}>
        {Array.from({ length: Math.ceil(bytes.length / 16) }).map((_, row) => {
          const slice = bytes.slice(row * 16, row * 16 + 16);
          const hex = slice.map(b => b.toString(16).padStart(2, '0')).join(' ');
          const ascii = slice.map(b => b >= 32 && b < 127 ? String.fromCharCode(b) : '·').join('');
          return (
            <div key={row} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 140px', gap: 16 }}>
              <span style={{ color: t.muted }}>{(row * 16).toString(16).padStart(4, '0')}</span>
              <span>{hex}</span>
              <span style={{ color: t.muted }}>{ascii}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
