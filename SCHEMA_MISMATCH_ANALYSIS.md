# TypeScript Code vs SQL Schema Mismatches

## Analysis Date: 2026-01-08

This document identifies all mismatches between TypeScript code/types and the actual SQL schema.

## Critical Issues

### 1. Phone Field - NULL vs NOT NULL

**SQL Schema** (`users` table):
```sql
phone VARCHAR(20) UNIQUE NOT NULL
```

**TypeScript Code** (`src/lib/utils/profile.ts` and `src/services/auth.ts`):
```typescript
phone: authUser.user_metadata?.phone || '',
```

**Issue**: Code allows empty string for phone, but SQL requires NOT NULL. An empty string satisfies NOT NULL but may violate UNIQUE constraint if multiple users have empty phone.

**Fix Required**: 
- Option 1: Make phone field nullable in SQL: `phone VARCHAR(20) UNIQUE`
- Option 2: Require phone in signup and fail if not provided
- Option 3: Generate unique placeholder phone (e.g., `temp_${userId}`)

### 2. Payouts Table - Column Name

**SQL Schema** (`payouts` table):
```sql
related_group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE
```

**TypeScript Types** (`src/types/index.ts`):
```typescript
export interface Payout {
  groupId: string;  // Should be relatedGroupId
  ...
}
```

**Fix Required**: Update TypeScript interface to use `relatedGroupId` to match SQL schema

### 3. Contribution Status Values

**SQL Schema** (`contributions` table):
```sql
status VARCHAR(20) DEFAULT 'pending'
-- No CHECK constraint specifying allowed values
```

**TypeScript Types** (`src/types/index.ts`):
```typescript
status: 'pending' | 'paid' | 'late' | 'missed';
```

**Note**: SQL doesn't enforce these values with CHECK constraint. Should add CHECK constraint for data integrity.

### 4. Payout Status Values  

**SQL Schema** (`payouts` table):
```sql
status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
```

**TypeScript Types** (`src/types/index.ts`):
```typescript
status: 'pending' | 'processed' | 'failed';  // Missing 'processing', has 'processed' instead of 'completed'
```

**Fix Required**: Update TypeScript to match SQL: `'pending' | 'processing' | 'completed' | 'failed'`

### 5. Group Status Values

**SQL Schema** (`groups` table):
```sql
status VARCHAR(20) DEFAULT 'forming' CHECK (status IN ('forming', 'active', 'paused', 'completed', 'cancelled'))
```

**TypeScript Types** (`src/types/index.ts`):
```typescript
status: 'forming' | 'active' | 'completed' | 'cancelled';  // Missing 'paused'
```

**Fix Required**: Add 'paused' to TypeScript type

### 6. Penalty Status/Reason Values

**SQL Schema** (`penalties` table):
```sql
type VARCHAR(50) NOT NULL CHECK (type IN ('late_payment', 'missed_payment', 'early_exit'))
status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'waived'))
```

**TypeScript Types** (`src/types/index.ts`):
```typescript
export interface Penalty {
  reason: 'late_payment' | 'missed_payment' | 'default';  // Should be 'type', and 'default' should be 'early_exit'
  status: 'applied' | 'waived';  // Missing 'unpaid' and 'paid'
}
```

**Fix Required**: 
- Rename `reason` to `type`
- Change 'default' to 'early_exit'
- Update status to: `'unpaid' | 'paid' | 'waived'`

### 7. KYC Status - Database vs Application Values

**SQL Schema** (`users` table):
```sql
kyc_status VARCHAR(50) DEFAULT 'not_started' CHECK (kyc_status IN ('not_started', 'pending', 'approved', 'rejected'))
```

**TypeScript Types** (`src/types/index.ts`):
```typescript
kycStatus: 'not_started' | 'pending' | 'verified' | 'rejected';  // 'verified' vs 'approved'
```

**Note**: This is intentional - there's a converter function `convertKycStatus()` that maps 'approved' -> 'verified' for the application layer. This is documented and working correctly.

### 8. Missing Fields in TypeScript Types

**Users Type Missing**:
- `is_active: BOOLEAN`
- `kyc_data: JSONB`
- `date_of_birth: DATE`
- `address: TEXT`
- `updated_at: TIMESTAMPTZ`
- `last_login_at: TIMESTAMPTZ`

**Groups Type Missing**:
- `created_by: UUID`
- `end_date: TIMESTAMPTZ`
- `updated_at: TIMESTAMPTZ`
- Missing `paused` status

**Contributions Type Missing**:
- `is_overdue: BOOLEAN`
- `updated_at: TIMESTAMPTZ`

**Payouts Type Missing**:
- `payment_method: VARCHAR(50)`
- `notes: TEXT`
- `updated_at: TIMESTAMPTZ`

### 9. Field Name Mismatches

**Contributions**:
- TS: `cycle` → SQL: `cycle_number`
- TS: `dueDate` → SQL: `due_date`
- TS: `paidDate` → SQL: `paid_date`
- TS: `transactionRef` → SQL: `transaction_ref`
- TS: `serviceFee` → SQL: `service_fee`

**Payouts**:
- TS: `groupId` → SQL: `related_group_id`
- TS: `userId` → SQL: `recipient_id`
- TS: `cycle` → SQL: `cycle_number`
- TS: `scheduledDate` → SQL: `payout_date`
- TS: `processedDate` → SQL: `payout_date` (same field, different semantic)
- TS: `transactionRef` → SQL: `payment_reference`

**Notifications**:
- TS: `groupId` → SQL: `related_group_id`
- TS: `read` → SQL: `is_read`
- TS: `createdAt` → SQL: `created_at`
- Missing: `related_transaction_id`, `read_at`

### 10. Notification Type Values

**SQL Schema** (`notifications` table):
```sql
type VARCHAR(50) NOT NULL CHECK (type IN (
  'payment_due', 'payment_received', 'payment_overdue',
  'payout_ready', 'payout_processed',
  'penalty_applied', 'group_complete', 'group_started',
  'member_joined', 'member_removed', 'system_announcement'
))
```

**TypeScript Types**:
```typescript
type: 'payment_due' | 'payment_received' | 'payout_ready' | 'penalty_applied' | 'group_complete';
```

**Fix Required**: Add missing notification types to TypeScript

## Recommended Actions

### Priority 1 (Critical - Breaks Functionality)

1. **Fix phone field handling** - Decide on strategy for phone field
2. **Fix payout status types** - Update to match SQL
3. **Fix payout field names** - Use `relatedGroupId` instead of `groupId`

### Priority 2 (Important - Data Integrity)

4. **Add CHECK constraint for contribution status**
5. **Fix penalty type/status fields**
6. **Add missing 'paused' status to groups**
7. **Add notification types**

### Priority 3 (Nice to Have - Completeness)

8. **Add missing optional fields to types**
9. **Align camelCase/snake_case mapping consistently**
10. **Add JSDoc comments documenting field mappings**

## Convention Notes

The codebase uses this convention:
- **SQL**: snake_case (e.g., `full_name`, `created_at`)
- **TypeScript**: camelCase (e.g., `fullName`, `createdAt`)
- Supabase client automatically handles this conversion in most cases

However, when manually constructing queries or handling responses, we must be explicit about field names.
