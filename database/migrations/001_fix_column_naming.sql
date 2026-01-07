-- Database Schema Migration: Fix Column Name Inconsistencies
-- This migration aligns the database schema with the application code

-- ============================================
-- MIGRATION: Fix Column Name Inconsistencies
-- ============================================

BEGIN;

-- 1. Fix group_members table: security_deposit_paid -> has_paid_security_deposit
ALTER TABLE group_members 
RENAME COLUMN security_deposit_paid TO has_paid_security_deposit;

-- 2. Fix group_members table: rotation_position -> position
ALTER TABLE group_members 
RENAME COLUMN rotation_position TO position;

-- Update the check constraint name for position
ALTER TABLE group_members 
DROP CONSTRAINT IF EXISTS group_members_rotation_position_check;

ALTER TABLE group_members 
ADD CONSTRAINT group_members_position_check CHECK (position > 0);

-- Update unique constraint
ALTER TABLE group_members 
DROP CONSTRAINT IF EXISTS group_members_group_id_rotation_position_key;

ALTER TABLE group_members 
ADD CONSTRAINT group_members_group_id_position_key UNIQUE (group_id, position);

-- 3. Fix contributions table: cycle -> cycle_number
ALTER TABLE contributions 
RENAME COLUMN cycle TO cycle_number;

-- Update index
DROP INDEX IF EXISTS idx_contributions_cycle;
CREATE INDEX idx_contributions_cycle_number ON contributions(cycle_number);

-- Update unique constraint on contributions if exists
ALTER TABLE contributions 
DROP CONSTRAINT IF EXISTS contributions_group_id_user_id_cycle_key;

ALTER TABLE contributions 
ADD CONSTRAINT contributions_group_id_user_id_cycle_number_key UNIQUE (group_id, user_id, cycle_number);

-- 4. Fix payouts table: cycle -> cycle_number
ALTER TABLE payouts 
RENAME COLUMN cycle TO cycle_number;

-- Update index
DROP INDEX IF EXISTS idx_payouts_cycle;
CREATE INDEX idx_payouts_cycle_number ON payouts(cycle_number);

-- Update unique constraint
ALTER TABLE payouts 
DROP CONSTRAINT IF EXISTS payouts_group_id_cycle_key;

ALTER TABLE payouts 
ADD CONSTRAINT payouts_group_id_cycle_number_key UNIQUE (group_id, cycle_number);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify the changes
-- \d group_members
-- \d contributions
-- \d payouts
