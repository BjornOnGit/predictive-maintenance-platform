import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, ArrowLeft, ChevronRight, Gauge, HeartPulse, RefreshCw, TriangleAlert, Wrench } from 'lucide-react';
import client from '@/api/client';
import { parseApiDate, severityStyle, timeAgo } from '@/lib/time';
import AlertDetailSheet from '@/components/AlertDetailSheet';
import RecordDialog from '@/components/RecordDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const RISK_COLORS = { Low: '#10b981', Medium: '#f59e0b', High: '#ef4444' };
const METRICS = [
  { key: 'vibration', label: 'Vibration', color: '#8b5cf6' },
  { key: 'temperature', label: 'Temperature', color: '#ef4444' },
  { key: 'pressure', label: 'Pressure', color: '#0ea5e9' },
  { key: 'rpm', label: 'RPM', color: '#10b981' },
];
const SENSOR_FIELDS = [
  { key: 'vibration', label: 'Vibration', type: 'number' },
  { key: 'temperature', label: 'Temperature', type: 'number' },
  { key: 'pressure', label: 'Pressure', type: 'number' },
  { key: 'runtime_hours', label: 'Runtime hours', type: 'number' },
  { key: 'rpm', label: 'RPM', type: 'number' },
];
const MAINTENANCE_FIELDS = [
  { key: 'action', label: 'Action performed', type: 'text', required: true },
  { key: 'technician', label: 'Technician', type: 'text' },
  { key: 'cost', label: 'Cost', type: 'number' },
  { key: 'downtime', label: 'Downtime (hours)', type: 'number' },
];
const tooltipStyle = {
  background: 'var(--popover)',
  color: 'var(--popover-foreground)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
};

function Stat({ title, value, icon: Icon, tone, color }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight" style={color ? { color } : undefined}>{value}</p>
        </div>
        <div className={`rounded-lg p-2.5 ${tone}`}><Icon className="size-5" /></div>
      </CardContent>
    </Card>
  );
}

