/**
 * Mock Database for Development
 * This is a temporary in-memory database to allow the application to work
 * without PostgreSQL. Replace this with actual PostgreSQL connection when ready.
 */

class MockDatabase {
  constructor() {
    this.users = [];
    this.refreshTokens = [];
    this.groups = [];
    this.groupMembers = [];
    this.contributions = [];
    this.transactions = [];
    this.payouts = [];
  }

  // Simulate query method like pg Pool
  async query(sql, params = []) {
    const sqlLower = sql.toLowerCase().trim();

    // Handle SELECT queries
    if (sqlLower.startsWith('select')) {
      return this._handleSelect(sql, params);
    }

    // Handle INSERT queries
    if (sqlLower.startsWith('insert')) {
      return this._handleInsert(sql, params);
    }

    // Handle UPDATE queries
    if (sqlLower.startsWith('update')) {
      return this._handleUpdate(sql, params);
    }

    // Handle DELETE queries
    if (sqlLower.startsWith('delete')) {
      return this._handleDelete(sql, params);
    }

    return { rows: [], rowCount: 0 };
  }

  _handleSelect(sql, params) {
    const sqlLower = sql.toLowerCase();

    // Check for users table
    if (sqlLower.includes('from users')) {
      if (sqlLower.includes('where email')) {
        const email = params[0];
        const user = this.users.find(u => u.email === email);
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
      }
      if (sqlLower.includes('where id')) {
        const id = params[0];
        const user = this.users.find(u => u.id === id);
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
      }
      return { rows: this.users, rowCount: this.users.length };
    }

    // Check for refresh_tokens table
    if (sqlLower.includes('from refresh_tokens')) {
      if (sqlLower.includes('where token')) {
        const token = params[0];
        const tokenData = this.refreshTokens.find(t => t.token === token);
        return { rows: tokenData ? [tokenData] : [], rowCount: tokenData ? 1 : 0 };
      }
      return { rows: this.refreshTokens, rowCount: this.refreshTokens.length };
    }

    // Check for groups table
    if (sqlLower.includes('from groups')) {
      if (sqlLower.includes('where id')) {
        const id = params[0];
        const group = this.groups.find(g => g.id === id);
        return { rows: group ? [group] : [], rowCount: group ? 1 : 0 };
      }
      if (sqlLower.includes('where status')) {
        const status = params[0] || params[params.length - 1];
        const groups = this.groups.filter(g => g.status === status);
        return { rows: groups, rowCount: groups.length };
      }
      return { rows: this.groups, rowCount: this.groups.length };
    }

    // Check for group_members table
    if (sqlLower.includes('from group_members')) {
      if (sqlLower.includes('where user_id')) {
        const userId = params[0];
        const members = this.groupMembers.filter(m => m.user_id === userId);
        return { rows: members, rowCount: members.length };
      }
      if (sqlLower.includes('where group_id')) {
        const groupId = params[0];
        const members = this.groupMembers.filter(m => m.group_id === groupId);
        return { rows: members, rowCount: members.length };
      }
      return { rows: this.groupMembers, rowCount: this.groupMembers.length };
    }

    // Check for transactions table
    if (sqlLower.includes('from transactions')) {
      if (sqlLower.includes('where user_id')) {
        const userId = params[0];
        const transactions = this.transactions.filter(t => t.user_id === userId);
        return { rows: transactions, rowCount: transactions.length };
      }
      if (sqlLower.includes('where group_id')) {
        const groupId = params[0];
        const transactions = this.transactions.filter(t => t.group_id === groupId);
        return { rows: transactions, rowCount: transactions.length };
      }
      return { rows: this.transactions, rowCount: this.transactions.length };
    }

    return { rows: [], rowCount: 0 };
  }

