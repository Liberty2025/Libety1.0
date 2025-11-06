require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../db');

async function createMissingTables() {
  try {
    console.log('🔧 Création des tables manquantes...\n');
    
    // Lire le fichier SQL
    const sqlFile = path.join(__dirname, 'createMissingTables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Exécuter le script SQL
    await pool.query(sql);
    
    console.log('✅ Tables créées avec succès !\n');
    
    // Vérifier que les tables existent maintenant
    const tables = ['service_requests', 'chats', 'chat_messages'];
    
    for (const tableName of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tableName]);
      
      if (result.rows[0].exists) {
        console.log(`   ✅ ${tableName} - créée`);
      } else {
        console.log(`   ❌ ${tableName} - erreur lors de la création`);
      }
    }
    
    console.log('\n✅ Toutes les tables requises sont maintenant disponibles !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la création des tables:', error.message);
    if (error.code === '42P07') {
      console.log('   ℹ️  Certaines tables existent déjà, c\'est normal.');
    }
  } finally {
    await pool.end();
    process.exit(0);
  }
}

createMissingTables();

