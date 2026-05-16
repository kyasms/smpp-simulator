import { useState, useEffect } from 'react';
import { ConfigService } from "../../bindings/kyasmpp/services";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function LogPanel({ config, onConfigChange }) {
  const [serverLogEnabled,  setServerLogEnabled]  = useState(false);
  const [serverLogPath,     setServerLogPath]      = useState('');
  const [sessionLogEnabled, setSessionLogEnabled]  = useState(false);
  const [sessionLogPath,    setSessionLogPath]     = useState('');
  const [pduLogEnabled,     setPduLogEnabled]      = useState(false);

  useEffect(() => {
    if (config) {
      setServerLogEnabled(config.serverLogEnabled ?? false);
      setServerLogPath(config.serverLogPath ?? '');
      setSessionLogEnabled(config.sessionLogEnabled ?? false);
      setSessionLogPath(config.sessionLogPath ?? '');
      setPduLogEnabled(config.pduLogEnabled ?? false);
    }
  }, [config]);

  const save = (patch = {}) => {
    if (!config) return;
    ConfigService.SaveConfig({
      ...config,
      serverLogEnabled, serverLogPath,
      sessionLogEnabled, sessionLogPath,
      pduLogEnabled,
      ...patch,
    }).then(onConfigChange);
  };

  return (
    <fieldset className="rounded-md border border-border bg-card px-3 pb-3 pt-1">
      <legend className="px-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">Log</legend>

      <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 gap-y-2 items-center">
        {/* Server log row */}
        <Label className="text-muted-foreground whitespace-nowrap">Server Log :</Label>
        <Input
          value={serverLogPath}
          onChange={e => setServerLogPath(e.target.value)}
          onBlur={() => save()}
          disabled={!serverLogEnabled}
          placeholder="log file path..."
        />
        <span />
        <div className="flex items-center gap-1.5">
          <Checkbox id="srvLog" checked={serverLogEnabled}
            onCheckedChange={v => { setServerLogEnabled(!!v); save({ serverLogEnabled: !!v }); }} />
          <Label htmlFor="srvLog">Enable</Label>
        </div>

        {/* Session log row */}
        <Label className="text-muted-foreground whitespace-nowrap">Session Log :</Label>
        <Input
          value={sessionLogPath}
          onChange={e => setSessionLogPath(e.target.value)}
          onBlur={() => save()}
          disabled={!sessionLogEnabled}
          placeholder="session log directory..."
        />
        <div className="flex items-center gap-1.5">
          <Checkbox id="pduLog" checked={pduLogEnabled}
            onCheckedChange={v => { setPduLogEnabled(!!v); save({ pduLogEnabled: !!v }); }} />
          <Label htmlFor="pduLog">PDU</Label>
        </div>
        <div className="flex items-center gap-1.5">
          <Checkbox id="sesLog" checked={sessionLogEnabled}
            onCheckedChange={v => { setSessionLogEnabled(!!v); save({ sessionLogEnabled: !!v }); }} />
          <Label htmlFor="sesLog">Enable</Label>
        </div>
      </div>
    </fieldset>
  );
}