  _handleInsert(sql, params) {
    const sqlLower = sql.toLowerCase();

    // Insert into users
    if (sqlLower.includes('into users')) {
      const id = this._generateId();
      const [email, phone, fullName, passwordHash] = params;
      const user = {
        id,
        email,
        phone,
        full_name: fullName,
        password_hash: passwordHash,
        is_verified: false,
        kyc_status: 'not_started',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        failed_login_attempts: 0,
        locked_until: null
      };
      this.users.push(user);
      return { rows: [user], rowCount: 1 };
    }

    // Insert into refresh_tokens
    if (sqlLower.includes('into refresh_tokens')) {
      const id = this._generateId();
      const [userId, token] = params;
      const tokenData = {
        id,
        user_id: userId,
        token,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        created_at: new Date(),
        revoked_at: null,
        replaced_by_token: null
      };
      this.refreshTokens.push(tokenData);
      return { rows: [tokenData], rowCount: 1 };
    }

    // Insert into groups
    if (sqlLower.includes('into groups')) {
      const id = this._generateId();
      const group = {
        id,
        name: params[0],
        description: params[1],
        contribution_amount: params[2],
        frequency: params[3],
        total_members: params[4],
        current_members: 1, // Creator is first member
        security_deposit_amount: params[5],
        security_deposit_percentage: params[6],
        status: 'forming',
        start_date: params[7] || null,
        current_cycle: 0,
        total_cycles: params[4], // total_cycles = total_members
        service_fee_percentage: params[8] || 10,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: params[9]
      };
      this.groups.push(group);
      return { rows: [group], rowCount: 1 };
    }

    // Insert into group_members
    if (sqlLower.includes('into group_members')) {
      const id = this._generateId();
      const [groupId, userId, rotationPosition] = params;
      const member = {
        id,
        group_id: groupId,
        user_id: userId,
        rotation_position: rotationPosition,
        security_deposit_paid: false,
        security_deposit_amount: 0,
        has_received_payout: false,
        status: 'active',
        joined_at: new Date()
      };
      this.groupMembers.push(member);
      return { rows: [member], rowCount: 1 };
    }

    // Insert into transactions
    if (sqlLower.includes('into transactions')) {
      const id = this._generateId();
      const transaction = {
        id,
        user_id: params[0],
        group_id: params[1],
        type: params[2],
        amount: params[3],
        status: params[4] || 'pending',
        payment_reference: params[5] || null,
        payment_method: params[6] || 'paystack',
        description: params[7] || '',
        metadata: params[8] || {},
        created_at: new Date()
      };
      this.transactions.push(transaction);
      return { rows: [transaction], rowCount: 1 };
    }

    return { rows: [], rowCount: 0 };
  }

  _handleUpdate(sql, params) {
    const sqlLower = sql.toLowerCase();

    // Update users
    if (sqlLower.includes('update users')) {
      if (sqlLower.includes('failed_login_attempts')) {
        const userId = params[params.length - 1];
        const user = this.users.find(u => u.id === userId);
        if (user) {
          user.failed_login_attempts = (user.failed_login_attempts || 0) + 1;
          if (user.failed_login_attempts >= 5) {
            user.locked_until = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
          }
          user.updated_at = new Date();
          return { rows: [user], rowCount: 1 };
        }
      }
      if (sqlLower.includes('failed_login_attempts = 0')) {
        const userId = params[params.length - 1];
        const user = this.users.find(u => u.id === userId);
        if (user) {
          user.failed_login_attempts = 0;
          user.locked_until = null;
          user.last_login_at = new Date();
          user.updated_at = new Date();
          return { rows: [user], rowCount: 1 };
        }
      }
    }

    // Update refresh_tokens
    if (sqlLower.includes('update refresh_tokens')) {
      if (sqlLower.includes('revoked_at')) {
        const token = params[params.length - 1];
        const tokenData = this.refreshTokens.find(t => t.token === token);
        if (tokenData) {
          tokenData.revoked_at = new Date();
          if (params.length > 1) {
            tokenData.replaced_by_token = params[0];
          }
          return { rows: [tokenData], rowCount: 1 };
        }
      }
    }

    // Update groups
    if (sqlLower.includes('update groups')) {
      const groupId = params[params.length - 1];
      const group = this.groups.find(g => g.id === groupId);
      if (group) {
        if (sqlLower.includes('current_members')) {
          group.current_members = (group.current_members || 0) + 1;
          if (group.current_members === group.total_members) {
            group.status = 'active';
            if (!group.start_date) {
              group.start_date = new Date();
            }
          }
        }
        if (sqlLower.includes('status')) {
          group.status = params[0];
        }
        group.updated_at = new Date();
        return { rows: [group], rowCount: 1 };
      }
    }

    // Update transactions
    if (sqlLower.includes('update transactions')) {
      const reference = params[params.length - 1];
      const transaction = this.transactions.find(t => t.payment_reference === reference);
      if (transaction) {
        transaction.status = params[0];
        transaction.updated_at = new Date();
        return { rows: [transaction], rowCount: 1 };
      }
    }

    return { rows: [], rowCount: 0 };
  }

  _handleDelete(sql, params) {
    const sqlLower = sql.toLowerCase();

    // Delete from refresh_tokens
    if (sqlLower.includes('from refresh_tokens')) {
      const token = params[0];
      const index = this.refreshTokens.findIndex(t => t.token === token);
      if (index !== -1) {
        this.refreshTokens.splice(index, 1);
        return { rows: [], rowCount: 1 };
      }
    }

    return { rows: [], rowCount: 0 };
  }

  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Method to connect (for compatibility)
  async connect() {
    return {
      query: this.query.bind(this),
      release: () => {}
    };
  }

  // Events (for compatibility)
  on(event, callback) {
    if (event === 'connect') {
      // Simulate successful connection
      setTimeout(() => callback(), 100);
    }
  }
}

// Create singleton instance
const mockDb = new MockDatabase();

module.exports = mockDb;
