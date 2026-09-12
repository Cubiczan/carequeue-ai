/**
 * Astra DB Client
 * 
 * Connects to DataStax Astra DB (Cassandra-compatible)
 * Docs: https://docs.datastax.com/en/astra-db-serverless/
 */

const { Client } = require('cassandra-driver');
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.label({ label: 'AstraDB' }),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

class AstraDBClient {
  constructor(config = {}) {
    this.keyspace = config.keyspace || process.env.ASTRA_KEYSPACE || 'battery_erp';
    this.client = null;
    this.connected = false;
    
    // Astra DB connection config using token authentication
    this.config = {
      contactPoints: [config.contactPoint || process.env.ASTRA_CONTACT_POINT],
      localDataCenter: config.datacenter || process.env.ASTRA_DATACENTER || 'us-east-2',
      keyspace: this.keyspace,
      credentials: {
        username: config.token || process.env.ASTRA_TOKEN,
        password: config.clientId || process.env.ASTRA_CLIENT_ID
      },
      sslOptions: {
        rejectUnauthorized: true
      },
      // Astra-specific optimizations
      pooling: {
        coreConnections: {
          local: 2,
          remote: 1
        },
        maxRequestsPerConnection: {
          local: 8192,
          remote: 1024
        }
      },
      queryOptions: {
        fetchSize: 5000,
        consistency: 1 // LOCAL_ONE
      }
    };
  }

  /**
   * Connect to Astra DB
   */
  async connect() {
    try {
      this.client = new Client(this.config);
      await this.client.connect();
      this.connected = true;
      logger.info('Connected to Astra DB', { keyspace: this.keyspace });
      
      // Initialize tables
      await this.initializeSchema();
      
      return true;
    } catch (error) {
      logger.error('Failed to connect to Astra DB', error.message);
      this.connected = false;
      throw error;
    }
  }

  /**
   * Disconnect from Astra DB
   */
  async disconnect() {
    if (this.client) {
      await this.client.shutdown();
      this.connected = false;
      logger.info('Disconnected from Astra DB');
    }
  }

  /**
   * Initialize database schema
   */
  async initializeSchema() {
    logger.info('Initializing Astra DB schema...');

    // Create tables if they don't exist
    const queries = [
      // Production Events (time-series)
      `CREATE TABLE IF NOT EXISTS production_events (
        event_id timeuuid PRIMARY KEY,
        work_order_id text,
        batch_id text,
        event_type text,
        station_id text,
        operator_id text,
        timestamp timestamp,
        data map<text, text>,
        metrics map<text, double>
      ) WITH CLUSTERING ORDER BY (event_id DESC)
         AND default_time_to_live = 31536000`, // 1 year retention

      // Batch Traceability
      `CREATE TABLE IF NOT EXISTS batch_genealogy (
        batch_id text PRIMARY KEY,
        parent_batch_id text,
        battery_type text,
        supplier text,
        receipt_date timestamp,
        current_status text,
        current_location text,
        weight_kg double,
        process_history list<text>,
        created_at timestamp,
        updated_at timestamp
      )`,

      // Quality Inspections
      `CREATE TABLE IF NOT EXISTS quality_records (
        inspection_id timeuuid PRIMARY KEY,
        batch_id text,
        work_order_id text,
        item_code text,
        inspection_type text,
        inspection_date timestamp,
        status text,
        readings list<frozen<reading_data>>,
        inspector_id text,
        created_at timestamp
      )`,

      // Material Recovery Tracking
      `CREATE TABLE IF NOT EXISTS material_recovery (
        recovery_id timeuuid PRIMARY KEY,
        batch_id text,
        process_stage text,
        material_type text,
        quantity_kg double,
        purity_percent double,
        warehouse text,
        recorded_at timestamp
      ) WITH CLUSTERING ORDER BY (recorded_at DESC)`,

      // Production Metrics (aggregated)
      `CREATE TABLE IF NOT EXISTS production_metrics (
        metric_date text PRIMARY KEY,
        work_orders_completed int,
        total_quantity double,
        avg_recovery_rate double,
        total_input_kg double,
        total_output_kg double,
        waste_kg double,
        downtime_minutes int,
        quality_pass_rate double
      )`,

      // Operator Activity
      `CREATE TABLE IF NOT EXISTS operator_activity (
        operator_id text,
        activity_date text,
        activity_id timeuuid,
        work_order_id text,
        action_type text,
        duration_seconds int,
        PRIMARY KEY ((operator_id, activity_date), activity_id)
      ) WITH CLUSTERING ORDER BY (activity_id DESC)`,

      // Sensor Data (IoT from shop floor)
      `CREATE TABLE IF NOT EXISTS sensor_readings (
        sensor_id text,
        reading_time timestamp,
        reading_id timeuuid,
        metric_name text,
        metric_value double,
        unit text,
        station_id text,
        PRIMARY KEY ((sensor_id, metric_name), reading_time)
      ) WITH CLUSTERING ORDER BY (reading_time DESC)
         AND default_time_to_live = 2592000` // 30 days
    ];

    // Create custom types
    const typeQueries = [
      `CREATE TYPE IF NOT EXISTS reading_data (
        specification text,
        value text,
        status text,
        measured_at timestamp
      )`
    ];

    try {
      // Create types first
      for (const query of typeQueries) {
        await this.client.execute(query);
      }

      // Create tables
      for (const query of queries) {
        await this.client.execute(query);
        logger.info('Table created/verified');
      }

      logger.info('Astra DB schema initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize schema', error);
      throw error;
    }
  }

