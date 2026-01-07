-- Query Template
-- Description: [Brief description of what this query does]
-- Parameters: 
--   $1: [Description of parameter 1]
--   $2: [Description of parameter 2]
-- Returns: [Description of what this query returns]
-- Usage: [Brief example of how to use this query]
--
-- Example:
-- const sql = loadSQL('queries/domain/query-name.sql');
-- const result = await query(sql, [param1, param2]);

-- Your SQL query goes here
SELECT 
  -- columns
FROM table_name
WHERE condition = $1
ORDER BY column
LIMIT $2;
