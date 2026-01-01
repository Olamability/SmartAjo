const pool = require('../config/database');

/**
 * Transaction Controller
 * Handles transaction history and queries
 */

// Get user's transactions
async function getUserTransactions(req, res) {
  try {
    const userId = req.userId;
    const {
      groupId,
      type,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    let query = `
      SELECT t.*, g.name as group_name
      FROM transactions t
      LEFT JOIN groups g ON t.group_id = g.id
      WHERE t.user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    // Add filters
    if (groupId) {
      query += ` AND t.group_id = $${paramIndex}`;
      params.push(groupId);
      paramIndex++;
    }

    if (type) {
      query += ` AND t.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (status) {
      query += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND t.created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND t.created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY t.created_at DESC`;

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    const transactions = result.rows.map(tx => ({
      id: tx.id,
      groupId: tx.group_id,
      groupName: tx.group_name,
      type: tx.type,
      amount: parseFloat(tx.amount),
      status: tx.status,
      paymentReference: tx.payment_reference,
      paymentMethod: tx.payment_method,
      description: tx.description,
      metadata: tx.metadata,
      createdAt: tx.created_at,
      updatedAt: tx.updated_at
    }));

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM transactions t
      WHERE t.user_id = $1
      ${groupId ? ` AND t.group_id = '${groupId}'` : ''}
      ${type ? ` AND t.type = '${type}'` : ''}
      ${status ? ` AND t.status = '${status}'` : ''}
      ${startDate ? ` AND t.created_at >= '${startDate}'` : ''}
      ${endDate ? ` AND t.created_at <= '${endDate}'` : ''}
    `;
    const countResult = await pool.query(countQuery, [userId]);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get user transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions'
    });
  }
}

// Get group transactions (all transactions for a specific group)
async function getGroupTransactions(req, res) {
  try {
    const userId = req.userId;
    const { groupId } = req.params;
    const {
      type,
      status,
      page = 1,
      limit = 20
    } = req.query;

    // First, verify that the user is a member of this group
    const memberCheck = await pool.query(
      `SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'You are not a member of this group',
        code: 'AUTH_004'
      });
    }

    let query = `
      SELECT t.*, u.full_name as user_name, u.email as user_email
      FROM transactions t
      INNER JOIN users u ON t.user_id = u.id
      WHERE t.group_id = $1
    `;
    const params = [groupId];
    let paramIndex = 2;

    // Add filters
    if (type) {
      query += ` AND t.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (status) {
      query += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY t.created_at DESC`;

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    const transactions = result.rows.map(tx => ({
      id: tx.id,
      userId: tx.user_id,
      userName: tx.user_name,
      userEmail: tx.user_email,
      type: tx.type,
      amount: parseFloat(tx.amount),
      status: tx.status,
      paymentReference: tx.payment_reference,
      paymentMethod: tx.payment_method,
      description: tx.description,
      createdAt: tx.created_at,
      updatedAt: tx.updated_at
    }));

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM transactions
      WHERE group_id = $1
      ${type ? ` AND type = '${type}'` : ''}
      ${status ? ` AND status = '${status}'` : ''}
    `;
    const countResult = await pool.query(countQuery, [groupId]);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get group transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch group transactions'
    });
  }
}

// Get transaction statistics for user
async function getUserTransactionStats(req, res) {
  try {
    const userId = req.userId;

    const statsQuery = `
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transactions,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_amount_paid,
        COALESCE(SUM(CASE WHEN status = 'completed' AND type = 'contribution' THEN amount ELSE 0 END), 0) as total_contributions,
        COALESCE(SUM(CASE WHEN status = 'completed' AND type = 'security_deposit' THEN amount ELSE 0 END), 0) as total_security_deposits
      FROM transactions
      WHERE user_id = $1
    `;

    const result = await pool.query(statsQuery, [userId]);
    const stats = result.rows[0] || {
      total_transactions: 0,
      completed_transactions: 0,
      pending_transactions: 0,
      failed_transactions: 0,
      total_amount_paid: 0,
      total_contributions: 0,
      total_security_deposits: 0
    };

    res.json({
      success: true,
      data: {
        totalTransactions: parseInt(stats.total_transactions || 0),
        completedTransactions: parseInt(stats.completed_transactions || 0),
        pendingTransactions: parseInt(stats.pending_transactions || 0),
        failedTransactions: parseInt(stats.failed_transactions || 0),
        totalAmountPaid: parseFloat(stats.total_amount_paid || 0),
        totalContributions: parseFloat(stats.total_contributions || 0),
        totalSecurityDeposits: parseFloat(stats.total_security_deposits || 0)
      }
    });
  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction statistics'
    });
  }
}

module.exports = {
  getUserTransactions,
  getGroupTransactions,
  getUserTransactionStats
};
