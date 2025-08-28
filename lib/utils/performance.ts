import { query } from '@/lib/database';

// Cache implementation for expensive operations
class Cache<T> {
  private cache = new Map<string, { value: T; expires: number }>();
  private defaultTTL: number;

  constructor(defaultTTL: number = 300000) { // 5 minutes default
    this.defaultTTL = defaultTTL;
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  set(key: string, value: T, ttl?: number): void {
    const expires = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expires });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instances
export const userCache = new Cache(600000); // 10 minutes for user data
export const goalsCache = new Cache(300000); // 5 minutes for goals
export const achievementsCache = new Cache(1800000); // 30 minutes for achievements

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private operations: Map<string, { count: number; totalTime: number; avgTime: number }> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  start(operation: string): () => void {
    const startTime = Date.now();

    return () => {
      const duration = Date.now() - startTime;
      const current = this.operations.get(operation) || { count: 0, totalTime: 0, avgTime: 0 };

      current.count++;
      current.totalTime += duration;
      current.avgTime = current.totalTime / current.count;

      this.operations.set(operation, current);
    };
  }

  getMetrics(operation?: string): any {
    if (operation) {
      return this.operations.get(operation) || null;
    }

    const allMetrics: Record<string, any> = {};
    this.operations.forEach((metrics, op) => {
      allMetrics[op] = metrics;
    });

    return allMetrics;
  }

  reset(operation?: string): void {
    if (operation) {
      this.operations.delete(operation);
    } else {
      this.operations.clear();
    }
  }
}

// Database query optimization
export class QueryOptimizer {
  // Analyze query performance and suggest optimizations
  static async analyzeQueryPerformance(queryText: string, params: any[] = []): Promise<{
    executionTime: number;
    rowCount: number;
    suggestions: string[];
  }> {
    const startTime = Date.now();

    try {
      const result = await query(queryText, params);
      const executionTime = Date.now() - startTime;

      const suggestions: string[] = [];

      // Analyze query patterns and suggest improvements
      if (queryText.toLowerCase().includes('select *')) {
        suggestions.push('Consider selecting only needed columns instead of SELECT *');
      }

      if (queryText.toLowerCase().includes('like') && !queryText.includes('%')) {
        suggestions.push('Consider using = instead of LIKE for exact matches');
      }

      if (executionTime > 1000) {
        suggestions.push('Query is slow (>1s). Consider adding indexes or optimizing the query');
      }

      if (result.rowCount > 1000) {
        suggestions.push('Large result set. Consider pagination or filtering');
      }

      return {
        executionTime,
        rowCount: result.rowCount || 0,
        suggestions,
      };

    } catch (error) {
      return {
        executionTime: Date.now() - startTime,
        rowCount: 0,
        suggestions: ['Query failed to execute'],
      };
    }
  }

  // Batch operations for better performance
  static async batchInsert(tableName: string, records: Record<string, any>[]): Promise<void> {
    if (records.length === 0) return;

    const columns = Object.keys(records[0]);
    const values = records.map(record =>
      `(${columns.map((_, i) => `$${i + 1}`).join(', ')})`
    ).join(', ');

    const flattenedValues = records.flatMap(record => columns.map(col => record[col]));

    const queryText = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES ${values}
    `;

    await query(queryText, flattenedValues);
  }

  // Get table statistics
  static async getTableStats(tableName: string): Promise<{
    rowCount: number;
    size: string;
    indexes: string[];
  }> {
    try {
      // Get row count
      const countResult = await query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const rowCount = parseInt(countResult.rows[0].count);

      // Get table size (simplified)
      const sizeResult = await query(`
        SELECT pg_size_pretty(pg_total_relation_size($1)) as size
      `, [tableName]);
      const size = sizeResult.rows[0].size;

      // Get indexes
      const indexResult = await query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = $1
      `, [tableName]);
      const indexes = indexResult.rows.map(row => row.indexname);

