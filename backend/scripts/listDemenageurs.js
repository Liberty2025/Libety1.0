require('dotenv').config();
const pool = require('../db');

async function listDemenageurs() {
  try {
    console.log('🔍 Recherche des déménageurs dans la base de données...\n');
    
    // Récupérer tous les utilisateurs avec le rôle déménageur
    const demenageurs = await pool.query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.role,
        u.status,
        u.address,
        u.is_verified,
        u.created_at
      FROM users u
      WHERE u.role = 'demenageur'
      ORDER BY u.created_at DESC;
    `);

    console.log(`📋 Nombre total de déménageurs: ${demenageurs.rows.length}\n`);

    if (demenageurs.rows.length === 0) {
      console.log('❌ Aucun déménageur trouvé dans la base de données.');
      await pool.end();
      process.exit(0);
    }

    // Pour chaque déménageur, récupérer les informations complémentaires
    for (let i = 0; i < demenageurs.rows.length; i++) {
      const demenageur = demenageurs.rows[i];
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📌 Déménageur ${i + 1}/${demenageurs.rows.length}`);
      console.log(`${'='.repeat(60)}`);
      console.log(`ID: ${demenageur.id}`);
      console.log(`Nom: ${demenageur.first_name || 'N/A'} ${demenageur.last_name || 'N/A'}`);
      console.log(`Email: ${demenageur.email || 'N/A'}`);
      console.log(`Téléphone: ${demenageur.phone || 'N/A'}`);
      console.log(`Statut: ${demenageur.status || 'N/A'}`);
      console.log(`Adresse: ${demenageur.address || 'N/A'}`);
      console.log(`Vérifié: ${demenageur.is_verified ? 'Oui ✅' : 'Non ❌'}`);
      console.log(`Date de création: ${demenageur.created_at || 'N/A'}`);

      // Récupérer le profil déménageur
      const profile = await pool.query(
        'SELECT * FROM mover_profiles WHERE user_id = $1',
        [demenageur.id]
      );

      if (profile.rows.length > 0) {
        const p = profile.rows[0];
        console.log(`\n📊 Profil déménageur:`);
        console.log(`   - Nom de l'entreprise: ${p.company_name || 'N/A'}`);
        console.log(`   - Note: ${p.rating || 0}/5`);
        console.log(`   - Nombre d'avis: ${p.total_reviews || 0}`);
        console.log(`   - Années d'expérience: ${p.experience_years || 0}`);
        console.log(`   - Bio: ${p.bio ? p.bio.substring(0, 50) + '...' : 'N/A'}`);
      } else {
        console.log(`\n⚠️  Aucun profil déménageur trouvé`);
      }

      // Récupérer la localisation
      const location = await pool.query(
        'SELECT * FROM user_locations WHERE user_id = $1',
        [demenageur.id]
      );

      if (location.rows.length > 0) {
        const loc = location.rows[0];
        console.log(`\n📍 Localisation:`);
        console.log(`   - Latitude: ${loc.lat || 'N/A'}`);
        console.log(`   - Longitude: ${loc.lng || 'N/A'}`);
        console.log(`   - Ville: ${loc.city || 'N/A'}`);
        console.log(`   - Pays: ${loc.country || 'N/A'}`);
      } else {
        console.log(`\n⚠️  Aucune localisation trouvée`);
      }

      // Compter les demandes de service
      const serviceRequests = await pool.query(
        'SELECT COUNT(*) as count FROM service_requests WHERE demenageur_id = $1',
        [demenageur.id]
      );
      console.log(`\n📦 Demandes de service: ${serviceRequests.rows[0].count || 0}`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Résumé: ${demenageurs.rows.length} déménageur(s) trouvé(s)`);
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error('❌ Erreur:', error);
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

listDemenageurs();

