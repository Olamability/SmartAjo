-- Get active groups with member statistics
-- Example of a complex multi-table query that should be externalized

SELECT 
  g.id,
  g.name,
  g.description,
  g.created_by,
  g.contribution_amount,
  g.frequency,
  g.total_members,
  g.current_members,
  g.current_cycle,
  g.total_cycles,
  g.security_deposit_amount,
  g.security_deposit_percentage,
  g.service_fee_percentage,
  g.start_date,
  g.status,
  g.created_at,
  u.full_name as creator_name,
  u.email as creator_email,
  -- Member statistics
  COUNT(DISTINCT gm.user_id) FILTER (WHERE gm.status = 'active') as active_member_count,
  COUNT(DISTINCT gm.user_id) FILTER (WHERE gm.has_paid_security_deposit = true) as members_paid_deposit,
  -- Contribution statistics for current cycle
  COUNT(DISTINCT c.id) FILTER (WHERE c.cycle_number = g.current_cycle) as total_contributions_current_cycle,
  COUNT(DISTINCT c.id) FILTER (WHERE c.cycle_number = g.current_cycle AND c.status = 'paid') as paid_contributions_current_cycle,
  COALESCE(SUM(c.amount) FILTER (WHERE c.cycle_number = g.current_cycle AND c.status = 'paid'), 0) as amount_collected_current_cycle
FROM groups g
LEFT JOIN users u ON g.created_by = u.id
LEFT JOIN group_members gm ON g.id = gm.group_id
LEFT JOIN contributions c ON g.id = c.group_id
WHERE g.status = $1
GROUP BY 
  g.id,
  g.name,
  g.description,
  g.created_by,
  g.contribution_amount,
  g.frequency,
  g.total_members,
  g.current_members,
  g.current_cycle,
  g.total_cycles,
  g.security_deposit_amount,
  g.security_deposit_percentage,
  g.service_fee_percentage,
  g.start_date,
  g.status,
  g.created_at,
  u.full_name,
  u.email
ORDER BY g.created_at DESC
LIMIT $2 OFFSET $3;