  // ==================== Query Methods ====================

  /**
   * Insert production event
   */
  async insertProductionEvent(event) {
    const query = `
      INSERT INTO production_events (event_id, work_order_id, batch_id, event_type, station_id, operator_id, timestamp, data, metrics)
      VALUES (now(), ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      event.work_order_id,
      event.batch_id,
      event.event_type,
      event.station_id,
      event.operator_id,
      new Date(event.timestamp),
      event.data || {},
      event.metrics || {}
    ];

    await this.client.execute(query, params, { prepare: true });
  }

  /**
   * Get production events for a work order
   */
  async getProductionEvents(workOrderId, limit = 100) {
    const query = `SELECT * FROM production_events WHERE work_order_id = ? LIMIT ? ALLOW FILTERING`;
    
    const result = await this.client.execute(query, [workOrderId, limit], { prepare: true });
    return result.rows.map(row => ({
      event_id: row.event_id,
      work_order_id: row.work_order_id,
      batch_id: row.batch_id,
      event_type: row.event_type,
      station_id: row.station_id,
      operator_id: row.operator_id,
      timestamp: row.timestamp,
      data: row.data,
      metrics: row.metrics
    }));
  }

  /**
   * Upsert batch genealogy record
   */
  async upsertBatchGenealogy(batch) {
    const query = `
      INSERT INTO batch_genealogy (batch_id, parent_batch_id, battery_type, supplier, receipt_date, current_status, current_location, weight_kg, process_history, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      batch.batch_id,
      batch.parent_batch_id,
      batch.battery_type,
      batch.supplier,
      batch.receipt_date ? new Date(batch.receipt_date) : null,
      batch.current_status,
      batch.current_location,
      batch.weight_kg,
      batch.process_history || [],
      new Date(),
      new Date()
    ];

    await this.client.execute(query, params, { prepare: true });
  }

