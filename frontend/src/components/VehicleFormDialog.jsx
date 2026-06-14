import { useEffect, useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'in_use', label: 'In use' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'retired', label: 'Retired' },
];

const EMPTY = {
  plateNo: '',
  brand: '',
  model: '',
  year: String(new Date().getFullYear()),
  status: 'available',
  mileage: '0',
  purchaseDate: '',
};

function toDateInput(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default function VehicleFormDialog({ open, onClose, onSubmit, vehicle }) {
  const isEdit = Boolean(vehicle);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(
      vehicle
        ? {
            plateNo: vehicle.plateNo,
            brand: vehicle.brand,
            model: vehicle.model,
            year: String(vehicle.year),
            status: vehicle.status,
            mileage: String(vehicle.mileage),
            purchaseDate: toDateInput(vehicle.purchaseDate),
          }
        : EMPTY,
    );
  }, [open, vehicle]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSubmit({
        plateNo: form.plateNo.trim(),
        brand: form.brand.trim(),
        model: form.model.trim(),
        year: Number(form.year),
        status: form.status,
        mileage: Number(form.mileage || 0),
        purchaseDate: form.purchaseDate || null,
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Edit vehicle' : 'Add vehicle'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Plate no.">
            <Input value={form.plateNo} onChange={set('plateNo')} required />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={set('status')}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Brand">
            <Input value={form.brand} onChange={set('brand')} required />
          </Field>
          <Field label="Model">
            <Input value={form.model} onChange={set('model')} required />
          </Field>
          <Field label="Year">
            <Input type="number" min="1900" max="2100" value={form.year} onChange={set('year')} required />
          </Field>
          <Field label="Mileage">
            <Input type="number" min="0" value={form.mileage} onChange={set('mileage')} />
          </Field>
          <Field label="Purchase date">
            <Input type="date" value={form.purchaseDate} onChange={set('purchaseDate')} />
          </Field>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
