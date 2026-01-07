-- ============================================
-- SECURED AJO - SUPABASE DATABASE SCHEMA
-- ============================================
-- Complete deployment-ready schema for Supabase
-- Version: 1.0.0
-- PostgreSQL: 14+
-- Supabase Compatible
-- ============================================

-- ============================================
-- SECTION 1: EXTENSIONS
-- ============================================
-- Enable required PostgreSQL extensions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";        -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";         -- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";          -- Trigram matching for search
CREATE EXTENSION IF NOT EXISTS "btree_gin";        -- GIN index support

-- ============================================
-- SECTION 2: CORE TABLES
-- ============================================

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    kyc_status VARCHAR(20) DEFAULT 'not_started' CHECK (kyc_status IN ('not_started', 'pending', 'verified', 'rejected')),
    bvn VARCHAR(11),
    profile_image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    phone_verified_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status);

-- ============================================
-- EMAIL VERIFICATION TOKENS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_email_verification_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_expires_at ON email_verification_tokens(expires_at);

-- ============================================
-- REFRESH TOKENS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    replaced_by_token TEXT
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- ============================================
-- GROUPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    contribution_amount DECIMAL(15, 2) NOT NULL CHECK (contribution_amount > 0),
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    total_members INT NOT NULL CHECK (total_members >= 2 AND total_members <= 50),
    current_members INT DEFAULT 0 CHECK (current_members >= 0),
    security_deposit_amount DECIMAL(15, 2) NOT NULL CHECK (security_deposit_amount >= 0),
    security_deposit_percentage INT NOT NULL CHECK (security_deposit_percentage >= 0 AND security_deposit_percentage <= 100),
    status VARCHAR(20) DEFAULT 'forming' CHECK (status IN ('forming', 'active', 'completed', 'cancelled')),
    start_date TIMESTAMP WITH TIME ZONE,
    current_cycle INT DEFAULT 0,
    total_cycles INT NOT NULL,
    service_fee_percentage INT DEFAULT 10 CHECK (service_fee_percentage >= 0 AND service_fee_percentage <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(id)
);

-- Indexes for groups table
CREATE INDEX IF NOT EXISTS idx_groups_status ON groups(status);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_start_date ON groups(start_date);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at);
CREATE INDEX IF NOT EXISTS idx_groups_name_trgm ON groups USING gin(name gin_trgm_ops);

-- ============================================
-- GROUP MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position INT NOT NULL CHECK (position > 0),
    has_paid_security_deposit BOOLEAN DEFAULT FALSE,
    security_deposit_amount DECIMAL(15, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'defaulted', 'removed')),
    total_contributions INT DEFAULT 0,
    total_penalties DECIMAL(15, 2) DEFAULT 0,
    has_received_payout BOOLEAN DEFAULT FALSE,
    payout_date TIMESTAMP WITH TIME ZONE,
    payout_amount DECIMAL(15, 2),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    removed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (group_id, user_id),
    UNIQUE (group_id, position)
);

-- Indexes for group_members table
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_status ON group_members(status);
CREATE INDEX IF NOT EXISTS idx_group_members_position ON group_members(group_id, position);

-- ============================================
-- CONTRIBUTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    cycle_number INT NOT NULL CHECK (cycle_number > 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'late', 'missed')),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    paid_date TIMESTAMP WITH TIME ZONE,
    penalty DECIMAL(15, 2) DEFAULT 0 CHECK (penalty >= 0),
    service_fee DECIMAL(15, 2) NOT NULL CHECK (service_fee >= 0),
    transaction_ref VARCHAR(100) UNIQUE,
    payment_reference VARCHAR(100) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (group_id, user_id, cycle_number)
);

-- Indexes for contributions table
CREATE INDEX IF NOT EXISTS idx_contributions_group_id ON contributions(group_id);
CREATE INDEX IF NOT EXISTS idx_contributions_user_id ON contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_contributions_status ON contributions(status);
CREATE INDEX IF NOT EXISTS idx_contributions_cycle_number ON contributions(cycle_number);
CREATE INDEX IF NOT EXISTS idx_contributions_due_date ON contributions(due_date);
CREATE INDEX IF NOT EXISTS idx_contributions_paid_date ON contributions(paid_date);
CREATE INDEX IF NOT EXISTS idx_contributions_group_cycle_status ON contributions(group_id, cycle_number, status);

-- ============================================
-- PAYOUTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cycle_number INT NOT NULL CHECK (cycle_number > 0),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    processed_date TIMESTAMP WITH TIME ZONE,
    transaction_ref VARCHAR(100) UNIQUE,
    payment_reference VARCHAR(100) UNIQUE,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (group_id, cycle_number)
);

