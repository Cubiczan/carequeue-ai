/**
 * Hazardous Waste Tracking Service
 * 
 * Manages hazardous waste manifests, storage, and compliance reporting
 */

const { v4: uuidv4 } = require('uuid');

class HazardousWasteService {
  constructor(astraDB) {
    this.astraDB = astraDB;
  }

  /**
   * Create hazardous waste manifest
   */
  async createManifest(manifestData) {
    const manifest = {
      manifest_id: `MAN-${Date.now()}-${uuidv4().slice(0, 8)}`,
      created_at: new Date(),
      status: 'pending', // pending, in_storage, scheduled, in_transit, disposed
      waste_items: [],
      total_weight_kg: 0,
      ...manifestData
    };

    if (this.astraDB) {
      // Store in Astra DB
      const query = `
        INSERT INTO hazmat_manifests (manifest_id, created_at, status, waste_type, total_weight_kg, generator, storage_location, accumulation_start_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await this.astraDB.client.execute(query, [
        manifest.manifest_id,
        manifest.created_at,
        manifest.status,
        manifest.waste_type,
        manifest.total_weight_kg,
        manifest.generator,
        manifest.storage_location,
        manifest.accumulation_start_date
      ], { prepare: true });
    }

    return manifest;
  }

  /**
   * Add waste item to manifest
   */
  async addWasteItem(manifestId, itemData) {
    const item = {
      item_id: uuidv4(),
      added_at: new Date(),
      ...itemData
    };

    if (this.astraDB) {
      const query = `
        INSERT INTO hazmat_waste_items (manifest_id, item_id, waste_code, description, weight_kg, container_type, container_count, added_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await this.astraDB.client.execute(query, [
        manifestId,
        item.item_id,
        item.waste_code,
        item.description,
        item.weight_kg,
        item.container_type,
        item.container_count,
        item.added_at
      ], { prepare: true });

      // Update manifest total
      await this.astraDB.client.execute(
        `UPDATE hazmat_manifests SET total_weight_kg = total_weight_kg + ? WHERE manifest_id = ?`,
        [item.weight_kg, manifestId],
        { prepare: true }
      );
    }

    return item;
  }

  /**
   * Get manifest by ID
   */
  async getManifest(manifestId) {
    if (this.astraDB) {
      const query = `SELECT * FROM hazmat_manifests WHERE manifest_id = ?`;
      const result = await this.astraDB.client.execute(query, [manifestId], { prepare: true });
      
      if (result.rows.length === 0) return null;
      
      const manifest = result.rows[0];
      
      // Get waste items
      const itemsQuery = `SELECT * FROM hazmat_waste_items WHERE manifest_id = ?`;
      const itemsResult = await this.astraDB.client.execute(itemsQuery, [manifestId], { prepare: true });
      
      return {
        ...manifest,
        waste_items: itemsResult.rows
      };
    }
    
    return null;
  }

  /**
   * Update manifest status
   */
  async updateManifestStatus(manifestId, status, additionalData = {}) {
    if (this.astraDB) {
      const query = `
        UPDATE hazmat_manifests 
        SET status = ?, updated_at = ?
        WHERE manifest_id = ?
      `;
      
      await this.astraDB.client.execute(query, [
        status,
        new Date(),
        manifestId
      ], { prepare: true });

      // Log status change
      await this.logManifestActivity(manifestId, 'status_change', {
        from_status: additionalData.fromStatus,
        to_status: status
      });
    }

    return { manifest_id: manifestId, status };
  }

  /**
   * Schedule waste pickup with disposal vendor
   */
  async schedulePickup(manifestId, pickupData) {
    const pickup = {
      pickup_id: uuidv4(),
      manifest_id: manifestId,
      scheduled_date: pickupData.scheduled_date,
      vendor: pickupData.vendor,
      vendor_epa_id: pickupData.vendor_epa_id,
      transporter: pickupData.transporter,
      transporter_epa_id: pickupData.transporter_epa_id,
      status: 'scheduled'
    };

    if (this.astraDB) {
      const query = `
        INSERT INTO hazmat_pickups (pickup_id, manifest_id, scheduled_date, vendor, vendor_epa_id, transporter, transporter_epa_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await this.astraDB.client.execute(query, [
        pickup.pickup_id,
        manifestId,
        pickup.scheduled_date,
        pickup.vendor,
        pickup.vendor_epa_id,
        pickup.transporter,
        pickup.transporter_epa_id,
        pickup.status
      ], { prepare: true });

      await this.updateManifestStatus(manifestId, 'scheduled', { fromStatus: 'in_storage' });
    }

    return pickup;
  }

  /**
   * Complete disposal and close manifest
   */
  async completeDisposal(manifestId, disposalData) {
    if (this.astraDB) {
      const query = `
        UPDATE hazmat_manifests 
        SET status = 'disposed',
            disposal_date = ?,
            disposal_method = ?,
            disposal_facility = ?,
            epa_document_id = ?
        WHERE manifest_id = ?
      `;
      
      await this.astraDB.client.execute(query, [
        disposalData.disposal_date,
        disposalData.disposal_method,
        disposalData.disposal_facility,
        disposalData.epa_document_id,
        manifestId
      ], { prepare: true });

      await this.logManifestActivity(manifestId, 'disposed', disposalData);
    }

    return { manifest_id: manifestId, status: 'disposed' };
  }

  /**
   * Log manifest activity
   */
  async logManifestActivity(manifestId, activityType, data) {
    if (this.astraDB) {
      const query = `
        INSERT INTO hazmat_manifest_activity (manifest_id, activity_id, activity_type, activity_data, recorded_at)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      await this.astraDB.client.execute(query, [
        manifestId,
        uuidv4(),
        activityType,
        data,
        new Date()
      ], { prepare: true });
    }
  }

  /**
   * Get manifests by status
   */
  async getManifestsByStatus(status, limit = 50) {
    if (this.astraDB) {
      const query = `SELECT * FROM hazmat_manifests WHERE status = ? LIMIT ?`;
      const result = await this.astraDB.client.execute(query, [status, limit], { prepare: true });
      
      return result.rows;
    }
    
    return [];
  }

  /**
   * Get manifests requiring attention (accumulation time limits)
   */
  async getManifestsRequiringAttention(daysThreshold = 90) {
    if (this.astraDB) {
      const query = `
        SELECT *, 
               DATEDIFF(toDate(now()), accumulation_start_date) as days_accumulated
        FROM hazmat_manifests 
        WHERE status IN ('pending', 'in_storage')
          AND accumulation_start_date < toDate(now()) - ?
        ORDER BY accumulation_start_date ASC
      `;
      
      const result = await this.astraDB.client.execute(query, [daysThreshold], { prepare: true });
      return result.rows;
    }
    
    return [];
  }

  /**
   * Generate EPA compliance report
   */
  async generateComplianceReport(startDate, endDate, reportType = 'quarterly') {
    if (this.astraDB) {
      const query = `
        SELECT 
          waste_type,
          COUNT(*) as manifest_count,
          SUM(total_weight_kg) as total_weight,
          AVG(DATEDIFF(toDate(now()), accumulation_start_date)) as avg_days_stored
        FROM hazmat_manifests
        WHERE created_at >= ? AND created_at <= ?
        GROUP BY waste_type
      `;
      
      const result = await this.astraDB.client.execute(query, [startDate, endDate], { prepare: true });
      
      return {
        report_type: reportType,
        period: { start: startDate, end: endDate },
        generated_at: new Date(),
        summaries: result.rows,
        compliance_status: 'compliant' // Would include actual compliance checks
      };
    }
    
    return null;
  }

  /**
   * Get storage location inventory
   */
  async getStorageInventory(location) {
    if (this.astraDB) {
      const query = `
        SELECT 
          storage_location,
          waste_type,
          COUNT(*) as manifest_count,
          SUM(total_weight_kg) as total_weight
        FROM hazmat_manifests
        WHERE status = 'in_storage'
          AND storage_location = ?
        GROUP BY storage_location, waste_type
      `;
      
      const result = await this.astraDB.client.execute(query, [location], { prepare: true });
      return result.rows;
    }
    
    return [];
  }

  /**
   * Check accumulation time compliance
   * SQG: 180 days, LQG: 90 days
   */
  checkAccumulationCompliance(manifest) {
    const accumulationStart = new Date(manifest.accumulation_start_date);
    const now = new Date();
    const daysAccumulated = Math.floor((now - accumulationStart) / (1000 * 60 * 60 * 24));
    
    // Default to LQG (Large Quantity Generator) limits
    const isLQG = true;
    const maxDays = isLQG ? 90 : 180;
    
    return {
      days_accumulated: daysAccumulated,
      max_days: maxDays,
      is_compliant: daysAccumulated <= maxDays,
      days_remaining: maxDays - daysAccumulated,
      generator_type: isLQG ? 'LQG' : 'SQG'
    };
  }
}

module.exports = HazardousWasteService;
