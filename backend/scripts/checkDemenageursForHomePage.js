require('dotenv').config();
const pool = require('../db');

async function checkDemenageursForHomePage() {
  try {
    // Récupérer tous les déménageurs
    const demenageurs = await pool.query(
      'SELECT id, first_name, last_name, email, status, is_verified FROM users WHERE role = $1',
      ['demenageur']
    );
    
    console.log('\n📋 Tous les déménageurs:');
    demenageurs.rows.forEach(d => {
      console.log(`  - ${d.first_name} ${d.last_name} (${d.email})`);
      console.log(`    Status: ${d.status || 'NULL'}`);
      console.log(`    Vérifié: ${d.is_verified ? 'Oui' : 'Non'}`);
    });
    
    // Récupérer les déménageurs avec status = 'available'
    const availableDemenageurs = await pool.query(
      'SELECT id, first_name, last_name, email, status FROM users WHERE role = $1 AND status = $2',
      ['demenageur', 'available']
    );
    
    console.log(`\n✅ Déménageurs avec status='available': ${availableDemenageurs.rows.length}`);
    
    // Vérifier les localisations
    if (availableDemenageurs.rows.length > 0) {
      const userIds = availableDemenageurs.rows.map(d => d.id);
      const placeholders = userIds.map((_, i) => `$${i + 1}`).join(', ');
      
      const locations = await pool.query(
        `SELECT user_id, lat, lng FROM user_locations WHERE user_id IN (${placeholders})`,
        userIds
      );
      
      console.log(`\n📍 Localisations trouvées: ${locations.rows.length}`);
      locations.rows.forEach(l => {
        console.log(`  - user_id: ${l.user_id}, lat: ${l.lat}, lng: ${l.lng}`);
      });
      
      // Vérifier quels déménageurs n'ont pas de localisation
      const demenageursWithoutLocation = availableDemenageurs.rows.filter(d => 
        !locations.rows.find(l => l.user_id === d.id)
      );
      
      if (demenageursWithoutLocation.length > 0) {
        console.log(`\n⚠️  Déménageurs sans localisation (${demenageursWithoutLocation.length}):`);
        demenageursWithoutLocation.forEach(d => {
          console.log(`  - ${d.first_name} ${d.last_name} (${d.email})`);
        });
      }
    }
    
    console.log('\n💡 Problèmes identifiés:');
    console.log('  1. Les déménageurs doivent avoir status = "available" pour être affichés');
    console.log('  2. Les déménageurs doivent avoir une localisation (user_locations) avec lat et lng valides');
    console.log('  3. Les déménageurs doivent avoir is_verified = true (optionnel mais recommandé)\n');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkDemenageursForHomePage();

