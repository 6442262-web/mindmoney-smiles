-- Add missing columns to notification_settings table
ALTER TABLE public.notification_settings 
ADD COLUMN IF NOT EXISTS enable_notifications boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_on_income boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_on_expense boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS summary_frequency text DEFAULT 'weekly' CHECK (summary_frequency IN ('daily', 'weekly', 'monthly')),
ADD COLUMN IF NOT EXISTS bill_due_reminder time DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS notification_channel text DEFAULT 'in-app' CHECK (notification_channel IN ('in-app', 'email', 'sms', 'all'));

-- Create a function to create default notification settings for new users
CREATE OR REPLACE FUNCTION public.create_default_notification_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.notification_settings (
    user_id,
    enable_notifications,
    notify_on_income,
    notify_on_expense,
    summary_frequency,
    budget_alerts,
    low_balance_alerts,
    transaction_reminders,
    recurring_reminders,
    notification_channel,
    enable_push,
    enable_email,
    daily_reminder_time,
    bill_due_reminder,
    low_balance_threshold
  ) VALUES (
    NEW.id,
    true,
    true,
    true,
    'weekly',
    true,
    true,
    true,
    true,
    'in-app',
    true,
    false,
    '19:00:00',
    '09:00:00',
    1000
  );
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create notification settings for new users
DROP TRIGGER IF EXISTS on_auth_user_created_notification_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_notification_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_notification_settings();