-- Get user's contributions with group and payment details
-- Example of a reporting query that benefits from externalization

SELECT 
  c.id as contribution_id,
  c.cycle_number,
  c.amount,
  c.due_date,
  c.paid_date,
  c.status,
  c.payment_reference,
  c.created_at,
  -- Group information
  g.id as group_id,
  g.name as group_name,
  g.frequency,
  g.contribution_amount as group_contribution_amount,
  g.current_cycle,
  -- Transaction information
  t.id as transaction_id,
  t.reference as transaction_reference,
  t.payment_method,
  t.status as transaction_status,
  -- Calculated fields
  CASE 
    WHEN c.status = 'pending' AND c.due_date < CURRENT_DATE THEN true
    ELSE false
  END as is_overdue,
  CASE 
    WHEN c.status = 'paid' THEN 0
    WHEN c.status = 'pending' AND c.due_date < CURRENT_DATE THEN 
      EXTRACT(DAY FROM CURRENT_DATE - c.due_date)
    ELSE 0
  END as days_overdue,
  -- Penalty information if applicable
  p.id as penalty_id,
  p.amount as penalty_amount,
  p.reason as penalty_reason,
  p.status as penalty_status
FROM contributions c
INNER JOIN groups g ON c.group_id = g.id
LEFT JOIN transactions t ON c.transaction_ref = t.reference
LEFT JOIN penalties p ON c.id = p.contribution_id AND p.status != 'waived'
WHERE c.user_id = $1
  AND ($2::uuid IS NULL OR c.group_id = $2)
  AND ($3::text IS NULL OR c.status = $3)
ORDER BY c.due_date DESC, c.created_at DESC
LIMIT $4 OFFSET $5;
