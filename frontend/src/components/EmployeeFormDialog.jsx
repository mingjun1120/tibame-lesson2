import { useEffect, useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

const EMPTY = {
  name: '',
  email: '',
  role: 'user',
  department: '',
  position: '',
  phone: '',
  hireDate: '',
  status: 'active',
  password: '',
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

export default function EmployeeFormDialog({ open, onClose, onSubmit, employee }) {
  const isEdit = Boolean(employee);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(
      employee
        ? {
            name: employee.name,
            email: employee.email,
            role: employee.role,
            department: employee.department ?? '',
            position: employee.position ?? '',
            phone: employee.phone ?? '',
            hireDate: toDateInput(employee.hireDate),
            status: employee.status,
            password: '',
          }
        : EMPTY,
    );
  }, [open, employee]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        department: form.department.trim() || null,
        position: form.position.trim() || null,
        phone: form.phone.trim() || null,
        hireDate: form.hireDate || null,
        status: form.status,
      };
      if (form.password) payload.password = form.password;
      await onSubmit(payload);
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
        <DialogTitle>{isEdit ? 'Edit employee' : 'Add employee'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input value={form.name} onChange={set('name')} required />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={set('email')} required />
          </Field>
          <Field label="Role">
            <Select value={form.role} onChange={set('role')}>
              <option value="user">User</option>
              <option value="admin">Administrator</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={set('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
          <Field label="Department">
            <Input value={form.department} onChange={set('department')} />
          </Field>
          <Field label="Position">
            <Input value={form.position} onChange={set('position')} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={set('phone')} />
          </Field>
          <Field label="Hire date">
            <Input type="date" value={form.hireDate} onChange={set('hireDate')} />
          </Field>
          <div className="sm:col-span-2">
            <Field label={isEdit ? 'Password (leave blank to keep current)' : 'Password'}>
              <Input
                type="password"
                value={form.password}
                onChange={set('password')}
                required={!isEdit}
                minLength={6}
                placeholder={isEdit ? '••••••' : 'At least 6 characters'}
              />
            </Field>
          </div>
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
