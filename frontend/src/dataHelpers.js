export function mapSessionState(bindType, state) {
  if (!state || state === 'CLOSED') return 'closed';
  if (state === 'BINDING') return 'open';
  if (state === 'BOUND') {
    const bt = (bindType || '').toUpperCase();
    if (bt === 'TRX') return 'bound_trx';
    if (bt === 'TX') return 'bound_tx';
    if (bt === 'RX') return 'bound_rx';
  }
  return 'open';
}

export function mapSession(s) {
  return {
    id: String(s.id),
    clientIp: s.ip || '',
    clientPort: s.port || 0,
    systemId: s.systemId || '',
    state: mapSessionState(s.bindType, s.state),
    boundAt: s.connectedAt ? new Date(s.connectedAt).getTime() : Date.now(),
    msgIn: s.msgIn ?? 0,
    msgOut: s.msgOut ?? 0,
    version: s.version,
    systemType: s.systemType,
    addrRange: s.addressRange,
    addrTon: s.addressRangeTon,
    addrNpi: s.addressRangeNpi,
  };
}

function mapMessageStatus(status) {
  if (status === 'SENT') return 'delivered';
  if (status === 'PENDING') return 'enroute';
  if (status === 'FAILED' || status === 'DENIED') return 'failed';
  return 'enroute';
}

export function mapMessage(m) {
  return {
    id: m.id,
    t: m.timestamp ? new Date(m.timestamp).getTime() : Date.now(),
    dir: m.direction === 'IN' ? 'in' : 'out',
    sessionId: String(m.sessionId),
    systemId: m.systemId || '',
    from: m.fromAddress || '',
    to: m.toAddress || '',
    body: m.body || '',
    ref: m.sequenceNumber || 0,
    state: mapMessageStatus(m.status),
    dataCoding: m.dataCoding ?? 0,
    commandStatus: m.commandStatus ?? 0,
    _raw: m,
  };
}

export function formatRelative(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return s + 's ago';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  return h + 'h ' + (m % 60) + 'm ago';
}

export function formatClock(ts) {
  const d = new Date(ts);
  return d.toTimeString().slice(0, 8) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}
