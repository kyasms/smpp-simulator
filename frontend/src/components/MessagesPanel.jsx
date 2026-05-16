import { useState, useEffect } from 'react';
import { ConfigService } from "../../bindings/kyasmpp/services";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import FailureRatesModal from './modals/FailureRatesModal';

const DIR_CLASS   = { IN: 'text-primary font-bold', OUT: 'text-warning font-bold' };
const STATE_CLASS = { SENT: 'text-success', FAILED: 'text-destructive', PENDING: 'text-warning' };

export default function MessagesPanel({ messages, stats, config, onClear, onConfigChange }) {
  const [echo, setEcho]           = useState(false);
  const [keep, setKeep]           = useState(200);
  const [showRates, setShowRates] = useState(false);

  useEffect(() => {
    if (config) {
      setEcho(config.echo ?? false);
      setKeep(config.keepMessages ?? 200);
    }
  }, [config]);

  const saveEcho = () => {
    if (!config) return;
    ConfigService.SaveConfig({ ...config, echo, keepMessages: keep }).then(onConfigChange);
  };

  const fmt = n => (typeof n === 'number' ? n.toFixed(1) : '0.0');

  return (
    <fieldset className="rounded-md border border-border bg-card px-3 pb-3 pt-1">
      <legend className="px-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">Messages</legend>

      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          {/* Table */}
          <div className="overflow-auto rounded border border-border max-h-36">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-secondary border-b border-border">
                  {['Dir.', 'SystemID', 'ToAddress', 'Reference', 'State', 'Body'].map(h => (
                    <th key={h} className="px-2 py-1 text-left font-semibold text-primary whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {messages.length === 0 && (
                  <tr><td colSpan={6} className="px-2 py-3 text-center text-muted-foreground">No messages</td></tr>
                )}
                {[...messages].reverse().map((m, i) => (
                  <tr key={m.id ?? i} className="border-b border-border hover:bg-accent">
                    <td className={cn('px-2 py-1', DIR_CLASS[m.direction])}>{m.direction}</td>
                    <td className="px-2 py-1">{m.systemId}</td>
                    <td className="px-2 py-1">{m.toAddress}</td>
                    <td className="px-2 py-1 font-mono text-[11px]">{m.reference}</td>
                    <td className={cn('px-2 py-1', STATE_CLASS[m.status] ?? '')}>{m.status}</td>
                    <td className="px-2 py-1 max-w-50 truncate">{m.body}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Checkbox id="echo" checked={echo}
                  onCheckedChange={v => setEcho(!!v)} onBlur={saveEcho} />
                <Label htmlFor="echo">Echo</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <Label>Keep :</Label>
                <Input type="number" value={keep} min={0} max={10000}
                  onChange={e => setKeep(Number(e.target.value))}
                  onBlur={saveEcho} className="w-16" />
                <Label>Messages</Label>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <span><span className="text-foreground font-medium">{messages.length}</span> Messages</span>
              <span>RX/s: <span className="text-foreground font-medium">{fmt(stats?.receivedPerSecond)}</span></span>
              <span>TX/s: <span className="text-foreground font-medium">{fmt(stats?.sentPerSecond)}</span></span>
              <span>Total RX: <span className="text-foreground font-medium">{stats?.totalReceived ?? 0}</span></span>
              <span>Total TX: <span className="text-foreground font-medium">{stats?.totalSent ?? 0}</span></span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-1.5 pt-0.5">
          <Button size="sm" onClick={onClear}>Clear</Button>
          <Button size="sm" onClick={() => setShowRates(true)}>Failure Rate...</Button>
        </div>
      </div>

      {showRates && <FailureRatesModal onClose={() => setShowRates(false)} />}
    </fieldset>
  );
}
