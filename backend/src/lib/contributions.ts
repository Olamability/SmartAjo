
/**
 * Contribution Tracking Service
 * Handles automatic creation and tracking of contributions
 */

import { query, transaction } from './db';
import { processCyclePayout, areAllContributionsPaid, advanceGroupCycle, shouldCompleteGroup, completeGroup } from './rotation';

/**
 * Calculate next due date based on frequency
 */
export function calculateNextDueDate(lastDueDate: Date, frequency: 'daily' | 'weekly' | 'monthly'): Date {
  const nextDate = new Date(lastDueDate);
  
  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
  }
  
  return nextDate;
}

/**
 * Create contribution records for a new cycle
 * This creates pending contribution records for all active members
 */
export async function createCycleContributions(groupId: string, cycleNumber: number): Promise<boolean> {
  try {
    return await transaction(async (client) => {
      // Get group details
      const groupResult = await client.query(
        `SELECT 
          id, 
          name, 
          contribution_amount, 
          frequency,
          current_cycle,
          start_date
        FROM groups 
        WHERE id = $1 AND status = 'active'`,
        [groupId]
      );

      if (groupResult.rows.length === 0) {
        console.log(`Group ${groupId} not found or not active`);
        return false;
      }

      const group = groupResult.rows[0];

      // Calculate due date for this cycle
      const startDate = new Date(group.start_date);
      let dueDate = new Date(startDate);
      
      // Add cycles to start date based on frequency
      for (let i = 1; i < cycleNumber; i++) {
        dueDate = calculateNextDueDate(dueDate, group.frequency);
      }

      // Get all active members who have paid security deposit
      const membersResult = await client.query(
        `SELECT user_id 
         FROM group_members 
         WHERE group_id = $1 
           AND status = 'active'
           AND has_paid_security_deposit = true`,
        [groupId]
      );

      if (membersResult.rows.length === 0) {
        console.log(`No active members found for group ${groupId}`);
        return false;
      }

      // Create contribution record for each member
      for (const member of membersResult.rows) {
        await client.query(
          `INSERT INTO contributions (
            group_id,
            user_id,
            cycle_number,
            amount,
            due_date,
            status
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (group_id, user_id, cycle_number) DO NOTHING`,
          [
            groupId,
            member.user_id,
            cycleNumber,
            group.contribution_amount,
            dueDate,
            'pending'
          ]
        );

        // Create notification for contribution due
        await client.query(
          `INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            related_group_id
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            member.user_id,
            'contribution_due',
            'Contribution Due',
            `Your contribution of ₦${parseFloat(group.contribution_amount).toLocaleString()} for ${group.name} is due on ${dueDate.toLocaleDateString()}`,
            groupId
          ]
        );
      }

      console.log(`Created contributions for group ${groupId}, cycle ${cycleNumber}`);
      return true;
    });

  } catch (error) {
    console.error('Error creating cycle contributions:', error);
    return false;
  }
}

/**
 * Process a contribution payment
 * Updates contribution status and checks if cycle payout should be processed
 */
export async function processContributionPayment(
  contributionId: string,
  transactionReference: string
): Promise<boolean> {
  try {
    return await transaction(async (client) => {
      // Get contribution details
      const contributionResult = await client.query(
        `SELECT 
          c.id,
          c.group_id,
          c.user_id,
          c.cycle_number,
          c.amount,
          c.status,
          g.name as group_name
        FROM contributions c
        INNER JOIN groups g ON c.group_id = g.id
        WHERE c.id = $1`,
        [contributionId]
      );

      if (contributionResult.rows.length === 0) {
        throw new Error('Contribution not found');
      }

      const contribution = contributionResult.rows[0];

      if (contribution.status === 'paid') {
        console.log(`Contribution ${contributionId} already paid`);
        return false;
      }

      // Update contribution status
      await client.query(
        `UPDATE contributions 
         SET status = 'paid', paid_date = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [contributionId]
      );

      console.log(`Contribution ${contributionId} marked as paid`);

      // Check if all contributions for this cycle are now paid
      const allPaid = await areAllContributionsPaid(
        contribution.group_id,
        contribution.cycle_number
      );

      if (allPaid) {
        console.log(`All contributions paid for group ${contribution.group_id}, cycle ${contribution.cycle_number}`);
        
        // Process payout
        const payoutProcessed = await processCyclePayout(
          contribution.group_id,
          contribution.cycle_number
        );

        if (payoutProcessed) {
          // Check if group should be completed
          const shouldComplete = await shouldCompleteGroup(contribution.group_id);
          
          if (shouldComplete) {
            await completeGroup(contribution.group_id);
          } else {
            // Advance to next cycle
            await advanceGroupCycle(contribution.group_id);
            
            // Create contributions for next cycle
            await createCycleContributions(
              contribution.group_id,
              contribution.cycle_number + 1
            );
          }
        }
      }

      return true;
    });

  } catch (error) {
    console.error('Error processing contribution payment:', error);
    return false;
  }
}

/**
 * Get upcoming contributions for a user
 */
export async function getUpcomingContributions(userId: string, daysAhead: number = 7): Promise<any[]> {
  try {
    const result = await query(
      `SELECT 
        c.id,
        c.group_id,
        c.cycle_number,
        c.amount,
        c.due_date,
        c.status,
        g.name as group_name,
        g.frequency
      FROM contributions c
      INNER JOIN groups g ON c.group_id = g.id
      WHERE c.user_id = $1
        AND c.status = 'pending'
        AND c.due_date <= NOW() + INTERVAL '${daysAhead} days'
      ORDER BY c.due_date ASC`,
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      groupId: row.group_id,
      groupName: row.group_name,
      cycleNumber: row.cycle_number,
      amount: parseFloat(row.amount),
      dueDate: row.due_date,
      status: row.status,
      frequency: row.frequency,
    }));

  } catch (error) {
    console.error('Error getting upcoming contributions:', error);
    return [];
  }
}

