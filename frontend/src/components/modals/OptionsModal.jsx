import { useState, useEffect } from 'react';

function OptGroup({ t, label, children }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 11, color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
      {children}
    </section>
  );
}

function OptInput({ t, label, value, onChange, suffix, mono }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11.5, color: t.inkSoft }}>{label}</span>
      <div style={{ position: 'relative' }}>
        <input
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%', padding: suffix ? '8px 44px 8px 10px' : '8px 10px',
            fontFamily: mono || suffix ? t.fontMono : t.fontUI, fontSize: 13,
            border: `1px solid ${t.border}`, background: t.bg, color: t.ink,
            borderRadius: 4, outline: 'none',
          }}
        />
        {suffix && (
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontFamily: t.fontMono, fontSize: 11, color: t.muted, pointerEvents: 'none' }}>
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

function OptSelect({ t, label, value, onChange, options }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11.5, color: t.inkSoft }}>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '8px 32px 8px 10px',
          fontFamily: t.fontMono, fontSize: 12.5,
          border: `1px solid ${t.border}`, background: t.bg, color: t.ink,
          borderRadius: 4, appearance: 'none', outline: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23999' fill='none' stroke-width='1.2'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
        }}
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function FailureSection({ t, label, okLabel, statusOptions, entries, pick, pct, onPick, onPct, onChange, columns, renderRow, buildEntry }) {
  const totalFail = entries.reduce((s, e) => s + (Number(e.pct) || 0), 0);
  const okPct = Math.max(0, 100 - totalFail);
  const insert = () => { if (Number(pct) > 0) onChange([...entries, buildEntry()]); };
  const remove = id => onChange(entries.filter(e => e.id !== id));
  const gridCols = columns.length === 2 ? '1fr 110px 28px' : '1fr 90px 110px 28px';

  return (
    <OptGroup t={t} label={label}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px auto', gap: 8, alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 11.5, color: t.inkSoft }}>Status</span>
          <select value={pick} onChange={e => onPick(e.target.value)} style={{ padding: '8px 10px', fontFamily: t.fontMono, fontSize: 12.5, border: `1px solid ${t.border}`, background: t.bg, color: t.ink, borderRadius: 4, appearance: 'none', outline: 'none' }}>
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 11.5, color: t.inkSoft }}>Occurrence</span>
          <div style={{ position: 'relative' }}>
            <input
              value={pct}
              onChange={e => onPct(e.target.value.replace(/[^0-9]/g, ''))}
              style={{ width: '100%', padding: '8px 28px 8px 10px', fontFamily: t.fontMono, fontSize: 13, border: `1px solid ${t.border}`, background: t.bg, color: t.ink, borderRadius: 4, outline: 'none' }}
            />
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11.5, color: t.muted }}>%</span>
          </div>
        </label>
        <button
          onClick={insert}
          disabled={okPct - (Number(pct) || 0) < 0}
          style={{ padding: '8px 14px', border: `1px solid ${t.border}`, background: 'transparent', color: t.ink, borderRadius: 4, fontSize: 12.5, cursor: 'pointer', opacity: okPct - (Number(pct) || 0) < 0 ? 0.4 : 1, alignSelf: 'flex-end' }}
        >
          Insert
        </button>
      </div>
      <div style={{ border: `1px solid ${t.border}`, borderRadius: 4, background: t.bg, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, padding: '8px 14px', fontSize: 11, color: t.muted, letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `1px solid ${t.borderSoft}` }}>
          {columns.map(c => <span key={c}>{c}</span>)}<span />
        </div>
        {entries.length === 0
          ? <div style={{ padding: 14, fontSize: 12, color: t.muted, fontStyle: 'italic' }}>No failures injected.</div>
          : entries.map(e => (
            <div key={e.id} style={{ display: 'grid', gridTemplateColumns: gridCols, alignItems: 'center', padding: '8px 14px', fontSize: 12.5, fontFamily: t.fontMono, color: t.ink, borderBottom: `1px solid ${t.borderSoft}` }}>
              {renderRow(e).map((v, i) => <span key={i}>{v}</span>)}
              <button onClick={() => remove(e.id)} style={{ border: 0, background: 'transparent', color: t.muted, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
            </div>
          ))
        }
        <div style={{ padding: '8px 14px', borderTop: `1px solid ${t.borderSoft}`, display: 'flex', justifyContent: 'flex-end', fontSize: 11.5, fontFamily: t.fontMono, color: t.muted }}>
          <span style={{ color: okPct === 100 ? t.muted : t.ink }}>{okPct}% {okLabel}</span>
        </div>
      </div>
    </OptGroup>
  );
}

