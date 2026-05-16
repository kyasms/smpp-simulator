import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const EMPTY = { fromAddress: '', fromTon: 1, fromNpi: 1, toAddress: '', toTon: 1, toNpi: 1, body: '', dataCoding: 0, hasUdh: false, tlvs: [] };
const TON_NPI_OPTIONS = [0, 1, 2, 3, 4, 5, 6];
const NPI_OPTIONS     = [0, 1, 3, 4, 6, 8, 9];

function AddressRow({ label, address, setAddress, ton, setTon, npi, setNpi, tonOpts, npiOpts }) {
  return (
    <>
      <Label className="text-right">{label} :</Label>
      <div className="flex gap-1.5">
        <Input value={address} onChange={e => setAddress(e.target.value)} className="flex-1" />
        <Select value={String(ton)} onValueChange={v => setTon(Number(v))}>
          <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            {tonOpts.map(v => <SelectItem key={v} value={String(v)}>TON:{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(npi)} onValueChange={v => setNpi(Number(v))}>
          <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            {npiOpts.map(v => <SelectItem key={v} value={String(v)}>NPI:{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

export default function AutoMessageFormModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial ?? EMPTY);
  useEffect(() => { setForm(initial ?? EMPTY); }, [initial]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit' : 'Add'} Auto Message</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-3 items-center">
          <AddressRow
            label="From Address"
            address={form.fromAddress} setAddress={v => set('fromAddress', v)}
            ton={form.fromTon} setTon={v => set('fromTon', v)}
            npi={form.fromNpi} setNpi={v => set('fromNpi', v)}
            tonOpts={TON_NPI_OPTIONS} npiOpts={NPI_OPTIONS}
          />
          <AddressRow
            label="To Address"
            address={form.toAddress} setAddress={v => set('toAddress', v)}
            ton={form.toTon} setTon={v => set('toTon', v)}
            npi={form.toNpi} setNpi={v => set('toNpi', v)}
            tonOpts={TON_NPI_OPTIONS} npiOpts={NPI_OPTIONS}
          />

          <Label className="text-right">Body :</Label>
          <Textarea value={form.body} onChange={e => set('body', e.target.value)}
            rows={4} className="font-mono text-[11px]" />

          <Label className="text-right">Data Coding :</Label>
          <Select value={String(form.dataCoding)} onValueChange={v => set('dataCoding', Number(v))}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">0x00 — GSM7 / Default</SelectItem>
              <SelectItem value="4">0x04 — Binary</SelectItem>
              <SelectItem value="8">0x08 — UCS-2 (Unicode)</SelectItem>
            </SelectContent>
          </Select>

          <Label className="text-right">Has UDH :</Label>
          <div className="flex items-center gap-2">
            <Checkbox id="udh" checked={form.hasUdh}
              onCheckedChange={v => set('hasUdh', !!v)} />
            <Label htmlFor="udh" className="text-muted-foreground">Include User Data Header</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="success" onClick={() => onSave(form)} disabled={!form.body || !form.toAddress}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
