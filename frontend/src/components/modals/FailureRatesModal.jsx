import { useState, useEffect } from 'react';
import { ConfigService } from "../../../bindings/kyasmpp/services";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ESME_CODES = [
  { code: 0x00, label: 'ESME_ROK — Success' },
  { code: 0x01, label: 'ESME_RINVMSGLEN' },
  { code: 0x08, label: 'ESME_RSYSERR' },
  { code: 0x0B, label: 'ESME_RINVSRCADR' },
  { code: 0x0C, label: 'ESME_RINVDSTADR' },
  { code: 0x0E, label: 'ESME_RBINDFAIL' },
  { code: 0x0F, label: 'ESME_RINVPASWD' },
  { code: 0x58, label: 'ESME_RTHROTTLED' },
  { code: 0x45, label: 'ESME_RSUBMITFAIL' },
  { code: 0xFF, label: 'ESME_RUNKNOWNERR' },
];
const DLR_STATUSES = ['DELIVRD', 'FAILED', 'EXPIRED', 'DELETED', 'UNDELIV', 'ACCEPTD', 'UNKNOWN', 'REJECTD'];

export default function FailureRatesModal({ onClose }) {
  const [msgRates, setMsgRates] = useState([]);
  const [dlrRates, setDlrRates] = useState([]);

  useEffect(() => {
    ConfigService.GetMessageErrorRates().then(r => setMsgRates(r ?? []));
    ConfigService.GetDeliveryErrorRates().then(r => setDlrRates(r ?? []));
  }, []);

  const addMsg = () => setMsgRates(p => [...p, { statusCode: 0, description: 'ESME_ROK — Success', occurrence: 10 }]);
  const delMsg = i => setMsgRates(p => p.filter((_, j) => j !== i));
  const setMsg = (i, k, v) => setMsgRates(p => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const addDlr = () => setDlrRates(p => [...p, { statusText: 'DELIVRD', occurrence: 100 }]);
  const delDlr = i => setDlrRates(p => p.filter((_, j) => j !== i));
  const setDlr = (i, k, v) => setDlrRates(p => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const handleSave = () => {
    ConfigService.SaveMessageErrorRates(msgRates)
      .then(() => ConfigService.SaveDeliveryErrorRates(dlrRates))
      .then(onClose);
  };

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Failure Rates</DialogTitle></DialogHeader>

        {/* Message Error Rates */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-primary">Message Error Rates</span>
            <Button size="sm" onClick={addMsg}>+ Add</Button>
          </div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-secondary border-b border-border">
                <th className="px-2 py-1 text-left font-semibold text-primary">ESME Status</th>
                <th className="px-2 py-1 text-left font-semibold text-primary">Occurrence %</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {msgRates.length === 0 && (
                <tr><td colSpan={3} className="px-2 py-2 text-muted-foreground">None — all submissions succeed</td></tr>
              )}
              {msgRates.map((r, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-1 py-1">
                    <Select value={String(r.statusCode)} onValueChange={v => {
                      const code = Number(v);
                      const desc = ESME_CODES.find(c => c.code === code)?.label ?? '';
                      setMsg(i, 'statusCode', code);
                      setMsg(i, 'description', desc);
                    }}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ESME_CODES.map(c => <SelectItem key={c.code} value={String(c.code)}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-1 py-1">
                    <Input type="number" value={r.occurrence} min={1} max={100}
                      onChange={e => setMsg(i, 'occurrence', Number(e.target.value))} className="w-16" />
                  </td>
                  <td className="px-1 py-1">
                    <Button size="sm" variant="destructive" onClick={() => delMsg(i)}>✕</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* DLR Status Rates */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-primary">Delivery Report Status Rates</span>
            <Button size="sm" onClick={addDlr}>+ Add</Button>
          </div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-secondary border-b border-border">
                <th className="px-2 py-1 text-left font-semibold text-primary">Status Text</th>
                <th className="px-2 py-1 text-left font-semibold text-primary">Occurrence %</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {dlrRates.length === 0 && (
                <tr><td colSpan={3} className="px-2 py-2 text-muted-foreground">None — all DLRs: DELIVRD</td></tr>
              )}
              {dlrRates.map((r, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-1 py-1">
                    <Select value={r.statusText} onValueChange={v => setDlr(i, 'statusText', v)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DLR_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-1 py-1">
                    <Input type="number" value={r.occurrence} min={1} max={100}
                      onChange={e => setDlr(i, 'occurrence', Number(e.target.value))} className="w-16" />
                  </td>
                  <td className="px-1 py-1">
                    <Button size="sm" variant="destructive" onClick={() => delDlr(i)}>✕</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="success" onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
