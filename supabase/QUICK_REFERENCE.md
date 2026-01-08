# Database Schema - Quick Reference Guide

## 🚀 Quick Start

### Setup Order
1. **schema.sql** - Core tables and base schema (Required)
2. **views.sql** - Common query views (Recommended)
3. **functions.sql** - Business logic functions (Recommended)
4. **triggers.sql** - Automation triggers (Recommended)
5. **realtime.sql** - Real-time subscriptions (Optional)
6. **scheduled-jobs.sql** - Background jobs (Optional, Pro plan)
7. **storage.sql** - File storage setup (Required)

### One-Command Setup
```sql
-- Run in Supabase SQL Editor in this order:
\i schema.sql
\i views.sql
\i functions.sql
\i triggers.sql
\i realtime.sql
\i scheduled-jobs.sql  -- Skip on free tier
\i storage.sql
```

## 📊 Tables Reference

### Core Tables
| Table | Purpose | Key Fields |
|-------|---------|------------|
| **users** | User profiles | email, phone, kyc_status |
| **groups** | Savings groups | contribution_amount, frequency, status |
| **group_members** | Group memberships | position, has_paid_security_deposit |
| **contributions** | Member payments | amount, status, due_date |
| **payouts** | Rotational payouts | recipient_id, amount, status |
| **penalties** | Late fees | amount, penalty_type, status |
| **transactions** | Financial audit | type, amount, reference |
| **notifications** | User alerts | type, title, is_read |

### Helper Tables
| Table | Purpose |
|-------|---------|
| **email_verification_tokens** | OTP management |
| **audit_logs** | System audit trail |
| **user_presence** | Online status tracking |

## 🔍 Views Reference

```sql
-- Active groups with availability
SELECT * FROM active_groups_summary WHERE is_full = false;

-- User dashboard data
SELECT * FROM user_dashboard_view WHERE user_id = 'uuid';

-- Current cycle progress
SELECT * FROM group_contribution_progress WHERE group_id = 'uuid';

-- Overdue payments
SELECT * FROM overdue_contributions_view;

-- User's group details
SELECT * FROM user_groups_detail WHERE user_id = 'uuid';

-- Ready payouts
SELECT * FROM pending_payouts_view WHERE is_ready_for_payout = true;

-- Financial summary
SELECT * FROM group_financial_summary WHERE group_id = 'uuid';

-- Unread notifications
SELECT * FROM user_notifications_unread WHERE user_id = 'uuid';

-- Audit trail
SELECT * FROM audit_trail_view ORDER BY created_at DESC LIMIT 100;
```

## 🛠️ Functions Reference

### Business Logic Functions

```sql
-- Calculate next payout recipient
SELECT calculate_next_payout_recipient('group-uuid');

-- Check if cycle complete
SELECT is_cycle_complete('group-uuid', 1);

-- Calculate payout amount (after fees)
SELECT calculate_payout_amount('group-uuid', 1);

-- Calculate late penalty
SELECT calculate_late_penalty('contribution-uuid');

-- Generate payment reference
SELECT generate_payment_reference('CONTRIB');

-- Process cycle completion
SELECT process_cycle_completion('group-uuid');

-- Create contributions for cycle
SELECT create_cycle_contributions('group-uuid', 2);

-- Apply all late penalties
SELECT apply_late_penalties();

-- Process all complete cycles
SELECT check_and_process_complete_cycles();

-- Validate group capacity
SELECT validate_group_member_limit('group-uuid');

-- Get contribution history
SELECT * FROM get_user_contribution_history('user-uuid');

-- Get group health score (0-100)
SELECT get_group_health_score('group-uuid');

-- Send payment reminders
SELECT send_payment_reminders();

-- Get user statistics
SELECT * FROM get_user_stats('user-uuid');

-- Get group progress
SELECT * FROM get_group_progress('group-uuid');
```

## ⚡ Triggers Reference

### Automatic Triggers (Always Active)

| Trigger | Fires On | Action |
|---------|----------|--------|
| **update_updated_at** | UPDATE any table | Updates updated_at timestamp |
| **sync_group_member_count** | INSERT/DELETE group_members | Syncs group.current_members |
| **auto_add_group_creator** | INSERT groups | Adds creator as first member |
| **notify_contribution_paid** | UPDATE contributions (paid) | Creates notifications |
| **check_cycle_completion** | UPDATE contributions (paid) | Processes complete cycles |
| **notify_payout_status** | UPDATE payouts | Notifies on status change |
| **notify_penalty_applied** | INSERT penalties | Notifies user |
| **notify_member_joined** | INSERT group_members | Notifies group |
| **notify_group_status_change** | UPDATE groups (status) | Notifies all members |
| **prevent_duplicate_membership** | INSERT group_members | Prevents duplicates |
| **validate_group_capacity** | INSERT group_members | Checks capacity |
| **create_contribution_transaction** | UPDATE contributions (paid) | Creates transaction |
| **create_payout_transaction** | UPDATE payouts (completed) | Creates transaction |
| **validate_security_deposits** | UPDATE groups (to active) | Validates deposits |

## ⏰ Scheduled Jobs Reference

| Job | Schedule | Purpose |
|-----|----------|---------|
| **apply-late-penalties** | Daily 1 AM UTC | Apply penalties to overdue |
| **process-complete-cycles** | Every 6 hours | Process completed cycles |
| **send-payment-reminders** | Daily 9 AM UTC | Send payment reminders |
| **clean-old-notifications** | Weekly Sun 2 AM | Delete old read notifications |
| **clean-expired-tokens** | Daily 3 AM UTC | Delete expired tokens |
| **update-group-status** | Hourly | Activate forming groups |
| **archive-completed-groups** | Weekly Mon 4 AM | Archive old groups |
| **generate-daily-stats** | Daily 5 AM UTC | Generate platform stats |

