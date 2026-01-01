const pool = require('../config/database');

/**
 * Group Management Controller
 * Handles all group-related operations including creation, joining, and management
 */

// Create a new savings group
async function createGroup(req, res) {
  try {
    const {
      name,
      description,
      contributionAmount,
      frequency,
      totalMembers,
      securityDepositPercentage,
      startDate,
      serviceFeePercentage
    } = req.body;

    const userId = req.userId;

    // Validate input
    if (!name || !contributionAmount || !frequency || !totalMembers) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        code: 'VAL_001'
      });
    }

    // Validate totalMembers
    if (totalMembers < 2 || totalMembers > 50) {
      return res.status(400).json({
        success: false,
        error: 'Total members must be between 2 and 50',
        code: 'VAL_001'
      });
    }

    // Validate frequency
    const validFrequencies = ['daily', 'weekly', 'monthly'];
    if (!validFrequencies.includes(frequency)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid frequency. Must be daily, weekly, or monthly',
        code: 'VAL_001'
      });
    }

    // Calculate security deposit
    const securityDepositAmount = (contributionAmount * (securityDepositPercentage || 10)) / 100;
    const serviceFee = serviceFeePercentage || parseInt(process.env.DEFAULT_SERVICE_FEE_PERCENTAGE) || 10;

    // Create group
    const result = await pool.query(
      `INSERT INTO groups (
        name, description, contribution_amount, frequency, 
        total_members, security_deposit_amount, security_deposit_percentage,
        service_fee_percentage, start_date, total_cycles, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, name, description, contribution_amount, frequency, 
                total_members, current_members, security_deposit_amount, 
                security_deposit_percentage, status, start_date, 
                current_cycle, total_cycles, service_fee_percentage, created_at`,
      [
        name,
        description,
        contributionAmount,
        frequency,
        totalMembers,
        securityDepositAmount,
        securityDepositPercentage || 10,
        serviceFee,
        startDate || null,
        totalMembers, // total_cycles = total_members
        userId
      ]
    );

    const group = result.rows[0];

    // Add creator as first member (rotation position 1)
    await pool.query(
      `INSERT INTO group_members (group_id, user_id, rotation_position)
       VALUES ($1, $2, $3)`,
      [group.id, userId, 1]
    );

    // Update group current_members count
    await pool.query(
      `UPDATE groups SET current_members = 1 WHERE id = $1`,
      [group.id]
    );

    res.status(201).json({
      success: true,
      data: {
        id: group.id,
        name: group.name,
        description: group.description,
        contributionAmount: parseFloat(group.contribution_amount),
        frequency: group.frequency,
        totalMembers: group.total_members,
        currentMembers: 1,
        securityDepositAmount: parseFloat(group.security_deposit_amount),
        securityDepositPercentage: group.security_deposit_percentage,
        status: group.status,
        startDate: group.start_date,
        currentCycle: group.current_cycle,
        totalCycles: group.total_cycles,
        serviceFeePercentage: group.service_fee_percentage,
        createdAt: group.created_at
      },
      message: 'Group created successfully'
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create group'
    });
  }
}

// Get user's groups (groups they are a member of)
async function getMyGroups(req, res) {
  try {
    const userId = req.userId;
    const { status } = req.query;

    let query = `
      SELECT g.*, gm.rotation_position, gm.status as member_status,
             gm.security_deposit_paid, gm.has_received_payout
      FROM groups g
      INNER JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = $1
    `;
    const params = [userId];

    if (status) {
      query += ` AND g.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY g.created_at DESC`;

    const result = await pool.query(query, params);

    const groups = result.rows.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      contributionAmount: parseFloat(group.contribution_amount),
      frequency: group.frequency,
      totalMembers: group.total_members,
      currentMembers: group.current_members,
      securityDepositAmount: parseFloat(group.security_deposit_amount),
      securityDepositPercentage: group.security_deposit_percentage,
      status: group.status,
      startDate: group.start_date,
      currentCycle: group.current_cycle,
      totalCycles: group.total_cycles,
      serviceFeePercentage: group.service_fee_percentage,
      createdAt: group.created_at,
      myRotationPosition: group.rotation_position,
      myMemberStatus: group.member_status,
      securityDepositPaid: group.security_deposit_paid,
      hasReceivedPayout: group.has_received_payout
    }));

    res.json({
      success: true,
      data: groups,
      count: groups.length
    });
  } catch (error) {
    console.error('Get my groups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch groups'
    });
  }
}