export default function AssetDetails() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [readings, setReadings] = useState([]);
  const [logs, setLogs] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [metric, setMetric] = useState('vibration');
  const [recalculating, setRecalculating] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    try {
      const [a, p, s, m, r, al] = await Promise.all([
        client.get(`/assets/${assetId}`),
        client.get(`/predictions/${assetId}`).catch(() => null),
        client.get(`/sensors/history/${assetId}`).catch(() => ({ data: [] })),
        client.get(`/maintenance/log/${assetId}`).catch(() => ({ data: [] })),
        client.get(`/maintenance/recommendation/${assetId}`).catch(() => null),
        client.get('/alerts', { params: { asset_id: assetId } }).catch(() => ({ data: [] })),
      ]);
      setAsset(a.data);
      setPrediction(p?.data || null);
      setReadings(
        s.data.slice().reverse().map((r) => ({
          ...r,
          time: parseApiDate(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }))
      );
      setLogs(m.data);
      setRecommendation(r?.data || null);
      setAlerts(al.data);
      setError('');
    } catch {
      setError('Failed to load this equipment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [assetId]);

  const recalculate = async () => {
    setRecalculating(true);
    setNotice('');
    try {
      const res = await client.post(`/predictions/${assetId}/recalculate`);
      setPrediction(res.data);
    } catch (err) {
      setNotice(err.response?.status === 403 ? 'Only engineers and admins can recalculate.' : 'Recalculation failed.');
    } finally {
      setRecalculating(false);
    }
  };

  const submitSensor = async (payload) => {
    await client.post('/sensors/data', { asset_id: assetId, ...payload });
    setNotice('Reading saved. The prediction updates in a few seconds.');
    load();
    setTimeout(load, 5000);
  };

  const submitMaintenance = async (payload) => {
    await client.post('/maintenance/log', { asset_id: assetId, ...payload });
    load();
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="space-y-4 p-6">
        <Button variant="outline" onClick={() => navigate('/assets')}><ArrowLeft /> Back to equipment</Button>
        <p className="text-sm text-destructive">{error || 'Equipment not found.'}</p>
      </div>
    );
  }

  const active = METRICS.find((m) => m.key === metric);
  const risk = prediction?.risk_level;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate('/assets')}>
            <ArrowLeft /> Equipment
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{asset.name}</h1>
          <p className="text-sm text-muted-foreground">
            {[asset.type, asset.facility, asset.manufacturer].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={recalculate} disabled={recalculating}>
            <RefreshCw className={recalculating ? 'animate-spin' : ''} /> Recalculate
          </Button>
          <RecordDialog
            variant="outline"
            title="Log sensor reading"
            description="Send a manual reading. Leave out any sensor you don't have."
            triggerLabel="Log reading"
            icon={Gauge}
            fields={SENSOR_FIELDS}
            onSubmit={submitSensor}
          />
          <RecordDialog
            title="Log maintenance"
            description="Record work performed on this equipment."
            triggerLabel="Log maintenance"
            icon={Wrench}
            fields={MAINTENANCE_FIELDS}
            onSubmit={submitMaintenance}
          />
        </div>
      </div>

      {notice && <p className="text-sm text-muted-foreground">{notice}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Health score" value={prediction ? `${Math.round(prediction.health_score)}%` : '—'} icon={HeartPulse} tone="bg-emerald-500/10 text-emerald-600" />
        <Stat title="Failure probability" value={prediction ? `${Math.round(prediction.failure_probability * 100)}%` : '—'} icon={Activity} tone="bg-sky-500/10 text-sky-600" />
        <Stat title="Risk level" value={risk || '—'} icon={TriangleAlert} tone="bg-amber-500/10 text-amber-600" color={RISK_COLORS[risk]} />
        <Stat title="Maintenance priority" value={recommendation ? recommendation.priority : '—'} icon={Wrench} tone="bg-violet-500/10 text-violet-600" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sensor history</CardTitle>
            <CardDescription>Most recent readings, oldest to newest</CardDescription>
            <div className="flex flex-wrap gap-2 pt-2">
              {METRICS.map((m) => (
                <Button key={m.key} size="sm" variant={metric === m.key ? 'default' : 'outline'} onClick={() => setMetric(m.key)}>
                  {m.label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {readings.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No readings yet. Use “Log reading” to add one.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={readings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" width={40} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey={active.key} name={active.label} stroke={active.color} strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>Suggested next steps</CardDescription>
          </CardHeader>
          <CardContent>
            {!recommendation || recommendation.recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recommendations right now.</p>
            ) : (
              <>
                <Badge variant="outline" className={`mb-3 capitalize ${severityStyle(recommendation.priority)}`}>
                  {recommendation.priority} priority
                </Badge>
                <ul className="list-disc space-y-2 pl-5 text-sm">
                  {recommendation.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Open alerts</CardTitle>
            <CardDescription>Select an alert for details</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {alerts.map((alert) => (
                <li key={alert.id}>
                  <button type="button" onClick={() => setSelected(alert)} className="flex w-full items-center gap-3 rounded-md px-2 py-3 text-left transition-colors hover:bg-muted/60">
                    <TriangleAlert className={`size-4 shrink-0 ${severityStyle(alert.severity).split(' ')[1]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium capitalize">{alert.type}</p>
                      <p className="truncate text-xs text-muted-foreground">{alert.message}</p>
                    </div>
                    <Badge variant="outline" className={`capitalize ${severityStyle(alert.severity)}`}>{alert.severity}</Badge>
                    <span className="hidden text-xs text-muted-foreground sm:block">{timeAgo(alert.created_at)}</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Maintenance history</CardTitle>
          <CardDescription>{logs.length} {logs.length === 1 ? 'entry' : 'entries'}</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {logs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No maintenance recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Date</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead className="pr-6">Downtime</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="pl-6">{parseApiDate(log.date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell>{log.technician || '—'}</TableCell>
                    <TableCell>{log.cost ?? '—'}</TableCell>
                    <TableCell className="pr-6">{log.downtime != null ? `${log.downtime}h` : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDetailSheet
        alert={selected}
        assetName={asset.name}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        onAcknowledged={(id) => setAlerts((prev) => prev.filter((a) => a.id !== id))}
      />
    </div>
  );
}