      return { rowCount, size, indexes };

    } catch (error) {
      console.error(`Failed to get stats for table ${tableName}:`, error);
      return { rowCount: 0, size: 'unknown', indexes: [] };
    }
  }
}

// Memory usage monitoring
export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private snapshots: Array<{ timestamp: number; usage: NodeJS.MemoryUsage }> = [];
  private maxSnapshots = 100;

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  takeSnapshot(): void {
    const usage = process.memoryUsage();
    this.snapshots.push({
      timestamp: Date.now(),
      usage,
    });

    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }
  }

  getMemoryStats(): {
    current: NodeJS.MemoryUsage;
    average: Partial<NodeJS.MemoryUsage>;
    trend: 'increasing' | 'decreasing' | 'stable';
    snapshots: number;
  } {
    if (this.snapshots.length === 0) {
      return {
        current: process.memoryUsage(),
        average: {},
        trend: 'stable',
        snapshots: 0,
      };
    }

    const current = this.snapshots[this.snapshots.length - 1].usage;

    // Calculate averages
    const average: Partial<NodeJS.MemoryUsage> = {};
    const keys = Object.keys(current) as (keyof NodeJS.MemoryUsage)[];

    keys.forEach(key => {
      const sum = this.snapshots.reduce((acc, snap) => acc + snap.usage[key], 0);
      average[key] = Math.round(sum / this.snapshots.length);
    });

    // Determine trend
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (this.snapshots.length >= 3) {
      const recent = this.snapshots.slice(-3);
      const heapUsage = recent.map(s => s.usage.heapUsed);
      const increasing = heapUsage[2] > heapUsage[0] * 1.1; // 10% increase
      const decreasing = heapUsage[2] < heapUsage[0] * 0.9; // 10% decrease

      if (increasing) trend = 'increasing';
      else if (decreasing) trend = 'decreasing';
    }

    return {
      current,
      average,
      trend,
      snapshots: this.snapshots.length,
    };
  }

  clearSnapshots(): void {
    this.snapshots = [];
  }
}

// Connection pooling optimization
export class ConnectionPoolMonitor {
  private static instance: ConnectionPoolMonitor;
  private connectionStats: {
    active: number;
    idle: number;
    waiting: number;
    timestamp: number;
  }[] = [];

  static getInstance(): ConnectionPoolMonitor {
    if (!ConnectionPoolMonitor.instance) {
      ConnectionPoolMonitor.instance = new ConnectionPoolMonitor();
    }
    return ConnectionPoolMonitor.instance;
  }

  recordConnectionStats(active: number, idle: number, waiting: number = 0): void {
    this.connectionStats.push({
      active,
      idle,
      waiting,
      timestamp: Date.now(),
    });

    // Keep only last 50 entries
    if (this.connectionStats.length > 50) {
      this.connectionStats = this.connectionStats.slice(-50);
    }
  }

  getConnectionStats(): {
    current: { active: number; idle: number; waiting: number } | null;
    average: { active: number; idle: number; waiting: number };
    maxActive: number;
  } {
    if (this.connectionStats.length === 0) {
      return {
        current: null,
        average: { active: 0, idle: 0, waiting: 0 },
        maxActive: 0,
      };
    }

    const current = this.connectionStats[this.connectionStats.length - 1];
    const sum = this.connectionStats.reduce(
      (acc, stat) => ({
        active: acc.active + stat.active,
        idle: acc.idle + stat.idle,
        waiting: acc.waiting + stat.waiting,
      }),
      { active: 0, idle: 0, waiting: 0 }
    );

    const count = this.connectionStats.length;
    const maxActive = Math.max(...this.connectionStats.map(s => s.active));

    return {
      current,
      average: {
        active: Math.round(sum.active / count),
        idle: Math.round(sum.idle / count),
        waiting: Math.round(sum.waiting / count),
      },
      maxActive,
    };
  }
}

// Export singleton instances
export const performanceMonitor = PerformanceMonitor.getInstance();
export const memoryMonitor = MemoryMonitor.getInstance();
export const connectionPoolMonitor = ConnectionPoolMonitor.getInstance();
