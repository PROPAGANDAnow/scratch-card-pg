#!/usr/bin/env node

/**
 * Database Clear Script using Prisma
 * Clears all data from 4 main tables while preserving schema
 * Tables: users, cards, reveals, stats
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

const TABLES_TO_CLEAR = [
  { name: 'cards', model: 'card' },    // Clear cards first (has foreign key to users)
  { name: 'users', model: 'user' },    // Clear users second
  { name: 'stats', model: 'stats' }    // Clear stats last
];

async function clearTable(tableName, modelName) {
  try {
    console.log(`🗑️  Clearing table: ${tableName}...`);
    
    const result = await prisma[modelName].deleteMany({});
    
    console.log(`✅ Cleared ${result.count} rows from ${tableName}`);
    return true;
  } catch (error) {
    console.error(`❌ Error clearing ${tableName}:`, error.message);
    return false;
  }
}

async function verifyTables() {
  console.log('\n📊 Verifying tables are empty...');
  
  for (const table of TABLES_TO_CLEAR) {
    try {
      const count = await prisma[table.model].count();
      console.log(`   ${table.name}: ${count} rows`);
    } catch (error) {
      console.error(`   ❌ Error counting ${table.name}:`, error.message);
    }
  }
}

async function clearDatabase() {
  console.log('🚀 Starting database clear operation...\n');
  
  let successCount = 0;
  
  for (const table of TABLES_TO_CLEAR) {
    const success = await clearTable(table.name, table.model);
    if (success) {
      successCount++;
    }
    console.log(''); // Empty line for readability
  }
  
  console.log('📊 Summary:');
  console.log(`   ✅ Successfully cleared: ${successCount}/${TABLES_TO_CLEAR.length} tables`);
  
  if (successCount === TABLES_TO_CLEAR.length) {
    console.log('🎉 Database cleared successfully! Schema preserved.');
    
    // Verify tables are empty
    await verifyTables();
  } else {
    console.log('⚠️  Some tables failed to clear. Check the errors above.');
    process.exit(1);
  }
}

// Cleanup function
async function cleanup() {
  console.log('\n🔌 Disconnecting from database...');
  await prisma.$disconnect();
}

// Run script with cleanup
clearDatabase()
  .then(() => {
    cleanup();
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error.message);
    cleanup();
    process.exit(1);
  });