import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Bell, ChevronRight, CircleCheck, Cog, HeartPulse, TriangleAlert } from 'lucide-react';
import client from '@/api/client';
import { severityStyle, timeAgo } from '@/lib/time';
import AlertDetailSheet from '@/components/AlertDetailSheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const RISK_COLORS = { Low: '#10b981', Medium: '#f59e0b', High: '#ef4444' };
const tooltipStyle = {
  background: 'var(--popover)',
  color: 'var(--popover-foreground)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
};

function StatCard({ title, value, hint, icon: Icon, tone }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className={`rounded-lg p-2.5 ${tone}`}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [assets, setAssets] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [a, al, p] = await Promise.all([
          client.get('/assets'),
          client.get('/alerts'),
          client.get('/predictions/all').catch(() => ({ data: [] })),
        ]);
        setAssets(a.data);
        setAlerts(al.data);
        setPredictions(p.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const assetName = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a.name])), [assets]);

  const avgHealth = predictions.length
    ? Math.round(predictions.reduce((s, p) => s + (p.health_score || 0), 0) / predictions.length)
    : null;

  const healthData = useMemo(
    () =>
      predictions
        .map((p) => ({
          name: assetName[p.asset_id] || 'Unknown',
          health: Math.round(p.health_score || 0),
          risk: p.risk_level,
        }))
        .sort((x, y) => x.health - y.health)
        .slice(0, 8),
    [predictions, assetName]
  );

  const riskData = ['Low', 'Medium', 'High']
    .map((name) => ({ name, value: predictions.filter((p) => p.risk_level === name).length }))
    .filter((d) => d.value > 0);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const criticalCount = assets.filter((a) => a.status === 'critical').length;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Fleet health and open alerts at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total equipment" value={assets.length} hint="Monitored assets" icon={Cog} tone="bg-sky-500/10 text-sky-600" />
        <StatCard title="Critical" value={criticalCount} hint="Need attention" icon={TriangleAlert} tone="bg-red-500/10 text-red-600" />
        <StatCard title="Open alerts" value={alerts.length} hint="Unacknowledged" icon={Bell} tone="bg-amber-500/10 text-amber-600" />
        <StatCard title="Avg. health" value={avgHealth === null ? '—' : `${avgHealth}%`} hint="Across predictions" icon={HeartPulse} tone="bg-emerald-500/10 text-emerald-600" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lowest health scores</CardTitle>
            <CardDescription>The 8 equipment items most in need of attention</CardDescription>
          </CardHeader>
          <CardContent>
            {healthData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No predictions yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={healthData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--muted)' }} formatter={(v) => [`${v}%`, 'Health']} />
                  <Bar dataKey="health" radius={[0, 4, 4, 0]}>
                    {healthData.map((d, i) => <Cell key={i} fill={RISK_COLORS[d.risk] || '#94a3b8'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk distribution</CardTitle>
            <CardDescription>Equipment by predicted risk</CardDescription>
          </CardHeader>
          <CardContent>
            {riskData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No predictions yet.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={riskData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} strokeWidth={0}>
                      {riskData.map((d) => <Cell key={d.name} fill={RISK_COLORS[d.name]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 flex justify-center gap-4 text-sm">
                  {riskData.map((d) => (
                    <span key={d.name} className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full" style={{ background: RISK_COLORS[d.name] }} />
                      {d.name} <span className="text-muted-foreground">{d.value}</span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent alerts</CardTitle>
              <CardDescription>Select an alert for details</CardDescription>
            </div>
            <Link to="/alerts" className="text-sm text-primary hover:underline">View all</Link>
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
              <CircleCheck className="size-8 text-emerald-500" />
              No open alerts. All systems operating normally.
            </div>
          ) : (
            <ul className="divide-y">
              {alerts.slice(0, 5).map((alert) => (
                <li key={alert.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(alert)}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-3 text-left transition-colors hover:bg-muted/60"
                  >
                    <TriangleAlert className={`size-4 shrink-0 ${severityStyle(alert.severity).split(' ')[1]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium capitalize">{alert.type}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {assetName[alert.asset_id] || 'Unknown'} · {alert.message}
                      </p>
                    </div>
                    <Badge variant="outline" className={`capitalize ${severityStyle(alert.severity)}`}>{alert.severity}</Badge>
                    <span className="hidden w-16 text-right text-xs text-muted-foreground sm:block">{timeAgo(alert.created_at)}</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AlertDetailSheet
        alert={selected}
        assetName={selected ? assetName[selected.asset_id] : ''}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        onAcknowledged={(id) => setAlerts((prev) => prev.filter((a) => a.id !== id))}
      />
    </div>
  );
}
