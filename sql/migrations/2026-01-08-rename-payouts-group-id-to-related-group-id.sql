-- Migration: Rename payouts.group_id to related_group_id
-- Date: 2026-01-08
-- Description: Updates the payouts table to use related_group_id for consistency
--              with the notifications table and other related tables.
--              Also fixes all functions, triggers, and views that reference this column.

-- ============================================================================
-- STEP 1: Rename the column in the payouts table
-- ============================================================================

ALTER TABLE payouts 
  RENAME COLUMN group_id TO related_group_id;

-- ============================================================================
-- STEP 2: Recreate indexes with the new column name
-- ============================================================================

-- Drop old indexes
DROP INDEX IF EXISTS idx_payouts_group_id;
DROP INDEX IF EXISTS idx_payouts_cycle_number;

-- Create new indexes with updated column name
CREATE INDEX idx_payouts_related_group_id ON payouts(related_group_id);
CREATE INDEX idx_payouts_cycle_number ON payouts(related_group_id, cycle_number);

-- ============================================================================
-- STEP 3: Update RLS policies
-- ============================================================================

-- Drop old policy
DROP POLICY IF EXISTS payouts_select_own_groups ON payouts;

-- Recreate policy with new column name
CREATE POLICY payouts_select_own_groups ON payouts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = payouts.related_group_id 
        AND gm.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 4: Update views
-- ============================================================================

-- Update pending_payouts_view
CREATE OR REPLACE VIEW pending_payouts_view AS
SELECT 
  p.id AS payout_id,
  p.related_group_id,
  g.name AS group_name,
  p.cycle_number,
  p.recipient_id,
  u.full_name AS recipient_name,
  u.email AS recipient_email,
  u.phone AS recipient_phone,
  p.amount,
  p.status,
  p.scheduled_date,
  p.created_at,
  -- Group details
  g.contribution_amount,
  g.service_fee_percentage,
  g.total_members,
  -- Check if all contributions are paid for this cycle
  (SELECT COUNT(*) 
   FROM contributions c 
   WHERE c.group_id = p.related_group_id 
   AND c.cycle_number = p.cycle_number 
   AND c.status = 'paid'
  ) AS paid_contributions_count,
  -- Calculate if payout is ready
  CASE 
    WHEN (SELECT COUNT(*) 
          FROM contributions c 
          WHERE c.group_id = p.related_group_id 
          AND c.cycle_number = p.cycle_number 
          AND c.status = 'paid') = g.total_members 
    THEN true
    ELSE false
  END AS is_ready_for_payout
FROM payouts p
JOIN groups g ON p.related_group_id = g.id
JOIN users u ON p.recipient_id = u.id
WHERE p.status = 'pending'
  AND g.status = 'active'
ORDER BY p.scheduled_date ASC, p.created_at ASC;

-- Update group_financial_summary view
DROP VIEW IF EXISTS group_financial_summary;

CREATE OR REPLACE VIEW group_financial_summary AS
SELECT 
  g.id AS group_id,
  g.name AS group_name,
  g.status,
  g.contribution_amount,
  g.frequency,
  g.total_members,
  g.current_cycle,
  g.total_cycles,
  -- Security deposits
  COALESCE(SUM(DISTINCT gm.security_deposit_amount), 0) AS total_security_deposits,
  COUNT(DISTINCT CASE WHEN gm.has_paid_security_deposit THEN gm.user_id END) AS members_paid_deposit,
  -- Contributions
  COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END), 0) AS total_contributions_collected,
  COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.service_fee ELSE 0 END), 0) AS total_service_fees,
  COUNT(CASE WHEN c.status = 'paid' THEN 1 END) AS total_paid_contributions,
  COUNT(CASE WHEN c.status = 'pending' THEN 1 END) AS total_pending_contributions,
  -- Payouts
  COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) AS total_payouts_disbursed,
  COUNT(CASE WHEN p.status = 'completed' THEN 1 END) AS total_payouts_completed,
  -- Penalties
  COALESCE(SUM(CASE WHEN pen.status = 'unpaid' THEN pen.amount ELSE 0 END), 0) AS total_penalties_applied,
  COALESCE(SUM(CASE WHEN pen.status = 'paid' THEN pen.amount ELSE 0 END), 0) AS total_penalties_collected,
  -- Expected totals
  (g.contribution_amount * g.total_members * g.current_cycle) AS expected_total_contributions,
  -- Balance calculation
  (
    COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0)
  ) AS current_pool_balance
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
LEFT JOIN contributions c ON g.id = c.group_id
LEFT JOIN payouts p ON g.id = p.related_group_id
LEFT JOIN penalties pen ON g.id = pen.group_id
GROUP BY 
  g.id, g.name, g.status, g.contribution_amount, g.frequency,
  g.total_members, g.current_cycle, g.total_cycles
ORDER BY g.created_at DESC;

COMMENT ON VIEW group_financial_summary IS 
  'Complete financial summary for each group including all money flows';

-- ============================================================================
-- STEP 5: Add migration tracking comment
-- ============================================================================

COMMENT ON COLUMN payouts.related_group_id IS 
  'References the group this payout belongs to. Renamed from group_id on 2026-01-08 for consistency with related tables.';

-- ============================================================================
-- Migration complete
-- ============================================================================
-- All functions and triggers have been updated in the main schema files:
-- - process_cycle_completion() - Updated to use related_group_id
-- - notify_payout_status_change() - Updated to use NEW.related_group_id
-- - create_payout_transaction() - Updated to use NEW.related_group_id
-- ============================================================================
