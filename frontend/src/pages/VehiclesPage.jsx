import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import VehicleFormDialog from '@/components/VehicleFormDialog';
import ConfirmDialog from '@/components/ConfirmDialog';

const STATUS_BADGE = {
  available: { label: 'Available', variant: 'success' },
  in_use: { label: 'In use', variant: 'default' },
  maintenance: { label: 'Maintenance', variant: 'warning' },
  retired: { label: 'Retired', variant: 'muted' },
};

function formatDate(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : '—';
}

export default function VehiclesPage() {
  const { isAdmin } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/vehicles${q ? `?search=${encodeURIComponent(q)}` : ''}`);
      setVehicles(data.vehicles);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  const handleSubmit = async (payload) => {
    if (editing) {
      await apiFetch(`/api/vehicles/${editing.id}`, { method: 'PATCH', body: payload });
    } else {
      await apiFetch('/api/vehicles', { method: 'POST', body: payload });
    }
    await load(search);
  };

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await apiFetch(`/api/vehicles/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      await load(search);
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Vehicles</h1>
          <p className="text-sm text-muted-foreground">{vehicles.length} vehicles</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Add vehicle
        </Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search plate, brand, model…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plate</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mileage</TableHead>
              <TableHead>Purchase date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : vehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No vehicles found
                </TableCell>
              </TableRow>
            ) : (
              vehicles.map((v) => {
                const badge = STATUS_BADGE[v.status] ?? { label: v.status, variant: 'muted' };
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.plateNo}</TableCell>
                    <TableCell>{v.brand}</TableCell>
                    <TableCell>{v.model}</TableCell>
                    <TableCell>{v.year}</TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell>{v.mileage.toLocaleString()}</TableCell>
                    <TableCell>{formatDate(v.purchaseDate)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit"
                          onClick={() => {
                            setEditing(v);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete"
                            onClick={() => setDeleting(v)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <VehicleFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        vehicle={editing}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Delete vehicle"
        description={deleting ? `Delete ${deleting.plateNo}? This action cannot be undone.` : ''}
        loading={deleteLoading}
      />
    </div>
  );
}
