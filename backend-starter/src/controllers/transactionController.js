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

    // Validate pagination parameters
    const validPage = Math.max(1, Number.parseInt(page, 10) || 1);
    const validLimit = Math.max(1, Math.min(100, Number.parseInt(limit, 10) || 20));

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

    // Add pagination with validated parameters
    const offset = (validPage - 1) * validLimit;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(validLimit, offset);

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

    // Get total count for pagination - using parameterized query to prevent SQL injection
    let countQuery = `
      SELECT COUNT(*) as total
      FROM transactions t
      WHERE t.user_id = $1
    `;
    const countParams = [userId];
    let countParamIndex = 2;

    if (groupId) {
      countQuery += ` AND t.group_id = $${countParamIndex}`;
      countParams.push(groupId);
      countParamIndex++;
    }

    if (type) {
      countQuery += ` AND t.type = $${countParamIndex}`;
      countParams.push(type);
      countParamIndex++;
    }

    if (status) {
      countQuery += ` AND t.status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (startDate) {
      countQuery += ` AND t.created_at >= $${countParamIndex}`;
      countParams.push(startDate);
      countParamIndex++;
    }

    if (endDate) {
      countQuery += ` AND t.created_at <= $${countParamIndex}`;
      countParams.push(endDate);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        totalPages: Math.ceil(total / validLimit)
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

    // Validate pagination parameters
    const validPage = Math.max(1, Number.parseInt(page, 10) || 1);
    const validLimit = Math.max(1, Math.min(100, Number.parseInt(limit, 10) || 20));

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

    // Add pagination with validated parameters
    const offset = (validPage - 1) * validLimit;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(validLimit, offset);

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

    // Get total count - using parameterized query to prevent SQL injection
    let countQuery = `
      SELECT COUNT(*) as total
      FROM transactions
      WHERE group_id = $1
    `;
    const countParams = [groupId];
    let countParamIndex = 2;

    if (type) {
      countQuery += ` AND type = $${countParamIndex}`;
      countParams.push(type);
      countParamIndex++;
    }

    if (status) {
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        totalPages: Math.ceil(total / validLimit)
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