-- Indexes for payouts table
CREATE INDEX IF NOT EXISTS idx_payouts_group_id ON payouts(group_id);
CREATE INDEX IF NOT EXISTS idx_payouts_user_id ON payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_cycle_number ON payouts(cycle_number);
CREATE INDEX IF NOT EXISTS idx_payouts_processed_date ON payouts(processed_date);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('contribution', 'payout', 'security_deposit', 'penalty', 'refund')),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    reference VARCHAR(100) NOT NULL UNIQUE,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for transactions table
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_group_id ON transactions(group_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- ============================================
-- PENALTIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS penalties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contribution_id UUID REFERENCES contributions(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('late_payment', 'missed_payment', 'default')),
    status VARCHAR(20) DEFAULT 'applied' CHECK (status IN ('applied', 'waived')),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    waived_at TIMESTAMP WITH TIME ZONE,
    waived_by UUID REFERENCES users(id),
    waive_reason TEXT
);

-- Indexes for penalties table
CREATE INDEX IF NOT EXISTS idx_penalties_group_id ON penalties(group_id);
CREATE INDEX IF NOT EXISTS idx_penalties_user_id ON penalties(user_id);
CREATE INDEX IF NOT EXISTS idx_penalties_contribution_id ON penalties(contribution_id);
CREATE INDEX IF NOT EXISTS idx_penalties_status ON penalties(status);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('payment_due', 'payment_received', 'payout_ready', 'penalty_applied', 'group_complete', 'group_update', 'kyc_update')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for audit_logs table
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- KYC DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS kyc_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('bvn', 'id_card', 'passport', 'drivers_license', 'utility_bill')),
    document_url TEXT NOT NULL,
    document_number VARCHAR(100),
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for kyc_documents table
CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_status ON kyc_documents(verification_status);

-- ============================================
-- PAYMENT WEBHOOKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    reference VARCHAR(100),
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for payment_webhooks table
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_provider ON payment_webhooks(provider);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_reference ON payment_webhooks(reference);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed ON payment_webhooks(processed);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_created_at ON payment_webhooks(created_at);

-- ============================================
-- SECTION 3: FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update group member count
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE groups 
        SET current_members = current_members + 1 
        WHERE id = NEW.group_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE groups 
        SET current_members = current_members - 1 
        WHERE id = OLD.group_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate total contributions for a group cycle
CREATE OR REPLACE FUNCTION get_cycle_total(p_group_id UUID, p_cycle_number INT)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
    total DECIMAL(15, 2);
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO total
    FROM contributions
    WHERE group_id = p_group_id 
    AND cycle_number = p_cycle_number 
    AND status = 'paid';
    
    RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Function to check if cycle is complete
CREATE OR REPLACE FUNCTION is_cycle_complete(p_group_id UUID, p_cycle_number INT)
RETURNS BOOLEAN AS $$
DECLARE
    expected_count INT;
    paid_count INT;
BEGIN
    SELECT current_members INTO expected_count
    FROM groups
    WHERE id = p_group_id;
    
    SELECT COUNT(*) INTO paid_count
    FROM contributions
    WHERE group_id = p_group_id 
    AND cycle_number = p_cycle_number 
    AND status = 'paid';
    
    RETURN paid_count >= expected_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SECTION 4: TRIGGERS
-- ============================================

-- Apply updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contributions_updated_at ON contributions;
CREATE TRIGGER update_contributions_updated_at BEFORE UPDATE ON contributions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payouts_updated_at ON payouts;
CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON payouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kyc_documents_updated_at ON kyc_documents;
CREATE TRIGGER update_kyc_documents_updated_at BEFORE UPDATE ON kyc_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to maintain group member count
DROP TRIGGER IF EXISTS update_group_member_count_trigger ON group_members;
CREATE TRIGGER update_group_member_count_trigger
AFTER INSERT OR DELETE ON group_members
FOR EACH ROW EXECUTE FUNCTION update_group_member_count();

-- ============================================
-- SECTION 5: VIEWS
-- ============================================

-- View for group statistics
CREATE OR REPLACE VIEW group_statistics AS
SELECT 
    g.id,
    g.name,
    g.status,
    g.current_members,
    g.total_members,
    g.current_cycle,
    g.total_cycles,
    COUNT(DISTINCT c.id) as total_contributions,
    SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END) as total_collected,
    COUNT(DISTINCT CASE WHEN c.status = 'pending' THEN c.id END) as pending_contributions,
    COUNT(DISTINCT p.id) as total_payouts,
    SUM(CASE WHEN p.status = 'processed' THEN p.amount ELSE 0 END) as total_paid_out
FROM groups g
LEFT JOIN contributions c ON g.id = c.group_id
LEFT JOIN payouts p ON g.id = p.group_id
GROUP BY g.id, g.name, g.status, g.current_members, g.total_members, g.current_cycle, g.total_cycles;

-- View for user group participation
CREATE OR REPLACE VIEW user_group_participation AS
SELECT 
    u.id as user_id,
    u.full_name,
    u.email,
    COUNT(DISTINCT gm.group_id) as total_groups,
    COUNT(DISTINCT CASE WHEN g.status = 'active' THEN gm.group_id END) as active_groups,
    COUNT(DISTINCT CASE WHEN g.status = 'completed' THEN gm.group_id END) as completed_groups,
    SUM(CASE WHEN c.status IN ('paid', 'late') THEN c.amount ELSE 0 END) as total_contributed,
    SUM(CASE WHEN gm.has_received_payout THEN gm.payout_amount ELSE 0 END) as total_received,
    SUM(gm.total_penalties) as total_penalties
