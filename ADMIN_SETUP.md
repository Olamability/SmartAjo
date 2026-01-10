# Admin Account Setup and Access Guide

This guide explains how to create and manage platform administrator accounts in the SmartAjo system.

## Table of Contents

1. [What is a Platform Admin?](#what-is-a-platform-admin)
2. [Creating Admin Accounts](#creating-admin-accounts)
3. [Accessing the Admin Panel](#accessing-the-admin-panel)
4. [Admin Privileges](#admin-privileges)
5. [Managing Admin Users](#managing-admin-users)
6. [Security Best Practices](#security-best-practices)

---

## What is a Platform Admin?

A **Platform Admin** is a special user role in SmartAjo with elevated privileges to:

- View and manage **all groups** in the system (not just groups they created or joined)
- Access any group's admin panel
- View all user transactions, contributions, penalties, and payouts
- Manage members across all groups
- Monitor platform-wide activity

**Important:** This is different from a **Group Creator**, who can only manage their own groups.

---

## Creating Admin Accounts

### Prerequisites

- You need direct database access via Supabase Dashboard
- You need a user account that has already registered in the system
- You should have the SQL Editor open in Supabase

### Method 1: Using the SQL Function (Recommended)

The easiest way to create an admin is using the built-in `promote_user_to_admin` function:

1. **Navigate to Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Click "SQL Editor" in the left sidebar

2. **Run the promotion function**
   ```sql
   -- Replace with the actual user's email
   SELECT promote_user_to_admin('user@example.com');
   ```

3. **Verify the promotion**
   ```sql
   SELECT id, email, full_name, is_admin 
   FROM users 
   WHERE email = 'user@example.com';
   ```

   The `is_admin` column should now be `true`.

### Method 2: Direct SQL Update

If you prefer to update the database directly:

```sql
-- Update user to admin by email
UPDATE users
SET is_admin = TRUE, updated_at = NOW()
WHERE email = 'user@example.com';
```

### Method 3: Using Supabase Dashboard (Table Editor)

1. Navigate to **Table Editor** in Supabase Dashboard
2. Select the **users** table
3. Find the user you want to promote
4. Click on the user row to edit
5. Change the `is_admin` field from `false` to `true`
6. Click **Save**

### Creating the First Admin Account

**During Initial Setup:**

1. Register a regular account through the application at `/signup`
2. Complete the registration process
3. Log into Supabase Dashboard
4. Run the migration script (if not already done):
   ```sql
   -- Ensure the is_admin column exists
   -- Copy and paste the entire content of:
   -- supabase/migrations/add_admin_field.sql
   ```
5. Promote your account to admin using one of the methods above

---

## Accessing the Admin Panel

### Group Admin Panels

Platform admins can access the admin panel for **any group** in the system:

#### Option 1: Direct URL Access

Navigate directly to:
```
https://your-app-url.com/groups/{groupId}/admin
```

Replace `{groupId}` with the actual group ID.

#### Option 2: Via Groups List

1. Log in to your admin account
2. Navigate to `/groups`
3. Click on any group to view details
4. You'll see an **"Admin Panel"** button or link
5. Click to access the admin panel for that group

#### Option 3: Finding Group IDs

To find all group IDs in the system:

```sql
-- List all groups with their IDs
SELECT id, name, status, created_by, current_members, total_members
FROM groups
ORDER BY created_at DESC;
```

### Admin Panel Features

Once in a group's admin panel, you can:

- **Overview Tab**: View group information, statistics, and quick actions
- **Members Tab**: View all members, their security deposit status, and remove members
- **Contributions Tab**: Track payment status for the current cycle
- **Penalties Tab**: View and waive penalties
- **Export Reports**: Download CSV reports of group activity

---

## Admin Privileges

Platform admins have the following capabilities:

### Data Access

✅ **View all groups** - Including forming, active, completed, and cancelled groups
✅ **View all group members** - Across all groups in the system
✅ **View all contributions** - See payment status for all members
✅ **View all penalties** - Monitor late payment penalties
✅ **View all payouts** - Track disbursements to members
✅ **View all transactions** - Complete financial audit trail
✅ **View all notifications** - System-wide notification history

### Management Actions

✅ **Access any group's admin panel** - Manage any group as if you were the creator
✅ **Update group status** - Activate, complete, or cancel groups
✅ **Remove members** - Remove members from any group
✅ **Waive penalties** - Forgive late payment penalties
✅ **Update contributions** - Manually mark contributions as paid
✅ **Update member information** - Modify security deposit status

### Restrictions

❌ **Cannot delete groups** - Groups can only be cancelled, not deleted
❌ **Cannot delete users** - User accounts are permanent once created
❌ **Cannot modify payment transactions** - Transaction records are immutable for audit purposes

---

## Managing Admin Users

### Viewing All Admins

To see all platform administrators:

```sql
SELECT id, email, full_name, is_admin, created_at
FROM users
WHERE is_admin = TRUE
ORDER BY created_at;
```

### Revoking Admin Privileges

#### Using the SQL Function

```sql
-- Revoke admin privileges
SELECT revoke_admin_privileges('admin@example.com');
```

#### Direct SQL Update

```sql
UPDATE users
SET is_admin = FALSE, updated_at = NOW()
WHERE email = 'admin@example.com';
```

### Checking Admin Status

To check if a specific user is an admin:

```sql
SELECT email, full_name, is_admin
FROM users
WHERE email = 'user@example.com';
```

---

## Security Best Practices

### 1. Limit Admin Accounts

- **Only create admin accounts when absolutely necessary**
- Keep the number of admins to a minimum (ideally 1-3 people)
- Each admin should have a legitimate business need for full system access

### 2. Use Strong Credentials

- Admin accounts must use **strong, unique passwords**
- Enable **two-factor authentication (2FA)** in Supabase Auth settings
- Never share admin credentials

### 3. Audit Admin Activity

Regularly review admin actions:

```sql
-- View recent admin activities (requires audit_logs table)
SELECT al.*, u.email as admin_email
FROM audit_logs al
JOIN users u ON al.user_id = u.id
WHERE u.is_admin = TRUE
ORDER BY al.created_at DESC
LIMIT 50;
```

### 4. Separate Admin and Regular Accounts

- Consider using separate email addresses for admin accounts
- Example: `admin-john@company.com` vs `john@company.com`
- This makes it clear when someone is acting in an admin capacity

### 5. Document Admin Changes

Keep a record of:
- When admin privileges were granted
- Who authorized the promotion
- Why the account needs admin access
- When privileges were revoked

### 6. Regular Access Reviews

- Review admin accounts quarterly
- Revoke admin access from users who no longer need it
- Deactivate admin accounts for employees who leave

### 7. Principle of Least Privilege

- Not every staff member needs admin access
- Group creators have sufficient privileges to manage their own groups
- Only grant admin access for platform-wide management needs

---

## Troubleshooting

### Issue: Can't see the Admin Panel button

**Possible causes:**
1. User is not marked as admin in the database
2. Browser cache needs clearing
3. Need to log out and log back in

**Solution:**
```sql
-- Verify admin status
SELECT is_admin FROM users WHERE id = '<user-id>';

-- If false, promote to admin
UPDATE users SET is_admin = TRUE WHERE id = '<user-id>';
```

Then log out and log back in.

### Issue: "You do not have permission to access this admin panel"

**Possible causes:**
1. The `is_admin` flag is not set correctly
2. Database connection issue
3. RLS policies not updated

**Solution:**
1. Verify admin status in database:
   ```sql
   SELECT * FROM users WHERE email = 'your-email@example.com';
   ```

2. Ensure the migration was run:
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'users' AND column_name = 'is_admin';
   ```

3. Re-run the migration if needed:
   ```sql
   -- Run supabase/migrations/add_admin_field.sql
   ```

### Issue: Admin can see groups but not members

**Solution:**
Ensure RLS policies were updated. Re-run the updated `schema.sql` or manually update policies:

```sql
-- Check if admin policies exist
SELECT polname, polcmd 
FROM pg_policy 
WHERE polrelid = 'group_members'::regclass;
```

If policies don't include admin checks, re-run the schema or add them manually.

---

## Quick Reference

### Common SQL Queries for Admins

```sql
-- Promote user to admin
SELECT promote_user_to_admin('user@example.com');

-- Revoke admin privileges
SELECT revoke_admin_privileges('user@example.com');

-- List all admins
SELECT email, full_name FROM users WHERE is_admin = TRUE;

-- List all groups
SELECT id, name, status, current_members, total_members FROM groups;

-- Find groups with issues
SELECT * FROM groups WHERE status = 'active' AND current_members < total_members;

-- View recent transactions
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 20;

-- Check contribution payment rates
SELECT 
  g.name,
  COUNT(c.id) as total_contributions,
  COUNT(CASE WHEN c.status = 'paid' THEN 1 END) as paid,
  COUNT(CASE WHEN c.status = 'overdue' THEN 1 END) as overdue
FROM groups g
LEFT JOIN contributions c ON g.id = c.group_id
WHERE g.status = 'active'
GROUP BY g.id, g.name;
```

---

## Support

For additional help:
- Check the [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for database configuration
- Review [FEATURES_DOCUMENTATION.md](./FEATURES_DOCUMENTATION.md) for feature details
- Contact your technical team for assistance

---

**Last Updated:** January 2026  
**Version:** 1.0
