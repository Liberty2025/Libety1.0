require('dotenv').config();
const pool = require('../db');

async function listTables() {
  try {
    console.log('🔍 Recherche des tables dans la base de données PostgreSQL...\n');
    
    // Requête pour lister toutes les tables
    const result = await pool.query(`
      SELECT 
        table_schema,
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name;
    `);

    if (result.rows.length === 0) {
      console.log('❌ Aucune table trouvée dans la base de données.');
      return;
    }

    console.log(`✅ ${result.rows.length} table(s) trouvée(s) :\n`);
    
    // Grouper par schéma
    const tablesBySchema = {};
    result.rows.forEach(row => {
      const schema = row.table_schema;
      if (!tablesBySchema[schema]) {
        tablesBySchema[schema] = [];
      }
      tablesBySchema[schema].push({
        name: row.table_name,
        type: row.table_type
      });
    });

    // Afficher les tables par schéma
    Object.keys(tablesBySchema).forEach(schema => {
      console.log(`📁 Schéma: ${schema}`);
      tablesBySchema[schema].forEach(table => {
        const icon = table.type === 'VIEW' ? '👁️' : '📊';
        console.log(`   ${icon} ${table.name} (${table.type})`);
      });
      console.log('');
    });

    // Afficher le nombre de lignes pour chaque table
    console.log('\n📈 Nombre de lignes par table :\n');
    for (const row of result.rows) {
      if (row.table_type === 'BASE TABLE') {
        try {
          const countResult = await pool.query(
            `SELECT COUNT(*) as count FROM ${row.table_schema}.${row.table_name}`
          );
          const count = countResult.rows[0].count;
          console.log(`   ${row.table_name}: ${count} ligne(s)`);
        } catch (err) {
          console.log(`   ${row.table_name}: Erreur lors du comptage`);
        }
      }
    }

    // Afficher la structure de quelques tables importantes
    console.log('\n\n🔍 Structure des tables principales :\n');
    const importantTables = ['users', 'service_requests', 'chats', 'chat_messages', 'reservations'];
    
    for (const tableName of importantTables) {
      const tableExists = result.rows.find(r => r.table_name === tableName);
      if (tableExists) {
        try {
          const columnsResult = await pool.query(`
            SELECT 
              column_name,
              data_type,
              character_maximum_length,
              is_nullable,
              column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position;
          `, [tableName]);

          console.log(`📋 Table: ${tableName}`);
          columnsResult.rows.forEach(col => {
            const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
            const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
            const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
            console.log(`   - ${col.column_name}: ${col.data_type}${maxLength} ${nullable}${defaultVal}`);
          });
          console.log('');
        } catch (err) {
          console.log(`   ❌ Erreur lors de la récupération de la structure de ${tableName}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des tables:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

listTables();

