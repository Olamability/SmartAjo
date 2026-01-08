-- ============================================================================
-- SECURED-AJO DATABASE SCHEMA
-- ============================================================================
-- This schema defines the complete database structure for the Secured-Ajo
-- platform - an automated escrow-based rotating savings and credit association
-- (ROSCA) system built with Supabase.
--
-- ARCHITECTURE:
-- - Supabase Auth for authentication (users.id syncs with auth.users)
-- - PostgreSQL for all data storage  
-- - Row Level Security (RLS) for data protection
-- - Triggers for automation
-- - Functions for business logic
--
-- CORE CONCEPTS:
-- - Groups: Savings circles where members contribute regularly
-- - Contributions: Regular payments from members
-- - Payouts: Rotational disbursements to members
-- - Security Deposits: Required upfront payment for group participation
-- - Penalties: Fees for late or missed contributions
-- - Transactions: Complete financial audit trail
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLE: users
-- ============================================================================
-- Extends Supabase Auth with application-specific user data
-- Syncs with auth.users table (id is the same)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  
  -- Verification & Status
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- KYC (Know Your Customer)
  kyc_status VARCHAR(50) DEFAULT 'not_started' CHECK (kyc_status IN ('not_started', 'pending', 'approved', 'rejected')),
  kyc_data JSONB DEFAULT '{}'::jsonb,
  
  -- Profile
  avatar_url TEXT,
  date_of_birth DATE,
  address TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Indexes for users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_kyc_status ON users(kyc_status);
CREATE INDEX idx_users_is_active ON users(is_active);

-- ============================================================================
-- TABLE: email_verification_tokens
-- ============================================================================
-- Stores OTP tokens for email verification
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for email_verification_tokens
CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_email_verification_tokens_token ON email_verification_tokens(token) WHERE NOT used;
CREATE INDEX idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);

-- ============================================================================
-- TABLE: groups
-- ============================================================================
-- Represents savings groups (ROSCA circles)
-- Each group has a fixed number of members, contribution amount, and frequency
-- ============================================================================

CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Group Configuration
  contribution_amount DECIMAL(15, 2) NOT NULL CHECK (contribution_amount > 0),
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  total_members INTEGER NOT NULL CHECK (total_members >= 2 AND total_members <= 50),
  current_members INTEGER DEFAULT 1 CHECK (current_members >= 0 AND current_members <= total_members),
  
  -- Security & Fees
  security_deposit_amount DECIMAL(15, 2) NOT NULL CHECK (security_deposit_amount >= 0),
  security_deposit_percentage INTEGER NOT NULL DEFAULT 20 CHECK (security_deposit_percentage >= 0 AND security_deposit_percentage <= 100),
  service_fee_percentage INTEGER NOT NULL DEFAULT 10 CHECK (service_fee_percentage >= 0 AND service_fee_percentage <= 50),
  
  -- Lifecycle
  status VARCHAR(20) DEFAULT 'forming' CHECK (status IN ('forming', 'active', 'paused', 'completed', 'cancelled')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  
  -- Cycle Management
  current_cycle INTEGER DEFAULT 1 CHECK (current_cycle >= 1),
  total_cycles INTEGER NOT NULL CHECK (total_cycles >= 1),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for groups table
CREATE INDEX idx_groups_created_by ON groups(created_by);
CREATE INDEX idx_groups_status ON groups(status);
CREATE INDEX idx_groups_start_date ON groups(start_date);
CREATE INDEX idx_groups_current_cycle ON groups(current_cycle);
CREATE INDEX idx_groups_forming ON groups(status) WHERE status = 'forming';

-- ============================================================================
-- TABLE: group_members
-- ============================================================================
-- Junction table for users and groups with additional member data
-- Position determines payout order (1st position gets paid first, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Position & Deposit
  position INTEGER NOT NULL CHECK (position >= 1),
  has_paid_security_deposit BOOLEAN DEFAULT FALSE,
  security_deposit_amount DECIMAL(15, 2) DEFAULT 0,
  security_deposit_paid_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'removed')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Member Role (creator vs regular member)
  is_creator BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(group_id, user_id),
  UNIQUE(group_id, position)
);

-- Indexes for group_members table
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_members_position ON group_members(group_id, position);
CREATE INDEX idx_group_members_status ON group_members(status);

