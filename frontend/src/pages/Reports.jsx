import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download } from 'lucide-react';
import client from '@/api/client';
import { parseApiDate } from '@/lib/time';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const TREND_DAYS = 14;
const FORECAST_DAYS = 30;
const PALETTE = ['#ef4444', '#f59e0b', '#0ea5e9', '#8b5cf6', '#10b981', '#ec4899'];
const EXPORTS = [
  { key: 'assets', label: 'Equipment', path: '/reporting/assets/export-csv' },
  { key: 'maintenance', label: 'Maintenance', path: '/reporting/maintenance/export-csv' },
  { key: 'alerts', label: 'Alerts', path: '/reporting/alerts/export-csv' },
];
const tooltipStyle = {
  background: 'var(--popover)',
  color: 'var(--popover-foreground)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
};

function categoryColor(name) {
  const s = String(name).toLowerCase();
  if (s.includes('excellent') || s.includes('good') || s.includes('healthy')) return '#10b981';
  if (s.includes('fair') || s.includes('warn')) return '#f59e0b';
  if (s.includes('poor')) return '#f97316';
  if (s.includes('crit')) return '#ef4444';
  return '#94a3b8';
}

function priorityStyle(priority) {
  const p = String(priority).toLowerCase();
  if (p === 'urgent' || p === 'high') return 'bg-red-500/10 text-red-600 border-red-500/30';
  if (p === 'medium') return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
  return 'bg-sky-500/10 text-sky-600 border-sky-500/30';
}

function Stat({ title, value }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const [scorecard, setScorecard] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [trend, setTrend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [s, f, t] = await Promise.all([
          client.get('/reporting/health-scorecard'),
          client.get('/reporting/maintenance-forecast', { params: { days_ahead: FORECAST_DAYS } }),
          client.get('/analytics/alerts/trend', { params: { days: TREND_DAYS } }),
        ]);
        setScorecard(s.data);
        setForecast(f.data);
        setTrend(t.data);
      } catch {
        setError('Failed to load reports.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const exportCsv = async ({ key, path }) => {
    setExporting(key);
    setError('');
    try {
      const res = await client.get(path);
      const url = URL.createObjectURL(new Blob([res.data.data], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${key}-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Export failed. Try again.');
    } finally {
      setExporting('');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const distribution = scorecard ? Object.entries(scorecard.health_distribution).map(([name, value]) => ({ name, value })) : [];
  const alertTypes = trend?.alert_types || [];
  const trendData = (trend?.daily_breakdown || []).map((d) => ({ date: d.date.slice(5), ...d.by_type }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Fleet health, upcoming maintenance and alert activity.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXPORTS.map((e) => (
            <Button key={e.key} variant="outline" size="sm" disabled={exporting === e.key} onClick={() => exportCsv(e)}>
              <Download /> {exporting === e.key ? 'Exporting…' : `${e.label} CSV`}
            </Button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {scorecard && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat title="Equipment" value={scorecard.total_assets} />
            <Stat title="Need attention" value={scorecard.summary.assets_requiring_attention} />
            <Stat title="Critical" value={scorecard.summary.critical_assets} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Health distribution</CardTitle>
                <CardDescription>Equipment by health category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={distribution}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" width={30} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--muted)' }} />
                    <Bar dataKey="value" name="Equipment" radius={[4, 4, 0, 0]}>
                      {distribution.map((d) => <Cell key={d.name} fill={categoryColor(d.name)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Alerts, last {TREND_DAYS} days</CardTitle>
                <CardDescription>Daily alert count by type</CardDescription>
              </CardHeader>
              <CardContent>
                {trendData.length === 0 ? (
                  <p className="py-16 text-center text-sm text-muted-foreground">No alerts in this period.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={trendData}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" width={30} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--muted)' }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {alertTypes.map((t, i) => (
                        <Bar key={t} dataKey={t} stackId="a" fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Health scorecard</CardTitle>
              <CardDescription>Lowest scores first</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Equipment</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead className="pr-6">Open alerts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scorecard.assets.map((a) => (
                    <TableRow key={a.asset_id}>
                      <TableCell className="pl-6 font-medium">
                        <Link to={`/assets/${a.asset_id}`} className="hover:underline">{a.name}</Link>
                      </TableCell>
                      <TableCell className="tabular-nums">{Math.round(a.health_score)}%</TableCell>
                      <TableCell>
                        <Badge variant="outline" style={{ borderColor: categoryColor(a.category), color: categoryColor(a.category) }}>
                          {a.category}
                        </Badge>
                      </TableCell>
                      <TableCell>{a.risk_level}</TableCell>
                      <TableCell className="pr-6">{a.active_alerts}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {forecast && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Maintenance forecast</CardTitle>
            <CardDescription>
              Equipment likely to need work in the next {forecast.forecast_horizon_days} days ({forecast.total_recommendations})
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {forecast.recommendations.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nothing is forecast to need maintenance in this period.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Equipment</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Failure probability</TableHead>
                    <TableHead className="pr-6">Suggested date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecast.recommendations.map((r) => (
                    <TableRow key={r.asset_id}>
                      <TableCell className="pl-6">
                        <Link to={`/assets/${r.asset_id}`} className="font-medium hover:underline">{r.asset_name}</Link>
                        <div className="text-xs text-muted-foreground">{r.asset_type}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize ${priorityStyle(r.priority)}`}>{String(r.priority).toLowerCase()}</Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">{Math.round(r.failure_probability * 100)}%</TableCell>
                      <TableCell className="pr-6">{parseApiDate(r.estimated_maintenance_date).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
