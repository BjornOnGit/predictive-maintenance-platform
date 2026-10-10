import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '@/api/client';
import { parseApiDate, severityStyle, timeAgo } from '@/lib/time';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

export default function AlertDetailSheet({ alert, assetName, open, onOpenChange, onAcknowledged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setError(''), [alert?.id]);

  if (!alert) return null;

  const acknowledge = async () => {
    setBusy(true);
    setError('');
    try {
      await client.patch(`/alerts/${alert.id}/acknowledge`);
      onAcknowledged(alert.id);
      onOpenChange(false);
    } catch (err) {
      setError(
        err.response?.status === 403
          ? 'Only engineers and admins can acknowledge alerts.'
          : 'Could not acknowledge this alert. Try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="capitalize">{alert.type}</SheetTitle>
          <SheetDescription>{alert.message}</SheetDescription>
        </SheetHeader>

        <div className="px-4 text-sm">
          <Row label="Severity">
            <Badge variant="outline" className={`capitalize ${severityStyle(alert.severity)}`}>
              {alert.severity}
            </Badge>
          </Row>
          <Row label="Equipment">{assetName || 'Unknown'}</Row>
          <Row label="Raised">
            {parseApiDate(alert.created_at).toLocaleString()} ({timeAgo(alert.created_at)})
          </Row>
          <Row label="Status">{alert.acknowledged ? 'Acknowledged' : 'Open'}</Row>
          {error && <p className="pt-3 text-sm text-destructive">{error}</p>}
        </div>

        <SheetFooter>
          <Button variant="outline" asChild>
            <Link to={`/assets/${alert.asset_id}`}>View equipment</Link>
          </Button>
          {!alert.acknowledged && (
            <Button onClick={acknowledge} disabled={busy}>
              {busy ? 'Acknowledging…' : 'Acknowledge'}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
