require('dotenv').config();
const pool = require('../db');

async function listAllTablesAndColumns() {
  try {
    // Récupérer toutes les tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`\n📊 Nombre total de tables: ${tables.rows.length}\n`);
    console.log('═'.repeat(80));
    
    // Pour chaque table, récupérer ses colonnes
    for (const table of tables.rows) {
      const tableName = table.table_name;
      
      const columns = await pool.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);
      
      console.log(`\n📋 Table: ${tableName}`);
      console.log(`   Colonnes: ${columns.rows.length}`);
      console.log('-'.repeat(80));
      
      columns.rows.forEach((col, index) => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        const dataType = col.data_type === 'character varying' ? `VARCHAR${maxLength}` : 
                        col.data_type === 'character' ? `CHAR${maxLength}` :
                        col.data_type === 'numeric' ? 'NUMERIC' :
                        col.data_type === 'double precision' ? 'DOUBLE PRECISION' :
                        col.data_type === 'timestamp with time zone' ? 'TIMESTAMP WITH TIME ZONE' :
                        col.data_type === 'timestamp without time zone' ? 'TIMESTAMP' :
                        col.data_type.toUpperCase();
        
        console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${col.column_name.padEnd(30, ' ')} ${dataType.padEnd(25, ' ')} ${nullable}${defaultVal}`);
      });
      
      console.log('═'.repeat(80));
    }
    
    console.log(`\n✅ Total: ${tables.rows.length} tables listées\n`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

listAllTablesAndColumns();