-- ============================================================================
-- TABLE: contributions
-- ============================================================================
-- Tracks individual member contributions for each cycle
-- Status progression: pending → paid or overdue
-- ============================================================================

CREATE TABLE IF NOT EXISTS contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Contribution Details
  cycle_number INTEGER NOT NULL CHECK (cycle_number >= 1),
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  service_fee DECIMAL(15, 2) DEFAULT 0,
  
  -- Timing
  due_date TIMESTAMPTZ NOT NULL,
  paid_date TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'waived')),
  
  -- Transaction Reference (links to transactions table)
  transaction_ref VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints: One contribution per user per cycle in a group
  UNIQUE(group_id, user_id, cycle_number)
);

-- Indexes for contributions table
CREATE INDEX idx_contributions_group_id ON contributions(group_id);
CREATE INDEX idx_contributions_user_id ON contributions(user_id);
CREATE INDEX idx_contributions_cycle_number ON contributions(group_id, cycle_number);
CREATE INDEX idx_contributions_status ON contributions(status);
CREATE INDEX idx_contributions_due_date ON contributions(due_date);
CREATE INDEX idx_contributions_pending ON contributions(group_id, cycle_number, status) WHERE status = 'pending';
CREATE INDEX idx_contributions_overdue ON contributions(status, due_date) WHERE status = 'pending' AND due_date < NOW();

-- ============================================================================
-- TABLE: payouts
-- ============================================================================
-- Records payouts to group members (one per cycle per group)
-- The recipient is determined by position order
-- ============================================================================

CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  related_group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Payout Details
  cycle_number INTEGER NOT NULL CHECK (cycle_number >= 1),
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payout_date TIMESTAMPTZ,
  
  -- Payment Details
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  
  -- Metadata
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints: One payout per cycle per group
  UNIQUE(related_group_id, cycle_number)
);

-- Indexes for payouts table
CREATE INDEX idx_payouts_related_group_id ON payouts(related_group_id);
CREATE INDEX idx_payouts_recipient_id ON payouts(recipient_id);
CREATE INDEX idx_payouts_cycle_number ON payouts(related_group_id, cycle_number);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_payouts_payout_date ON payouts(payout_date);

-- ============================================================================
-- TABLE: penalties
-- ============================================================================
-- Tracks penalties applied to members for late/missed contributions
-- Penalties are calculated based on group rules
-- ============================================================================

CREATE TABLE IF NOT EXISTS penalties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  contribution_id UUID REFERENCES contributions(id) ON DELETE SET NULL,
  
  -- Penalty Details
  amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),
  type VARCHAR(50) NOT NULL CHECK (type IN ('late_payment', 'missed_payment', 'early_exit')),
  reason TEXT NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'applied' CHECK (status IN ('applied', 'paid', 'waived')),
  paid_date TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for penalties table
CREATE INDEX idx_penalties_user_id ON penalties(user_id);
CREATE INDEX idx_penalties_group_id ON penalties(group_id);
CREATE INDEX idx_penalties_contribution_id ON penalties(contribution_id);
CREATE INDEX idx_penalties_status ON penalties(status);
CREATE INDEX idx_penalties_type ON penalties(type);

-- ============================================================================
-- TABLE: transactions
-- ============================================================================
-- Complete audit trail of all financial transactions
-- Includes contributions, payouts, penalties, refunds, etc.
-- ============================================================================

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  
  -- Transaction Details
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'contribution',
    'security_deposit',
    'payout',
    'penalty',
    'refund',
    'service_fee'
  )),
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  
  -- Status & Payment
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  payment_method VARCHAR(50) DEFAULT 'paystack',
  reference VARCHAR(255) UNIQUE NOT NULL,
  
  -- External Payment Gateway Info
  gateway_response JSONB,
  
  -- Description & Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for transactions table
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_group_id ON transactions(group_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_reference ON transactions(reference);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- ============================================================================
-- TABLE: notifications
-- ============================================================================
-- User notifications for various events (contributions due, payouts, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Notification Content
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'contribution_due',
    'contribution_reminder',
    'contribution_paid',
    'payout_received',
    'penalty_applied',
    'group_activated',
    'group_completed',
    'member_joined',
    'security_deposit_required',
    'general'
  )),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Related Resources
  related_group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  related_transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications table
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_related_group_id ON notifications(related_group_id);

