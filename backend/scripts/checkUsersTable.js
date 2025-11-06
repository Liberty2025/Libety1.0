require('dotenv').config();
const pool = require('../db');

async function checkUsersTable() {
  try {
    console.log('🔍 Vérification de la structure de la table users...\n');
    
    const result = await pool.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log('📋 Colonnes de la table users :\n');
    result.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`   - ${col.column_name}: ${col.data_type}${maxLength} ${nullable}${defaultVal}`);
    });

    // Vérifier les colonnes requises pour l'inscription
    const requiredColumns = ['id', 'first_name', 'last_name', 'email', 'phone', 'password', 'role', 'status'];
    const existingColumns = result.rows.map(r => r.column_name);
    
    console.log('\n\n✅ Vérification des colonnes requises :\n');
    requiredColumns.forEach(col => {
      if (existingColumns.includes(col)) {
        console.log(`   ✅ ${col} - EXISTE`);
      } else {
        console.log(`   ❌ ${col} - MANQUANTE`);
      }
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkUsersTable();