FROM users u
LEFT JOIN group_members gm ON u.id = gm.user_id
LEFT JOIN groups g ON gm.group_id = g.id
LEFT JOIN contributions c ON gm.user_id = c.user_id AND gm.group_id = c.group_id
GROUP BY u.id, u.full_name, u.email;

-- ============================================
-- SECTION 6: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;

-- Users: Can read and update their own data
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid()::uuid = id);

CREATE POLICY "Users can update their own data" ON users
    FOR UPDATE USING (auth.uid()::uuid = id);

-- Groups: Members can read their groups, creators can manage
CREATE POLICY "Users can view groups they belong to" ON groups
    FOR SELECT USING (
        id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()::uuid)
        OR created_by = auth.uid()::uuid
    );

CREATE POLICY "Group creators can update their groups" ON groups
    FOR UPDATE USING (created_by = auth.uid()::uuid);

CREATE POLICY "Authenticated users can create groups" ON groups
    FOR INSERT WITH CHECK (auth.uid()::uuid = created_by);

-- Group Members: Can view members of their groups
CREATE POLICY "Users can view members of their groups" ON group_members
    FOR SELECT USING (
        group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()::uuid)
    );

-- Contributions: Users can view their own contributions
CREATE POLICY "Users can view their own contributions" ON contributions
    FOR SELECT USING (user_id = auth.uid()::uuid);

-- Payouts: Users can view their own payouts
CREATE POLICY "Users can view their own payouts" ON payouts
    FOR SELECT USING (user_id = auth.uid()::uuid);

-- Transactions: Users can view their own transactions
CREATE POLICY "Users can view their own transactions" ON transactions
    FOR SELECT USING (user_id = auth.uid()::uuid);

-- Penalties: Users can view their own penalties
CREATE POLICY "Users can view their own penalties" ON penalties
    FOR SELECT USING (user_id = auth.uid()::uuid);

-- Notifications: Users can view and update their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid()::uuid);

-- KYC Documents: Users can view their own documents
CREATE POLICY "Users can view their own KYC documents" ON kyc_documents
    FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can insert their own KYC documents" ON kyc_documents
    FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);

-- Audit Logs: Users can view their own audit logs
CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT USING (user_id = auth.uid()::uuid);

-- ============================================
-- SECTION 7: INITIAL SEED DATA
-- ============================================

-- Create system admin user (change password in production!)
INSERT INTO users (email, phone, full_name, password_hash, is_verified, kyc_status, is_active)
VALUES (
    'admin@ajosecure.com',
    '+2348000000000',
    'System Administrator',
    crypt('Admin123!', gen_salt('bf')),
    TRUE,
    'verified',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- ============================================
-- SECTION 8: TABLE COMMENTS (Documentation)
-- ============================================

COMMENT ON TABLE users IS 'Stores user account information and authentication details';
COMMENT ON TABLE email_verification_tokens IS 'Temporary tokens for email verification';
COMMENT ON TABLE refresh_tokens IS 'JWT refresh tokens for session management';
COMMENT ON TABLE groups IS 'Savings group information and configuration';
COMMENT ON TABLE group_members IS 'Tracks user membership and participation in groups';
COMMENT ON TABLE contributions IS 'Records all contributions made by group members';
COMMENT ON TABLE payouts IS 'Tracks payout distributions to group members';
COMMENT ON TABLE transactions IS 'Comprehensive transaction log for all financial activities';
COMMENT ON TABLE penalties IS 'Records penalties applied to members for late/missed payments';
COMMENT ON TABLE notifications IS 'User notifications for important events';
COMMENT ON TABLE audit_logs IS 'Audit trail for security and compliance';
COMMENT ON TABLE kyc_documents IS 'KYC verification documents and status';
COMMENT ON TABLE payment_webhooks IS 'Payment gateway webhook tracking and processing';

COMMENT ON VIEW group_statistics IS 'Aggregated statistics for each group';
COMMENT ON VIEW user_group_participation IS 'User participation metrics across all groups';

-- ============================================
-- SECTION 9: STORAGE BUCKETS (Supabase)
-- ============================================
-- Note: These are created via Supabase Dashboard or Storage API
-- Documented here for reference

-- Profile Images Bucket
-- Bucket Name: profile-images
-- Public: false
-- File Size Limit: 5MB
-- Allowed MIME Types: image/jpeg, image/png, image/webp

-- KYC Documents Bucket
-- Bucket Name: kyc-documents
-- Public: false
-- File Size Limit: 10MB
-- Allowed MIME Types: image/jpeg, image/png, application/pdf

-- ============================================
-- DEPLOYMENT COMPLETE
-- ============================================
-- This schema is now ready for deployment to Supabase
-- Run this entire file in the Supabase SQL Editor
-- ============================================