-- ============================================================================
-- TABLE: audit_logs
-- ============================================================================
-- System audit trail for security and compliance
-- Records all important user actions
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Action Details
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  
  -- Request Information
  ip_address INET,
  user_agent TEXT,
  
  -- Change Details
  details JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit_logs table
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================================
-- TRIGGERS: Update timestamps automatically
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TRIGGER: Auto-create user profile on auth signup
-- ============================================================================
-- Automatically creates a user record in public.users when a user signs up
-- This ensures data consistency between auth.users and public.users
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    phone,
    full_name,
    is_verified,
    is_active,
    kyc_status
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    FALSE,
    TRUE,
    'not_started'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

COMMENT ON FUNCTION handle_new_user() IS 
  'Automatically creates a user profile in public.users when a user signs up in auth.users';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 
  'Triggers automatic user profile creation on signup';

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_members_updated_at BEFORE UPDATE ON group_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contributions_updated_at BEFORE UPDATE ON contributions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_penalties_updated_at BEFORE UPDATE ON penalties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TRIGGER: Sync group current_members count
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE groups 
    SET current_members = current_members + 1,
        updated_at = NOW()
    WHERE id = NEW.group_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE groups 
    SET current_members = GREATEST(0, current_members - 1),
        updated_at = NOW()
    WHERE id = OLD.group_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_group_member_count_trigger
AFTER INSERT OR DELETE ON group_members
FOR EACH ROW EXECUTE FUNCTION sync_group_member_count();

-- ============================================================================
-- TRIGGER: Auto-create group membership for creator
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_add_group_creator()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically add the creator as the first member with position 1
  INSERT INTO group_members (
    group_id,
    user_id,
    position,
    has_paid_security_deposit,
    security_deposit_amount,
    status,
    is_creator
  ) VALUES (
    NEW.id,
    NEW.created_by,
    1,
    FALSE,
    NEW.security_deposit_amount,
    'active',
    TRUE
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_add_group_creator_trigger
AFTER INSERT ON groups
FOR EACH ROW EXECUTE FUNCTION auto_add_group_creator();

-- ============================================================================
-- FUNCTION: Get user statistics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE (
  total_groups INTEGER,
  active_groups INTEGER,
  completed_groups INTEGER,
  total_contributions DECIMAL,
  total_payouts DECIMAL,
  pending_contributions INTEGER,
  overdue_contributions INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT gm.group_id)::INTEGER AS total_groups,
    COUNT(DISTINCT CASE WHEN g.status = 'active' THEN g.id END)::INTEGER AS active_groups,
    COUNT(DISTINCT CASE WHEN g.status = 'completed' THEN g.id END)::INTEGER AS completed_groups,
    COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END), 0) AS total_contributions,
    COALESCE(SUM(p.amount), 0) AS total_payouts,
    COUNT(CASE WHEN c.status = 'pending' AND c.due_date >= NOW() THEN 1 END)::INTEGER AS pending_contributions,
    COUNT(CASE WHEN c.status = 'pending' AND c.due_date < NOW() THEN 1 END)::INTEGER AS overdue_contributions
  FROM users u
  LEFT JOIN group_members gm ON u.id = gm.user_id
  LEFT JOIN groups g ON gm.group_id = g.id
  LEFT JOIN contributions c ON u.id = c.user_id
  LEFT JOIN payouts p ON u.id = p.recipient_id AND p.status = 'completed'
  WHERE u.id = p_user_id
  GROUP BY u.id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Get group progress
-- ============================================================================

CREATE OR REPLACE FUNCTION get_group_progress(p_group_id UUID)
RETURNS TABLE (
  cycle_number INTEGER,
  total_members INTEGER,
  paid_count INTEGER,
  pending_count INTEGER,
  total_amount DECIMAL,
  collected_amount DECIMAL,
  progress_percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.current_cycle,
    g.total_members,
    COUNT(CASE WHEN c.status = 'paid' THEN 1 END)::INTEGER AS paid_count,
    COUNT(CASE WHEN c.status = 'pending' THEN 1 END)::INTEGER AS pending_count,
    (g.contribution_amount * g.total_members) AS total_amount,
    COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END), 0) AS collected_amount,
    ROUND(
      (COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END), 0) / 
       NULLIF(g.contribution_amount * g.total_members, 0) * 100),
      2
    ) AS progress_percentage
  FROM groups g
  LEFT JOIN contributions c ON g.id = c.group_id AND c.cycle_number = g.current_cycle
  WHERE g.id = p_group_id
  GROUP BY g.id, g.current_cycle, g.total_members, g.contribution_amount;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Enable RLS on all tables and define policies for data access control
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: users
-- ============================================================================

