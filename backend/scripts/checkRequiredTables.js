require('dotenv').config();
const pool = require('../db');

// Tables requises pour l'application
const requiredTables = [
  'users',
  'user_locations',
  'users_location', // Alternative
  'reservations',
  'payments',
  'subscription_plans',
  'demenageur_subscriptions',
  'codes_promo',
  'tickets',
  'mover_profiles',
  'demenageur_evaluations',
  'scoring_config',
  'scoring_config_history',
  'demenageur_gifts',
  'demenageur_gift_stats',
  'demenageur_payments',
  'demenageur_payment_preferences',
  'service_requests',
  'chats',
  'chat_messages'
];

async function checkRequiredTables() {
  try {
    console.log('🔍 Vérification des tables requises...\n');
    
    // Récupérer toutes les tables
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const existingTables = result.rows.map(row => row.table_name);
    
    console.log('📊 Tables existantes dans la base de données :');
    existingTables.forEach(table => {
      console.log(`   ✓ ${table}`);
    });
    
    console.log('\n\n🔍 Vérification des tables requises :\n');
    
    const missing = [];
    const found = [];
    
    requiredTables.forEach(table => {
      if (existingTables.includes(table)) {
        found.push(table);
        console.log(`   ✅ ${table} - EXISTE`);
      } else {
        missing.push(table);
        console.log(`   ❌ ${table} - MANQUANTE`);
      }
    });
    
    console.log(`\n\n📈 Résumé :`);
    console.log(`   ✅ Tables trouvées : ${found.length}/${requiredTables.length}`);
    console.log(`   ❌ Tables manquantes : ${missing.length}/${requiredTables.length}`);
    
    if (missing.length > 0) {
      console.log(`\n⚠️  Tables manquantes :`);
      missing.forEach(table => {
        console.log(`   - ${table}`);
      });
      console.log(`\n💡 Ces tables doivent être créées dans PostgreSQL.`);
    } else {
      console.log(`\n✅ Toutes les tables requises sont présentes !`);
    }
    
    // Vérifier les tables similaires (variations de noms)
    console.log(`\n\n🔍 Recherche de tables similaires :\n`);
    const similarTables = {
      'user_locations': existingTables.filter(t => t.includes('location')),
      'chats': existingTables.filter(t => t.includes('chat') || t.includes('conversation')),
      'chat_messages': existingTables.filter(t => t.includes('message')),
      'service_requests': existingTables.filter(t => t.includes('service') || t.includes('request') || t.includes('quote') || t.includes('offer') || t.includes('move'))
    };
    
    Object.keys(similarTables).forEach(required => {
      const similar = similarTables[required];
      if (similar.length > 0) {
        console.log(`   ${required} → Tables similaires trouvées : ${similar.join(', ')}`);
      }
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkRequiredTables();

