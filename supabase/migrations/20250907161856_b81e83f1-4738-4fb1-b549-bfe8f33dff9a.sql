-- Create notifications table for managing user notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expiry', 'warranty', 'reminder', 'info')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" 
ON public.notifications 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create notification settings table
CREATE TABLE public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  expiry_reminder_days INTEGER NOT NULL DEFAULT 7,
  warranty_reminder_days INTEGER NOT NULL DEFAULT 30,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  push_notifications BOOLEAN NOT NULL DEFAULT true,
  daily_digest BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for notification settings
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for notification settings
CREATE POLICY "Users can view their own notification settings" 
ON public.notification_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings" 
ON public.notification_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings" 
ON public.notification_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create trigger for notification settings updated_at
CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate notifications for expiring products
CREATE OR REPLACE FUNCTION public.generate_product_notifications()
RETURNS void AS $$
DECLARE
    product_record RECORD;
    user_settings RECORD;
    notification_date DATE;
BEGIN
    -- Loop through all products with expiry dates
    FOR product_record IN 
        SELECT p.*, u.email 
        FROM products p 
        JOIN auth.users u ON p.user_id = u.id
        WHERE p.expiry_date IS NOT NULL 
        AND p.is_consumed = false
    LOOP
        -- Get user notification settings
        SELECT * INTO user_settings 
        FROM notification_settings 
        WHERE user_id = product_record.user_id;
        
        -- Use default settings if none exist
        IF user_settings IS NULL THEN
            user_settings.expiry_reminder_days := 7;
        END IF;
        
        -- Calculate notification date
        notification_date := product_record.expiry_date::DATE - INTERVAL '1 day' * user_settings.expiry_reminder_days;
        
        -- Create notification if it's time and doesn't already exist
        IF notification_date = CURRENT_DATE THEN
            INSERT INTO notifications (user_id, product_id, title, message, type, scheduled_for)
            SELECT 
                product_record.user_id,
                product_record.id,
                'Product Expiring Soon',
                product_record.name || ' expires in ' || user_settings.expiry_reminder_days || ' days',
                'expiry',
                now()
            WHERE NOT EXISTS (
                SELECT 1 FROM notifications 
                WHERE product_id = product_record.id 
                AND type = 'expiry' 
                AND scheduled_for::DATE = notification_date
            );
        END IF;
    END LOOP;
    
    -- Similar logic for warranty notifications
    FOR product_record IN 
        SELECT p.*, u.email 
        FROM products p 
        JOIN auth.users u ON p.user_id = u.id
        WHERE p.warranty_date IS NOT NULL
    LOOP
        SELECT * INTO user_settings 
        FROM notification_settings 
        WHERE user_id = product_record.user_id;
        
        IF user_settings IS NULL THEN
            user_settings.warranty_reminder_days := 30;
        END IF;
        
        notification_date := product_record.warranty_date::DATE - INTERVAL '1 day' * user_settings.warranty_reminder_days;
        
        IF notification_date = CURRENT_DATE THEN
            INSERT INTO notifications (user_id, product_id, title, message, type, scheduled_for)
            SELECT 
                product_record.user_id,
                product_record.id,
                'Warranty Expiring Soon',
                product_record.name || ' warranty expires in ' || user_settings.warranty_reminder_days || ' days',
                'warranty',
                now()
            WHERE NOT EXISTS (
                SELECT 1 FROM notifications 
                WHERE product_id = product_record.id 
                AND type = 'warranty' 
                AND scheduled_for::DATE = notification_date
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;