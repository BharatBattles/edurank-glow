import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useStudyReminders, formatDaysOfWeek, formatTime, StudyReminder } from '@/hooks/useStudyReminders';
import { Bell, Plus, Trash2, Loader2, Clock, BellOff } from 'lucide-react';

const DAYS_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

export const StudyRemindersCard = () => {
  const { reminders, loading, createReminder, deleteReminder, toggleReminder } = useStudyReminders();
  const [open, setOpen] = useState(false);
  const [newTime, setNewTime] = useState('18:00');
  const [newDays, setNewDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [newMessage, setNewMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    setSaving(true);
    const success = await createReminder(newTime, newDays, newMessage || undefined);
    setSaving(false);
    if (success) {
      setOpen(false);
      setNewTime('18:00');
      setNewDays([1, 2, 3, 4, 5]);
      setNewMessage('');
    }
  };

  const toggleDay = (day: number) => {
    setNewDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  if (loading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Study Reminders
          </CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Study Reminder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={newTime}
                    onChange={e => setNewTime(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Days</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OPTIONS.map(day => (
                      <label
                        key={day.value}
                        className={`flex items-center justify-center w-10 h-10 rounded-full cursor-pointer transition-colors ${
                          newDays.includes(day.value)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={newDays.includes(day.value)}
                          onChange={() => toggleDay(day.value)}
                        />
                        <span className="text-xs font-medium">{day.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Custom Message (optional)</Label>
                  <Input
                    placeholder="Time to study! Keep your streak going."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleCreate}
                  disabled={saving || newDays.length === 0}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Bell className="h-4 w-4 mr-2" />
                  )}
                  Create Reminder
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {reminders.length === 0 ? (
          <div className="text-center py-4">
            <BellOff className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No reminders set</p>
            <p className="text-xs text-muted-foreground">Add a reminder to stay on track</p>
          </div>
        ) : (
          reminders.map(reminder => (
            <ReminderItem
              key={reminder.id}
              reminder={reminder}
              onToggle={() => toggleReminder(reminder.id)}
              onDelete={() => deleteReminder(reminder.id)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
};

interface ReminderItemProps {
  reminder: StudyReminder;
  onToggle: () => void;
  onDelete: () => void;
}

const ReminderItem = ({ reminder, onToggle, onDelete }: ReminderItemProps) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  };

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
        reminder.is_enabled
          ? 'bg-muted/30 border-border/50'
          : 'bg-muted/10 border-border/30 opacity-60'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${reminder.is_enabled ? 'bg-primary/10' : 'bg-muted/30'}`}>
          <Clock className={`h-4 w-4 ${reminder.is_enabled ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <div>
          <p className="font-medium text-sm text-foreground">
            {formatTime(reminder.reminder_time)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDaysOfWeek(reminder.days_of_week)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={reminder.is_enabled}
          onCheckedChange={onToggle}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};