-- Users can view their own profile
CREATE POLICY users_select_own ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile during signup
CREATE POLICY users_insert_own ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Service role can do anything
CREATE POLICY users_service_role_all ON users
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- RLS POLICIES: email_verification_tokens
-- ============================================================================

-- Users can view their own tokens
CREATE POLICY email_verification_tokens_select_own ON email_verification_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do anything
CREATE POLICY email_verification_tokens_service_role_all ON email_verification_tokens
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- RLS POLICIES: groups
-- ============================================================================

-- Anyone can view active/forming groups (for browsing)
CREATE POLICY groups_select_public ON groups
  FOR SELECT
  USING (status IN ('forming', 'active'));

-- Users can create groups
CREATE POLICY groups_insert_authenticated ON groups
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Group creators can update their groups
CREATE POLICY groups_update_creator ON groups
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Service role can do anything
CREATE POLICY groups_service_role_all ON groups
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- RLS POLICIES: group_members
-- ============================================================================

-- Users can view members of groups they're in
CREATE POLICY group_members_select_own_groups ON group_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = group_members.group_id 
        AND gm.user_id = auth.uid()
    )
  );

-- Users can join groups (insert their own membership)
CREATE POLICY group_members_insert_own ON group_members
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can do anything
CREATE POLICY group_members_service_role_all ON group_members
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- RLS POLICIES: contributions
-- ============================================================================

-- Users can view contributions for groups they're in
CREATE POLICY contributions_select_own_groups ON contributions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = contributions.group_id 
        AND gm.user_id = auth.uid()
    )
  );

-- Service role can do anything
CREATE POLICY contributions_service_role_all ON contributions
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- RLS POLICIES: payouts
-- ============================================================================

-- Users can view payouts for groups they're in
CREATE POLICY payouts_select_own_groups ON payouts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = payouts.related_group_id 
        AND gm.user_id = auth.uid()
    )
  );

-- Service role can do anything
CREATE POLICY payouts_service_role_all ON payouts
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- RLS POLICIES: penalties
-- ============================================================================

-- Users can view their own penalties
CREATE POLICY penalties_select_own ON penalties
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do anything
CREATE POLICY penalties_service_role_all ON penalties
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- RLS POLICIES: transactions
-- ============================================================================

-- Users can view their own transactions
CREATE POLICY transactions_select_own ON transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do anything
CREATE POLICY transactions_service_role_all ON transactions
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- RLS POLICIES: notifications
-- ============================================================================

-- Users can view their own notifications
CREATE POLICY notifications_select_own ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can do anything
CREATE POLICY notifications_service_role_all ON notifications
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- RLS POLICIES: audit_logs
-- ============================================================================

-- Only service role can access audit logs
CREATE POLICY audit_logs_service_role_all ON audit_logs
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
-- 
-- SETUP INSTRUCTIONS:
-- 1. Create a Supabase project at https://supabase.com
-- 2. Go to SQL Editor in your Supabase dashboard
-- 3. Create a new query and paste this entire schema
-- 4. Run the query to create all tables, indexes, triggers, and policies
-- 5. Verify tables were created in the Table Editor
-- 6. Update your .env.local file with Supabase credentials:
--    - NEXT_PUBLIC_SUPABASE_URL (from Settings > API)
--    - NEXT_PUBLIC_SUPABASE_ANON_KEY (from Settings > API)
--    - SUPABASE_SERVICE_ROLE_KEY (from Settings > API)
--    - DATABASE_URL (from Settings > Database > Connection String)
-- 7. Run the application: npm run dev
--
-- NOTES:
-- - This schema uses Supabase Auth (auth.users table must exist)
-- - RLS policies protect data based on authentication
-- - Triggers maintain data consistency automatically
-- - Functions provide analytics and statistics
-- - All timestamps use UTC timezone
-- - Decimal(15,2) is used for currency (supports up to 9,999,999,999,999.99)
-- - The service role bypasses RLS - use it only on the server side
-- - Never expose SUPABASE_SERVICE_ROLE_KEY to the client
--
-- VERIFICATION:
-- After running this schema, verify with these queries:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
--
-- ============================================================================
