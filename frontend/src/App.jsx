import { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from '@emotion/react';
import { Events } from "@wailsio/runtime";
import { SmppService, ConfigService, OperatorService } from "../bindings/kyasmpp/services";
import { resolveTheme } from './kyaTheme';
import { mapSession, mapMessage } from './dataHelpers';
import OperatorStrip from './components/OperatorStrip';
import KyaShell from './components/KyaShell';
import OptionsModal from './components/modals/OptionsModal';
import Toast from './components/Toast';
import './app.css';

const MAX_MESSAGES = 20000;
function makeOperator(name, port) {
  return { id: crypto.randomUUID(), name, port };
}

// Merge the live session list (from stats ticks / GetSessions) with the rows we
// already have. Any session that has dropped out of the live list is kept as a
// CLOSED row instead of being discarded — so disconnected sessions stay visible
// in the table. New live sessions are appended.
function mergeSessions(prev, live) {
  const liveById = new Map(live.map(s => [s.id, s]));
  const merged = prev.map(p =>
    liveById.has(p.id) ? liveById.get(p.id) : { ...p, state: 'CLOSED' }
  );
  const seen = new Set(prev.map(p => p.id));
  for (const l of live) {
    if (!seen.has(l.id)) merged.push(l);
  }
  return merged;
}

const DEFAULT_STATS = {
  sessionCount: 0, totalReceived: 0, totalSent: 0,
  receivedPerSecond: 0, sentPerSecond: 0, port: 2775,
};
const defaultOpState = () => ({ running: false, stats: DEFAULT_STATS, rawSessions: [], rawMessages: [] });

export default function App() {
  const [darkMode, setDarkMode]   = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [monoFont, setMonoFont]   = useState(false);
  const [operators, setOperators] = useState([]);
  const [activeOpId, setActiveOpId] = useState('1');
  const [perOp, setPerOp]         = useState({});
  const [configByOp, setConfigByOp] = useState({});
  const [startError, setStartError] = useState(null);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const t = resolveTheme(darkMode, monoFont);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const updateOp = (opId, fn) =>
    setPerOp(prev => ({ ...prev, [opId]: fn(prev[opId] ?? defaultOpState()) }));

  const mappedForOp = opId => {
    const s = perOp[opId] ?? defaultOpState();
    const msgs = s.rawMessages.map(mapMessage);
    const sess = s.rawSessions.map(mapSession);
    return { messages: msgs, sessions: sess };
  };

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  const loadConfig = useCallback(opId =>
    ConfigService.GetConfig(opId).then(cfg =>
      setConfigByOp(prev => ({ ...prev, [opId]: cfg }))
    ), []);

  const loadOperators = useCallback(() =>
    OperatorService.GetOperators().then(ops => {
      let result;
      if (!ops || ops.length === 0) {
        const def = makeOperator('Default', 2775);
        OperatorService.SaveOperator(def);
        result = [def];
      } else {
        result = ops.map(o => ({ id: o.id, name: o.name, port: o.port }));
      }
      setOperators(result);
      setActiveOpId(result[0].id);
      return result;
    }), []);

  useEffect(() => {
    loadOperators().then(ops => {
      ops.forEach(op => {
        SmppService.IsRunning(op.id).then(running => {
          if (running) updateOp(op.id, s => ({ ...s, running: true }));
        });
        SmppService.GetSessions(op.id).then(ss =>
          updateOp(op.id, s => ({ ...s, rawSessions: ss ?? [] }))
        );
        SmppService.GetMessages(op.id, 0, MAX_MESSAGES).then(ms =>
          updateOp(op.id, s => ({ ...s, rawMessages: ms ?? [] }))
        );
        loadConfig(op.id);
      });
    });

    const off = [
      Events.On('smpp:stats-tick', e => {
        const { operatorId, data: d } = e.data ?? {};
        if (!operatorId || !d) return;
        updateOp(operatorId, s => ({
          ...s,
          running: d.serverRunning ?? false,
          stats: d,
          rawSessions: d.sessions ? mergeSessions(s.rawSessions, d.sessions) : s.rawSessions,
        }));
      }),
      Events.On('smpp:server-stopped', e => {
        const { operatorId } = e.data ?? {};
        if (!operatorId) return;
        updateOp(operatorId, s => ({ ...s, running: false }));
      }),
      Events.On('smpp:session-connected', e => {
        const { operatorId, data: session } = e.data ?? {};
        if (!operatorId || !session) return;
        updateOp(operatorId, s => ({
          ...s,
          rawSessions: [...s.rawSessions.filter(x => x.id !== session.id), session],
        }));
      }),
      Events.On('smpp:session-bound', e => {
        const { operatorId, data: session } = e.data ?? {};
        if (!operatorId || !session) return;
        updateOp(operatorId, s => ({
          ...s,
          rawSessions: s.rawSessions.map(x => x.id === session.id ? session : x),
        }));
      }),
      Events.On('smpp:session-disconnected', e => {
        const { operatorId, data: info } = e.data ?? {};
        if (!operatorId || !info) return;
        // Keep the row, but flag it CLOSED so it shows as an extinguished session.
        updateOp(operatorId, s => ({
          ...s,
          rawSessions: s.rawSessions.map(x =>
            x.id === info.id ? { ...x, state: 'CLOSED' } : x
          ),
        }));
      }),
      Events.On('smpp:message-received', e => {
        const { operatorId, data: msg } = e.data ?? {};
        if (!operatorId || !msg) return;
        updateOp(operatorId, s => ({
          ...s,
          rawMessages: [...s.rawMessages, msg].slice(-MAX_MESSAGES),
        }));
      }),
      Events.On('smpp:message-sent', e => {
        const { operatorId, data: msg } = e.data ?? {};
        if (!operatorId || !msg) return;
        updateOp(operatorId, s => ({
          ...s,
          rawMessages: [...s.rawMessages, msg].slice(-MAX_MESSAGES),
        }));
      }),
    ];

    return () => off.forEach(fn => typeof fn === 'function' && fn());
  }, []);

  // ── Operator actions ──────────────────────────────────────────────────────
  const handleStart = async (opId, port, ip) => {
    const op = operators.find(o => o.id === opId);
    const p = port || op?.port || 2775;
    try {
      await SmppService.StartServer(opId, p, ip || '0.0.0.0');
      setStartError(null);
      updateOp(opId, s => ({ ...s, running: true }));
      setOperators(ops => {
        const updated = ops.map(o => o.id === opId ? { ...o, port: p } : o);
        const saved = updated.find(o => o.id === opId);
        if (saved) OperatorService.SaveOperator({ id: saved.id, name: saved.name, port: saved.port });
        return updated;
      });
    } catch (err) {
      setStartError(String(err?.message ?? err));
    }
  };

  const handleStop = async (opId) => {
    await SmppService.StopServer(opId);
    updateOp(opId, s => ({ ...s, running: false }));
  };

  const handleToggleOperator = opId => {
    const op = operators.find(o => o.id === opId);
    if (!op) return;
    const running = perOp[opId]?.running ?? false;
    if (running) {
      handleStop(opId);
    } else {
      setActiveOpId(opId);
      handleStart(opId, op.port, '0.0.0.0');
    }
  };

  const handleAddOperator = ({ name, port }) => {
    const op = makeOperator(name, port);
    OperatorService.SaveOperator({ id: op.id, name: op.name, port: op.port }).then(() => loadConfig(op.id));
    setOperators(ops => [...ops, op]);
    setActiveOpId(op.id);
  };

  const handleRemoveOperator = async opId => {
    if (perOp[opId]?.running) await SmppService.StopServer(opId);
    OperatorService.DeleteOperator(opId);
    setOperators(ops => {
      const next = ops.filter(o => o.id !== opId);
      if (next.length === 0) return ops;
      if (activeOpId === opId) setActiveOpId(next[0].id);
      return next;
    });
  };

  const handleReorderOperators = (newOperators) => {
    setOperators(newOperators);
    OperatorService.SaveOrder(newOperators.map(o => o.id));
  };

  const handleChangePort = (opId, port) => {
    const p = Number(port);
    if (!Number.isInteger(p) || p < 1 || p > 65535) return;
    const current = operators.find(o => o.id === opId);
    if (!current || current.port === p) return;
    const next = { ...current, port: p };
    setOperators(ops => ops.map(o => o.id === opId ? next : o));
    OperatorService.SaveOperator({ id: next.id, name: next.name, port: next.port });
  };

  const handleRenameOperator = (id, name) => {
    setOperators(ops => {
      const updated = ops.map(o => o.id === id ? { ...o, name } : o);
      const op = updated.find(o => o.id === id);
      if (op) OperatorService.SaveOperator({ id: op.id, name: op.name, port: op.port });
      return updated;
    });
  };

  const handleConfigSave = (opId, cfg) =>
    ConfigService.SaveConfig(opId, cfg).then(() => loadConfig(opId));

  // ── Derived ───────────────────────────────────────────────────────────────
  const operatorsWithStatus = operators.map(op => ({
    ...op,
    status: perOp[op.id]?.running ? 'running' : 'stopped',
  }));

  return (
    <ThemeProvider theme={t}>
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.bg }}>
      <OperatorStrip
        operators={operatorsWithStatus}
        activeId={activeOpId}
        onPick={setActiveOpId}
        onAdd={handleAddOperator}
        onRemove={handleRemoveOperator}
        onRename={handleRenameOperator}
        onReorder={handleReorderOperators}
        onToggle={handleToggleOperator}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
        onOpenOptions={() => setOptionsOpen(true)}
      />

      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {operators.map(op => {
          const { messages: opMsgs, sessions: opSess } = mappedForOp(op.id);
          const opRunning = perOp[op.id]?.running ?? false;
          const opStats   = perOp[op.id]?.stats ?? DEFAULT_STATS;
          return (
            <div
              key={op.id}
              style={{
                position: 'absolute', inset: 0,
                display: op.id === activeOpId ? 'flex' : 'none',
                flexDirection: 'column',
              }}
            >
              <KyaShell
                t={t}
                darkMode={darkMode}
                onToggleDark={() => setDarkMode(d => !d)}
                operator={op}
                running={opRunning}
                stats={opStats}
                sessions={opSess}
                messages={opMsgs}
                config={configByOp[op.id]}
                onStart={(port, ip) => handleStart(op.id, port, ip)}
                onStop={() => handleStop(op.id)}
                onChangePort={port => handleChangePort(op.id, port)}
                onSend={req => SmppService.SendMessage({ ...req, operatorId: op.id })}
                onDrop={id => {
                  const nid = Number(id);
                  const target = (perOp[op.id]?.rawSessions ?? []).find(x => x.id === nid);
                  // An already-closed row is simply dismissed from the list.
                  if (target && target.state === 'CLOSED') {
                    updateOp(op.id, s => ({ ...s, rawSessions: s.rawSessions.filter(x => x.id !== nid) }));
                    return Promise.resolve();
                  }
                  // Live session: ask the backend to disconnect it; the
                  // session-disconnected event then marks the row CLOSED.
                  return SmppService.DropSession(op.id, nid)
                    .catch(err => setStartError(String(err?.message ?? err)));
                }}
                onConfigChange={() => loadConfig(op.id)}
                onConfigSave={cfg => handleConfigSave(op.id, cfg)}
              />
            </div>
          );
        })}
      </div>
    </div>
    {startError && <Toast message={startError} onClose={() => setStartError(null)} />}
    {optionsOpen && (
      <OptionsModal
        t={t}
        config={configByOp[activeOpId]}
        onSave={cfg => handleConfigSave(activeOpId, cfg)}
        onClose={() => setOptionsOpen(false)}
      />
    )}
    </ThemeProvider>
  );
}