### Job Management

```sql
-- View all jobs
SELECT * FROM cron_jobs_status;

-- View job history
SELECT * FROM get_job_run_history();
SELECT * FROM get_job_run_history('apply-late-penalties');

-- Manually trigger job
SELECT trigger_scheduled_job('apply-late-penalties');
```

## 🔴 Realtime Subscriptions

### Client-Side Examples

```typescript
// Subscribe to group changes
const channel = supabase
  .channel('group-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'groups',
    filter: `id=eq.${groupId}`
  }, (payload) => {
    console.log('Group updated:', payload)
  })
  .subscribe()

// Subscribe to notifications
const notifChannel = supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    console.log('New notification:', payload.new)
  })
  .subscribe()

// Track presence
const presenceChannel = supabase.channel('group-presence')
presenceChannel.track({ user_id: userId, status: 'online' })
presenceChannel.subscribe()
```

## 🔒 Row Level Security (RLS)

### Access Patterns

```sql
-- Users can view their own data
auth.uid() = user_id

-- Users can view groups they're in
EXISTS (
  SELECT 1 FROM group_members
  WHERE group_id = groups.id
  AND user_id = auth.uid()
)

-- Service role can do everything
auth.jwt()->>'role' = 'service_role'
```

### Testing RLS

```typescript
// As authenticated user
const { data } = await supabase
  .from('groups')
  .select('*')
  // Only returns groups user is member of

// As service role (backend only)
const { data } = await supabase
  .from('groups')
  .select('*')
  // Returns all groups
```

## 📦 Storage Reference

### Buckets

| Bucket | Access | Size Limit | MIME Types |
|--------|--------|------------|------------|
| **avatars** | Public | 2MB | image/* |
| **kyc-documents** | Private | 5MB | image/*, pdf |
| **group-images** | Public | 3MB | image/* |

### Client Usage

```typescript
// Upload avatar
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.jpg`, file)

// Get public URL
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}/avatar.jpg`)

// Upload KYC document (private)
const { data } = await supabase.storage
  .from('kyc-documents')
  .upload(`${userId}/id-card.pdf`, file)
```

## 🧪 Testing Queries

### Verify Setup

```sql
-- Check all tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check all views exist
SELECT viewname FROM pg_views 
WHERE schemaname = 'public' 
ORDER BY viewname;

-- Check all functions exist
SELECT proname FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
ORDER BY proname;

-- Check all triggers exist
SELECT tgname FROM pg_trigger 
WHERE tgname NOT LIKE 'RI_%' 
ORDER BY tgname;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- Check storage buckets
SELECT * FROM storage.buckets;

-- Check realtime publications
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- Check scheduled jobs (if enabled)
SELECT * FROM cron.job;
```

## 🐛 Common Issues

### Issue: RLS prevents data access
**Solution**: Check if user is authenticated and has proper permissions
```sql
-- Test query
SELECT * FROM users WHERE id = auth.uid();
```

### Issue: Triggers not firing
**Solution**: Check trigger is enabled
```sql
-- List triggers
SELECT * FROM pg_trigger WHERE tgname = 'trigger_name';

-- Enable trigger
ALTER TABLE table_name ENABLE TRIGGER trigger_name;
```

### Issue: Functions return null
**Solution**: Check function parameters and return type
```sql
-- Debug function
SELECT * FROM get_user_stats('uuid-here');
```

### Issue: Scheduled jobs not running
**Solution**: Verify pg_cron is enabled
```sql
-- Check extension
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check job status
SELECT * FROM cron.job_run_details ORDER BY start_time DESC;
```

## 📊 Performance Tips

1. **Use views** for complex queries instead of joining in application
2. **Use functions** for business logic to reduce API calls
3. **Use indexes** - already optimized in schema
4. **Use RLS policies** - security with no extra code
5. **Use realtime** - eliminates polling overhead
6. **Use scheduled jobs** - automate recurring tasks
7. **Batch operations** when possible
8. **Monitor query performance** in Supabase dashboard

## 🔐 Security Best Practices

1. ✅ Never expose service_role key to client
2. ✅ Use anon key for client applications
3. ✅ RLS policies protect all data access
4. ✅ Validate input at database level (CHECK constraints)
5. ✅ Use prepared statements (automatic with Supabase client)
6. ✅ Audit logs track all important actions
7. ✅ Storage policies control file access
8. ✅ Triggers enforce business rules automatically

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime Guide](https://supabase.com/docs/guides/realtime)
- [pg_cron Documentation](https://github.com/citusdata/pg_cron)

## 💡 Quick Wins

### Get Started in 5 Minutes
1. Run schema.sql
2. Run views.sql
3. Run functions.sql
4. Configure environment variables
5. Test with `SELECT * FROM active_groups_summary;`

### Most Useful Queries
```sql
-- User dashboard
SELECT * FROM user_dashboard_view WHERE user_id = auth.uid();

-- Available groups
SELECT * FROM active_groups_summary WHERE is_full = false;

-- My groups
SELECT * FROM user_groups_detail WHERE user_id = auth.uid();

-- Pending payments
SELECT * FROM overdue_contributions_view WHERE user_id = auth.uid();
```

---

**Quick Reference Version**: 2.0.0  
**Last Updated**: January 2026  
**For**: Secured-Ajo Platform
