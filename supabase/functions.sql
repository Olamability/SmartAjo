-- ============================================================================
-- SECURED-AJO UTILITY FUNCTIONS
-- ============================================================================
-- This file contains utility functions for business logic, calculations,
-- and automation in the Secured-Ajo platform.
--
-- IMPORTANT: Run this file AFTER schema.sql has been executed.
-- ============================================================================

-- ============================================================================
-- FUNCTION: calculate_next_payout_recipient
-- ============================================================================
-- Determines the next user to receive payout in a group based on position
-- Returns the user_id of the next recipient
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_next_payout_recipient(p_group_id UUID)
RETURNS UUID AS $$
DECLARE
  v_next_cycle INTEGER;
  v_recipient_id UUID;
BEGIN
  -- Get the next cycle number (current + 1)
  SELECT current_cycle + 1 INTO v_next_cycle
  FROM groups
  WHERE id = p_group_id;
  
  -- Get the user at the position matching the next cycle
  SELECT user_id INTO v_recipient_id
  FROM group_members
  WHERE group_id = p_group_id
    AND position = v_next_cycle
    AND status = 'active'
  LIMIT 1;
  
  RETURN v_recipient_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_next_payout_recipient IS 
  'Returns the user_id of the next payout recipient based on rotation position';

-- ============================================================================
-- FUNCTION: is_cycle_complete
-- ============================================================================
-- Checks if all contributions for a given cycle have been paid
-- Returns TRUE if cycle is complete, FALSE otherwise
-- ============================================================================

