# 📖 Supabase Schema Quick Reference

Quick reference guide for the Secured Ajo database schema on Supabase.

## 🗂️ Files Overview

| File | Purpose | When to Use |
|------|---------|-------------|
| `supabase_schema.sql` | Complete database schema | First-time deployment to new Supabase project |
| `supabase_storage.sql` | Storage buckets and policies | After main schema, for file storage setup |
| `SUPABASE_DEPLOYMENT.md` | Detailed deployment guide | Step-by-step deployment instructions |
| `schema.sql` | Original schema (PostgreSQL) | Reference or non-Supabase deployments |
| `migrations/` | Schema changes over time | Apply incremental updates |

## 🚀 Quick Start (60 seconds)

1. **Create Supabase project** at [supabase.com](https://supabase.com)
2. **Copy password** (you'll need it later)
3. **Open SQL Editor** in Supabase dashboard
4. **Run `supabase_schema.sql`** - Copy entire file contents and execute
5. **Run `supabase_storage.sql`** - Copy entire file contents and execute
6. **Get connection string** from Project Settings > Database
7. **Update `.env.local`** with your DATABASE_URL
8. **Done!** 🎉

## 📋 Schema Components

### Tables (13 Total)

#### Core Business Tables
- `users` - User accounts and authentication
- `groups` - Savings groups
- `group_members` - Group membership and rotation
- `contributions` - Payment contributions
- `payouts` - Payout distributions
- `transactions` - Financial transaction log
- `penalties` - Late payment penalties

#### Supporting Tables
- `email_verification_tokens` - Email OTP codes
- `refresh_tokens` - JWT session tokens
- `notifications` - User notifications
- `kyc_documents` - KYC verification files
- `payment_webhooks` - Payment gateway events
- `audit_logs` - Security audit trail

### Views (2 Total)
- `group_statistics` - Group performance metrics
- `user_group_participation` - User engagement data

### Functions (6 Total)
- `update_updated_at_column()` - Auto-timestamp updates
- `update_group_member_count()` - Auto-count members
- `get_cycle_total()` - Calculate cycle contributions
- `is_cycle_complete()` - Check cycle completion
- `cleanup_expired_tokens()` - Remove old tokens
- `get_profile_image_url()` - Get user avatar URL

### Triggers (7 Total)
- Auto-update `updated_at` on: users, groups, contributions, payouts, transactions, kyc_documents
- Auto-maintain `current_members` count on groups

### Storage Buckets (2 Total)
- `profile-images` - User avatars (5MB max, images only)
- `kyc-documents` - KYC files (10MB max, images + PDFs)

## 🔐 Security Features

### Row Level Security (RLS)
✅ Enabled on all tables with policies:
- Users can only view/edit their own data
- Group data visible only to members
- Transactions isolated to owner
- Admin override available via service role

### Storage Security
✅ All buckets are private by default
✅ Users can only access their own files
✅ File type and size restrictions enforced

### Realtime Subscriptions
✅ Enabled on: notifications, group_members, contributions, transactions
✅ Users only receive events for their own data

## 📊 Key Relationships

```
users (1) ──→ (many) group_members ──→ (many) groups
  │                                        │
  ├─→ (many) contributions                │
  │                                        │
  ├─→ (many) payouts                      │
  │                                        │
  ├─→ (many) transactions                 │
  │                                        │
  └─→ (many) notifications                │
                                           │
groups (1) ──→ (many) group_members       │
         │                                 │
         ├─→ (many) contributions          │
         │                                 │
         └─→ (many) payouts                │
```

## 🔑 Important Constraints

### Users Table
- Email must be unique
- Password stored as bcrypt hash
- Failed login attempts tracked (max 5 before lockout)
- KYC status: `not_started` | `pending` | `verified` | `rejected`

### Groups Table
- Member count: 2-50
- Service fee: 0-100%
- Security deposit: 0-100%
- Status: `forming` | `active` | `completed` | `cancelled`
- Frequency: `daily` | `weekly` | `monthly`

### Contributions Table
- Unique per (group, user, cycle)
- Status: `pending` | `paid` | `late` | `missed`
- Penalties auto-calculated for late payments

### Payouts Table
- One payout per cycle per group
- Automatic recipient determination by rotation
- Status: `pending` | `processed` | `failed`

## 🎨 Common Queries

### Get User's Active Groups
```sql
SELECT g.* 
FROM groups g
INNER JOIN group_members gm ON g.id = gm.group_id
WHERE gm.user_id = 'user-uuid-here'
AND g.status = 'active';
```

### Get Pending Contributions for User
```sql
SELECT c.* 
FROM contributions c
WHERE c.user_id = 'user-uuid-here'
AND c.status = 'pending'
ORDER BY c.due_date ASC;
```

### Get Group Statistics
```sql
SELECT * FROM group_statistics
WHERE id = 'group-uuid-here';
```

### Get User's Transaction History
```sql
SELECT * FROM transactions
WHERE user_id = 'user-uuid-here'
ORDER BY date DESC
LIMIT 50;
```

### Check if Cycle is Complete
```sql
SELECT is_cycle_complete('group-uuid-here', 1);
```

## 🔧 Maintenance Tasks

### Daily Tasks
```sql
-- Cleanup expired tokens
SELECT cleanup_expired_tokens();

-- Find overdue contributions
SELECT * FROM contributions
WHERE status = 'pending'
AND due_date < NOW();
```

### Weekly Tasks
```sql
-- Find inactive groups
SELECT * FROM groups
WHERE status = 'active'
AND current_cycle = 0
AND created_at < NOW() - INTERVAL '30 days';

-- User engagement metrics
SELECT * FROM user_group_participation
ORDER BY total_contributed DESC;
```

### Monthly Tasks
```sql
-- Archive completed groups (manual review recommended)
SELECT * FROM groups
WHERE status = 'completed'
AND updated_at < NOW() - INTERVAL '90 days';

-- Review penalties
SELECT u.full_name, u.email, SUM(p.amount) as total_penalties
FROM penalties p
JOIN users u ON p.user_id = u.id
WHERE p.applied_at > NOW() - INTERVAL '30 days'
GROUP BY u.id, u.full_name, u.email
ORDER BY total_penalties DESC;
```

## 📈 Monitoring Queries

### System Health
```sql
-- Active users count
SELECT COUNT(*) FROM users WHERE is_active = true;

-- Active groups count
SELECT COUNT(*) FROM groups WHERE status = 'active';

-- Today's transactions
SELECT COUNT(*), SUM(amount) 
FROM transactions 
WHERE date::date = CURRENT_DATE;
```

### Performance Metrics
```sql
-- Largest tables
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Slow queries (from Supabase dashboard)
-- Use Supabase's Query Performance tab
```

## ⚠️ Important Notes

### Before Production
1. **Change admin password** - Default is `ChangeMe123!SecureAjo` ⚠️ CRITICAL
   ```sql
   UPDATE users 
   SET password_hash = crypt('YourNewStrongPassword', gen_salt('bf'))
   WHERE email = 'admin@ajosecure.com';
   ```
2. **Review RLS policies** - Ensure they match security requirements
3. **Setup backups** - Enable point-in-time recovery
4. **Configure monitoring** - Set up alerts in Supabase
5. **Test all features** - Verify CRUD operations work correctly
6. **Load test** - Test with realistic data volumes

### Default Admin User
⚠️ **SECURITY CRITICAL**: Change this immediately after deployment!

```
Email: admin@ajosecure.com
Default Password: ChangeMe123!SecureAjo
```

**Change password command:**
```sql
UPDATE users 
SET password_hash = crypt('YourNewStrongPassword', gen_salt('bf'))
WHERE email = 'admin@ajosecure.com';
```

### Connection String Format
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### Required Environment Variables
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-min-32-chars
PAYSTACK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...
```

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| Can't connect to database | Verify connection string and password |
| RLS policy error | Check user is authenticated and has proper permissions |
| Storage upload fails | Verify bucket exists and file size/type is allowed |
| Trigger not firing | Ensure table has trigger installed, check function exists |
| View returns no data | Normal if no data exists yet, verify view definition |

## 📚 Resources

- **Main Guide**: [SUPABASE_DEPLOYMENT.md](./SUPABASE_DEPLOYMENT.md)
- **Supabase Docs**: https://supabase.com/docs
- **RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security
- **Storage Guide**: https://supabase.com/docs/guides/storage

---

**Quick help**: For detailed instructions, see [SUPABASE_DEPLOYMENT.md](./SUPABASE_DEPLOYMENT.md)
