-- Fix security warning by setting search_path for the function
CREATE OR REPLACE FUNCTION public.create_default_notification_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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