  /**
   * Get batch genealogy
   */
  async getBatchGenealogy(batchId) {
    const query = `SELECT * FROM batch_genealogy WHERE batch_id = ?`;
    const result = await this.client.execute(query, [batchId], { prepare: true });
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      batch_id: row.batch_id,
      parent_batch_id: row.parent_batch_id,
      battery_type: row.battery_type,
      supplier: row.supplier,
      receipt_date: row.receipt_date,
      current_status: row.current_status,
      current_location: row.current_location,
      weight_kg: row.weight_kg,
      process_history: row.process_history,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Insert quality record
   */
  async insertQualityRecord(inspection) {
    const query = `
      INSERT INTO quality_records (inspection_id, batch_id, work_order_id, item_code, inspection_type, inspection_date, status, readings, inspector_id, created_at)
      VALUES (now(), ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      inspection.batch_id,
      inspection.work_order_id,
      inspection.item_code,
      inspection.inspection_type,
      new Date(inspection.inspection_date),
      inspection.status,
      inspection.readings || [],
      inspection.inspector_id,
      new Date()
    ];

    await this.client.execute(query, params, { prepare: true });
  }

  /**
   * Insert material recovery record
   */
  async insertMaterialRecovery(recovery) {
    const query = `
      INSERT INTO material_recovery (recovery_id, batch_id, process_stage, material_type, quantity_kg, purity_percent, warehouse, recorded_at)
      VALUES (now(), ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      recovery.batch_id,
      recovery.process_stage,
      recovery.material_type,
      recovery.quantity_kg,
      recovery.purity_percent,
      recovery.warehouse,
      new Date()
    ];

    await this.client.execute(query, params, { prepare: true });
  }

  /**
   * Get material recovery by batch
   */
  async getMaterialRecoveryByBatch(batchId) {
    const query = `SELECT * FROM material_recovery WHERE batch_id = ?`;
    const result = await this.client.execute(query, [batchId], { prepare: true });
    
    return result.rows.map(row => ({
      recovery_id: row.recovery_id,
      batch_id: row.batch_id,
      process_stage: row.process_stage,
      material_type: row.material_type,
      quantity_kg: row.quantity_kg,
      purity_percent: row.purity_percent,
      warehouse: row.warehouse,
      recorded_at: row.recorded_at
    }));
  }

  /**
   * Update production metrics (daily aggregation)
   */
  async updateProductionMetrics(date, metrics) {
    const query = `
      INSERT INTO production_metrics (metric_date, work_orders_completed, total_quantity, avg_recovery_rate, total_input_kg, total_output_kg, waste_kg, downtime_minutes, quality_pass_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      date,
      metrics.work_orders_completed || 0,
      metrics.total_quantity || 0,
      metrics.avg_recovery_rate || 0,
      metrics.total_input_kg || 0,
      metrics.total_output_kg || 0,
      metrics.waste_kg || 0,
      metrics.downtime_minutes || 0,
      metrics.quality_pass_rate || 0
    ];

    await this.client.execute(query, params, { prepare: true });
  }

  /**
   * Insert sensor reading
   */
  async insertSensorReading(reading) {
    const query = `
      INSERT INTO sensor_readings (sensor_id, reading_time, reading_id, metric_name, metric_value, unit, station_id)
      VALUES (?, ?, now(), ?, ?, ?, ?)
    `;
    
    const params = [
      reading.sensor_id,
      new Date(),
      reading.metric_name,
      reading.metric_value,
      reading.unit,
      reading.station_id
    ];

    await this.client.execute(query, params, { prepare: true });
  }

  /**
   * Get recent sensor readings
   */
  async getSensorReadings(sensorId, metricName, limit = 100) {
    const query = `
      SELECT * FROM sensor_readings 
      WHERE sensor_id = ? AND metric_name = ?
      LIMIT ?
    `;
    
    const result = await this.client.execute(query, [sensorId, metricName, limit], { prepare: true });
    
    return result.rows.map(row => ({
      sensor_id: row.sensor_id,
      reading_time: row.reading_time,
      metric_name: row.metric_name,
      metric_value: row.metric_value,
      unit: row.unit,
      station_id: row.station_id
    }));
  }

  /**
   * Get production metrics for date range
   */
  async getProductionMetrics(startDate, endDate) {
    const query = `
      SELECT * FROM production_metrics 
      WHERE metric_date >= ? AND metric_date <= ?
    `;
    
    const result = await this.client.execute(query, [startDate, endDate], { prepare: true });
    
    return result.rows.map(row => ({
      metric_date: row.metric_date,
      work_orders_completed: row.work_orders_completed,
      total_quantity: row.total_quantity,
      avg_recovery_rate: row.avg_recovery_rate,
      total_input_kg: row.total_input_kg,
      total_output_kg: row.total_output_kg,
      waste_kg: row.waste_kg,
      downtime_minutes: row.downtime_minutes,
      quality_pass_rate: row.quality_pass_rate
    }));
  }
}

module.exports = AstraDBClient;