/**
 * Get contribution statistics for a user
 */
export async function getUserContributionStats(userId: string): Promise<{
  totalContributions: number;
  paidContributions: number;
  pendingContributions: number;
  overdueContributions: number;
  totalAmountPaid: number;
  totalAmountPending: number;
}> {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) as total_contributions,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_contributions,
        SUM(CASE WHEN status = 'pending' AND due_date >= NOW() THEN 1 ELSE 0 END) as pending_contributions,
        SUM(CASE WHEN status = 'pending' AND due_date < NOW() THEN 1 ELSE 0 END) as overdue_contributions,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_amount_paid,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_amount_pending
      FROM contributions
      WHERE user_id = $1`,
      [userId]
    );

    const row = result.rows[0];

    return {
      totalContributions: parseInt(row.total_contributions),
      paidContributions: parseInt(row.paid_contributions),
      pendingContributions: parseInt(row.pending_contributions),
      overdueContributions: parseInt(row.overdue_contributions),
      totalAmountPaid: parseFloat(row.total_amount_paid),
      totalAmountPending: parseFloat(row.total_amount_pending),
    };

  } catch (error) {
    console.error('Error getting user contribution stats:', error);
    return {
      totalContributions: 0,
      paidContributions: 0,
      pendingContributions: 0,
      overdueContributions: 0,
      totalAmountPaid: 0,
      totalAmountPending: 0,
    };
  }
}

/**
 * Initialize contributions for a newly activated group
 * Called when group reaches full capacity and becomes active
 */
export async function initializeGroupContributions(groupId: string): Promise<boolean> {
  try {
    // Create contributions for cycle 1
    return await createCycleContributions(groupId, 1);

  } catch (error) {
    console.error('Error initializing group contributions:', error);
    return false;
  }
}