// Get available groups (groups that are open for joining)
async function getAvailableGroups(req, res) {
  try {
    const userId = req.userId;
    const { frequency, minAmount, maxAmount, page = 1, limit = 20 } = req.query;

    // Validate pagination parameters
    const validPage = Math.max(1, Number.parseInt(page, 10) || 1);
    const validLimit = Math.max(1, Math.min(100, Number.parseInt(limit, 10) || 20));

    let query = `
      SELECT g.*, COUNT(gm.id) as current_members_count
      FROM groups g
      LEFT JOIN group_members gm ON g.id = gm.group_id
      WHERE g.status = 'forming'
      AND g.current_members < g.total_members
      AND g.id NOT IN (
        SELECT group_id FROM group_members WHERE user_id = $1
      )
    `;
    const params = [userId];
    let paramIndex = 2;

    if (frequency) {
      query += ` AND g.frequency = $${paramIndex}`;
      params.push(frequency);
      paramIndex++;
    }

    if (minAmount) {
      query += ` AND g.contribution_amount >= $${paramIndex}`;
      params.push(minAmount);
      paramIndex++;
    }

    if (maxAmount) {
      query += ` AND g.contribution_amount <= $${paramIndex}`;
      params.push(maxAmount);
      paramIndex++;
    }

    query += ` GROUP BY g.id ORDER BY g.created_at DESC`;
    
    // Add pagination with validated parameters
    const offset = (validPage - 1) * validLimit;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(validLimit, offset);

    const result = await pool.query(query, params);

    const groups = result.rows.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      contributionAmount: parseFloat(group.contribution_amount),
      frequency: group.frequency,
      totalMembers: group.total_members,
      currentMembers: group.current_members,
      securityDepositAmount: parseFloat(group.security_deposit_amount),
      securityDepositPercentage: group.security_deposit_percentage,
      status: group.status,
      startDate: group.start_date,
      serviceFeePercentage: group.service_fee_percentage,
      createdAt: group.created_at,
      spotsRemaining: group.total_members - group.current_members
    }));

    res.json({
      success: true,
      data: groups,
      count: groups.length,
      page: validPage,
      limit: validLimit
    });
  } catch (error) {
    console.error('Get available groups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available groups'
    });
  }
}

// Get group details by ID
async function getGroupById(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Get group details
    const groupResult = await pool.query(
      `SELECT g.*, u.full_name as creator_name, u.email as creator_email
       FROM groups g
       INNER JOIN users u ON g.created_by = u.id
       WHERE g.id = $1`,
      [id]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Group not found',
        code: 'GROUP_001'
      });
    }

    const group = groupResult.rows[0];

    // Get group members
    const membersResult = await pool.query(
      `SELECT gm.*, u.full_name, u.email, u.phone
       FROM group_members gm
       INNER JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1
       ORDER BY gm.rotation_position`,
      [id]
    );

    const members = membersResult.rows.map(member => ({
      id: member.id,
      userId: member.user_id,
      fullName: member.full_name,
      email: member.email,
      phone: member.phone,
      rotationPosition: member.rotation_position,
      securityDepositPaid: member.security_deposit_paid,
      securityDepositAmount: parseFloat(member.security_deposit_amount || 0),
      hasReceivedPayout: member.has_received_payout,
      status: member.status,
      joinedAt: member.joined_at
    }));

    // Check if current user is a member
    const isMember = members.some(m => m.userId === userId);

    res.json({
      success: true,
      data: {
        id: group.id,
        name: group.name,
        description: group.description,
        contributionAmount: parseFloat(group.contribution_amount),
        frequency: group.frequency,
        totalMembers: group.total_members,
        currentMembers: group.current_members,
        securityDepositAmount: parseFloat(group.security_deposit_amount),
        securityDepositPercentage: group.security_deposit_percentage,
        status: group.status,
        startDate: group.start_date,
        currentCycle: group.current_cycle,
        totalCycles: group.total_cycles,
        serviceFeePercentage: group.service_fee_percentage,
        createdAt: group.created_at,
        createdBy: group.created_by,
        creatorName: group.creator_name,
        creatorEmail: group.creator_email,
        members,
        isMember
      }
    });
  } catch (error) {
    console.error('Get group by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch group details'
    });
  }
}

// Join a group
async function joinGroup(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Check if group exists and is accepting members
    const groupResult = await pool.query(
      `SELECT * FROM groups WHERE id = $1`,
      [id]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Group not found',
        code: 'GROUP_001'
      });
    }

    const group = groupResult.rows[0];

    if (group.status !== 'forming') {
      return res.status(400).json({
        success: false,
        error: 'Group is not accepting new members',
        code: 'GROUP_002'
      });
    }

    if (group.current_members >= group.total_members) {
      return res.status(400).json({
        success: false,
        error: 'Group is full',
        code: 'GROUP_003'
      });
    }

    // Check if user is already a member
    const existingMember = await pool.query(
      `SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (existingMember.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'You are already a member of this group',
        code: 'GROUP_004'
      });
    }

    // Determine next rotation position
    const positionResult = await pool.query(
      `SELECT COALESCE(MAX(rotation_position), 0) + 1 as next_position
       FROM group_members WHERE group_id = $1`,
      [id]
    );
    const nextPosition = positionResult.rows[0].next_position;

    // Add user to group
    await pool.query(
      `INSERT INTO group_members (group_id, user_id, rotation_position)
       VALUES ($1, $2, $3)`,
      [id, userId, nextPosition]
    );

    // Update group member count
    const newMemberCount = group.current_members + 1;
    await pool.query(
      `UPDATE groups SET current_members = $1 WHERE id = $2`,
      [newMemberCount, id]
    );

    // If group is now full, update status to active
    if (newMemberCount === group.total_members) {
      await pool.query(
        `UPDATE groups SET status = 'active', start_date = COALESCE(start_date, CURRENT_TIMESTAMP) WHERE id = $1`,
        [id]
      );
    }

    res.json({
      success: true,
      data: {
        groupId: id,
        rotationPosition: nextPosition,
        currentMembers: newMemberCount,
        totalMembers: group.total_members
      },
      message: 'Successfully joined group'
    });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join group'
    });
  }
}

module.exports = {
  createGroup,
  getMyGroups,
  getAvailableGroups,
  getGroupById,
  joinGroup
};
