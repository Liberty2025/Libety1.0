require('dotenv').config();
const pool = require('../db');

async function checkTableStructures() {
  try {
    console.log('🔍 Vérification de la structure des tables similaires...\n');
    
    // Vérifier la structure de 'conversations' (au lieu de 'chats')
    console.log('📋 Table: conversations (alternative à chats)');
    const conversations = await pool.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'conversations'
      ORDER BY ordinal_position;
    `);
    
    if (conversations.rows.length > 0) {
      conversations.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`   - ${col.column_name}: ${col.data_type}${maxLength} ${nullable}${defaultVal}`);
      });
    } else {
      console.log('   ❌ Table non trouvée');
    }
    
    console.log('\n📋 Table: messages (alternative à chat_messages)');
    const messages = await pool.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'messages'
      ORDER BY ordinal_position;
    `);
    
    if (messages.rows.length > 0) {
      messages.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`   - ${col.column_name}: ${col.data_type}${maxLength} ${nullable}${defaultVal}`);
      });
    } else {
      console.log('   ❌ Table non trouvée');
    }
    
    console.log('\n📋 Table: moves (alternative à service_requests)');
    const moves = await pool.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'moves'
      ORDER BY ordinal_position;
    `);
    
    if (moves.rows.length > 0) {
      moves.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`   - ${col.column_name}: ${col.data_type}${maxLength} ${nullable}${defaultVal}`);
      });
    } else {
      console.log('   ❌ Table non trouvée');
    }
    
    console.log('\n📋 Table: quotes (alternative à service_requests)');
    const quotes = await pool.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'quotes'
      ORDER BY ordinal_position;
    `);
    
    if (quotes.rows.length > 0) {
      quotes.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`   - ${col.column_name}: ${col.data_type}${maxLength} ${nullable}${defaultVal}`);
      });
    } else {
      console.log('   ❌ Table non trouvée');
    }
    
    console.log('\n\n💡 Recommandations :');
    console.log('   1. Si les tables similaires ont la même structure, on peut adapter les routes');
    console.log('   2. Sinon, il faut créer les tables manquantes (service_requests, chats, chat_messages)');
    console.log('   3. Ou créer des vues/aliases pour mapper les noms');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkTableStructures();

