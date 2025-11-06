require('dotenv').config();
const pool = require('../db');

async function checkUsersTableStructure() {
  try {
    console.log('🔍 Vérification de la structure de la table users...');
    
    // Vérifier toutes les colonnes de la table users
    const columns = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'users'
       ORDER BY ordinal_position`
    );

    console.log('\n📋 Colonnes de la table users:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // Chercher spécifiquement les colonnes liées à identity card
    const identityColumns = columns.rows.filter(col => 
      col.column_name.toLowerCase().includes('identity') || 
      col.column_name.toLowerCase().includes('card')
    );

    console.log('\n🔍 Colonnes liées à identity card:');
    if (identityColumns.length > 0) {
      identityColumns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('   ❌ Aucune colonne trouvée avec "identity" ou "card" dans le nom');
    }

  } catch (err) {
    console.error('❌ Erreur lors de la vérification:', err.message);
  } finally {
    await pool.end();
  }
}

checkUsersTableStructure();