CREATE OR REPLACE FUNCTION is_cycle_complete(p_group_id UUID, p_cycle_number INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_total_members INTEGER;
  v_paid_count INTEGER;
BEGIN
  -- Get total members
  SELECT total_members INTO v_total_members
  FROM groups
  WHERE id = p_group_id;
  
  -- Count paid contributions for this cycle
  SELECT COUNT(*) INTO v_paid_count
  FROM contributions
  WHERE group_id = p_group_id
    AND cycle_number = p_cycle_number
    AND status = 'paid';
  
  -- Return true if all members have paid
  RETURN v_paid_count >= v_total_members;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_cycle_complete IS 
  'Checks if all members have paid their contributions for a given cycle';

-- ============================================================================
-- FUNCTION: calculate_payout_amount
-- ============================================================================
-- Calculates the payout amount after deducting service fees
-- Takes into account the contribution amount and service fee percentage
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_payout_amount(
  p_group_id UUID,
  p_cycle_number INTEGER
)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
  v_contribution_amount DECIMAL(15, 2);
  v_total_members INTEGER;
  v_service_fee_percentage DECIMAL(5, 2);
  v_total_collected DECIMAL(15, 2);
  v_total_fees DECIMAL(15, 2);
  v_payout_amount DECIMAL(15, 2);
BEGIN
  -- Get group details
  SELECT 
    contribution_amount,
    total_members,
    service_fee_percentage
  INTO 
    v_contribution_amount,
    v_total_members,
    v_service_fee_percentage
  FROM groups
  WHERE id = p_group_id;
  
  -- Calculate total collected
  v_total_collected := v_contribution_amount * v_total_members;
  
  -- Calculate total service fees
  v_total_fees := v_total_collected * (v_service_fee_percentage / 100);
  
  -- Calculate payout amount (total - fees)
  v_payout_amount := v_total_collected - v_total_fees;
  
  RETURN v_payout_amount;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_payout_amount IS 
  'Calculates payout amount after deducting service fees';

-- ============================================================================
-- FUNCTION: calculate_late_penalty
-- ============================================================================
-- Calculates penalty amount based on days late and group rules
-- Default: 5% of contribution amount per day late (max 50%)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_late_penalty(
  p_contribution_id UUID,
  p_days_late INTEGER DEFAULT NULL
)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
  v_contribution_amount DECIMAL(15, 2);
  v_days_overdue INTEGER;
  v_penalty_rate DECIMAL(5, 2) := 5.00; -- 5% per day
  v_max_penalty_rate DECIMAL(5, 2) := 50.00; -- Max 50%
  v_penalty_amount DECIMAL(15, 2);
BEGIN
  -- Get contribution details
  SELECT 
    amount,
    COALESCE(p_days_late, EXTRACT(DAY FROM (NOW() - due_date))::INTEGER)
  INTO 
    v_contribution_amount,
    v_days_overdue
  FROM contributions
  WHERE id = p_contribution_id;
  
  -- Calculate penalty (5% per day, max 50%)
  v_penalty_amount := v_contribution_amount * 
    LEAST(v_days_overdue * v_penalty_rate, v_max_penalty_rate) / 100;
  
  RETURN ROUND(v_penalty_amount, 2);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_late_penalty IS 
  'Calculates penalty for late payment (5% per day, max 50% of contribution)';

-- ============================================================================
-- FUNCTION: generate_payment_reference
-- ============================================================================
-- Generates a unique payment reference for transactions
-- Format: AJO-{TYPE}-{TIMESTAMP}-{RANDOM}
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_payment_reference(p_type VARCHAR(20) DEFAULT 'TXN')
RETURNS VARCHAR(100) AS $$
DECLARE
  v_timestamp VARCHAR(20);
  v_random VARCHAR(8);
  v_reference VARCHAR(100);
BEGIN
  -- Get timestamp (YYYYMMDDHHMMSS)
  v_timestamp := TO_CHAR(NOW(), 'YYYYMMDDHH24MISS');
  
  -- Generate random alphanumeric string
  v_random := UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
  
  -- Construct reference
  v_reference := 'AJO-' || UPPER(p_type) || '-' || v_timestamp || '-' || v_random;
  
  RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_payment_reference IS 
  'Generates unique payment reference in format AJO-TYPE-TIMESTAMP-RANDOM';

-- ============================================================================
-- FUNCTION: process_cycle_completion
-- ============================================================================
-- Processes the completion of a cycle: creates payout, advances cycle
-- Called automatically or manually when all contributions are paid
-- ============================================================================

CREATE OR REPLACE FUNCTION process_cycle_completion(p_group_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_current_cycle INTEGER;
  v_total_cycles INTEGER;
  v_recipient_id UUID;
  v_payout_amount DECIMAL(15, 2);
  v_payout_id UUID;
  v_result JSONB;
BEGIN
  -- Get current cycle info
  SELECT current_cycle, total_cycles 
  INTO v_current_cycle, v_total_cycles
  FROM groups
  WHERE id = p_group_id;
  
  -- Check if cycle is actually complete
  IF NOT is_cycle_complete(p_group_id, v_current_cycle) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Cycle is not complete yet',
      'cycle', v_current_cycle
    );
  END IF;
  
  -- Get recipient for this cycle
  SELECT user_id INTO v_recipient_id
  FROM group_members
  WHERE group_id = p_group_id
    AND position = v_current_cycle
  LIMIT 1;
  
  -- Calculate payout amount
  v_payout_amount := calculate_payout_amount(p_group_id, v_current_cycle);
  
  -- Create or update payout record
  INSERT INTO payouts (
    related_group_id,
    cycle_number,
    recipient_id,
    amount,
    status,
    scheduled_date
  ) VALUES (
    p_group_id,
    v_current_cycle,
    v_recipient_id,
    v_payout_amount,
    'pending',
    NOW()
  )
  ON CONFLICT (related_group_id, cycle_number)
  DO UPDATE SET
    status = 'pending',
    amount = v_payout_amount,
    updated_at = NOW()
  RETURNING id INTO v_payout_id;
  
  -- Create notification for recipient
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    related_group_id
  ) VALUES (
    v_recipient_id,
    'payout_ready',
    'Payout Ready!',
    'Your payout for cycle ' || v_current_cycle || ' is ready for processing.',
    p_group_id
  );
  
  -- Advance to next cycle or complete group
  IF v_current_cycle >= v_total_cycles THEN
    -- Group is complete
    UPDATE groups
    SET status = 'completed',
        updated_at = NOW()
    WHERE id = p_group_id;
    
    v_result := jsonb_build_object(
      'success', true,
      'message', 'Group completed',
      'cycle', v_current_cycle,
      'payout_id', v_payout_id,
      'group_status', 'completed'
    );
  ELSE
    -- Move to next cycle
    UPDATE groups
    SET current_cycle = current_cycle + 1,
        updated_at = NOW()
    WHERE id = p_group_id;
    
    -- Create contributions for next cycle
    PERFORM create_cycle_contributions(p_group_id, v_current_cycle + 1);
    
    v_result := jsonb_build_object(
      'success', true,
      'message', 'Cycle completed, moved to next cycle',
      'cycle', v_current_cycle,
      'next_cycle', v_current_cycle + 1,
      'payout_id', v_payout_id
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_cycle_completion IS 
  'Processes cycle completion: creates payout, advances cycle, or completes group';

-- ============================================================================
-- FUNCTION: create_cycle_contributions
-- ============================================================================
-- Creates contribution records for all members in a specific cycle
-- Sets due dates based on group frequency
-- ============================================================================

CREATE OR REPLACE FUNCTION create_cycle_contributions(
  p_group_id UUID,
  p_cycle_number INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_contribution_amount DECIMAL(15, 2);
  v_service_fee_percentage DECIMAL(5, 2);
  v_frequency VARCHAR(20);
  v_start_date TIMESTAMPTZ;
  v_due_date TIMESTAMPTZ;
  v_service_fee DECIMAL(15, 2);
  v_count INTEGER := 0;
BEGIN
  -- Get group details
  SELECT 
    contribution_amount,
    service_fee_percentage,
    frequency,
    start_date
  INTO 
    v_contribution_amount,
    v_service_fee_percentage,
    v_frequency,
    v_start_date
  FROM groups
  WHERE id = p_group_id;
  
  -- Calculate service fee
  v_service_fee := v_contribution_amount * (v_service_fee_percentage / 100);
  
  -- Calculate due date based on frequency and cycle
  v_due_date := CASE v_frequency
    WHEN 'daily' THEN v_start_date + ((p_cycle_number - 1) * INTERVAL '1 day')
    WHEN 'weekly' THEN v_start_date + ((p_cycle_number - 1) * INTERVAL '1 week')
    WHEN 'monthly' THEN v_start_date + ((p_cycle_number - 1) * INTERVAL '1 month')
    ELSE v_start_date + ((p_cycle_number - 1) * INTERVAL '1 month')
  END;
  
  -- Create contribution record for each active member
  INSERT INTO contributions (
    group_id,
    user_id,
    cycle_number,
    amount,
    service_fee,
    due_date,
    status
  )
  SELECT 
    p_group_id,
    user_id,
    p_cycle_number,
    v_contribution_amount,
    v_service_fee,
    v_due_date,
    'pending'
  FROM group_members
  WHERE group_id = p_group_id
    AND status = 'active';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Create notifications for all members
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    related_group_id
  )
  SELECT 
    user_id,
    'payment_due',
    'Payment Due',
    'Your contribution for cycle ' || p_cycle_number || ' is due on ' || 
      TO_CHAR(v_due_date, 'Mon DD, YYYY'),
    p_group_id
  FROM group_members
  WHERE group_id = p_group_id
    AND status = 'active';
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_cycle_contributions IS 
  'Creates contribution records for all active members in a cycle';

-- ============================================================================
-- FUNCTION: apply_late_penalties
-- ============================================================================
-- Applies penalties to all overdue contributions
-- Returns count of penalties applied
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_late_penalties()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_contribution RECORD;
  v_penalty_amount DECIMAL(15, 2);
BEGIN
  -- Loop through overdue contributions without penalties
  FOR v_contribution IN
    SELECT 
      c.id,
      c.group_id,
      c.user_id,
      c.amount,
      EXTRACT(DAY FROM (NOW() - c.due_date))::INTEGER AS days_overdue
    FROM contributions c
    WHERE c.status = 'pending'
      AND c.due_date < NOW()
      AND NOT EXISTS (
        SELECT 1 FROM penalties p
        WHERE p.contribution_id = c.id
        AND p.penalty_type = 'late_payment'
      )
  LOOP
    -- Calculate penalty
    v_penalty_amount := calculate_late_penalty(v_contribution.id, v_contribution.days_overdue);
    
    -- Insert penalty record
    INSERT INTO penalties (
      group_id,
      user_id,
      contribution_id,
      amount,
      penalty_type,
      reason,
      status
    ) VALUES (
      v_contribution.group_id,
      v_contribution.user_id,
      v_contribution.id,
      v_penalty_amount,
      'late_payment',
      'Late payment - ' || v_contribution.days_overdue || ' days overdue',
      'unpaid'
    );
    
    -- Create notification
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      related_group_id
    ) VALUES (
      v_contribution.user_id,
      'penalty_applied',
      'Late Payment Penalty',
      'A penalty of ₦' || v_penalty_amount || ' has been applied for late payment.',
      v_contribution.group_id
    );
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION apply_late_penalties IS 
  'Automatically applies penalties to overdue contributions';

