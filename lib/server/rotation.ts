import 'server-only';

/**
 * Group Rotation and Payout Service
 * Handles the core business logic for rotating savings groups:
 * - Determining next payout recipient
 * - Calculating payout amounts
 * - Managing group lifecycle
 * - Processing automated payouts
 */

import { query, transaction } from './db';

export interface RotationMember {
  userId: string;
  position: number;
  hasPaidSecurityDeposit: boolean;
  hasReceivedPayout: boolean;
}

/**
 * Get the next member to receive payout in a group
 */
export async function getNextPayoutRecipient(groupId: string): Promise<RotationMember | null> {
  try {
    // Get all active members who haven't received payout yet, ordered by position
    const result = await query(
      `SELECT 
        gm.user_id,
        gm.position,
        gm.has_paid_security_deposit,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM payouts p 
            WHERE p.related_group_id = $1 AND p.recipient_id = gm.user_id
          ) THEN true 
          ELSE false 
        END as has_received_payout
      FROM group_members gm
      WHERE gm.group_id = $1 
        AND gm.status = 'active'
        AND gm.has_paid_security_deposit = true
      ORDER BY gm.position ASC`,
      [groupId]
    );

    // Find first member who hasn't received payout
    const nextRecipient = result.rows.find(member => !member.has_received_payout);
    
    if (!nextRecipient) {
      return null;
    }

    return {
      userId: nextRecipient.user_id,
      position: nextRecipient.position,
      hasPaidSecurityDeposit: nextRecipient.has_paid_security_deposit,
      hasReceivedPayout: nextRecipient.has_received_payout,
    };
  } catch (error) {
    console.error('Error getting next payout recipient:', error);
    return null;
  }
}

/**
 * Calculate the payout amount for current cycle
 * Total = (All contributions for this cycle) - (Service fee)
 */
export async function calculateCyclePayout(groupId: string, cycleNumber: number): Promise<number> {
  try {
    const result = await query(
      `SELECT 
        COALESCE(SUM(c.amount), 0) as total_contributions,
        g.service_fee_percentage
      FROM contributions c
      INNER JOIN groups g ON c.group_id = g.id
      WHERE c.group_id = $1 
        AND c.cycle_number = $2 
        AND c.status = 'paid'
      GROUP BY g.service_fee_percentage`,
      [groupId, cycleNumber]
    );

    if (result.rows.length === 0) {
      return 0;
    }

    const totalContributions = parseFloat(result.rows[0].total_contributions);
    const serviceFeePercentage = parseFloat(result.rows[0].service_fee_percentage);
    
    // Calculate service fee
    const serviceFee = (totalContributions * serviceFeePercentage) / 100;
    
    // Payout = Total contributions - Service fee
    const payoutAmount = totalContributions - serviceFee;
    
    return Math.floor(payoutAmount); // Round down to nearest whole number

  } catch (error) {
    console.error('Error calculating cycle payout:', error);
    return 0;
  }
}

/**
 * Process payout for the current cycle
 * This should be called when all contributions for a cycle are paid
 */
