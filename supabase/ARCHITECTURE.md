# Database Architecture Documentation

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Secured-Ajo Platform                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────┐     ┌──────────────┐    ┌────────────────┐ │
│  │   Next.js     │────▶│   Supabase   │───▶│   PostgreSQL   │ │
│  │   Frontend    │     │     Auth     │    │    Database    │ │
│  └───────────────┘     └──────────────┘    └────────────────┘ │
│         │                      │                    │           │
│         │                      │                    │           │
│         ▼                      ▼                    ▼           │
│  ┌───────────────┐     ┌──────────────┐    ┌────────────────┐ │
│  │   Next.js     │────▶│   Supabase   │───▶│   Supabase     │ │
│  │   API Routes  │     │   Storage    │    │   RLS          │ │
│  └───────────────┘     └──────────────┘    └────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Entity Relationship Diagram (ERD)

```
┌──────────────┐
│  auth.users  │ (Supabase Auth)
└──────┬───────┘
       │ 1:1
       │
       ▼
┌──────────────┐         ┌──────────────┐
│    users     │────────▶│email_verify_ │
│              │  1:*    │   _tokens    │
└──────┬───────┘         └──────────────┘
       │
       │ 1:*
       ▼
┌──────────────┐
│    groups    │
│ (created_by) │
└──────┬───────┘
       │
       │ 1:*
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌──────────────┐  ┌──────────────┐
│group_members │  │contributions │
│              │  │              │
└──────┬───────┘  └──────┬───────┘
       │                 │
       │ 1:*             │ 1:1
       │                 │
       ▼                 ▼
┌──────────────┐  ┌──────────────┐
│   payouts    │  │  penalties   │
│              │  │              │
└──────────────┘  └──────────────┘
       │
       │
       ▼
┌──────────────┐
│ transactions │
│              │
└──────────────┘
       │
       │ 1:*
       ▼
┌──────────────┐
│notifications │
│              │
└──────────────┘
```

## 🔗 Table Relationships

### users → groups
- **Type**: One-to-Many
- **Relation**: A user can create multiple groups
- **Foreign Key**: `groups.created_by → users.id`
- **On Delete**: RESTRICT (cannot delete user who created groups)

### users → group_members
- **Type**: One-to-Many
- **Relation**: A user can be a member of multiple groups
- **Foreign Key**: `group_members.user_id → users.id`
- **On Delete**: CASCADE (remove membership if user is deleted)

### groups → group_members
- **Type**: One-to-Many
- **Relation**: A group has multiple members
- **Foreign Key**: `group_members.group_id → groups.id`
- **On Delete**: CASCADE (remove members if group is deleted)
- **Unique Constraint**: `(group_id, user_id)` - user can only join once
- **Unique Constraint**: `(group_id, position)` - positions must be unique

### groups → contributions
- **Type**: One-to-Many
- **Relation**: A group has contributions from all members per cycle
- **Foreign Key**: `contributions.group_id → groups.id`
- **On Delete**: CASCADE
- **Unique Constraint**: `(group_id, user_id, cycle_number)` - one contribution per member per cycle

### groups → payouts
- **Type**: One-to-Many (One per cycle)
- **Relation**: One payout per cycle to one member
- **Foreign Key**: `payouts.group_id → groups.id`
- **On Delete**: CASCADE
- **Unique Constraint**: `(group_id, cycle_number)` - one payout per cycle

### users → payouts
- **Type**: One-to-Many
- **Relation**: A user can receive multiple payouts (from different groups/cycles)
- **Foreign Key**: `payouts.recipient_id → users.id`
- **On Delete**: CASCADE

### users → penalties
- **Type**: One-to-Many
- **Relation**: A user can have multiple penalties
- **Foreign Key**: `penalties.user_id → users.id`
- **On Delete**: CASCADE

### contributions → penalties
- **Type**: One-to-One (optional)
- **Relation**: A penalty may be linked to a specific contribution
- **Foreign Key**: `penalties.contribution_id → contributions.id`
- **On Delete**: SET NULL (keep penalty record even if contribution is removed)

### users → transactions
- **Type**: One-to-Many
- **Relation**: A user has multiple transactions
- **Foreign Key**: `transactions.user_id → users.id`
- **On Delete**: CASCADE

### groups → transactions
- **Type**: One-to-Many
- **Relation**: Transactions can be linked to a group
- **Foreign Key**: `transactions.group_id → groups.id`
- **On Delete**: CASCADE (nullable)

## 🔄 Business Logic Flow

### Group Creation Flow

```
1. User creates group
   ↓
2. Trigger auto-creates group_member record
   ↓
3. Creator is position 1, status 'active'
   ↓
4. Group status = 'forming'
   ↓
5. Wait for other members to join
```

### Member Join Flow

```
1. User requests to join group
   ↓
2. System assigns next available position
   ↓
3. group_members INSERT
   ↓
4. Trigger increments groups.current_members
   ↓
5. If current_members >= total_members
   ↓
6. Group status → 'active'
   ↓
7. Initialize first cycle contributions
```

### Contribution Flow

