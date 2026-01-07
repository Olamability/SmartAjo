-- ============================================
-- SUPABASE STORAGE CONFIGURATION
-- ============================================
-- Storage buckets and policies for Secured Ajo
-- Run this after the main schema deployment
-- ============================================

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create profile images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'profile-images',
    'profile-images',
    false,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create KYC documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'kyc-documents',
    'kyc-documents',
    false,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Profile Images Policies
-- Users can upload their own profile images
CREATE POLICY "Users can upload their own profile image"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'profile-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own profile images
CREATE POLICY "Users can view their own profile image"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'profile-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own profile images
CREATE POLICY "Users can update their own profile image"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'profile-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own profile images
CREATE POLICY "Users can delete their own profile image"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'profile-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- KYC Documents Policies
-- Users can upload their own KYC documents
CREATE POLICY "Users can upload their own KYC documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'kyc-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own KYC documents
CREATE POLICY "Users can view their own KYC documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'kyc-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own KYC documents
CREATE POLICY "Users can delete their own KYC documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'kyc-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- STORAGE HELPER FUNCTIONS
-- ============================================

-- Function to get user's profile image URL
CREATE OR REPLACE FUNCTION get_profile_image_url(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    image_path TEXT;
BEGIN
    SELECT profile_image INTO image_path
    FROM users
    WHERE id = user_id;
    
    IF image_path IS NOT NULL THEN
        RETURN image_path;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old verification tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    -- Delete expired email verification tokens older than 24 hours
    DELETE FROM email_verification_tokens
    WHERE expires_at < NOW() - INTERVAL '24 hours';
    
    -- Delete expired refresh tokens
    DELETE FROM refresh_tokens
    WHERE expires_at < NOW() AND revoked_at IS NULL;
    
    -- Delete revoked refresh tokens older than 30 days
    DELETE FROM refresh_tokens
    WHERE revoked_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SCHEDULED TASKS (via pg_cron or Supabase Edge Functions)
-- ============================================

-- Note: These tasks should be configured in Supabase Dashboard
-- or via Edge Functions/External Cron Services

-- Task 1: Cleanup expired tokens (Daily at 2 AM)
-- SELECT cron.schedule('cleanup-expired-tokens', '0 2 * * *', 'SELECT cleanup_expired_tokens()');

-- Task 2: Process pending webhooks (Every 5 minutes)
-- SELECT cron.schedule('process-webhooks', '*/5 * * * *', 'SELECT process_pending_webhooks()');

-- Task 3: Send payment reminders (Daily at 9 AM)
-- SELECT cron.schedule('payment-reminders', '0 9 * * *', 'SELECT send_payment_reminders()');

-- ============================================
-- REALTIME SUBSCRIPTIONS (Supabase Realtime)
-- ============================================

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Enable realtime for group_members table (for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;

-- Enable realtime for contributions table (for live payment tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE contributions;

-- Enable realtime for transactions table (for live transaction history)
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

-- ============================================
-- WEBHOOK CONFIGURATION
-- ============================================

-- Function to handle Paystack webhooks
CREATE OR REPLACE FUNCTION handle_paystack_webhook()
RETURNS TRIGGER AS $$
BEGIN
    -- This function will be called via Supabase Edge Function
    -- It processes incoming webhook payloads
    
    -- Log the webhook
    INSERT INTO payment_webhooks (
        provider,
        event_type,
        payload,
        reference,
        processed
    ) VALUES (
        'paystack',
        NEW.event_type,
        NEW.payload,
        NEW.reference,
        false
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STORAGE COMPLETE
-- ============================================
