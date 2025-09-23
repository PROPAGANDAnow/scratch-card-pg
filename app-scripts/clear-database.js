#!/usr/bin/env node

/**
 * Database Clear Script
 * Clears all data from the 4 main tables while preserving schema
 * Tables: users, cards, reveals, stats
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TABLES_TO_CLEAR = [
  'reveals',  // Clear reveals first (has foreign key to cards)
  'cards',    // Clear cards second (has foreign key to users)
  'users',    // Clear users third
  'stats'     // Clear stats last
];

async function clearTable(tableName) {
  try {
    console.log(`🗑️  Clearing table: ${tableName}...`);
    
    const { error, count } = await supabase
      .from(tableName)
      .delete()
      .neq('id', 'impossible-id'); // Delete all rows
    
    if (error) {
      console.error(`❌ Error clearing ${tableName}:`, error.message);
      return false;
    }
    
    console.log(`✅ Cleared ${count || 0} rows from ${tableName}`);
    return true;
  } catch (error) {
    console.error(`❌ Unexpected error clearing ${tableName}:`, error.message);
    return false;
  }
}

async function clearDatabase() {
  console.log('🚀 Starting database clear operation...\n');
  
  let successCount = 0;
  
  for (const table of TABLES_TO_CLEAR) {
    const success = await clearTable(table);
    if (success) {
      successCount++;
    }
    console.log(''); // Empty line for readability
  }
  
  console.log('📊 Summary:');
  console.log(`   ✅ Successfully cleared: ${successCount}/${TABLES_TO_CLEAR.length} tables`);
  
  if (successCount === TABLES_TO_CLEAR.length) {
    console.log('🎉 Database cleared successfully! Schema preserved.');
  } else {
    console.log('⚠️  Some tables failed to clear. Check the errors above.');
    process.exit(1);
  }
}

// Run the script
clearDatabase().catch((error) => {
  console.error('💥 Fatal error:', error.message);
  process.exit(1);
});
