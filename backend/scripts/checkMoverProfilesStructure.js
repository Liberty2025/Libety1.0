require('dotenv').config();
const pool = require('../db');

async function checkStructure() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'mover_profiles' 
      ORDER BY ordinal_position;
    `);

    console.log('📋 Colonnes de mover_profiles:');
    result.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });

    // Vérifier si is_verified existe
    const hasIsVerified = result.rows.some(col => col.column_name === 'is_verified');
    console.log(`\n✅ is_verified existe: ${hasIsVerified ? 'OUI' : 'NON'}`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkStructure();

