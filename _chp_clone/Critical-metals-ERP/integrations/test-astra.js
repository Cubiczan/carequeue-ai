#!/usr/bin/env node
/**
 * Test Astra DB Connection
 * 
 * Run this to verify your Astra DB credentials are working
 * Usage: node test-astra.js
 */

require('dotenv').config();

const AstraDBClient = require('./src/clients/astradb');

async function testConnection() {
  console.log('🔫 Testing Astra DB Connection...\n');
  console.log('Database ID:', process.env.ASTRA_DB_ID);
  console.log('Keyspace:', process.env.ASTRA_KEYSPACE);
  console.log('Contact Point:', process.env.ASTRA_CONTACT_POINT);
  console.log('');

  const astraDB = new AstraDBClient({
    keyspace: process.env.ASTRA_KEYSPACE || 'battery_erp',
    contactPoint: process.env.ASTRA_CONTACT_POINT,
    datacenter: process.env.ASTRA_DATACENTER || 'us-east-2',
    token: process.env.ASTRA_TOKEN,
    clientId: process.env.ASTRA_CLIENT_ID
  });

  try {
    console.log('⏳ Connecting to Astra DB...');
    await astraDB.connect();
    console.log('✅ Successfully connected to Astra DB!\n');

    // Test write
    console.log('⏳ Testing write operation...');
    const testBatchId = `TEST-${Date.now()}`;
    await astraDB.upsertBatchGenealogy({
      batch_id: testBatchId,
      battery_type: 'Test-Li-ion',
      supplier: 'Test Supplier',
      current_status: 'testing',
      weight_kg: 1.0,
      process_history: ['test']
    });
    console.log('✅ Write test successful!\n');

    // Test read
    console.log('⏳ Testing read operation...');
    const batch = await astraDB.getBatchGenealogy(testBatchId);
    if (batch) {
      console.log('✅ Read test successful!');
      console.log('   Retrieved batch:', batch.batch_id);
      console.log('   Battery type:', batch.battery_type);
      console.log('');
    }

    // Test production event
    console.log('⏳ Testing production event recording...');
    await astraDB.insertProductionEvent({
      work_order_id: 'TEST-WO-001',
      batch_id: testBatchId,
      event_type: 'test_event',
      station_id: 'TEST-STATION',
      operator_id: 'TEST-OP',
      timestamp: new Date().toISOString(),
      data: { test: 'data' },
      metrics: { temperature: 25.5 }
    });
    console.log('✅ Production event recorded!\n');

    // Get events
    console.log('⏳ Fetching production events...');
    const events = await astraDB.getProductionEvents('TEST-WO-001', 10);
    console.log(`✅ Retrieved ${events.length} event(s)\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 All tests passed! Astra DB is ready.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Cleanup test data
    console.log('Note: Test data was created in your database.');
    console.log('You may want to delete these test records:');
    console.log(`  - Batch: ${testBatchId}`);
    console.log(`  - Work Order: TEST-WO-001`);
    console.log('');

  } catch (error) {
    console.error('❌ Connection test failed!\n');
    console.error('Error:', error.message);
    console.error('\nTroubleshooting tips:');
    console.error('1. Verify your Astra DB credentials in .env file');
    console.error('2. Check that your IP address is allowlisted in Astra DB console');
    console.error('3. Ensure the database is active (not paused)');
    console.error('4. Verify the contact point URL is correct');
    console.error('');
    process.exit(1);
  } finally {
    await astraDB.disconnect();
  }
}

// Run the test
testConnection();
