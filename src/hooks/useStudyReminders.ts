import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface StudyReminder {
  id: string;
  user_id: string;
  reminder_time: string;
  days_of_week: number[];
  is_enabled: boolean;
  message: string;
  created_at: string;
  updated_at: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const useStudyReminders = () => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<StudyReminder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReminders = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('study_reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('reminder_time');

      if (error) throw error;
      setReminders(data || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createReminder = async (
    reminderTime: string,
    daysOfWeek: number[],
    message?: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('study_reminders')
        .insert({
          user_id: user.id,
          reminder_time: reminderTime,
          days_of_week: daysOfWeek,
          message: message || 'Time to study! Keep your streak going.',
        })
        .select()
        .single();

      if (error) throw error;

      setReminders(prev => [...prev, data as StudyReminder]);
      toast.success('Reminder created!');
      
      // Request notification permission
      requestNotificationPermission();
      
      return true;
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast.error('Failed to create reminder');
      return false;
    }
  };

  const updateReminder = async (
    id: string,
    updates: Partial<Pick<StudyReminder, 'reminder_time' | 'days_of_week' | 'is_enabled' | 'message'>>
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('study_reminders')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setReminders(prev =>
        prev.map(r => (r.id === id ? { ...r, ...updates } : r))
      );
      toast.success('Reminder updated!');
      return true;
    } catch (error) {
      console.error('Error updating reminder:', error);
      toast.error('Failed to update reminder');
      return false;
    }
  };

  const deleteReminder = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('study_reminders')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setReminders(prev => prev.filter(r => r.id !== id));
      toast.success('Reminder deleted');
      return true;
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast.error('Failed to delete reminder');
      return false;
    }
  };

  const toggleReminder = async (id: string): Promise<boolean> => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return false;

    return updateReminder(id, { is_enabled: !reminder.is_enabled });
  };

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  // Check for active reminders and show notifications
  useEffect(() => {
    if (reminders.length === 0) return;

    const checkReminders = () => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const currentDay = now.getDay();

      reminders.forEach(reminder => {
        if (!reminder.is_enabled) return;
        if (!reminder.days_of_week.includes(currentDay)) return;
        
        // Check if time matches (within the same minute)
        if (reminder.reminder_time.startsWith(currentTime)) {
          showNotification(reminder.message);
        }
      });
    };

    const interval = setInterval(checkReminders, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [reminders]);

  return {
    reminders,
    loading,
    createReminder,
    updateReminder,
    deleteReminder,
    toggleReminder,
    refetch: fetchReminders,
  };
};

const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return;
  
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
};

const showNotification = (message: string) => {
  if (!('Notification' in window)) {
    toast.info(message);
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification('EduRank Study Reminder', {
      body: message,
      icon: '/favicon.ico',
    });
  } else {
    toast.info(message);
  }
};

export const formatDaysOfWeek = (days: number[]): string => {
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
  return days.map(d => DAYS[d]).join(', ');
};

export const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};