```
1. Cycle begins, contributions created for all members
   ↓
2. Member initiates payment
   ↓
3. Transaction created (status: pending)
   ↓
4. Payment gateway (Paystack) processes
   ↓
5. Webhook updates transaction (status: completed)
   ↓
6. Contribution updated (status: paid)
   ↓
7. Check if all cycle contributions paid
   ↓
8. If yes → process payout
```

### Payout Flow

```
1. All cycle contributions paid
   ↓
2. Get next recipient (by position, hasn't received yet)
   ↓
3. Calculate payout amount (contributions - service fee)
   ↓
4. Create payout record
   ↓
5. Create transaction record (type: payout)
   ↓
6. Notify recipient
   ↓
7. Check if all members received payout
   ↓
8. If yes → mark group as 'completed'
   If no → advance to next cycle
```

### Penalty Flow

```
1. Daily cron job runs
   ↓
2. Find overdue contributions
   ↓
3. Calculate penalty based on days late
   ↓
4. Create penalty record
   ↓
5. Create transaction record
   ↓
6. Notify user
```

## 🔐 Security Architecture

### Row Level Security (RLS)

#### Principle: Users can only access their own data and shared group data

**users table:**
- ✅ Users can SELECT/UPDATE their own record
- ✅ Service role can do anything

**groups table:**
- ✅ Anyone can view forming/active groups (for browsing)
- ✅ Authenticated users can create groups
- ✅ Creators can update their groups
- ✅ Service role can do anything

**group_members table:**
- ✅ Users can view members of groups they're in
- ✅ Users can insert their own membership (join)
- ✅ Service role can do anything

**contributions table:**
- ✅ Users can view contributions for groups they're in
- ✅ Service role can do anything (for automation)

**transactions table:**
- ✅ Users can view their own transactions
- ✅ Service role can do anything

**notifications table:**
- ✅ Users can view their own notifications
- ✅ Users can update their notifications (mark as read)
- ✅ Service role can do anything

**audit_logs table:**
- ❌ Regular users cannot access
- ✅ Only service role can access

### Authentication Flow

```
Client Request
     ↓
[Next.js Middleware]
     ↓
Check Supabase Session
     ↓
Valid? → Continue
Invalid? → Redirect to login
     ↓
[API Route Handler]
     ↓
Get user from session
     ↓
Perform authorized action
     ↓
RLS automatically filters data
```

## 🎯 Data Integrity Constraints

### Check Constraints

- **contribution_amount > 0**: Contributions must be positive
- **total_members >= 2 AND <= 50**: Groups need 2-50 members
- **security_deposit_percentage >= 0 AND <= 100**: Valid percentage
- **position >= 1**: Positions start at 1
- **cycle_number >= 1**: Cycles start at 1
- **status IN (...)**: Only allowed status values

### Unique Constraints

- **users.email**: No duplicate emails
- **users.phone**: No duplicate phone numbers
- **group_members.(group_id, user_id)**: User can only join group once
- **group_members.(group_id, position)**: Positions are unique per group
- **contributions.(group_id, user_id, cycle_number)**: One contribution per user per cycle
- **payouts.(group_id, cycle_number)**: One payout per cycle
- **transactions.reference**: Payment references are unique

### Foreign Key Constraints

All relationships enforce referential integrity. Most use CASCADE delete to maintain data consistency, except:

- **groups.created_by**: RESTRICT (can't delete group creator)
- **penalties.contribution_id**: SET NULL (keep penalty if contribution deleted)

## 📈 Performance Optimizations

### Indexes

**Most Queried Fields:**
- `users(email, phone)` - Login and lookup
- `groups(status, created_by)` - Browsing and management
- `group_members(group_id, user_id)` - Membership checks
- `contributions(group_id, cycle_number, status)` - Contribution tracking
- `transactions(user_id, reference)` - Transaction lookup

**Partial Indexes:**
- `contributions WHERE status = 'pending'` - Faster pending lookup
- `contributions WHERE status = 'pending' AND due_date < NOW()` - Overdue detection
- `groups WHERE status = 'forming'` - Available groups

**Compound Indexes:**
- `contributions(group_id, cycle_number)` - Cycle queries
- `group_members(group_id, position)` - Payout order
- `notifications(user_id, is_read)` - Unread notifications

### Query Optimization Tips

1. **Use specific columns** instead of SELECT *
2. **Filter by indexed columns** (status, group_id, user_id)
3. **Use JOINs efficiently** - join on indexed foreign keys
4. **Limit results** with LIMIT clause
5. **Use prepared statements** for repeated queries

## 🧪 Testing Recommendations

### Unit Tests
- Test database functions
- Test triggers
- Test constraint violations

### Integration Tests
- Test complete flows (signup → create group → contribute → payout)
- Test RLS policies
- Test concurrent operations

### Performance Tests
- Load test with many groups
- Stress test contribution processing
- Test with large transaction history

## 📋 Monitoring Checklist

- [ ] Monitor table sizes
- [ ] Track query performance
- [ ] Alert on failed transactions
- [ ] Monitor RLS policy performance
- [ ] Track storage usage
- [ ] Monitor database connections
- [ ] Alert on constraint violations
- [ ] Track cron job execution

---

**Last Updated**: January 2026  
**Database Version**: PostgreSQL 15+  
**Supabase Compatibility**: Latest
