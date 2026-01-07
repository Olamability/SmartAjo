import 'server-only';

/**
 * Cron Job Service
 * Handles scheduled tasks for the application
 * This should be run as a separate process or API endpoint triggered by a cron service
 */

import { checkAndApplyPenalties } from './penalties';
import { query } from './db';

/**
 * Daily tasks that should run once per day
 */
export async function runDailyTasks(): Promise<void> {
  console.log('=== Starting daily tasks ===');
  const startTime = Date.now();

  try {
    // 1. Check and apply penalties for overdue contributions
    console.log('[Task 1/2] Checking and applying penalties...');
    await checkAndApplyPenalties();

    // 2. Send reminders for upcoming contributions (next 3 days)
    console.log('[Task 2/2] Sending contribution reminders...');
    await sendContributionReminders();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`=== Daily tasks completed in ${duration}s ===`);

  } catch (error) {
    console.error('Error running daily tasks:', error);
    throw error;
  }
}

/**
 * Send reminders for upcoming contributions
 */
async function sendContributionReminders(): Promise<void> {
  try {
    // Get contributions due in the next 3 days that haven't been paid
    const result = await query(
      `SELECT 
        c.id,
        c.user_id,
        c.group_id,
        c.amount,
        c.due_date,
        g.name as group_name,
        u.email,
        u.full_name
      FROM contributions c
      INNER JOIN groups g ON c.group_id = g.id
      INNER JOIN users u ON c.user_id = u.id
      WHERE c.status = 'pending'
        AND c.due_date > NOW()
        AND c.due_date <= NOW() + INTERVAL '3 days'
        AND g.status = 'active'
      ORDER BY c.due_date ASC`
    );

    if (result.rows.length === 0) {
      console.log('No upcoming contributions to remind');
      return;
    }

    console.log(`Found ${result.rows.length} upcoming contributions`);

    for (const contribution of result.rows) {
      const dueDate = new Date(contribution.due_date);
      const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      // Check if reminder was already sent today
      const reminderCheck = await query(
        `SELECT id FROM notifications 
         WHERE user_id = $1 
           AND type = 'contribution_reminder'
           AND created_at > NOW() - INTERVAL '24 hours'
           AND message LIKE $2`,
        [contribution.user_id, `%${contribution.group_name}%`]
      );

      if (reminderCheck.rows.length > 0) {
        continue; // Skip if already reminded today
      }

      // Create reminder notification
      await query(
        `INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          related_group_id
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          contribution.user_id,
          'contribution_reminder',
          'Contribution Due Soon',
          `Reminder: Your contribution of ₦${parseFloat(contribution.amount).toLocaleString()} for ${contribution.group_name} is due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`,
          contribution.group_id
        ]
      );

      console.log(`Sent reminder to user ${contribution.user_id} for contribution ${contribution.id}`);
    }

  } catch (error) {
    console.error('Error sending contribution reminders:', error);
  }
}

/**
 * Hourly tasks (if needed)
 */
export async function runHourlyTasks(): Promise<void> {
  console.log('=== Starting hourly tasks ===');
  const startTime = Date.now();

  try {
    // Check for groups that should transition from forming to active
    console.log('[Task 1/1] Checking for groups to activate...');
    await activateFullGroups();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`=== Hourly tasks completed in ${duration}s ===`);

  } catch (error) {
    console.error('Error running hourly tasks:', error);
    throw error;
  }
}

/**
 * Activate groups that have reached full capacity
 */
async function activateFullGroups(): Promise<void> {
  try {
    // Find groups that are forming and have all positions filled
    const result = await query(
      `SELECT 
        g.id,
        g.name,
        g.total_members,
        g.current_members,
        COUNT(gm.id) FILTER (WHERE gm.has_paid_security_deposit = true) as members_paid_deposit
      FROM groups g
      LEFT JOIN group_members gm ON g.id = gm.group_id AND gm.status = 'active'
      WHERE g.status = 'forming'
        AND g.current_members >= g.total_members
      GROUP BY g.id, g.name, g.total_members, g.current_members
      HAVING COUNT(gm.id) FILTER (WHERE gm.has_paid_security_deposit = true) >= g.total_members`
    );

    if (result.rows.length === 0) {
      console.log('No groups ready to activate');
      return;
    }

    console.log(`Found ${result.rows.length} groups ready to activate`);

    for (const group of result.rows) {
      // Update group status to active
      await query(
        `UPDATE groups 
         SET status = 'active', updated_at = NOW()
         WHERE id = $1`,
        [group.id]
      );

      // Import the contributions module dynamically to avoid circular deps
      const { initializeGroupContributions } = await import('./contributions');
      
      // Initialize first cycle contributions
      await initializeGroupContributions(group.id);

      // Notify all members
      const members = await query(
        `SELECT user_id FROM group_members WHERE group_id = $1 AND status = 'active'`,
        [group.id]
      );

      for (const member of members.rows) {
        await query(
          `INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            related_group_id
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            member.user_id,
            'group_activated',
            'Group Activated!',
            `Great news! The group "${group.name}" is now active and the savings cycle has begun.`,
            group.id
          ]
        );
      }

      console.log(`Activated group ${group.id} (${group.name})`);
    }

  } catch (error) {
    console.error('Error activating full groups:', error);
  }
}

/**
 * Health check for cron service
 */
export function healthCheck(): { status: string; timestamp: string } {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
}