// Parse a millisecond field: empty/invalid falls back to the default, but an
// explicit 0 is kept (0 = disabled, e.g. enquire_link timeout off).
function parseMs(v, dflt) {
  if (v === '' || v === null || v === undefined) return dflt;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : dflt;
}

const MULTIPART_MAP_FWD = { 0: 'UDH', 1: 'UDH16', 2: 'SAR', 3: 'PAYLOAD' };
const MULTIPART_MAP_REV = { UDH: 0, UDH16: 1, SAR: 2, PAYLOAD: 3 };
const DELIVER_MAP_FWD   = { 0: 'FORWARD', 1: 'DELIVER' };
const DELIVER_MAP_REV   = { FORWARD: 0, DELIVER: 1 };

export default function OptionsModal({ t, config, onSave, onClose }) {
  const [opts, setOpts] = useState({
    authEnabled: false, authSystemId: '', authPassword: '',
    gsmEncoding: 'INOUTCHARS', deliverMode: 'DELIVER', multipartMode: 'UDH',
    pduTimeout: 5000, enquireInterval: 30000,
    lastReference: '0', procMin: '', procMax: '',
    certStore: 'CURRENTUSER',
    msgFailures: [], dlrFailures: [],
    msgPick: 'RINVMSGLEN', msgPickPct: '10',
    dlrPick: 'EXPIRED', dlrPickPct: '10',
  });
  const set = (k, v) => setOpts(o => ({ ...o, [k]: v }));

  useEffect(() => {
    if (!config) return;
    setOpts(o => ({
      ...o,
      authEnabled:     config.authRequired ?? false,
      authSystemId:    config.systemId ?? '',
      authPassword:    config.password ?? '',
      pduTimeout:      config.pduTimeoutMs ?? 5000,
      enquireInterval: config.enquireIntervalMs ?? 30000,
      procMin:         String(config.processingMinMs ?? ''),
      procMax:         String(config.processingMaxMs ?? ''),
      lastReference:   String(config.lastReference ?? 0),
      multipartMode:   MULTIPART_MAP_FWD[config.multipartMode] ?? 'UDH',
      deliverMode:     DELIVER_MAP_FWD[config.deliverMode] ?? 'DELIVER',
      msgFailures: (config.messageErrorRates ?? []).map((r, i) => ({
        id: r.statusCode ?? i,
        status: r.description || String(r.statusCode ?? ''),
        pct: r.occurrence ?? 0,
      })),
      dlrFailures: (config.deliveryErrorRates ?? []).map((r, i) => ({
        id: r.statusText + i,
        status: r.statusText ?? '',
        code: '—',
        pct: r.occurrence ?? 0,
      })),
    }));
  }, [config]);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSave = () => {
    if (!config) { onClose(); return; }
    const updated = {
      ...config,
      authRequired:       opts.authEnabled,
      systemId:           opts.authSystemId,
      password:           opts.authPassword,
      pduTimeoutMs:       parseMs(opts.pduTimeout, 5000),
      enquireIntervalMs:  parseMs(opts.enquireInterval, 30000),
      processingMinMs:    Number(opts.procMin) || 0,
      processingMaxMs:    Number(opts.procMax) || 0,
      lastReference:      Number(opts.lastReference) || 0,
      multipartMode:      MULTIPART_MAP_REV[opts.multipartMode] ?? 0,
      deliverMode:        DELIVER_MAP_REV[opts.deliverMode] ?? 1,
      messageErrorRates:  opts.msgFailures.map(e => ({ statusCode: 0, description: e.status, occurrence: Number(e.pct) })),
      deliveryErrorRates: opts.dlrFailures.map(e => ({ statusText: e.status, occurrence: Number(e.pct) })),
    };
    onSave(updated).then(onClose).catch(console.error);
  };

  const GSM_OPTS       = [['INOUTCHARS','In/out chars'],['OUT','Out only'],['NONE','None (UCS-2 always)']];
  const DELIVER_OPTS   = [['FORWARD','forward_sm'],['DELIVER','deliver_sm']];
  const MULTIPART_OPTS = [['UDH','UDH (concatenated)'],['UDH16','UDH16'],['SAR','SAR-TLV'],['PAYLOAD','Payload-TLV']];
  const CERT_OPTS      = [['CURRENTUSER','Current user · My / Personal'],['LOCALMACHINE','Local machine · My / Personal'],['FILE','Custom .pfx file']];
  const MSG_OPTS       = ['RINVMSGLEN','RINVDSTADR','RINVSRCADR','RTHROTTLED','RSYSERR','RMSGQFUL','RSUBMITFAIL','RX_T_APPN','RX_P_APPN','RX_R_APPN'];
  const DLR_OPTS       = ['EXPIRED','DELETED','UNDELIV','ACCEPTD','UNKNOWN','REJECTD','ENROUTE'];
  const DLR_CODES      = { EXPIRED:3, DELETED:2, UNDELIV:5, ACCEPTD:6, UNKNOWN:7, REJECTD:8, ENROUTE:1 };

  const btn = (label, onClick, primary) => (
    <button
      onClick={onClick}
      style={{
        padding: primary ? '7px 16px' : '7px 14px',
        border: `1px solid ${primary ? t.ink : t.border}`,
        background: primary ? t.ink : 'transparent',
        color: primary ? t.bg : t.ink,
        borderRadius: 4, fontSize: 12.5, cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(2px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 560, maxHeight: '88vh', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, color: t.ink, boxShadow: '0 24px 60px -20px rgba(0,0,0,0.35), 0 8px 18px -8px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '20px 28px 14px', borderBottom: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 11, color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Server</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontFamily: t.fontDisplay, fontSize: 28, letterSpacing: '-0.02em', lineHeight: 1.1 }}>Options</span>
            <button onClick={onClose} style={{ border: 0, background: 'transparent', color: t.muted, fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 26, flex: 1, minHeight: 0, overflowY: 'auto' }}>

          <OptGroup t={t} label="Authentication">
            <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 12.5 }}>
              <input type="checkbox" checked={opts.authEnabled} onChange={e => set('authEnabled', e.target.checked)} style={{ accentColor: t.ink, width: 14, height: 14, margin: 0 }} />
              Require client authentication
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, opacity: opts.authEnabled ? 1 : 0.4, pointerEvents: opts.authEnabled ? 'auto' : 'none', transition: 'opacity 120ms' }}>
              <OptInput t={t} label="SystemID" mono value={opts.authSystemId} onChange={v => set('authSystemId', v)} />
              <OptInput t={t} label="Password" mono value={opts.authPassword} onChange={v => set('authPassword', v)} />
            </div>
          </OptGroup>

          <OptGroup t={t} label="Encoding & delivery">
            <OptSelect t={t} label="GSM encoding"  value={opts.gsmEncoding}   onChange={v => set('gsmEncoding', v)}   options={GSM_OPTS} />
            <OptSelect t={t} label="Deliver mode"  value={opts.deliverMode}   onChange={v => set('deliverMode', v)}   options={DELIVER_OPTS} />
            <OptSelect t={t} label="Multipart mode" value={opts.multipartMode} onChange={v => set('multipartMode', v)} options={MULTIPART_OPTS} />
          </OptGroup>

          <OptGroup t={t} label="Timing">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <OptInput t={t} label="PDU timeout"          suffix="ms" value={opts.pduTimeout}      onChange={v => set('pduTimeout', v)} />
              <OptInput t={t} label="enquire_link interval" suffix="ms" value={opts.enquireInterval} onChange={v => set('enquireInterval', v)} />
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 11.5, color: t.muted, lineHeight: 1.55 }}>
              The server sends an enquire_link to each bound client every <span style={{ fontFamily: t.fontMono, color: t.inkSoft }}>enquire_link interval</span> ms to keep the connection alive.
              If a client fails to answer an outstanding PDU within the <span style={{ fontFamily: t.fontMono, color: t.inkSoft }}>PDU timeout</span>, its session is closed.
              Set either to <span style={{ fontFamily: t.fontMono, color: t.inkSoft }}>0</span> to disable it — enquire_link interval 0 stops the pings, so an idle session is never auto-disconnected.
            </p>
          </OptGroup>

          <OptGroup t={t} label="Sequence">
            <OptInput t={t} label="Last reference" mono value={opts.lastReference} onChange={v => set('lastReference', v)} />
          </OptGroup>

          <OptGroup t={t} label="Processing time">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <OptInput t={t} label="Minimum" suffix="ms" value={opts.procMin} onChange={v => set('procMin', v)} />
              <OptInput t={t} label="Maximum" suffix="ms" value={opts.procMax} onChange={v => set('procMax', v)} />
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 11.5, color: t.muted, lineHeight: 1.55 }}>
              Each incoming message is held for a random delay between min and max before the response is emitted.
            </p>
          </OptGroup>

          <FailureSection
            t={t}
            label="Message status (submit_sm response)"
            okLabel="ROK"
            statusOptions={MSG_OPTS}
            entries={opts.msgFailures}
            pick={opts.msgPick} pct={opts.msgPickPct}
            onPick={v => set('msgPick', v)} onPct={v => set('msgPickPct', v)}
            onChange={v => set('msgFailures', v)}
            columns={['Status', 'Occurrence']}
            renderRow={e => [e.status, `${e.pct}%`]}
            buildEntry={() => ({ id: Date.now() + Math.random(), status: opts.msgPick, pct: Number(opts.msgPickPct) || 0 })}
          />

          <FailureSection
            t={t}
            label="Delivery status (DLR)"
            okLabel="DELIVRD"
            statusOptions={DLR_OPTS}
            entries={opts.dlrFailures}
            pick={opts.dlrPick} pct={opts.dlrPickPct}
            onPick={v => set('dlrPick', v)} onPct={v => set('dlrPickPct', v)}
            onChange={v => set('dlrFailures', v)}
            columns={['Text', 'Code', 'Occurrence']}
            renderRow={e => [e.status, e.code ?? DLR_CODES[e.status] ?? '—', `${e.pct}%`]}
            buildEntry={() => ({ id: Date.now() + Math.random(), status: opts.dlrPick, code: DLR_CODES[opts.dlrPick] ?? 0, pct: Number(opts.dlrPickPct) || 0 })}
          />

          <OptGroup t={t} label="TLS">
            <OptSelect t={t} label="Certificate store" value={opts.certStore} onChange={v => set('certStore', v)} options={CERT_OPTS} />
            <p style={{ margin: '4px 0 0', fontSize: 11.5, color: t.muted, lineHeight: 1.55 }}>
              Kya will look in the chosen <span style={{ fontFamily: t.fontMono, color: t.inkSoft }}>My</span> location for certificates whose intended purpose includes <span style={{ fontFamily: t.fontMono, color: t.inkSoft }}>Server</span>.
            </p>
          </OptGroup>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', padding: '14px 22px', borderTop: `1px solid ${t.border}`, display: 'flex', justifyContent: 'flex-end', gap: 8, background: t.surfaceAlt }}>
          {btn('Cancel', onClose, false)}
          {btn('Save', handleSave, true)}
        </div>
      </div>
    </div>
  );
}
