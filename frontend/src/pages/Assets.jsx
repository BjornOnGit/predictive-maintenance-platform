import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Plus, Search } from 'lucide-react';
import client from '@/api/client';
import { parseApiDate } from '@/lib/time';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const RISK_COLORS = { Low: '#10b981', Medium: '#f59e0b', High: '#ef4444' };
const EMPTY_FORM = { name: '', type: '', facility: '', manufacturer: '', install_date: '' };

function statusStyle(status) {
  const s = String(status).toLowerCase();
  if (s.includes('crit')) return 'bg-red-500/10 text-red-600 border-red-500/30';
  if (s.includes('warn') || s.includes('maint')) return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
  return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
}

function Field({ id, label, ...props }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...props} />
    </div>
  );
}

export default function Assets() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    try {
      const [a, p] = await Promise.all([
        client.get('/assets'),
        client.get('/predictions/all').catch(() => ({ data: [] })),
      ]);
      setAssets(a.data);
      setPredictions(Object.fromEntries(p.data.map((x) => [x.asset_id, x])));
      setError('');
    } catch {
      setError('Failed to load equipment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((a) => [a.name, a.type, a.facility].some((v) => v?.toLowerCase().includes(q)));
  }, [assets, query]);

  const setField = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await client.post('/assets', {
        name: form.name,
        type: form.type,
        facility: form.facility,
        manufacturer: form.manufacturer || null,
        install_date: form.install_date ? `${form.install_date}T00:00:00` : null,
      });
      setOpen(false);
      setForm(EMPTY_FORM);
      fetchData();
    } catch (err) {
      setFormError(
        err.response?.status === 403
          ? 'Only engineers and admins can add equipment.'
          : 'Could not save equipment. Check the fields and try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Equipment</h1>
          <p className="text-sm text-muted-foreground">Monitored assets and their current health.</p>
        </div>

        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setFormError(''); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus /> Add equipment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Add equipment</DialogTitle>
                <DialogDescription>Register a new asset to start monitoring it.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Field id="name" label="Name" value={form.name} onChange={setField('name')} required />
                <Field id="type" label="Type" placeholder="Pump, Motor…" value={form.type} onChange={setField('type')} required />
                <Field id="facility" label="Facility" value={form.facility} onChange={setField('facility')} required />
                <Field id="manufacturer" label="Manufacturer (optional)" value={form.manufacturer} onChange={setField('manufacturer')} />
                <Field id="install_date" label="Install date (optional)" type="date" value={form.install_date} onChange={setField('install_date')} />
                {formError && <p className="text-sm text-destructive">{formError}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search name, type or facility…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <Card className="overflow-hidden py-0">
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {assets.length === 0 ? 'No equipment yet. Add your first asset to get started.' : 'No equipment matches your search.'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((asset) => {
                const p = predictions[asset.id];
                const health = p ? Math.round(p.health_score) : null;
                return (
                  <TableRow key={asset.id} className="cursor-pointer" onClick={() => navigate(`/assets/${asset.id}`)}>
                    <TableCell>
                      <div className="font-medium">{asset.name}</div>
                      {asset.manufacturer && <div className="text-xs text-muted-foreground">{asset.manufacturer}</div>}
                    </TableCell>
                    <TableCell>{asset.type}</TableCell>
                    <TableCell>{asset.facility}</TableCell>
                    <TableCell>
                      {health === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-muted">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${health}%`, background: RISK_COLORS[p.risk_level] || '#94a3b8' }}
                            />
                          </div>
                          <span className="text-xs tabular-nums">{health}%</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize ${statusStyle(asset.status)}`}>{asset.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{parseApiDate(asset.created_at).toLocaleDateString()}</TableCell>
                    <TableCell><ChevronRight className="size-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
