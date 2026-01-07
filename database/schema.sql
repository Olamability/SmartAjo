-- Ajo Secure Database Schema
-- PostgreSQL 14+
-- This schema defines the complete database structure for the Ajo Secure platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
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
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ============================================
-- EMAIL VERIFICATION TOKENS TABLE
-- ============================================
CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_email_verification_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_email_verification_token ON email_verification_tokens(token);

-- ============================================
-- REFRESH TOKENS TABLE
-- ============================================
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    replaced_by_token TEXT
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- ============================================
-- GROUPS TABLE
-- ============================================
CREATE TABLE groups (
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
CREATE INDEX idx_groups_status ON groups(status);
CREATE INDEX idx_groups_created_by ON groups(created_by);
CREATE INDEX idx_groups_start_date ON groups(start_date);
CREATE INDEX idx_groups_created_at ON groups(created_at);

-- ============================================
-- GROUP MEMBERS TABLE
-- ============================================
CREATE TABLE group_members (
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
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_members_status ON group_members(status);

-- ============================================
-- CONTRIBUTIONS TABLE
-- ============================================
CREATE TABLE contributions (
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
    payment_reference VARCHAR(100) UNIQUE, -- For payment gateway reference
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (group_id, user_id, cycle_number)
);

-- Indexes for contributions table
CREATE INDEX idx_contributions_group_id ON contributions(group_id);
CREATE INDEX idx_contributions_user_id ON contributions(user_id);
CREATE INDEX idx_contributions_status ON contributions(status);
CREATE INDEX idx_contributions_cycle_number ON contributions(cycle_number);
CREATE INDEX idx_contributions_due_date ON contributions(due_date);

-- ============================================
-- PAYOUTS TABLE
-- ============================================
CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cycle_number INT NOT NULL CHECK (cycle_number > 0),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    processed_date TIMESTAMP WITH TIME ZONE,
    transaction_ref VARCHAR(100) UNIQUE,
    payment_reference VARCHAR(100) UNIQUE, -- For payment gateway reference
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (group_id, cycle_number)
);

-- Indexes for payouts table
CREATE INDEX idx_payouts_group_id ON payouts(group_id);
CREATE INDEX idx_payouts_user_id ON payouts(user_id);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_payouts_cycle_number ON payouts(cycle_number);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('contribution', 'payout', 'security_deposit', 'penalty', 'refund')),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    reference VARCHAR(100) NOT NULL UNIQUE,
    payment_method VARCHAR(50), -- e.g., 'paystack', 'flutterwave', 'bank_transfer'
    payment_reference VARCHAR(100), -- External payment gateway reference
    metadata JSONB, -- Additional payment/transaction metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for transactions table
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_group_id ON transactions(group_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_reference ON transactions(reference);

-- ============================================
-- PENALTIES TABLE
-- ============================================
CREATE TABLE penalties (
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
CREATE INDEX idx_penalties_group_id ON penalties(group_id);
CREATE INDEX idx_penalties_user_id ON penalties(user_id);
CREATE INDEX idx_penalties_contribution_id ON penalties(contribution_id);
CREATE INDEX idx_penalties_status ON penalties(status);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('payment_due', 'payment_received', 'payout_ready', 'penalty_applied', 'group_complete', 'group_update', 'kyc_update')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    metadata JSONB, -- Additional notification data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for notifications table
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_type ON notifications(type);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE audit_logs (
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
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- KYC DOCUMENTS TABLE
-- ============================================
CREATE TABLE kyc_documents (
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
CREATE INDEX idx_kyc_documents_user_id ON kyc_documents(user_id);
CREATE INDEX idx_kyc_documents_status ON kyc_documents(verification_status);

-- ============================================
-- PAYMENT WEBHOOKS TABLE (for tracking payment gateway webhooks)
-- ============================================
CREATE TABLE payment_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) NOT NULL, -- 'paystack', 'flutterwave', etc.
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    reference VARCHAR(100),
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for payment_webhooks table
CREATE INDEX idx_payment_webhooks_provider ON payment_webhooks(provider);
CREATE INDEX idx_payment_webhooks_reference ON payment_webhooks(reference);
CREATE INDEX idx_payment_webhooks_processed ON payment_webhooks(processed);
CREATE INDEX idx_payment_webhooks_created_at ON payment_webhooks(created_at);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contributions_updated_at BEFORE UPDATE ON contributions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON payouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kyc_documents_updated_at BEFORE UPDATE ON kyc_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE TRIGGER update_group_member_count_trigger
AFTER INSERT OR DELETE ON group_members
FOR EACH ROW EXECUTE FUNCTION update_group_member_count();

-- ============================================
-- VIEWS FOR COMMON QUERIES
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
-- INITIAL DATA / SEED
-- ============================================

-- Create system admin user (change password in production!)
-- Password: 'Admin123!' (hashed)
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
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE users IS 'Stores user account information and authentication details';
COMMENT ON TABLE groups IS 'Stores savings group information and configuration';
COMMENT ON TABLE group_members IS 'Tracks user membership and participation in groups';
COMMENT ON TABLE contributions IS 'Records all contributions made by group members';
COMMENT ON TABLE payouts IS 'Tracks payout distributions to group members';
COMMENT ON TABLE transactions IS 'Comprehensive transaction log for all financial activities';
COMMENT ON TABLE penalties IS 'Records penalties applied to members for late/missed payments';
COMMENT ON TABLE notifications IS 'User notifications for important events';
COMMENT ON TABLE audit_logs IS 'Audit trail for security and compliance';
COMMENT ON TABLE kyc_documents IS 'KYC verification documents and status';
COMMENT ON TABLE payment_webhooks IS 'Payment gateway webhook tracking and processing';
