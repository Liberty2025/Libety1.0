require('dotenv').config();
const pool = require('../db');

async function checkTables() {
  try {
    console.log('🔍 Vérification des tables nécessaires pour /api/demenageurs...\n');
    
    // Vérifier si les tables existent
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('mover_profiles', 'user_locations', 'users')
      ORDER BY table_name;
    `);

    const existingTables = tablesResult.rows.map(r => r.table_name);
    console.log('📋 Tables trouvées:', existingTables);
    
    // Vérifier les colonnes de la table users
    if (existingTables.includes('users')) {
      const usersCols = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
        AND column_name IN ('latitude', 'longitude', 'role')
        ORDER BY column_name;
      `);
      console.log('\n📋 Colonnes latitude/longitude/role dans users:', usersCols.rows.map(r => r.column_name));
    }

    // Vérifier la structure de mover_profiles si elle existe
    if (existingTables.includes('mover_profiles')) {
      const moverCols = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mover_profiles'
        ORDER BY ordinal_position;
      `);
      console.log('\n📋 Colonnes de mover_profiles:');
      moverCols.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('\n❌ Table mover_profiles n\'existe pas!');
    }

    // Vérifier la structure de user_locations si elle existe
    if (existingTables.includes('user_locations')) {
      const locCols = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_locations'
        ORDER BY ordinal_position;
      `);
      console.log('\n📋 Colonnes de user_locations:');
      locCols.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('\n❌ Table user_locations n\'existe pas!');
    }

    // Tester la requête qui cause l'erreur
    console.log('\n🧪 Test de la requête principale...');
    try {
      const testResult = await pool.query(
        'SELECT id, first_name, last_name, email, phone, role, status, address, latitude, longitude, created_at, updated_at FROM users WHERE role = $1 LIMIT 1',
        ['demenageur']
      );
      console.log('✅ Requête principale OK, déménageurs trouvés:', testResult.rows.length);
    } catch (error) {
      console.error('❌ Erreur dans la requête principale:', error.message);
      console.error('   Code:', error.code);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkTables();

