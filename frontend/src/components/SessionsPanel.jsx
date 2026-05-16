import { useState, useEffect } from 'react';
import { ConfigService } from "../../bindings/kyasmpp/services";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import SendMessageModal from './modals/SendMessageModal';

const BIND_COLOR = { TX: 'text-warning', RX: 'text-primary', TRX: 'text-success' };

export default function SessionsPanel({ sessions, selected, onSelect, config, onDrop, onSend, onConfigChange }) {
  const [authRequired, setAuthRequired] = useState(false);
  const [systemId, setSystemId]         = useState('');
  const [password, setPassword]         = useState('');
  const [showSend, setShowSend]         = useState(false);

  useEffect(() => {
    if (config) {
      setAuthRequired(config.authRequired ?? false);
      setSystemId(config.systemId ?? '');
      setPassword(config.password ?? '');
    }
  }, [config]);

  const saveAuth = () => {
    if (!config) return;
    ConfigService.SaveConfig({ ...config, authRequired, systemId, password }).then(onConfigChange);
  };

  const handleDrop = () => {
    if (!selected) return;
    onDrop(selected.id).then(() => onSelect(null)).catch(console.error);
  };

  return (
    <fieldset className="rounded-md border border-border bg-card px-3 pb-3 pt-1">
      <legend className="px-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">Sessions</legend>

      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          {/* Table */}
          <div className="overflow-auto rounded border border-border max-h-28">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-secondary border-b border-border">
                  {['Client IP', 'Port', 'SystemID', 'Type', 'State'].map(h => (
                    <th key={h} className="px-2 py-1 text-left font-semibold text-primary whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 && (
                  <tr><td colSpan={5} className="px-2 py-3 text-center text-muted-foreground">No sessions</td></tr>
                )}
                {sessions.map(s => (
                  <tr
                    key={s.id}
                    onClick={() => onSelect(s)}
                    className={cn('border-b border-border cursor-pointer hover:bg-accent', selected?.id === s.id && 'bg-primary/10')}
                  >
                    <td className="px-2 py-1">{s.ip}</td>
                    <td className="px-2 py-1">{s.port}</td>
                    <td className="px-2 py-1">{s.systemId}</td>
                    <td className={cn('px-2 py-1 font-bold', BIND_COLOR[s.bindType])}>{s.bindType || '—'}</td>
                    <td className="px-2 py-1">{s.state}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Auth row */}
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5">
              <Checkbox
                id="auth"
                checked={authRequired}
                onCheckedChange={v => { setAuthRequired(!!v); }}
                onBlur={saveAuth}
              />
              <Label htmlFor="auth">Authentication</Label>
            </div>
            <div className="flex items-center gap-1.5">
              <Label>SystemID :</Label>
              <Input value={systemId} onChange={e => setSystemId(e.target.value)}
                onBlur={saveAuth} className="w-28" disabled={!authRequired} />
            </div>
            <div className="flex items-center gap-1.5">
              <Label>Password :</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)}
                onBlur={saveAuth} className="w-28" disabled={!authRequired} />
            </div>
            <span className="ml-auto text-[11px] text-muted-foreground">
              {sessions.length} Session{sessions.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-1.5 pt-0.5">
          <Button size="sm" disabled={!selected} onClick={() => setShowSend(true)}>Send...</Button>
          <Button size="sm" variant="destructive" disabled={!selected} onClick={handleDrop}>Drop</Button>
        </div>
      </div>

      {showSend && selected && (
        <SendMessageModal
          session={selected}
          onSend={req => onSend(req).catch(console.error)}
          onClose={() => setShowSend(false)}
        />
      )}
    </fieldset>
  );
}
