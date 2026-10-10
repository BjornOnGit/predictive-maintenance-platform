import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, CircleCheck, RefreshCw, TriangleAlert } from 'lucide-react';
import client from '@/api/client';
import { severityStyle, timeAgo } from '@/lib/time';
import AlertDetailSheet from '@/components/AlertDetailSheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [names, setNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [ackingId, setAckingId] = useState(null);

  const fetchAlerts = async () => {
    setRefreshing(true);
    try {
      const res = await client.get('/alerts');
      setAlerts(res.data);
      setError('');
      setLastRefresh(new Date());
    } catch {
      setError('Failed to load alerts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    client.get('/assets').then((r) => setNames(Object.fromEntries(r.data.map((a) => [a.id, a.name])))).catch(() => {});
    const timer = setInterval(fetchAlerts, 30000);
    return () => clearInterval(timer);
  }, []);

  const severities = useMemo(() => ['all', ...new Set(alerts.map((a) => String(a.severity).toLowerCase()))], [alerts]);
  const visible = filter === 'all' ? alerts : alerts.filter((a) => String(a.severity).toLowerCase() === filter);

  const acknowledge = async (alert) => {
    setAckingId(alert.id);
    setError('');
    try {
      await client.patch(`/alerts/${alert.id}/acknowledge`);
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    } catch (err) {
      setError(
        err.response?.status === 403
          ? 'Only engineers and admins can acknowledge alerts.'
          : 'Could not acknowledge the alert. Try again.'
      );
    } finally {
      setAckingId(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
          <p className="text-sm text-muted-foreground">
            {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()} · refreshes every 30s` : 'Loading…'}
          </p>
        </div>
        <Button variant="outline" onClick={fetchAlerts} disabled={refreshing}>
          <RefreshCw className={refreshing ? 'animate-spin' : ''} /> Refresh
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {severities.length > 2 && (
        <div className="flex flex-wrap gap-2">
          {severities.map((s) => (
            <Button key={s} size="sm" variant={filter === s ? 'default' : 'outline'} className="capitalize" onClick={() => setFilter(s)}>
              {s}
            </Button>
          ))}
        </div>
      )}

      <Card>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
              <CircleCheck className="size-8 text-emerald-500" />
              No open alerts. All systems operating normally.
            </div>
          ) : (
            <ul className="divide-y">
              {visible.map((alert) => (
                <li key={alert.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelected(alert)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-3 text-left transition-colors hover:bg-muted/60"
                  >
                    <TriangleAlert className={`size-4 shrink-0 ${severityStyle(alert.severity).split(' ')[1]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium capitalize">{alert.type}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {names[alert.asset_id] || 'Unknown'} · {alert.message}
                      </p>
                    </div>
                    <Badge variant="outline" className={`capitalize ${severityStyle(alert.severity)}`}>{alert.severity}</Badge>
                    <span className="hidden w-16 text-right text-xs text-muted-foreground sm:block">{timeAgo(alert.created_at)}</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </button>
                  <Button size="sm" variant="outline" disabled={ackingId === alert.id} onClick={() => acknowledge(alert)}>
                    <Check /> <span className="hidden sm:inline">{ackingId === alert.id ? 'Working…' : 'Acknowledge'}</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AlertDetailSheet
        alert={selected}
        assetName={selected ? names[selected.asset_id] : ''}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        onAcknowledged={(id) => setAlerts((prev) => prev.filter((a) => a.id !== id))}
      />
    </div>
  );
}
