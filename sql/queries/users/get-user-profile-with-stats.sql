-- Get detailed user profile with statistics
-- This is an example of a complex query that should be externalized
-- following the Contributing.md guidelines

SELECT 
  u.id,
  u.email,
  u.full_name,
  u.phone,
  u.is_verified,
  u.kyc_status,
  u.bvn,
  u.profile_image,
  u.created_at,
  u.last_login_at,
  -- Aggregate user statistics
  COUNT(DISTINCT gm.group_id) as total_groups,
  COUNT(DISTINCT CASE WHEN g.status = 'active' THEN gm.group_id END) as active_groups,
  COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END), 0) as total_contributions_paid,
  COALESCE(SUM(CASE WHEN c.status = 'pending' THEN c.amount ELSE 0 END), 0) as total_contributions_pending
FROM users u
LEFT JOIN group_members gm ON u.id = gm.user_id AND gm.status = 'active'
LEFT JOIN groups g ON gm.group_id = g.id
LEFT JOIN contributions c ON u.id = c.user_id
WHERE u.id = $1
GROUP BY 
  u.id,
  u.email,
  u.full_name,
  u.phone,
  u.is_verified,
  u.kyc_status,
  u.bvn,
  u.profile_image,
  u.created_at,
  u.last_login_at;
