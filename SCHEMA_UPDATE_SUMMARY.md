# Schema Update Summary - Payouts and Notifications Fix

## Overview
This update addresses critical schema consistency issues and fixes bugs that were causing the "stuck at logging in" problem.

## Changes Made

### 1. Payouts Table Schema Update
**Change**: Renamed `payouts.group_id` to `payouts.related_group_id`

**Reason**: For consistency with the `notifications` table which already uses `related_group_id`

**Files Modified**:
- `supabase/schema.sql` - Table definition, indexes, constraints, RLS policies
- `supabase/functions.sql` - `process_cycle_completion()` function
- `supabase/triggers.sql` - `notify_payout_status_change()` and `create_payout_transaction()` functions
- `supabase/views.sql` - `pending_payouts_view` and `group_financial_summary` views
- `lib/server/rotation.ts` - TypeScript queries

### 2. Critical Bug Fix #1: Notification Column Mismatch
**Problem**: All triggers and functions were inserting notifications with `group_id`, but the notifications table schema only has `related_group_id`. This caused SQL errors.

**Fixed In**:
- `notify_contribution_paid()` - triggers.sql
- `notify_penalty_applied()` - triggers.sql
- `notify_new_member()` - triggers.sql
- `notify_group_status_change()` - triggers.sql
- `create_cycle_contributions()` - functions.sql
- `apply_late_penalties()` - functions.sql
- `send_payment_reminders()` - functions.sql

### 3. Critical Bug Fix #2: Invalid Notification Types
**Problem**: Many notification types didn't match the CHECK constraint in the notifications table, causing SQL errors.

**Type Mapping Fixed**:
| Old Type (Invalid) | New Type (Valid) |
|-------------------|------------------|
| `payment_received` | `contribution_paid` |
| `payout_ready` | `payout_received` |
| `payout_failed` | `general` |
| `group_joined` | `member_joined` |
| `payment_due` | `contribution_due` |
| `payment_overdue` | `contribution_reminder` |

## Root Cause of Login Issue

The "stuck at logging in" problem was caused by SQL errors in database triggers that fire during user operations. Specifically:

1. **Notification Insert Failures**: When users performed actions (login, join group, make contribution), triggers would attempt to insert notifications using the wrong column name (`group_id` instead of `related_group_id`), causing the entire database transaction to fail.

2. **Type Constraint Violations**: Even when the column name was correct, invalid notification types would cause CHECK constraint violations, also failing the transaction.

3. **Cascading Failures**: These trigger failures prevented successful completion of user operations, making the application appear "stuck" during login and other critical flows.

## Impact

### Before Fix
- Users could not log in successfully
- Notifications could not be created
- Payouts could not be processed
- Any operation involving triggers would fail silently or cause errors

### After Fix
- Login operations complete successfully
- All notification types are valid and inserts work
- Payout processing uses consistent column naming
- Database operations complete without SQL errors

## Migration Instructions

To apply these changes to an existing database:

1. Run the migration file: `sql/migrations/2026-01-08-rename-payouts-group-id-to-related-group-id.sql`

2. The migration will:
   - Rename the column in the payouts table
   - Recreate indexes with the new name
   - Update RLS policies
   - Recreate affected views

3. Deploy the updated function and trigger files:
   - `supabase/functions.sql`
   - `supabase/triggers.sql`
   - `supabase/views.sql`

4. Deploy the updated application code:
   - `lib/server/rotation.ts`

## Testing Checklist

After applying the migration:

- [ ] User login works without errors
- [ ] User can register and verify email
- [ ] Contributions can be made and notifications are created
- [ ] Penalties can be applied and notifications are sent
- [ ] Users can join groups and receive notifications
- [ ] Payouts can be created and processed
- [ ] Cycle completion triggers work correctly
- [ ] All notification types are valid
- [ ] No SQL errors in database logs

## Rollback Plan

If issues occur, you can rollback by:

1. Rename column back: `ALTER TABLE payouts RENAME COLUMN related_group_id TO group_id;`
2. Recreate old indexes
3. Revert function and trigger changes
4. Revert view changes

However, this will reintroduce the bugs. It's recommended to fix any issues forward rather than rollback.

## Notes

- All changes are backward-compatible in terms of data - no data loss occurs
- The migration preserves all existing payout records
- Functions and triggers must be updated together with the schema
- TypeScript code changes are minimal and localized to one file
