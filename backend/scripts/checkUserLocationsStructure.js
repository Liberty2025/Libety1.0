require('dotenv').config();
const pool = require('../db');

async function checkUserLocationsStructure() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'user_locations' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Structure de la table user_locations:');
    if (result.rows.length === 0) {
      console.log('   ❌ Table non trouvée');
    } else {
      result.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)'}`);
      });
    }
    
    // Vérifier aussi si la table existe avec un autre nom
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND (table_name LIKE '%location%' OR table_name LIKE '%user%')
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tables similaires trouvées:');
    tables.rows.forEach(t => {
      console.log(`   - ${t.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkUserLocationsStructure();