-- ============================================================================
-- FUNCTION: check_and_process_complete_cycles
-- ============================================================================
-- Checks all active groups and processes any complete cycles
-- Should be called by scheduled job or manually
-- ============================================================================

CREATE OR REPLACE FUNCTION check_and_process_complete_cycles()
RETURNS JSONB AS $$
DECLARE
  v_group RECORD;
  v_result JSONB;
  v_processed INTEGER := 0;
  v_results JSONB := '[]'::jsonb;
BEGIN
  -- Loop through active groups
  FOR v_group IN
    SELECT id, name, current_cycle
    FROM groups
    WHERE status = 'active'
  LOOP
    -- Check if cycle is complete
    IF is_cycle_complete(v_group.id, v_group.current_cycle) THEN
      -- Process completion
      v_result := process_cycle_completion(v_group.id);
      
      -- Add to results
      v_results := v_results || jsonb_build_object(
        'group_id', v_group.id,
        'group_name', v_group.name,
        'result', v_result
      );
      
      v_processed := v_processed + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'processed_count', v_processed,
    'results', v_results
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_and_process_complete_cycles IS 
  'Checks all active groups and processes complete cycles';

-- ============================================================================
-- FUNCTION: validate_group_member_limit
-- ============================================================================
-- Validates that a group hasn't exceeded its member limit
-- Used before adding new members
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_group_member_limit(p_group_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_total_members INTEGER;
  v_current_members INTEGER;
BEGIN
  SELECT total_members, current_members
  INTO v_total_members, v_current_members
  FROM groups
  WHERE id = p_group_id;
  
  RETURN v_current_members < v_total_members;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_group_member_limit IS 
  'Checks if group has space for more members';

-- ============================================================================
-- FUNCTION: get_user_contribution_history
-- ============================================================================
-- Gets complete contribution history for a user with statistics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_contribution_history(p_user_id UUID)
RETURNS TABLE (
  group_id UUID,
  group_name VARCHAR,
  total_contributions BIGINT,
  paid_contributions BIGINT,
  pending_contributions BIGINT,
  total_amount_paid DECIMAL,
  total_penalties DECIMAL,
  completion_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id AS group_id,
    g.name AS group_name,
    COUNT(c.id) AS total_contributions,
    COUNT(CASE WHEN c.status = 'paid' THEN 1 END) AS paid_contributions,
    COUNT(CASE WHEN c.status = 'pending' THEN 1 END) AS pending_contributions,
    COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END), 0) AS total_amount_paid,
    COALESCE(SUM(pen.amount), 0) AS total_penalties,
    ROUND(
      (COUNT(CASE WHEN c.status = 'paid' THEN 1 END)::DECIMAL / 
       NULLIF(COUNT(c.id), 0) * 100),
      2
    ) AS completion_rate
  FROM group_members gm
  JOIN groups g ON gm.group_id = g.id
  LEFT JOIN contributions c ON gm.group_id = c.group_id AND gm.user_id = c.user_id
  LEFT JOIN penalties pen ON c.id = pen.contribution_id
  WHERE gm.user_id = p_user_id
  GROUP BY g.id, g.name
  ORDER BY g.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_contribution_history IS 
  'Returns complete contribution history for a user grouped by group';

