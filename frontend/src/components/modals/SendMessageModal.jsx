import { useState, useEffect } from 'react';

const TON_OPTIONS = [
  [0,'Unknown'],[1,'International'],[2,'National'],[3,'Network Specific'],
  [4,'Subscriber'],[5,'Alphanumeric'],[6,'Abbreviated'],
];
const NPI_OPTIONS = [
  [0,'Unknown'],[1,'ISDN'],[3,'Data'],[4,'Telex'],
  [6,'Land Mobile'],[8,'National'],[9,'Private'],
];
const DC_LIMITS = {
  0:  { single: 160, multi: 153, label: 'GSM7' },
  8:  { single: 70,  multi: 67,  label: 'UCS-2' },
  4:  { single: 140, multi: 133, label: 'Binary' },
};

function countSms(body, dc) {
  const limits = DC_LIMITS[dc] || DC_LIMITS[0];
  const len = body.length;
  if (len <= limits.single) return { chars: len, parts: 1, perPart: limits.single };
  const parts = Math.ceil(len / limits.multi);
  return { chars: len, parts, perPart: limits.multi };
}

function Field({ t, label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, color: t.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
      {children}
    </div>
  );
}

function AddressRow({ t, address, setAddress, ton, setTon, npi, setNpi }) {
  const inputBase = {
    padding: '7px 10px', fontFamily: t.fontMono, fontSize: 12.5,
    border: `1px solid ${t.border}`, background: t.bg, color: t.ink,
    borderRadius: 4, outline: 'none',
  };
  const selectBase = {
    ...inputBase, cursor: 'pointer', appearance: 'none', paddingRight: 24,
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2379786F' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
  };
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        value={address}
        onChange={e => setAddress(e.target.value)}
        placeholder="number or address"
        style={{ ...inputBase, flex: 1 }}
      />
      <select value={ton} onChange={e => setTon(Number(e.target.value))} style={{ ...selectBase, width: 130 }}>
        {TON_OPTIONS.map(([v, l]) => <option key={v} value={v}>TON:{v} {l}</option>)}
      </select>
      <select value={npi} onChange={e => setNpi(Number(e.target.value))} style={{ ...selectBase, width: 118 }}>
        {NPI_OPTIONS.map(([v, l]) => <option key={v} value={v}>NPI:{v} {l}</option>)}
      </select>
    </div>
  );
}

