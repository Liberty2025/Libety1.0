require('dotenv').config();
const pool = require('../db');

async function addLocationsToAllDemenageurs() {
  try {
    console.log('🔍 Recherche des déménageurs sans localisation...\n');
    
    // Récupérer tous les déménageurs
    const demenageurs = await pool.query(
      'SELECT id, first_name, last_name, email, status FROM users WHERE role = $1',
      ['demenageur']
    );
    
    console.log(`📋 Déménageurs trouvés: ${demenageurs.rows.length}\n`);
    
    if (demenageurs.rows.length === 0) {
      console.log('❌ Aucun déménageur trouvé dans la base de données.');
      await pool.end();
      process.exit(0);
    }
    
    // Coordonnées par défaut (Tunis, Tunisie - centre-ville)
    const defaultLocations = [
      { lat: 36.8065, lng: 10.1815, city: 'Tunis', country: 'Tunisie' }, // Tunis centre
      { lat: 36.8667, lng: 10.3167, city: 'La Marsa', country: 'Tunisie' }, // La Marsa
      { lat: 36.8500, lng: 10.2000, city: 'Aouina', country: 'Tunisie' }, // Aouina
      { lat: 36.7833, lng: 10.2167, city: 'Ain Zaghouen', country: 'Tunisie' }, // Ain Zaghouen
      { lat: 36.8667, lng: 10.3500, city: 'Sidi Bou Said', country: 'Tunisie' }, // Sidi Bou Said
    ];
    
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < demenageurs.rows.length; i++) {
      const demenageur = demenageurs.rows[i];
      const location = defaultLocations[i % defaultLocations.length];
      
      // Vérifier si une localisation existe déjà
      const existingLocation = await pool.query(
        'SELECT * FROM user_locations WHERE user_id = $1',
        [demenageur.id]
      );
      
      if (existingLocation.rows.length > 0) {
        const existing = existingLocation.rows[0];
        // Vérifier si la localisation est valide (non null)
        if (existing.lat && existing.lng) {
          console.log(`⏭️  ${demenageur.first_name} ${demenageur.last_name} (${demenageur.email}) - Localisation déjà présente: ${existing.lat}, ${existing.lng}`);
          skippedCount++;
          continue;
        } else {
          // Mettre à jour si les coordonnées sont null
          await pool.query(
            `UPDATE user_locations 
             SET lat = $1, lng = $2, city = $3, country = $4, updated_at = NOW()
             WHERE user_id = $5`,
            [location.lat, location.lng, location.city, location.country, demenageur.id]
          );
          console.log(`🔄 ${demenageur.first_name} ${demenageur.last_name} (${demenageur.email}) - Localisation mise à jour: ${location.lat}, ${location.lng} (${location.city})`);
          updatedCount++;
          continue;
        }
      }
      
      // Insérer une nouvelle localisation
      try {
        await pool.query(
          `INSERT INTO user_locations (user_id, lat, lng, city, country, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [demenageur.id, location.lat, location.lng, location.city, location.country]
        );
        console.log(`✅ ${demenageur.first_name} ${demenageur.last_name} (${demenageur.email}) - Localisation ajoutée: ${location.lat}, ${location.lng} (${location.city})`);
        addedCount++;
      } catch (error) {
        if (error.code === '23505') {
          // Contrainte unique violée, essayer de mettre à jour
          await pool.query(
            `UPDATE user_locations 
             SET lat = $1, lng = $2, city = $3, country = $4, updated_at = NOW()
             WHERE user_id = $5`,
            [location.lat, location.lng, location.city, location.country, demenageur.id]
          );
          console.log(`🔄 ${demenageur.first_name} ${demenageur.last_name} (${demenageur.email}) - Localisation mise à jour (conflit résolu): ${location.lat}, ${location.lng} (${location.city})`);
          updatedCount++;
        } else {
          console.error(`❌ Erreur pour ${demenageur.email}:`, error.message);
        }
      }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Résumé:`);
    console.log(`   ✅ Localisations ajoutées: ${addedCount}`);
    console.log(`   🔄 Localisations mises à jour: ${updatedCount}`);
    console.log(`   ⏭️  Localisations ignorées (déjà présentes): ${skippedCount}`);
    console.log(`   📋 Total déménageurs: ${demenageurs.rows.length}`);
    console.log(`${'='.repeat(60)}\n`);
    
    console.log('💡 Les déménageurs devraient maintenant apparaître sur la page d\'accueil du client.\n');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('   Code:', error.code);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

addLocationsToAllDemenageurs();