export async function processCyclePayout(groupId: string, cycleNumber: number): Promise<boolean> {
  try {
    return await transaction(async (client) => {
      // Get group details
      const groupResult = await client.query(
        `SELECT id, name, current_cycle, status FROM groups WHERE id = $1`,
        [groupId]
      );

      if (groupResult.rows.length === 0) {
        throw new Error('Group not found');
      }

      const group = groupResult.rows[0];

      if (group.status !== 'active') {
        throw new Error('Group is not active');
      }

      // Check if payout already exists for this cycle
      const existingPayout = await client.query(
        `SELECT id FROM payouts WHERE related_group_id = $1 AND cycle_number = $2`,
        [groupId, cycleNumber]
      );

      if (existingPayout.rows.length > 0) {
        console.log(`Payout already processed for group ${groupId}, cycle ${cycleNumber}`);
        return false;
      }

      // Get next recipient
      const nextRecipient = await getNextPayoutRecipient(groupId);
      
      if (!nextRecipient) {
        console.log(`No eligible recipient found for group ${groupId}`);
        return false;
      }

      // Calculate payout amount
      const payoutAmount = await calculateCyclePayout(groupId, cycleNumber);
      
      if (payoutAmount <= 0) {
        throw new Error('Payout amount must be greater than zero');
      }

      // Create payout record
      const payoutResult = await client.query(
        `INSERT INTO payouts (
          related_group_id,
          recipient_id,
          cycle_number,
          amount,
          status,
          payout_date
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id`,
        [groupId, nextRecipient.userId, cycleNumber, payoutAmount, 'completed']
      );

      const payoutId = payoutResult.rows[0].id;

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
          nextRecipient.userId,
          groupId,
          'payout',
          payoutAmount,
          'completed',
          `PAYOUT-${groupId}-CYCLE${cycleNumber}`,
          `Payout for ${group.name} - Cycle ${cycleNumber}`
        ]
      );

      // Create notification for recipient
      await client.query(
        `INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          related_group_id
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          nextRecipient.userId,
          'payout_received',
          'Payout Received!',
          `You have received ₦${payoutAmount.toLocaleString()} from ${group.name} for cycle ${cycleNumber}`,
          groupId
        ]
      );

      console.log(`Payout processed successfully for group ${groupId}, cycle ${cycleNumber}, recipient ${nextRecipient.userId}`);
      
      return true;
    });

  } catch (error) {
    console.error('Error processing cycle payout:', error);
    return false;
  }
}

/**
 * Check if all contributions for a cycle are paid
 */
export async function areAllContributionsPaid(groupId: string, cycleNumber: number): Promise<boolean> {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) as total_contributions,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_contributions
      FROM contributions
      WHERE group_id = $1 AND cycle_number = $2`,
      [groupId, cycleNumber]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const total = parseInt(result.rows[0].total_contributions);
    const paid = parseInt(result.rows[0].paid_contributions);

    return total > 0 && total === paid;

  } catch (error) {
    console.error('Error checking contributions status:', error);
    return false;
  }
}

/**
 * Advance group to next cycle
 */
export async function advanceGroupCycle(groupId: string): Promise<boolean> {
  try {
    const result = await query(
      `UPDATE groups 
       SET current_cycle = current_cycle + 1, updated_at = NOW()
       WHERE id = $1
       RETURNING current_cycle`,
      [groupId]
    );

    return result.rows.length > 0;

  } catch (error) {
    console.error('Error advancing group cycle:', error);
    return false;
  }
}

/**
 * Check if group should be completed (all members received payout)
 */
export async function shouldCompleteGroup(groupId: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT 
        (SELECT COUNT(*) FROM group_members WHERE group_id = $1 AND status = 'active') as total_members,
        (SELECT COUNT(*) FROM payouts WHERE related_group_id = $1) as total_payouts
      FROM groups WHERE id = $1`,
      [groupId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const totalMembers = parseInt(result.rows[0].total_members);
    const totalPayouts = parseInt(result.rows[0].total_payouts);

    return totalMembers > 0 && totalMembers === totalPayouts;

  } catch (error) {
    console.error('Error checking group completion status:', error);
    return false;
  }
}

/**
 * Complete a group (mark as completed, process final tasks)
 */
export async function completeGroup(groupId: string): Promise<boolean> {
  try {
    return await transaction(async (client) => {
      // Update group status
      await client.query(
        `UPDATE groups 
         SET status = 'completed', end_date = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [groupId]
      );

      // Get group details for notifications
      const groupResult = await client.query(
        `SELECT name FROM groups WHERE id = $1`,
        [groupId]
      );

      const groupName = groupResult.rows[0].name;

      // Notify all members
      const members = await client.query(
        `SELECT user_id FROM group_members WHERE group_id = $1 AND status = 'active'`,
        [groupId]
      );

      for (const member of members.rows) {
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
            'group_completed',
            'Group Completed!',
            `Congratulations! The group "${groupName}" has completed successfully. All members have received their payouts.`,
            groupId
          ]
        );
      }

      console.log(`Group ${groupId} completed successfully`);
      return true;
    });

  } catch (error) {
    console.error('Error completing group:', error);
    return false;
  }
}