export default function SendMessageModal({ t, sess, onSend, onClose }) {
  const [form, setForm] = useState({
    fromAddress: 'KYA', fromTon: 1, fromNpi: 1,
    toAddress: sess?.systemId || '', toTon: 1, toNpi: 1,
    body: '', dataCoding: 0,
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const { chars, parts, perPart } = countSms(form.body, form.dataCoding);
  const dcLabel = DC_LIMITS[form.dataCoding]?.label || 'GSM7';

  const handleSend = async () => {
    if (!form.body || sending || sent) return;
    setSending(true);
    try {
      await onSend({
        sessionId: Number(sess.id),
        fromAddress: form.fromAddress,
        fromTon: form.fromTon,
        fromNpi: form.fromNpi,
        toAddress: form.toAddress,
        toTon: form.toTon,
        toNpi: form.toNpi,
        body: form.body,
        dataCoding: form.dataCoding,
        tlvs: [],
      });
      setSent(true);
      setTimeout(onClose, 800);
    } finally {
      setSending(false);
    }
  };

  const inputBase = {
    padding: '7px 10px', fontFamily: t.fontMono, fontSize: 12.5,
    border: `1px solid ${t.border}`, background: t.bg, color: t.ink,
    borderRadius: 4, outline: 'none', width: '100%', boxSizing: 'border-box',
  };
  const selectBase = {
    ...inputBase, cursor: 'pointer', appearance: 'none', paddingRight: 24,
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2379786F' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.36)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50, backdropFilter: 'blur(3px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 560, background: t.surface, border: `1px solid ${t.border}`,
          borderRadius: 8, color: t.ink, fontFamily: t.fontUI,
          boxShadow: '0 32px 80px -24px rgba(0,0,0,0.38)',
          display: 'flex', flexDirection: 'column', maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 28px 14px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            deliver_sm
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontFamily: t.fontDisplay, fontSize: 24, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Send message
            </span>
            <button
              onClick={onClose}
              style={{ border: 0, background: 'transparent', color: t.muted, fontSize: 20, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div style={{
          padding: '10px 28px', background: t.surfaceAlt, borderBottom: `1px solid ${t.border}`,
          display: 'flex', gap: 20, fontSize: 11.5, fontFamily: t.fontMono, color: t.muted, flexShrink: 0,
        }}>
          <span>
            <span style={{ color: t.mutedSoft }}>client </span>
            <span style={{ color: t.ink }}>{sess?.clientIp}:{sess?.clientPort}</span>
          </span>
          <span>
            <span style={{ color: t.mutedSoft }}>system_id </span>
            <span style={{ color: t.ink }}>{sess?.systemId || '—'}</span>
          </span>
          <span style={{ marginLeft: 'auto', color: t.accent }}>KYA → client</span>
        </div>

        {/* Form body */}
        <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>

          <Field t={t} label="From">
            <AddressRow
              t={t}
              address={form.fromAddress} setAddress={v => set('fromAddress', v)}
              ton={form.fromTon} setTon={v => set('fromTon', v)}
              npi={form.fromNpi} setNpi={v => set('fromNpi', v)}
            />
          </Field>

          <Field t={t} label="To">
            <AddressRow
              t={t}
              address={form.toAddress} setAddress={v => set('toAddress', v)}
              ton={form.toTon} setTon={v => set('toTon', v)}
              npi={form.toNpi} setNpi={v => set('toNpi', v)}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field t={t} label="Data Coding">
              <select value={form.dataCoding} onChange={e => set('dataCoding', Number(e.target.value))} style={selectBase}>
                <option value={0}>0x00 — GSM7 / Default</option>
                <option value={4}>0x04 — Binary</option>
                <option value={8}>0x08 — UCS-2 (Unicode)</option>
              </select>
            </Field>
            <Field t={t} label="Encoding">
              <div style={{
                padding: '7px 10px', border: `1px solid ${t.border}`, borderRadius: 4,
                background: t.bg, fontFamily: t.fontMono, fontSize: 12.5, color: t.muted,
              }}>
                {dcLabel} · {perPart} chars/part
              </div>
            </Field>
          </div>

          <Field t={t} label="Message body">
            <textarea
              value={form.body}
              onChange={e => set('body', e.target.value)}
              rows={5}
              placeholder="Message text…"
              style={{
                ...inputBase, resize: 'vertical', lineHeight: 1.5,
                fontSize: 13, fontFamily: t.fontUI,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, fontSize: 11, color: t.muted, marginTop: -4 }}>
              <span style={{ fontFamily: t.fontMono }}>{chars} chars</span>
              {parts > 1 && (
                <span style={{ fontFamily: t.fontMono, color: t.warn }}>{parts} parts</span>
              )}
            </div>
          </Field>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 22px', borderTop: `1px solid ${t.border}`,
          background: t.surfaceAlt, display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 16px', border: `1px solid ${t.border}`, background: 'transparent',
              color: t.ink, borderRadius: 4, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!form.body || sending || sent}
            style={{
              padding: '7px 20px',
              border: `1px solid ${sent ? t.accent : t.ink}`,
              background: sent ? t.accent : t.ink,
              color: t.bg,
              borderRadius: 4, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer',
              opacity: (!form.body || sending) ? 0.55 : 1,
              transition: 'background 0.2s, border-color 0.2s',
            }}
          >
            {sent ? 'Sent ✓' : sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
