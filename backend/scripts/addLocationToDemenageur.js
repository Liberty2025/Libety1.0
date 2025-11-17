require('dotenv').config();
const pool = require('../db');

async function addLocationToDemenageur() {
  try {
    const email = 'seddik.25@gmail.com';
    
    // Récupérer l'ID du déménageur
    const user = await pool.query(
      'SELECT id, first_name, last_name FROM users WHERE email = $1 AND role = $2',
      [email, 'demenageur']
    );
    
    if (user.rows.length === 0) {
      console.log(`❌ Aucun déménageur trouvé avec l'email: ${email}`);
      await pool.end();
      process.exit(1);
    }
    
    const demenageur = user.rows[0];
    console.log(`\n📋 Déménageur trouvé: ${demenageur.first_name} ${demenageur.last_name} (${email})`);
    console.log(`   ID: ${demenageur.id}\n`);
    
    // Vérifier si une localisation existe déjà
    const existingLocation = await pool.query(
      'SELECT * FROM user_locations WHERE user_id = $1',
      [demenageur.id]
    );
    
    if (existingLocation.rows.length > 0) {
      console.log('⚠️  Une localisation existe déjà pour ce déménageur:');
      console.log(`   lat: ${existingLocation.rows[0].lat}, lng: ${existingLocation.rows[0].lng}`);
      console.log('\n💡 Voulez-vous la mettre à jour ? (modifiez le script pour changer les coordonnées)\n');
      await pool.end();
      process.exit(0);
    }
    
    // Coordonnées par défaut (Tunis, Tunisie - centre-ville)
    // Vous pouvez modifier ces coordonnées selon vos besoins
    const defaultLat = 36.8065;  // Latitude de Tunis
    const defaultLng = 10.1815;   // Longitude de Tunis
    
    // Insérer la localisation (user_id est la clé primaire)
    const result = await pool.query(
      `INSERT INTO user_locations (user_id, lat, lng, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET lat = $2, lng = $3, updated_at = NOW()
       RETURNING *`,
      [demenageur.id, defaultLat, defaultLng]
    );
    
    const location = result.rows[0];
    console.log(`✅ Localisation ajoutée avec succès !`);
    console.log(`   lat: ${location.lat}`);
    console.log(`   lng: ${location.lng}`);
    console.log(`\n💡 Le déménageur devrait maintenant apparaître sur la page d'accueil du client.\n`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.code === '23505') {
      console.error('   (Erreur: contrainte unique - une localisation existe peut-être déjà)');
    }
  } finally {
    await pool.end();
    process.exit(0);
  }
}

addLocationToDemenageur();

