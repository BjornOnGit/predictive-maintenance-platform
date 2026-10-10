import { useState } from 'react';
import { Button } from '@/components/ui/button';
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

// Generic "fill a few fields and submit" modal. fields: [{ key, label, type: 'text' | 'number', required }]
// onSubmit receives a payload with empty fields dropped and number fields converted.
export default function RecordDialog({ title, description, triggerLabel, icon: Icon, fields, onSubmit, variant = 'default' }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {};
    for (const f of fields) {
      const v = values[f.key];
      if (v === undefined || v === '') continue;
      payload[f.key] = f.type === 'number' ? Number(v) : v;
    }
    try {
      await onSubmit(payload);
      setOpen(false);
      setValues({});
    } catch (err) {
      setError(
        err.response?.status === 403
          ? 'Only engineers and admins can do this.'
          : 'Could not save. Check the values and try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(''); }}>
      <DialogTrigger asChild>
        <Button variant={variant}>
          {Icon && <Icon />} {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {fields.map((f) => (
              <div key={f.key} className="grid gap-2">
                <Label htmlFor={`f-${f.key}`}>{f.label}</Label>
                <Input
                  id={`f-${f.key}`}
                  type={f.type === 'number' ? 'number' : 'text'}
                  step={f.type === 'number' ? 'any' : undefined}
                  required={f.required}
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
              </div>
            ))}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
