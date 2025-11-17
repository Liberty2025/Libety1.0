require('dotenv').config();
const pool = require('../db');

async function checkMoverProfilesColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'mover_profiles' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Colonnes de mover_profiles:');
    result.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkMoverProfilesColumns();

