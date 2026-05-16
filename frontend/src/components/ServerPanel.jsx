import { useState, useEffect } from 'react';
import { ConfigService } from "../../bindings/kyasmpp/services";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import OptionsModal from './modals/OptionsModal';

export default function ServerPanel({ running, config, stats, onStart, onStop, onConfigChange }) {
  const [port, setPort]           = useState(2775);
  const [showOptions, setShowOptions] = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    if (config) {
      setPort(config.port || 2775);
    }
  }, [config]);

  const handleStart = () => {
    setError('');
    if (config) {
      ConfigService.SaveConfig({ ...config, port }).then(() => {
        onConfigChange();
        onStart(port).catch(e => setError(String(e)));
      });
    } else {
      onStart(port).catch(e => setError(String(e)));
    }
  };

  const handleStop = () => {
    setError('');
    onStop().catch(e => setError(String(e)));
  };

  return (
    <fieldset className="rounded-md border border-border bg-card px-3 pb-3 pt-1">
      <legend className="px-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">Server</legend>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Label>Port :</Label>
          <Input
            type="number" value={port} min={1} max={65535}
            onChange={e => setPort(Number(e.target.value))}
            disabled={running} className="w-20"
          />
        </div>

        <Select disabled>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="<< Not Secured >>" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">&lt;&lt; Not Secured &gt;&gt;</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="success" onClick={handleStart} disabled={running}>Start</Button>
        <Button variant="destructive" onClick={handleStop} disabled={!running}>Stop</Button>
        <Button onClick={() => setShowOptions(true)}>Options...</Button>

        <div className="ml-2 flex items-center gap-1.5">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${running ? 'bg-success shadow-[0_0_6px_var(--color-success)]' : 'bg-muted-foreground'}`} />
          {running
            ? <span className="text-success text-xs font-medium">RUNNING :{stats?.port ?? port}</span>
            : <span className="text-muted-foreground text-xs">STOPPED</span>
          }
        </div>

        {error && <span className="text-destructive text-[11px]">{error}</span>}
      </div>

      {showOptions && (
        <OptionsModal
          config={config}
          onSave={cfg => ConfigService.SaveConfig(cfg).then(onConfigChange)}
          onClose={() => setShowOptions(false)}
        />
      )}
    </fieldset>
  );
}
