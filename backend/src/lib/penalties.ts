
/**
 * Penalty Calculation Service
 * Handles penalty logic for late or missed contributions
 */

import { query, transaction } from './db';

export interface PenaltyConfig {
  lateFeePercentage: number; // Percentage of contribution amount
  missedContributionPenalty: number; // Fixed penalty for missed contribution
  gracePeriodDays: number; // Days after due date before penalty applies
}

// Default penalty configuration
const DEFAULT_PENALTY_CONFIG: PenaltyConfig = {
  lateFeePercentage: 5, // 5% late fee
  missedContributionPenalty: 1000, // ₦1000 fixed penalty
  gracePeriodDays: 2, // 2 days grace period
};

/**
 * Calculate penalty for a late contribution
 */
export function calculateLatePenalty(contributionAmount: number, daysLate: number, config: PenaltyConfig = DEFAULT_PENALTY_CONFIG): number {
  if (daysLate <= config.gracePeriodDays) {
    return 0; // No penalty during grace period
  }

  // Calculate percentage-based penalty
  const penalty = (contributionAmount * config.lateFeePercentage) / 100;
  
  return Math.floor(penalty);
}

/**
 * Check and apply penalties for overdue contributions
 * This should be run daily as a cron job
 */
export async function checkAndApplyPenalties(): Promise<void> {
  try {
    console.log('Starting penalty check...');

    // Get all overdue contributions that don't have pending payments
    const overdueResult = await query(
      `SELECT 
        c.id as contribution_id,
        c.user_id,
        c.group_id,
        c.amount,
        c.due_date,
        c.status,
        g.name as group_name,
        EXTRACT(DAY FROM NOW() - c.due_date) as days_overdue
      FROM contributions c
      INNER JOIN groups g ON c.group_id = g.id
      WHERE c.status = 'pending'
        AND c.due_date < NOW()
        AND g.status = 'active'
      ORDER BY c.due_date ASC`
    );

    if (overdueResult.rows.length === 0) {
      console.log('No overdue contributions found');
      return;
    }

    console.log(`Found ${overdueResult.rows.length} overdue contributions`);

    for (const contribution of overdueResult.rows) {
      const daysOverdue = parseInt(contribution.days_overdue);
      const penaltyAmount = calculateLatePenalty(
        parseFloat(contribution.amount),
        daysOverdue
      );

      if (penaltyAmount > 0) {
        // Check if penalty already exists for this contribution
        const existingPenalty = await query(
          `SELECT id FROM penalties 
           WHERE contribution_id = $1 AND type = 'late_payment'`,
          [contribution.contribution_id]
        );

        if (existingPenalty.rows.length === 0) {
          // Apply penalty
          await applyPenalty(
            contribution.user_id,
            contribution.group_id,
            contribution.contribution_id,
            penaltyAmount,
            'late_payment',
            `Late payment penalty for ${contribution.group_name} contribution`
          );

          console.log(`Applied penalty of ₦${penaltyAmount} to user ${contribution.user_id} for contribution ${contribution.contribution_id}`);
        }
      }
    }

    console.log('Penalty check completed');

  } catch (error) {
    console.error('Error checking and applying penalties:', error);
  }
}

/**
 * Apply a penalty to a user
 */
export async function applyPenalty(
  userId: string,
  groupId: string,
  contributionId: string | null,
  amount: number,
  type: 'late_payment' | 'missed_payment' | 'early_exit',
  reason: string
): Promise<boolean> {
  try {
    return await transaction(async (client) => {
      // Create penalty record
      const penaltyResult = await client.query(
        `INSERT INTO penalties (
          user_id,
          group_id,
          contribution_id,
          amount,
          type,
          reason,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [userId, groupId, contributionId, amount, type, reason, 'applied']
      );

      const penaltyId = penaltyResult.rows[0].id;

      // Create transaction record
      await client.query(
        `INSERT INTO transactions (
          user_id,
          group_id,
          type,
          amount,
          status,
          reference,
          description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          groupId,
          'penalty',
          amount,
          'completed',
          `PENALTY-${penaltyId}`,
          reason
        ]
      );

      // Create notification
      await client.query(
        `INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          related_group_id
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          'penalty_applied',
          'Penalty Applied',
          `A penalty of ₦${amount.toLocaleString()} has been applied: ${reason}`,
          groupId
        ]
      );

      return true;
    });

  } catch (error) {
    console.error('Error applying penalty:', error);
    return false;
  }
}

/**
 * Get user's total pending penalties
 */
export async function getUserPendingPenalties(userId: string, groupId?: string): Promise<number> {
  try {
    let queryText = `
      SELECT COALESCE(SUM(amount), 0) as total_penalties
      FROM penalties
      WHERE user_id = $1 AND status = 'applied'
    `;

    const queryParams: any[] = [userId];

    if (groupId) {
      queryText += ' AND group_id = $2';
      queryParams.push(groupId);
    }

    const result = await query(queryText, queryParams);

    return parseFloat(result.rows[0].total_penalties);

  } catch (error) {
    console.error('Error getting user pending penalties:', error);
    return 0;
  }
}

/**
 * Mark penalties as paid
 */
export async function markPenaltiesAsPaid(userId: string, groupId: string, amount: number): Promise<boolean> {
  try {
    const result = await query(
      `UPDATE penalties 
       SET status = 'paid', paid_date = NOW(), updated_at = NOW()
       WHERE user_id = $1 
         AND group_id = $2 
         AND status = 'applied'
         AND amount <= $3
       RETURNING id`,
      [userId, groupId, amount]
    );

    return result.rows.length > 0;

  } catch (error) {
    console.error('Error marking penalties as paid:', error);
    return false;
  }
}

/**
 * Get penalty statistics for a group
 */
export async function getGroupPenaltyStats(groupId: string): Promise<{
  totalPenalties: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
}> {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) as total_penalties,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN status = 'applied' THEN amount ELSE 0 END), 0) as pending_amount
      FROM penalties
      WHERE group_id = $1`,
      [groupId]
    );

    const row = result.rows[0];

    return {
      totalPenalties: parseInt(row.total_penalties),
      totalAmount: parseFloat(row.total_amount),
      paidAmount: parseFloat(row.paid_amount),
      pendingAmount: parseFloat(row.pending_amount),
    };

  } catch (error) {
    console.error('Error getting group penalty stats:', error);
    return {
      totalPenalties: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
    };
  }
}
