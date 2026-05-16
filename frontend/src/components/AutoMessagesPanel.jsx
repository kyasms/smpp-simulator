import { useState, useEffect } from 'react';
import { ConfigService } from "../../bindings/kyasmpp/services";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import AutoMessageFormModal from './modals/AutoMessageFormModal';

export default function AutoMessagesPanel({ config, onConfigChange }) {
  const [autoMessages, setAutoMessages] = useState([]);
  const [rate, setRate]                 = useState(0);
  const [random, setRandom]             = useState(false);
  const [selected, setSelected]         = useState(null);
  const [showForm, setShowForm]         = useState(false);
  const [editMsg, setEditMsg]           = useState(null);

  useEffect(() => {
    if (config) {
      setAutoMessages(config.autoMessages ?? []);
      setRate(config.generatePerMinute ?? 0);
      setRandom(config.randomOrder ?? false);
    }
  }, [config]);

  const saveRate = () => {
    if (!config) return;
    ConfigService.SaveConfig({ ...config, generatePerMinute: rate, randomOrder: random }).then(onConfigChange);
  };

  const handleAdd    = () => { setEditMsg(null); setShowForm(true); };
  const handleEdit   = () => { if (selected === null) return; setEditMsg(autoMessages[selected]); setShowForm(true); };
  const handleDelete = () => {
    if (selected === null) return;
    ConfigService.DeleteAutoMessage(selected).then(() => { setSelected(null); onConfigChange(); });
  };

  const handleSave = async msg => {
    if (editMsg !== null && selected !== null) {
      await ConfigService.SaveAutoMessages(autoMessages.map((m, i) => i === selected ? msg : m));
    } else {
      await ConfigService.AddAutoMessage(msg);
    }
    setShowForm(false);
    setEditMsg(null);
    onConfigChange();
  };

  return (
    <fieldset className="rounded-md border border-border bg-card px-3 pb-3 pt-1">
      <legend className="px-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">Auto Messages</legend>

      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <div className="overflow-auto rounded border border-border max-h-28">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-secondary border-b border-border">
                  {['FromAddress', 'ToAddress', 'Body'].map(h => (
                    <th key={h} className="px-2 py-1 text-left font-semibold text-primary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {autoMessages.length === 0 && (
                  <tr><td colSpan={3} className="px-2 py-3 text-center text-muted-foreground">No auto messages</td></tr>
                )}
                {autoMessages.map((m, i) => (
                  <tr key={i} onClick={() => setSelected(i)}
                    className={cn('border-b border-border cursor-pointer hover:bg-accent', selected === i && 'bg-primary/10')}>
                    <td className="px-2 py-1">{m.fromAddress}</td>
                    <td className="px-2 py-1">{m.toAddress}</td>
                    <td className="px-2 py-1 max-w-50 truncate">{m.body}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5">
              <Checkbox id="random" checked={random}
                onCheckedChange={v => setRandom(!!v)} onBlur={saveRate} />
              <Label htmlFor="random">Random</Label>
            </div>
            <div className="flex items-center gap-1.5">
              <Label>Send :</Label>
              <Input type="number" value={rate} min={0}
                onChange={e => setRate(Number(e.target.value))}
                onBlur={saveRate} className="w-20" />
              <Label>Msg / Minute</Label>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 pt-0.5">
          <Button size="sm" onClick={handleAdd}>Add...</Button>
          <Button size="sm" disabled={selected === null} onClick={handleEdit}>Edit...</Button>
          <Button size="sm" variant="destructive" disabled={selected === null} onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      {showForm && (
        <AutoMessageFormModal
          initial={editMsg}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditMsg(null); }}
        />
      )}
    </fieldset>
  );
}