-- ============================================================================
-- FUNCTION: get_group_health_score
-- ============================================================================
-- Calculates a health score for a group (0-100)
-- Based on payment compliance, active members, and cycle progress
-- ============================================================================

CREATE OR REPLACE FUNCTION get_group_health_score(p_group_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_payment_rate DECIMAL;
  v_active_member_rate DECIMAL;
  v_cycle_progress DECIMAL;
  v_health_score INTEGER;
BEGIN
  -- Calculate payment compliance rate (40% weight)
  SELECT 
    COALESCE(
      COUNT(CASE WHEN status = 'paid' THEN 1 END)::DECIMAL / 
      NULLIF(COUNT(*), 0) * 40,
      0
    )
  INTO v_payment_rate
  FROM contributions
  WHERE group_id = p_group_id;
  
  -- Calculate active member rate (30% weight)
  SELECT 
    COALESCE(
      COUNT(CASE WHEN status = 'active' THEN 1 END)::DECIMAL / 
      NULLIF(total_members, 0) * 30,
      0
    )
  INTO v_active_member_rate
  FROM groups g
  LEFT JOIN group_members gm ON g.id = gm.group_id
  WHERE g.id = p_group_id
  GROUP BY g.total_members;
  
  -- Calculate cycle progress (30% weight)
  SELECT 
    COALESCE(
      (current_cycle::DECIMAL / NULLIF(total_cycles, 0)) * 30,
      0
    )
  INTO v_cycle_progress
  FROM groups
  WHERE id = p_group_id;
  
  -- Sum up the score
  v_health_score := ROUND(v_payment_rate + v_active_member_rate + v_cycle_progress);
  
  RETURN v_health_score;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_group_health_score IS 
  'Calculates group health score (0-100) based on payments, members, and progress';

-- ============================================================================
-- FUNCTION: send_payment_reminders
-- ============================================================================
-- Creates notification reminders for upcoming and overdue payments
-- Returns count of reminders sent
-- ============================================================================

CREATE OR REPLACE FUNCTION send_payment_reminders()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Send reminders for payments due in 2 days
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    related_group_id
  )
  SELECT 
    c.user_id,
    'payment_due',
    'Payment Due Soon',
    'Your contribution for ' || g.name || ' is due in 2 days (₦' || c.amount || ').',
    c.group_id
  FROM contributions c
  JOIN groups g ON c.group_id = g.id
  WHERE c.status = 'pending'
    AND c.due_date::date = (CURRENT_DATE + INTERVAL '2 days')::date
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = c.user_id
        AND n.related_group_id = c.group_id
        AND n.type = 'payment_due'
        AND n.created_at > NOW() - INTERVAL '1 day'
    );
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Send overdue reminders
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    related_group_id
  )
  SELECT 
    c.user_id,
    'payment_overdue',
    'Payment Overdue',
    'Your contribution for ' || g.name || ' is now overdue. Please pay to avoid additional penalties.',
    c.group_id
  FROM contributions c
  JOIN groups g ON c.group_id = g.id
  WHERE c.status = 'pending'
    AND c.due_date < NOW()
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = c.user_id
        AND n.related_group_id = c.group_id
        AND n.type = 'payment_overdue'
        AND n.created_at > NOW() - INTERVAL '1 day'
    );
  
  GET DIAGNOSTICS v_count = v_count + ROW_COUNT;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION send_payment_reminders IS 
  'Sends payment reminder notifications for upcoming and overdue payments';

-- ============================================================================
-- END OF FUNCTIONS
-- ============================================================================
--
-- USAGE:
-- 1. Run this file after schema.sql has been executed
-- 2. Functions are available immediately for use
-- 3. Call from SQL: SELECT * FROM get_user_stats('user-uuid');
-- 4. Call from application via Supabase RPC: supabase.rpc('function_name', params)
--
-- EXAMPLES:
-- - Check if cycle complete: SELECT is_cycle_complete('group-uuid', 1);
-- - Calculate payout: SELECT calculate_payout_amount('group-uuid', 1);
-- - Apply penalties: SELECT apply_late_penalties();
-- - Send reminders: SELECT send_payment_reminders();
--
-- ============================================================================
