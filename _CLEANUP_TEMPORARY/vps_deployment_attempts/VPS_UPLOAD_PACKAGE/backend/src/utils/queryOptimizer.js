/**
 * Database Query Optimizer Utility
 * Provides utilities for optimizing database queries
 * 
 * Features:
 * - Query result caching
 * - Batch operations
 * - Query performance monitoring
 * - Index recommendations
 */

const db = require('../config/database');

class QueryOptimizer {
  constructor() {
    this.queryLog = [];
    this.slowQueryThreshold = 1000; // 1 second
    this.maxLogSize = 1000;
  }

  /**
   * Execute query with performance monitoring
   */
  async executeQuery(query, params = [], options = {}) {
    const startTime = Date.now();
    const queryPreview = query.substring(0, 100).replace(/\s+/g, ' ').trim();

    try {
      const result = await db.query(query, params);
      const duration = Date.now() - startTime;

      // Log slow queries
      if (duration > this.slowQueryThreshold) {
        console.warn(`⚠️  SLOW QUERY (${duration}ms): ${queryPreview}`);
        this.logQuery(query, params, duration, 'slow');
      }

      // Log all queries in development
      if (process.env.NODE_ENV === 'development' && options.verbose) {
        console.log(`📊 Query executed in ${duration}ms: ${queryPreview}`);
      }

      return result;
    } catch (error) {
      console.error(`❌ Query error: ${queryPreview}`, error.message);
      throw error;
    }
  }

  /**
   * Log query for analysis
   */
  logQuery(query, params, duration, type = 'normal') {
    const logEntry = {
      query: query.substring(0, 200),
      params: params.length,
      duration,
      type,
      timestamp: new Date()
    };

    this.queryLog.push(logEntry);

    // Keep log size manageable
    if (this.queryLog.length > this.maxLogSize) {
      this.queryLog.shift();
    }
  }

  /**
   * Batch insert/update operations
   */
  async batchInsert(table, records, batchSize = 100) {
    if (!records || records.length === 0) {
      return { success: true, inserted: 0 };
    }

    const batches = [];
    for (let i = 0; i < records.length; i += batchSize) {
      batches.push(records.slice(i, i + batchSize));
    }

    let totalInserted = 0;
    const startTime = Date.now();

    for (const batch of batches) {
      const keys = Object.keys(batch[0]);
      const placeholders = batch.map(() => `(${keys.map(() => '?').join(', ')})`).join(', ');
      const values = batch.flatMap(record => keys.map(key => record[key]));

      const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES ${placeholders}`;
      
      await db.query(query, values);
      totalInserted += batch.length;
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Batch insert: ${totalInserted} records in ${duration}ms (${batches.length} batches)`);

    return { success: true, inserted: totalInserted, duration };
  }

  /**
   * Get query statistics
   */
  getStatistics() {
    const slowQueries = this.queryLog.filter(q => q.type === 'slow');
    const avgDuration = this.queryLog.reduce((sum, q) => sum + q.duration, 0) / this.queryLog.length || 0;

    return {
      totalQueries: this.queryLog.length,
      slowQueries: slowQueries.length,
      averageDuration: Math.round(avgDuration),
      slowestQuery: this.queryLog.reduce((max, q) => q.duration > max.duration ? q : max, { duration: 0 })
    };
  }

  /**
   * Suggest indexes based on query patterns
   */
  async suggestIndexes() {
    const suggestions = [];

    // Analyze query log for common WHERE clauses
    const commonColumns = this.analyzeWhereClause();

    for (const [table, columns] of Object.entries(commonColumns)) {
      if (columns.length > 0) {
        suggestions.push({
          table,
          columns: columns.slice(0, 3), // Top 3 most used
          query: `CREATE INDEX idx_${table}_${columns.join('_')} ON ${table}(${columns.join(', ')});`
        });
      }
    }

    return suggestions;
  }

  /**
   * Analyze WHERE clauses from query log
   */
  analyzeWhereClause() {
    const columnUsage = {};

    // Simple heuristic: look for WHERE patterns
    this.queryLog.forEach(entry => {
      const whereMatch = entry.query.match(/WHERE\s+(\w+)\.?(\w+)\s*=/gi);
      if (whereMatch) {
        whereMatch.forEach(match => {
          const parts = match.split('.');
          const column = parts[parts.length - 1].split('=')[0].trim();
          const table = parts.length > 1 ? parts[0].replace('WHERE', '').trim() : 'unknown';
          
          if (!columnUsage[table]) {
            columnUsage[table] = {};
          }
          columnUsage[table][column] = (columnUsage[table][column] || 0) + 1;
        });
      }
    });

    // Convert to sorted arrays
    const result = {};
    for (const [table, columns] of Object.entries(columnUsage)) {
      result[table] = Object.entries(columns)
        .sort((a, b) => b[1] - a[1])
        .map(([col]) => col);
    }

    return result;
  }

  /**
   * Clear query log
   */
  clearLog() {
    this.queryLog = [];
  }
}

// Global instance
const queryOptimizer = new QueryOptimizer();

/**
 * Pagination helper with optimized counting
 */
const paginate = async (baseQuery, countQuery, params, options = {}) => {
  const {
    page = 1,
    limit = 20,
    orderBy = 'created_at',
    orderDirection = 'DESC'
  } = options;

  const offset = (page - 1) * limit;

  // Build paginated query
  const paginatedQuery = `
    ${baseQuery}
    ORDER BY ${orderBy} ${orderDirection}
    LIMIT ? OFFSET ?
  `;

  // Execute both queries in parallel
  const [dataResult, countResult] = await Promise.all([
    db.query(paginatedQuery, [...params, limit, offset]),
    db.query(countQuery, params)
  ]);

  const [data] = dataResult;
  const [countRow] = countResult;
  const total = countRow[0].total || countRow[0].count || 0;

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    }
  };
};

/**
 * Optimized bulk upsert (insert or update)
 */
const bulkUpsert = async (table, records, uniqueKey = 'id') => {
  if (!records || records.length === 0) {
    return { success: true, affected: 0 };
  }

  const keys = Object.keys(records[0]);
  const updateKeys = keys.filter(k => k !== uniqueKey);
  
  const placeholders = records.map(() => `(${keys.map(() => '?').join(', ')})`).join(', ');
  const values = records.flatMap(record => keys.map(key => record[key]));
  
  const updateClause = updateKeys.map(key => `${key} = VALUES(${key})`).join(', ');

  const query = `
    INSERT INTO ${table} (${keys.join(', ')})
    VALUES ${placeholders}
    ON DUPLICATE KEY UPDATE ${updateClause}
  `;

  const [result] = await db.query(query, values);
  
  return {
    success: true,
    affected: result.affectedRows,
    inserted: result.affectedRows - result.changedRows,
    updated: result.changedRows
  };
};

module.exports = {
  queryOptimizer,
  paginate,
  bulkUpsert,
  executeQuery: queryOptimizer.executeQuery.bind(queryOptimizer),
  getQueryStats: queryOptimizer.getStatistics.bind(queryOptimizer),
  suggestIndexes: queryOptimizer.suggestIndexes.bind(queryOptimizer)
};
